import { z } from "zod";

import {
  isGenerationAssetManifest,
  type ClaimedGenerationAsset,
  type GenerationAssetManifestItem,
} from "@/lib/automation/generation";
import {
  CHATGPT_NEW_CHAT_URL,
  PROMPT_STUDIO_CHAT_URL,
} from "@/lib/automation/chatgpt";
import { isAutomationRunnerAuthorized } from "@/lib/automation/runner-auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export const runtime = "nodejs";

const claimSchema = z.object({
  runnerId: z.string().trim().min(3).max(120),
});

export async function POST(request: Request) {
  if (!isAutomationRunnerAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = claimSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return Response.json({ error: "Invalid runner request" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: job, error } = await supabase.rpc("claim_generation_job", {
    target_runner_id: parsed.data.runnerId,
    lease_seconds: 900,
  });
  if (error) {
    console.error("generation_job_claim_failed", error);
    return Response.json({ error: "Unable to claim a job" }, { status: 500 });
  }
  if (!job?.id) return new Response(null, { status: 204 });

  if (!isGenerationAssetManifest(job.asset_manifest)) {
    await markFailed(
      job.id,
      parsed.data.runnerId,
      "The queued asset manifest is invalid.",
    );
    return Response.json({ error: "Invalid asset manifest" }, { status: 500 });
  }

  const manifest =
    job.asset_manifest as unknown as GenerationAssetManifestItem[];
  const assets: ClaimedGenerationAsset[] = [];
  for (const asset of manifest) {
    const { data, error: signedUrlError } = await supabase.storage
      .from(asset.bucketId)
      .createSignedUrl(asset.storagePath, 600, {
        download: asset.originalFilename,
      });
    if (signedUrlError || !data?.signedUrl) {
      await markFailed(
        job.id,
        parsed.data.runnerId,
        `Could not prepare ${asset.originalFilename} for download.`,
      );
      return Response.json(
        { error: "Unable to sign a required asset" },
        { status: 500 },
      );
    }
    assets.push({ ...asset, downloadUrl: data.signedUrl });
  }

  return Response.json(
    {
      job: {
        id: job.id,
        orderId: job.order_id,
        stage: job.stage,
        submissionMode: job.submission_mode,
        inputText: job.input_text,
        revisionFeedback: job.revision_feedback,
        orderNumber:
          typeof job.brief_snapshot === "object" &&
          job.brief_snapshot !== null &&
          !Array.isArray(job.brief_snapshot) &&
          typeof job.brief_snapshot.orderNumber === "string"
            ? job.brief_snapshot.orderNumber
            : null,
        targetUrl:
          job.stage === "prompt_generation"
            ? PROMPT_STUDIO_CHAT_URL
            : CHATGPT_NEW_CHAT_URL,
        assets,
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function markFailed(jobId: string, runnerId: string, message: string) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("update_generation_job_from_runner", {
    target_job_id: jobId,
    target_runner_id: runnerId,
    next_status: "failed",
    job_error: message,
  });
  if (error)
    console.error("generation_job_manifest_failure_update_failed", error);
}

async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
