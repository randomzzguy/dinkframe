"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/guards";
import {
  isStandardStatusTransition,
  ORDER_STATUS_LABELS,
} from "@/lib/orders/status";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/types/domain";

export type AdminActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

const orderStatusSchema = z.object({
  orderId: z.uuid(),
  currentStatus: z.enum(ORDER_STATUSES),
  nextStatus: z.enum(ORDER_STATUSES),
  note: z.string().trim().max(1000).optional(),
  clientMessage: z.string().trim().max(1000).optional(),
  confirmUnusual: z.boolean(),
});

const paymentSchema = z.object({
  orderId: z.uuid(),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  paymentNote: z.string().trim().max(1000).optional(),
});

const orderIdSchema = z.object({ orderId: z.uuid() });
const deleteOrderSchema = z.object({
  orderId: z.uuid(),
  confirmationNumber: z.string().trim().min(1).max(40),
});

export async function changeOrderStatus(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = orderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    currentStatus: formData.get("currentStatus"),
    nextStatus: formData.get("nextStatus"),
    note: formData.get("note") || undefined,
    clientMessage: formData.get("clientMessage") || undefined,
    confirmUnusual: formData.get("confirmUnusual") === "on",
  });

  if (!parsed.success) {
    return { status: "error", message: "Check the status update details." };
  }

  const isUnusual = !isStandardStatusTransition(
    parsed.data.currentStatus,
    parsed.data.nextStatus,
  );
  if (isUnusual && !parsed.data.confirmUnusual) {
    return {
      status: "error",
      message: "Confirm the unusual transition before applying it.",
    };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("change_order_status", {
    target_order_id: parsed.data.orderId,
    next_status: parsed.data.nextStatus,
    change_note: parsed.data.note,
    client_message: parsed.data.clientMessage,
    force_transition: isUnusual && parsed.data.confirmUnusual,
  });

  if (error) return adminError("change_order_status_failed", error);

  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  return {
    status: "success",
    message: `Order moved to ${ORDER_STATUS_LABELS[parsed.data.nextStatus]}.`,
  };
}

export async function changePaymentStatus(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = paymentSchema.safeParse({
    orderId: formData.get("orderId"),
    paymentStatus: formData.get("paymentStatus"),
    paymentNote: formData.get("paymentNote") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Check the payment update details." };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("change_payment_status", {
    target_order_id: parsed.data.orderId,
    next_payment_status: parsed.data.paymentStatus,
    payment_note: parsed.data.paymentNote,
  });

  if (error) return adminError("change_payment_status_failed", error);

  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  return { status: "success", message: "Payment status updated." };
}

export async function verifyLocalArchive(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = orderIdSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) {
    return { status: "error", message: "The order reference is invalid." };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("verify_order_archive", {
    target_order_id: parsed.data.orderId,
  });
  if (error) return adminError("archive_verification_failed", error);

  revalidateOrderPaths(parsed.data.orderId);
  return {
    status: "success",
    message: "Local ZIP verified. This order can now be archived.",
  };
}

export async function archiveOrder(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = orderIdSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) {
    return { status: "error", message: "The order reference is invalid." };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("archive_order", {
    target_order_id: parsed.data.orderId,
  });
  if (error) return adminError("order_archive_failed", error);

  revalidateOrderPaths(parsed.data.orderId);
  return { status: "success", message: "Order archived." };
}

export async function deleteArchivedOrder(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = deleteOrderSchema.safeParse({
    orderId: formData.get("orderId"),
    confirmationNumber: formData.get("confirmationNumber"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter the full order number." };
  }

  const { supabase } = await requireAdmin();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("order_number, status, exported_at, archive_verified_at")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (orderError || !order)
    return adminError("delete_order_lookup_failed", orderError);
  if (order.order_number !== parsed.data.confirmationNumber) {
    return { status: "error", message: "The order number does not match." };
  }
  if (
    order.status !== "archived" ||
    !order.exported_at ||
    !order.archive_verified_at
  ) {
    return {
      status: "error",
      message: "Only a verified archived order can be deleted.",
    };
  }

  const { data: assets, error: assetsError } = await supabase
    .from("order_assets")
    .select("bucket_id, storage_path")
    .eq("order_id", parsed.data.orderId);
  if (assetsError)
    return adminError("delete_order_assets_lookup_failed", assetsError);

  const pathsByBucket = new Map<string, string[]>();
  for (const asset of assets ?? []) {
    const paths = pathsByBucket.get(asset.bucket_id) ?? [];
    paths.push(asset.storage_path);
    pathsByBucket.set(asset.bucket_id, paths);
  }

  for (const [bucket, paths] of pathsByBucket) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) return adminError("delete_order_storage_failed", error);
  }

  const { error } = await supabase.rpc("delete_archived_order", {
    target_order_id: parsed.data.orderId,
    confirmation_number: parsed.data.confirmationNumber,
  });
  if (error) return adminError("delete_order_record_failed", error);

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  redirect(`/admin/orders?deleted=${encodeURIComponent(order.order_number)}`);
}

function revalidateOrderPaths(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${orderId}`);
}

function adminError(event: string, error: unknown): AdminActionState {
  const errorId = randomUUID();
  console.error(event, { errorId, error });
  return {
    status: "error",
    message: `We couldn't apply that change. Reference: ${errorId}`,
  };
}
