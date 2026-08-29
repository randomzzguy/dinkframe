import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import {
  IMAGE_GENERATION_TEMPLATE_VERSION,
  PROMPT_STUDIO_TEMPLATE_VERSION,
  selectManifestForStage,
  toJson,
  validateManifestForStage,
  type GenerationAssetManifestItem,
} from "@/lib/automation/generation";
import { isAutomationRunnerAuthorized } from "@/lib/automation/runner-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { Database } from "@/lib/types/database";

export const runtime = "nodejs";

const decisionSchema = z.object({
  approvalToken: z.string().trim().min(32).max(200),
  decision: z.enum(["approve", "revise", "cancel"]),
  feedback: z.string().trim().min(2).max(3000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isAutomationRunnerAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsedId = z.uuid().safeParse(id);
  const parsed = decisionSchema.safeParse(await readJson(request));
  if (!parsedId.success || !parsed.success) {
    return Response.json(
      { error: "Invalid approval decision" },
      { status: 400 },
    );
  }
  if (parsed.data.decision === "revise" && !parsed.data.feedback) {
    return Response.json(
      { error: "Revision feedback is required" },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", parsedId.data)
    .eq("status", "awaiting_review")
    .maybeSingle();
  if (jobError || !job) {
    return Response.json(
      { error: "This approval is no longer pending" },
      { status: 409 },
    );
  }
  if (!tokenMatches(parsed.data.approvalToken, job.approval_token_hash)) {
    return Response.json(
      { error: "Approval token is invalid" },
      { status: 403 },
    );
  }

  if (parsed.data.decision === "cancel") {
    const { error } = await supabase
      .from("generation_jobs")
      .update({
        status: "cancelled",
        completed_at: new Date().toISOString(),
        approval_token_hash: null,
      })
      .eq("id", job.id)
      .eq("status", "awaiting_review");
    if (error) return serverError(error);
    return Response.json({ message: "Generation job cancelled." });
  }

  if (parsed.data.decision === "revise") {
    if (job.stage === "image_generation") {
      const finishError = await finishReviewedJob(
        supabase,
        job.id,
        "cancelled",
      );
      if (finishError) return serverError(finishError);
    }
    const revision = await queueRevision(
      supabase,
      job,
      parsed.data.feedback ?? "",
    );
    if (revision.error) return serverError(revision.error);
    return Response.json({
      message:
        job.stage === "prompt_generation"
          ? "Prompt revision queued."
          : "Creative-direction revision queued before another image is generated.",
    });
  }

  if (job.stage === "prompt_generation") {
    if (!job.output_text) {
      return Response.json(
        { error: "The generated prompt is missing" },
        { status: 409 },
      );
    }
    const queued = await queueImageJob(supabase, job, job.output_text);
    if (queued.error) return serverError(queued.error);
  }

  const finishError = await finishReviewedJob(supabase, job.id, "submitted");
  if (finishError) return serverError(finishError);
  if (job.stage === "image_generation") {
    const { error: statusError } = await supabase.rpc(
      "mark_order_finishing_after_image_approval",
      { target_order_id: job.order_id },
    );
    if (statusError) return serverError(statusError);
  }
  return Response.json({
    message:
      job.stage === "prompt_generation"
        ? "Prompt approved. One image draft has been queued."
        : "Image approved for manual finishing.",
  });
}

async function queueImageJob(
  supabase: ReturnType<typeof createServiceRoleClient>,
  job: Database["public"]["Tables"]["generation_jobs"]["Row"],
  approvedPrompt: string,
) {
  const { data: assets, error: assetError } = await supabase
    .from("order_assets")
    .select(
      "id, asset_type, bucket_id, storage_path, original_filename, mime_type, file_size",
    )
    .eq("order_id", job.order_id);
  if (assetError) return { error: assetError };
  const manifest = (assets ?? []).map(toManifestItem);
  const manifestError = validateManifestForStage("image_generation", manifest);
  if (manifestError) return { error: new Error(manifestError) };
  return supabase.from("generation_jobs").insert({
    order_id: job.order_id,
    stage: "image_generation",
    submission_mode: job.submission_mode,
    input_text: approvedPrompt,
    prompt_template_version: IMAGE_GENERATION_TEMPLATE_VERSION,
    brief_snapshot: job.brief_snapshot,
    asset_manifest: toJson(
      selectManifestForStage("image_generation", manifest),
    ),
    created_by: job.created_by,
  });
}

async function queueRevision(
  supabase: ReturnType<typeof createServiceRoleClient>,
  job: Database["public"]["Tables"]["generation_jobs"]["Row"],
  feedback: string,
) {
  if (job.stage === "prompt_generation") {
    return supabase
      .from("generation_jobs")
      .update({
        status: "queued",
        input_text: job.output_text ?? job.input_text,
        runner_id: null,
        claimed_at: null,
        lease_expires_at: null,
        output_text: null,
        output_local_path: null,
        approval_token_hash: null,
        approval_requested_at: null,
        revision_feedback: feedback,
        completed_at: null,
        last_error: null,
      })
      .eq("id", job.id)
      .eq("status", "awaiting_review");
  }

  return supabase.from("generation_jobs").insert({
    order_id: job.order_id,
    stage: "prompt_generation",
    submission_mode: job.submission_mode,
    input_text: job.input_text,
    prompt_template_version: PROMPT_STUDIO_TEMPLATE_VERSION,
    brief_snapshot: job.brief_snapshot,
    asset_manifest: job.asset_manifest,
    revision_feedback: feedback,
    created_by: job.created_by,
  });
}

async function finishReviewedJob(
  supabase: ReturnType<typeof createServiceRoleClient>,
  jobId: string,
  status: "submitted" | "cancelled",
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("generation_jobs")
    .update({
      status,
      approved_at: status === "submitted" ? now : null,
      submitted_at: status === "submitted" ? now : null,
      completed_at: now,
      approval_token_hash: null,
    })
    .eq("id", jobId)
    .eq("status", "awaiting_review");
  return error;
}

function tokenMatches(rawToken: string, storedHash: string | null) {
  if (!storedHash || !/^[0-9a-f]{64}$/.test(storedHash)) return false;
  const received = Buffer.from(
    createHash("sha256").update(rawToken).digest("hex"),
  );
  const expected = Buffer.from(storedHash);
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}

function toManifestItem(asset: {
  id: string;
  asset_type: GenerationAssetManifestItem["assetType"];
  bucket_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
}): GenerationAssetManifestItem {
  return {
    id: asset.id,
    assetType: asset.asset_type,
    bucketId: asset.bucket_id,
    storagePath: asset.storage_path,
    originalFilename: asset.original_filename,
    mimeType: asset.mime_type,
    fileSize: asset.file_size,
  };
}

function serverError(error: unknown) {
  console.error("hermes_generation_decision_failed", error);
  return Response.json(
    { error: "Unable to apply that decision" },
    { status: 409 },
  );
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
