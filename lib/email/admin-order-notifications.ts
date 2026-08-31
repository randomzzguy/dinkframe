import "server-only";

import { Buffer } from "node:buffer";

import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";
import {
  renderAdminOrderNotification,
  type AdminReceiptStatus,
} from "@/lib/email/admin-order-notification-content";
import type { OrderNotificationResult } from "@/lib/email/order-notifications";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const resendResponseSchema = z.object({ id: z.string().min(1) });

type ReceiptAttachment = {
  content: string;
  filename: string;
};

export async function sendAdminNewOrderNotification(
  orderId: string,
): Promise<OrderNotificationResult> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) {
    console.error("admin_order_notification_not_configured", { orderId });
    return { status: "skipped", reason: "Resend is not configured." };
  }
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("admin_order_notification_service_role_missing", { orderId });
    return {
      status: "skipped",
      reason: "Service-role access is not configured.",
    };
  }

  const supabase = createServiceRoleClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, client_id, player_name, whatsapp, tournament_name, package_name_snapshot, package_price_snapshot",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) {
    console.error("admin_order_notification_order_lookup_failed", {
      orderId,
      error: orderError,
    });
    return { status: "failed", reason: "Order details are unavailable." };
  }

  const usedFrameCredit = Number(order.package_price_snapshot) === 0;
  const [profileResult, receiptResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", order.client_id)
      .maybeSingle(),
    usedFrameCredit
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("order_assets")
          .select(
            "bucket_id, storage_path, original_filename, mime_type, file_size",
          )
          .eq("order_id", order.id)
          .eq("asset_type", "payment_proof")
          .maybeSingle(),
  ]);
  if (profileResult.error || !profileResult.data?.email) {
    console.error("admin_order_notification_profile_lookup_failed", {
      orderId,
      error: profileResult.error,
    });
    return { status: "failed", reason: "Client details are unavailable." };
  }
  if (receiptResult.error) {
    console.error("admin_order_notification_receipt_lookup_failed", {
      orderId,
      error: receiptResult.error,
    });
  }

  const { data: delivery, error: deliveryError } = await supabase
    .from("order_notification_deliveries")
    .insert({
      order_id: order.id,
      notification_kind: "admin_new_order",
      recipient_email: env.ADMIN_EMAIL,
      status: "sending",
      attempts: 1,
    })
    .select("id")
    .maybeSingle();
  if (deliveryError?.code === "23505") return { status: "duplicate" };
  if (deliveryError || !delivery) {
    console.error("admin_order_notification_claim_failed", {
      orderId,
      error: deliveryError,
    });
    return { status: "failed", reason: "Owner email could not be claimed." };
  }

  let attachment: ReceiptAttachment | null = null;
  let receiptStatus: AdminReceiptStatus = usedFrameCredit
    ? "not_required"
    : "unavailable";
  if (receiptResult.data) {
    attachment = await downloadReceipt(order.id, receiptResult.data);
    receiptStatus = attachment ? "attached" : "unavailable";
  }

  const actionUrl = (decision: "open" | "confirm" | "reject") => {
    const url = new URL("/auth/admin-order-action", env.NEXT_PUBLIC_APP_URL);
    url.searchParams.set("order", order.id);
    url.searchParams.set("decision", decision);
    return url.toString();
  };
  const adminOrderUrl = actionUrl("open");
  const content = renderAdminOrderNotification({
    orderNumber: order.order_number,
    playerName: order.player_name,
    clientName: profileResult.data.full_name ?? order.player_name,
    clientEmail: profileResult.data.email,
    clientWhatsapp: order.whatsapp,
    tournamentName: order.tournament_name,
    packageName: order.package_name_snapshot,
    packageAmount: Number(order.package_price_snapshot),
    receiptStatus,
    receiptFilename: attachment?.filename,
    adminOrderUrl,
    confirmPaymentUrl: usedFrameCredit ? undefined : actionUrl("confirm"),
    rejectPaymentUrl: usedFrameCredit ? undefined : actionUrl("reject"),
    logoUrl: new URL("/upscaledlogo.png", env.NEXT_PUBLIC_SITE_URL).toString(),
    usedFrameCredit,
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `dinkframe/admin-new-order/${order.id}`,
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL ?? `DINKFRAME <${env.ADMIN_EMAIL}>`,
        to: [env.ADMIN_EMAIL],
        reply_to: profileResult.data.email,
        subject: content.subject,
        html: content.html,
        text: content.text,
        attachments: attachment ? [attachment] : undefined,
        tags: [
          { name: "order", value: order.order_number },
          { name: "event", value: "admin_new_order" },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const responseBody = await response.text();
    if (!response.ok) {
      throw new Error(
        `Resend returned ${response.status}: ${responseBody.slice(0, 300)}`,
      );
    }
    const provider = resendResponseSchema.parse(JSON.parse(responseBody));
    const { error: updateError } = await supabase
      .from("order_notification_deliveries")
      .update({
        status: "sent",
        provider_message_id: provider.id,
        sent_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", delivery.id);
    if (updateError) {
      console.error("admin_order_notification_receipt_update_failed", {
        orderId,
        error: updateError,
      });
    }
    return { status: "sent" };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown owner email failure";
    await supabase
      .from("order_notification_deliveries")
      .update({ status: "failed", last_error: reason.slice(0, 1000) })
      .eq("id", delivery.id);
    console.error("admin_order_notification_send_failed", { orderId, error });
    return { status: "failed", reason: "The owner email could not be sent." };
  }
}

async function downloadReceipt(
  orderId: string,
  receipt: {
    bucket_id: string;
    storage_path: string;
    original_filename: string;
    file_size: number;
  },
): Promise<ReceiptAttachment | null> {
  if (receipt.file_size <= 0 || receipt.file_size > MAX_ATTACHMENT_BYTES) {
    console.error("admin_order_notification_receipt_size_rejected", {
      orderId,
      fileSize: receipt.file_size,
    });
    return null;
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(receipt.bucket_id)
    .download(receipt.storage_path);
  if (error || !data) {
    console.error("admin_order_notification_receipt_download_failed", {
      orderId,
      error,
    });
    return null;
  }

  const bytes = Buffer.from(await data.arrayBuffer());
  if (bytes.byteLength <= 0 || bytes.byteLength > MAX_ATTACHMENT_BYTES) {
    console.error("admin_order_notification_receipt_download_size_rejected", {
      orderId,
      fileSize: bytes.byteLength,
    });
    return null;
  }

  return {
    content: bytes.toString("base64"),
    filename: safeAttachmentFilename(receipt.original_filename),
  };
}

function safeAttachmentFilename(value: string) {
  const filename = value.split(/[\\/]/).at(-1)?.trim().slice(0, 180);
  return filename || "payment-receipt";
}
