import "server-only";

import { z } from "zod";

import { getServerEnv } from "@/lib/config/env";
import {
  renderOrderNotification,
  type OrderNotificationKind,
} from "@/lib/email/order-notification-content";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type OrderNotificationResult =
  | { status: "sent" | "duplicate" }
  | { status: "skipped" | "failed"; reason: string };

const resendResponseSchema = z.object({ id: z.string().min(1) });

export async function sendOrderNotification(
  orderId: string,
  kind: OrderNotificationKind,
): Promise<OrderNotificationResult> {
  const env = getServerEnv();
  if (!env.RESEND_API_KEY) {
    console.error("order_notification_not_configured", { orderId, kind });
    return { status: "skipped", reason: "Resend is not configured." };
  }

  const supabase = createServiceRoleClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, client_id, player_name, tournament_name, package_price_snapshot",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) {
    console.error("order_notification_order_lookup_failed", {
      orderId,
      kind,
      error: orderError,
    });
    return { status: "failed", reason: "Order details are unavailable." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", order.client_id)
    .maybeSingle();
  if (profileError || !profile?.email) {
    console.error("order_notification_profile_lookup_failed", {
      orderId,
      kind,
      error: profileError,
    });
    return { status: "failed", reason: "Client email is unavailable." };
  }

  const { data: delivery, error: deliveryError } = await supabase
    .from("order_notification_deliveries")
    .insert({
      order_id: orderId,
      notification_kind: kind,
      recipient_email: profile.email,
      status: "sending",
      attempts: 1,
    })
    .select("id")
    .maybeSingle();
  if (deliveryError?.code === "23505") return { status: "duplicate" };
  if (deliveryError || !delivery) {
    console.error("order_notification_claim_failed", {
      orderId,
      kind,
      error: deliveryError,
    });
    return { status: "failed", reason: "Email delivery could not be claimed." };
  }

  const loginUrl = new URL("/login", env.NEXT_PUBLIC_APP_URL);
  loginUrl.searchParams.set("next", `/orders/${order.id}`);
  const content = renderOrderNotification({
    kind,
    clientName: profile.full_name ?? order.player_name,
    orderNumber: order.order_number,
    playerName: order.player_name,
    tournamentName: order.tournament_name,
    orderUrl: loginUrl.toString(),
    logoUrl: new URL("/upscaledlogo.png", env.NEXT_PUBLIC_SITE_URL).toString(),
    usedFrameCredit: Number(order.package_price_snapshot) === 0,
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `dinkframe/${kind}/${order.id}`,
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL ?? `DINKFRAME <${env.ADMIN_EMAIL}>`,
        to: [profile.email],
        reply_to: env.ADMIN_EMAIL,
        subject: content.subject,
        html: content.html,
        text: content.text,
        tags: [
          { name: "order", value: order.order_number },
          { name: "event", value: kind },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
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
      console.error("order_notification_receipt_update_failed", {
        orderId,
        kind,
        error: updateError,
      });
    }
    return { status: "sent" };
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unknown email failure";
    await supabase
      .from("order_notification_deliveries")
      .update({ status: "failed", last_error: reason.slice(0, 1000) })
      .eq("id", delivery.id);
    console.error("order_notification_send_failed", { orderId, kind, error });
    return { status: "failed", reason: "The client email could not be sent." };
  }
}

export function notificationWarning(result: OrderNotificationResult) {
  return result.status === "failed" || result.status === "skipped"
    ? " The order was updated, but the client email needs attention."
    : "";
}
