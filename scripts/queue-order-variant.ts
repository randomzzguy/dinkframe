import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  PROMPT_STUDIO_TEMPLATE_VERSION,
  buildPromptStudioMessage,
  selectManifestForStage,
  toJson,
  validateManifestForStage,
  type GenerationAssetManifestItem,
  type GenerationBriefSnapshot,
} from "../lib/automation/generation";
import type { FrameType } from "../lib/orders/frame-types";
import type { Database } from "../lib/types/database";

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .parse(process.env);

const [orderNumber, colorPreference, themePreference, customColor] =
  process.argv.slice(2);

if (!orderNumber || !colorPreference || !themePreference) {
  throw new Error(
    "Usage: queue-order-variant <order-number> <color> <theme> [custom-hex]",
  );
}
if (
  colorPreference === "custom" &&
  !/^#[0-9a-fA-F]{6}$/.test(customColor ?? "")
) {
  throw new Error("A custom color requires a valid six-digit hex value.");
}

const supabase = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const activeStatuses = [
  "queued",
  "claimed",
  "preparing",
  "awaiting_review",
] as const;

void main().catch((error: unknown) => {
  console.error(
    "Variant queue failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});

async function main() {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .single();
  if (orderError) throw orderError;

  const [
    playerResult,
    eventResult,
    sponsorResult,
    assetResult,
    settingsResult,
  ] = await Promise.all([
    supabase
      .from("order_players")
      .select("id, full_name, sort_order")
      .eq("order_id", order.id)
      .order("sort_order"),
    supabase
      .from("order_event_details")
      .select("event_name, partner_name, placement")
      .eq("order_id", order.id)
      .order("sort_order"),
    supabase
      .from("sponsors")
      .select("company_name")
      .eq("order_id", order.id)
      .order("created_at"),
    supabase
      .from("order_assets")
      .select(
        "id, asset_type, bucket_id, storage_path, original_filename, mime_type, file_size, player_id",
      )
      .eq("order_id", order.id),
    supabase
      .from("automation_settings")
      .select("chatgpt_submission_mode")
      .eq("id", true)
      .single(),
  ]);

  const lookupError =
    playerResult.error ??
    eventResult.error ??
    sponsorResult.error ??
    assetResult.error ??
    settingsResult.error;
  if (lookupError) throw lookupError;
  if (!settingsResult.data) throw new Error("Automation settings are missing.");

  const playerNames = new Map(
    (playerResult.data ?? []).map((player) => [player.id, player.full_name]),
  );
  const allAssets: GenerationAssetManifestItem[] = (assetResult.data ?? [])
    .filter((asset) => asset.asset_type !== "final_poster")
    .map((asset) => ({
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
    }));
  const assetError = validateManifestForStage("prompt_generation", allAssets);
  if (assetError) throw new Error(assetError);

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
    frameType: order.frame_type as FrameType,
    announcementMessage: order.announcement_message,
    announcementTone: order.announcement_tone,
    packageName: order.package_name_snapshot,
    posterCount: order.poster_count_snapshot,
    colorPreference,
    customColor: colorPreference === "custom" ? (customColor ?? null) : null,
    themePreference,
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

  const now = new Date().toISOString();
  const { error: cancelError } = await supabase
    .from("generation_jobs")
    .update({
      status: "cancelled",
      completed_at: now,
      lease_expires_at: null,
      approval_token_hash: null,
    })
    .eq("order_id", order.id)
    .in("status", [...activeStatuses]);
  if (cancelError) throw cancelError;

  const promptAssets = selectManifestForStage("prompt_generation", allAssets);
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .insert({
      order_id: order.id,
      stage: "prompt_generation",
      submission_mode: settingsResult.data.chatgpt_submission_mode,
      input_text: buildPromptStudioMessage(snapshot),
      prompt_template_version: PROMPT_STUDIO_TEMPLATE_VERSION,
      brief_snapshot: toJson(snapshot),
      asset_manifest: toJson(promptAssets),
    })
    .select("id, status")
    .single();
  if (jobError) throw jobError;

  console.log(
    JSON.stringify(
      {
        orderNumber: order.order_number,
        jobId: job.id,
        status: job.status,
        colorPreference,
        themePreference,
        reusedAssets: promptAssets.length,
      },
      null,
      2,
    ),
  );
}
