"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  buildPromptStudioMessage,
  IMAGE_GENERATION_TEMPLATE_VERSION,
  PROMPT_STUDIO_TEMPLATE_VERSION,
  selectManifestForStage,
  toJson,
  validateManifestForStage,
  type GenerationAssetManifestItem,
  type GenerationBriefSnapshot,
  type GenerationJobStage,
} from "@/lib/automation/generation";
import { requireAdmin } from "@/lib/auth/guards";
import {
  notificationWarning,
  sendOrderNotification,
} from "@/lib/email/order-notifications";
import {
  isStandardStatusTransition,
  ORDER_STATUS_LABELS,
} from "@/lib/orders/status";
import { POSTER_DELIVERY_KINDS } from "@/lib/orders/delivery";
import { ORDER_STATUSES } from "@/lib/types/domain";

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
  paymentStatus: z.enum(["confirmed", "rejected"]),
  paymentNote: z.string().trim().max(1000).optional(),
});

const orderIdSchema = z.object({ orderId: z.uuid() });
const deleteOrderSchema = z.object({
  orderId: z.uuid(),
  confirmationNumber: z.string().trim().min(1).max(40),
});
const imageGenerationSchema = z.object({
  orderId: z.uuid(),
  generatedPrompt: z.string().trim().min(100).max(50000),
});
const generationJobSchema = z.object({
  orderId: z.uuid(),
  jobId: z.uuid(),
});
const posterDeliverySchema = z
  .object({
    orderId: z.uuid(),
    kind: z.enum(POSTER_DELIVERY_KINDS),
    storagePath: z.string().trim().min(1).max(1024),
    originalFilename: z.string().trim().min(1).max(180),
    mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    fileSize: z
      .number()
      .int()
      .positive()
      .max(25 * 1024 * 1024),
    clientMessage: z.string().trim().max(1000).optional(),
  })
  .superRefine((value, context) => {
    const expectedPrefix = `orders/${value.orderId}/deliveries/${value.kind}/`;
    if (!value.storagePath.startsWith(expectedPrefix)) {
      context.addIssue({
        code: "custom",
        message: "The poster upload path is invalid.",
        path: ["storagePath"],
      });
    }
  });

const ACTIVE_GENERATION_STATUSES = [
  "queued",
  "claimed",
  "preparing",
  "awaiting_review",
] as const;

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

  const notification =
    parsed.data.paymentStatus === "confirmed"
      ? await sendOrderNotification(parsed.data.orderId, "payment_confirmed")
      : null;

  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/orders/${parsed.data.orderId}`);
  return {
    status: "success",
    message:
      parsed.data.paymentStatus === "confirmed"
        ? `Payment confirmed and production started.${notification ? notificationWarning(notification) : ""}`
        : "Payment proof rejected.",
  };
}

export async function queuePromptGeneration(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = orderIdSchema.safeParse({ orderId: formData.get("orderId") });
  if (!parsed.success) {
    return { status: "error", message: "The order reference is invalid." };
  }

  return queueGenerationJob({
    orderId: parsed.data.orderId,
    stage: "prompt_generation",
  });
}

export async function queueImageGeneration(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = imageGenerationSchema.safeParse({
    orderId: formData.get("orderId"),
    generatedPrompt: formData.get("generatedPrompt"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Paste the complete generated prompt before queuing the image.",
    };
  }

  return queueGenerationJob({
    orderId: parsed.data.orderId,
    stage: "image_generation",
    generatedPrompt: parsed.data.generatedPrompt,
  });
}

export async function cancelGenerationJob(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = generationJobSchema.safeParse({
    orderId: formData.get("orderId"),
    jobId: formData.get("jobId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The generation job is invalid." };
  }

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("generation_jobs")
    .update({
      status: "cancelled",
      completed_at: new Date().toISOString(),
      lease_expires_at: null,
      approval_token_hash: null,
    })
    .eq("id", parsed.data.jobId)
    .eq("order_id", parsed.data.orderId)
    .in("status", [...ACTIVE_GENERATION_STATUSES])
    .select("id")
    .maybeSingle();
  if (error) return adminError("generation_job_cancel_failed", error);
  if (!data) {
    return { status: "error", message: "This job can no longer be cancelled." };
  }

  revalidateOrderPaths(parsed.data.orderId);
  return { status: "success", message: "Generation job cancelled." };
}

export async function retryGenerationJob(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = generationJobSchema.safeParse({
    orderId: formData.get("orderId"),
    jobId: formData.get("jobId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The generation job is invalid." };
  }

  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("generation_jobs")
    .update({
      status: "queued",
      runner_id: null,
      claimed_at: null,
      lease_expires_at: null,
      completed_at: null,
      last_error: null,
      output_text: null,
      output_local_path: null,
      approval_token_hash: null,
      approval_requested_at: null,
    })
    .eq("id", parsed.data.jobId)
    .eq("order_id", parsed.data.orderId)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (error) return adminError("generation_job_retry_failed", error);
  if (!data) {
    return { status: "error", message: "Only failed jobs can be retried." };
  }

  revalidateOrderPaths(parsed.data.orderId);
  return { status: "success", message: "Generation job queued again." };
}

export async function markGenerationJobSubmitted(
  _previousState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = generationJobSchema.safeParse({
    orderId: formData.get("orderId"),
    jobId: formData.get("jobId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The generation job is invalid." };
  }

  const now = new Date().toISOString();
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("generation_jobs")
    .update({
      status: "submitted",
      submitted_at: now,
      completed_at: now,
      lease_expires_at: null,
    })
    .eq("id", parsed.data.jobId)
    .eq("order_id", parsed.data.orderId)
    .eq("status", "awaiting_review")
    .select("id")
    .maybeSingle();
  if (error) return adminError("generation_job_mark_sent_failed", error);
  if (!data) {
    return { status: "error", message: "This job is not waiting for review." };
  }

  revalidateOrderPaths(parsed.data.orderId);
  return { status: "success", message: "Job marked as sent." };
}

export async function publishPosterDelivery(input: {
  orderId: string;
  kind: "review" | "final";
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  clientMessage?: string;
}): Promise<AdminActionState> {
  const parsed = posterDeliverySchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "error",
      message:
        parsed.error.issues[0]?.message ?? "Check the poster delivery details.",
    };
  }

  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("publish_poster_delivery", {
    target_order_id: parsed.data.orderId,
    target_storage_path: parsed.data.storagePath,
    target_original_filename: parsed.data.originalFilename,
    target_mime_type: parsed.data.mimeType,
    target_file_size: parsed.data.fileSize,
    target_is_review: parsed.data.kind === "review",
    client_message: parsed.data.clientMessage,
  });

  if (error) {
    const { error: cleanupError } = await supabase.storage
      .from("order-assets")
      .remove([parsed.data.storagePath]);
    if (cleanupError) {
      console.error("poster_delivery_cleanup_failed", cleanupError);
    }
    return adminError("poster_delivery_publish_failed", error);
  }

  const notification = await sendOrderNotification(
    parsed.data.orderId,
    parsed.data.kind === "review" ? "review_draft_ready" : "final_poster_ready",
  );

  revalidateOrderPaths(parsed.data.orderId);
  return {
    status: "success",
    message:
      parsed.data.kind === "review"
        ? `Review poster published and the order opened for amendments.${notificationWarning(notification)}`
        : `Final poster published and the order completed.${notificationWarning(notification)}`,
  };
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

async function queueGenerationJob({
  orderId,
  stage,
  generatedPrompt,
}: {
  orderId: string;
  stage: GenerationJobStage;
  generatedPrompt?: string;
}): Promise<AdminActionState> {
  const { claims, supabase } = await requireAdmin();
  const [
    orderResult,
    playerResult,
    eventResult,
    sponsorResult,
    assetResult,
    settingsResult,
    activeJobResult,
  ] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
    supabase
      .from("order_players")
      .select("id, full_name, sort_order")
      .eq("order_id", orderId)
      .order("sort_order"),
    supabase
      .from("order_event_details")
      .select("event_name, partner_name, placement")
      .eq("order_id", orderId)
      .order("sort_order"),
    supabase
      .from("sponsors")
      .select("company_name")
      .eq("order_id", orderId)
      .order("created_at"),
    supabase
      .from("order_assets")
      .select("*")
      .eq("order_id", orderId)
      .order("created_at"),
    supabase
      .from("automation_settings")
      .select("chatgpt_submission_mode")
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("generation_jobs")
      .select("id")
      .eq("order_id", orderId)
      .in("status", [...ACTIVE_GENERATION_STATUSES])
      .limit(1),
  ]);

  const lookupError =
    orderResult.error ??
    playerResult.error ??
    eventResult.error ??
    sponsorResult.error ??
    assetResult.error ??
    settingsResult.error ??
    activeJobResult.error;
  if (lookupError)
    return adminError("generation_job_source_lookup_failed", lookupError);

  const order = orderResult.data;
  if (!order) return { status: "error", message: "Order not found." };
  if (order.payment_status !== "confirmed") {
    return {
      status: "error",
      message: "Confirm payment before sending this order into production.",
    };
  }
  if (order.status === "archived" || order.status === "cancelled") {
    return { status: "error", message: "This order is no longer active." };
  }
  if (activeJobResult.data?.length) {
    return {
      status: "error",
      message: "This order already has an active generation workflow.",
    };
  }

  const playerNames = new Map(
    (playerResult.data ?? []).map((player) => [player.id, player.full_name]),
  );
  const allAssets: GenerationAssetManifestItem[] = (assetResult.data ?? []).map(
    (asset) => ({
      id: asset.id,
      assetType: asset.asset_type,
      bucketId: asset.bucket_id,
      storagePath: asset.storage_path,
      originalFilename: asset.original_filename,
      mimeType: asset.mime_type,
      fileSize: asset.file_size,
      playerId: asset.player_id,
      playerName: asset.player_id
        ? (playerNames.get(asset.player_id) ?? null)
        : null,
    }),
  );
  const assetError = validateManifestForStage(stage, allAssets);
  if (assetError) return { status: "error", message: assetError };

  const snapshot: GenerationBriefSnapshot = {
    orderNumber: order.order_number,
    playerName: order.player_name,
    instagramHandle: order.instagram_handle,
    players: (playerResult.data ?? []).map((player) => ({
      id: player.id,
      fullName: player.full_name,
    })),
    whatsapp: order.whatsapp,
    tournamentName: order.tournament_name,
    tournamentStartDate: order.tournament_start_date,
    tournamentEndDate: order.tournament_end_date,
    tournamentLocation: order.tournament_location,
    frameType: order.frame_type,
    announcementMessage: order.announcement_message,
    announcementTone: order.announcement_tone,
    packageName: order.package_name_snapshot,
    posterCount: order.poster_count_snapshot,
    colorPreference: order.color_preference,
    customColor: order.custom_color,
    themePreference: order.theme_preference,
    customNotes: order.custom_notes,
    referenceUrl: order.reference_url,
    preferredCompletionDate: order.preferred_completion_date,
    events: (eventResult.data ?? []).map((event) => ({
      eventName: event.event_name,
      partnerName: event.partner_name,
      placement: event.placement,
    })),
    sponsors: (sponsorResult.data ?? []).map((sponsor) => sponsor.company_name),
  };
  const selectedAssets = selectManifestForStage(stage, allAssets);
  const inputText =
    stage === "prompt_generation"
      ? buildPromptStudioMessage(snapshot)
      : (generatedPrompt ?? "");

  const { error } = await supabase.from("generation_jobs").insert({
    order_id: orderId,
    stage,
    submission_mode:
      settingsResult.data?.chatgpt_submission_mode ?? "review_required",
    input_text: inputText,
    prompt_template_version:
      stage === "prompt_generation"
        ? PROMPT_STUDIO_TEMPLATE_VERSION
        : IMAGE_GENERATION_TEMPLATE_VERSION,
    brief_snapshot: toJson(snapshot),
    asset_manifest: toJson(selectedAssets),
    created_by: typeof claims.sub === "string" ? claims.sub : null,
  });
  if (error) return adminError("generation_job_insert_failed", error);

  if (order.status === "payment_confirmed") {
    const { error: statusError } = await supabase.rpc("change_order_status", {
      target_order_id: orderId,
      next_status: "design_in_progress",
      change_note: "Creative production started",
      client_message: null,
      force_transition: false,
    });
    if (statusError) {
      return adminError("generation_job_status_update_failed", statusError);
    }
  }

  revalidateOrderPaths(orderId);
  return {
    status: "success",
    message:
      stage === "prompt_generation"
        ? "Prompt Studio job queued."
        : "Image-generation job queued.",
  };
}

function adminError(event: string, error: unknown): AdminActionState {
  const errorId = randomUUID();
  console.error(event, { errorId, error });
  return {
    status: "error",
    message: `We couldn't apply that change. Reference: ${errorId}`,
  };
}
