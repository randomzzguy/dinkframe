import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
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
} from "../lib/automation/generation";
import type { Database } from "../lib/types/database";

const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  })
  .parse(process.env);

const supabase = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const stateDirectory = path.join(process.cwd(), ".dinkframe");
const statePath = path.join(stateDirectory, "synthetic-smoke.json");
const marker = "[synthetic automation smoke test]";

type SmokeState = {
  userId: string;
  orderId: string;
  orderNumber: string;
  jobId: string;
  imageJobId?: string;
  storagePaths: string[];
};

void main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error("Synthetic smoke command failed:", describeError(error));
    process.exit(1);
  });

async function main() {
  const command = process.argv[2];
  if (command === "create") await createSmokeOrder();
  else if (command === "status") await showSmokeStatus();
  else if (command === "queue-image") await queueSmokeImageJob();
  else if (command === "retry") await retrySmokeJob();
  else if (command === "cleanup") await cleanupSmokeOrder();
  else {
    throw new Error("Use create, status, queue-image, retry, or cleanup.");
  }
}

async function createSmokeOrder() {
  if (await fileExists(statePath)) {
    throw new Error(
      "A synthetic smoke order already exists. Run automation:smoke:status or cleanup first.",
    );
  }

  const email = `dinkframe-smoke-${Date.now()}@example.com`;
  const storagePaths: string[] = [];
  let userId: string | null = null;
  let orderId: string | null = null;

  try {
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        password: `${randomUUID()}Aa1!`,
        user_metadata: { full_name: "DINKFRAME Smoke Test" },
      });
    if (authError || !authData.user)
      throw authError ?? new Error("User creation failed.");
    userId = authData.user.id;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: "DINKFRAME Smoke Test",
        whatsapp: "+60000000000",
        instagram_handle: "dinkframe_smoke_test",
      })
      .eq("id", userId);
    if (profileError) throw profileError;

    const { data: selectedPackage, error: packageError } = await supabase
      .from("packages")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .limit(1)
      .single();
    if (packageError) throw packageError;

    orderId = randomUUID();
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        id: orderId,
        client_id: userId,
        player_name: "Jordan Testframe",
        instagram_handle: "jordan_testframe",
        whatsapp: "+60000000000",
        tournament_name: "Synthetic DINK Open 2026",
        tournament_start_date: "2026-09-15",
        tournament_end_date: "2026-09-16",
        tournament_location: "Kuala Lumpur Test Court",
        package_id: selectedPackage.id,
        package_name_snapshot: selectedPackage.name,
        package_price_snapshot: selectedPackage.price_myr,
        poster_count_snapshot: selectedPackage.poster_count,
        free_amendments_total: selectedPackage.free_amendments,
        color_preference: "custom",
        custom_color: "#CCFF00",
        theme_preference: "bold_energy",
        custom_notes:
          "Automation smoke test only. Make the composition unmistakably synthetic and do not include sponsor marks.",
        reference_url: null,
        preferred_completion_date: "2026-09-10",
        payment_status: "confirmed",
        status: "payment_confirmed",
        priority: "normal",
        admin_note: marker,
        submitted_at: new Date().toISOString(),
      })
      .select("id, order_number")
      .single();
    if (orderError) throw orderError;

    const { error: eventError } = await supabase
      .from("order_event_details")
      .insert([
        {
          order_id: order.id,
          event_name: "Mixed Doubles 4.0",
          partner_name: "Taylor Sample",
          sort_order: 0,
        },
        {
          order_id: order.id,
          event_name: "Men's Doubles 4.0",
          partner_name: "Casey Demo",
          sort_order: 1,
        },
      ]);
    if (eventError) throw eventError;

    const fixtureDefinitions = [
      {
        source: "public/1.png",
        storagePath: `orders/${order.id}/players/smoke-player-1.png`,
        filename: "smoke-player-1.png",
        assetType: "player_photo" as const,
      },
      {
        source: "public/2.png",
        storagePath: `orders/${order.id}/players/smoke-player-2.png`,
        filename: "smoke-player-2.png",
        assetType: "player_photo" as const,
      },
      {
        source: "public/icon.png",
        storagePath: `orders/${order.id}/tournament/synthetic-dink-open-logo.png`,
        filename: "synthetic-dink-open-logo.png",
        assetType: "tournament_logo" as const,
      },
    ];

    const manifest: GenerationAssetManifestItem[] = [];
    for (const definition of fixtureDefinitions) {
      const sourcePath = path.join(process.cwd(), definition.source);
      const [contents, sourceStat] = await Promise.all([
        readFile(sourcePath),
        stat(sourcePath),
      ]);
      const { error: uploadError } = await supabase.storage
        .from("order-assets")
        .upload(definition.storagePath, contents, {
          contentType: "image/png",
          upsert: false,
        });
      if (uploadError) throw uploadError;
      storagePaths.push(definition.storagePath);

      const assetId = randomUUID();
      const { error: assetError } = await supabase.from("order_assets").insert({
        id: assetId,
        order_id: order.id,
        asset_type: definition.assetType,
        bucket_id: "order-assets",
        storage_path: definition.storagePath,
        original_filename: definition.filename,
        mime_type: "image/png",
        file_size: sourceStat.size,
        is_temporary: false,
      });
      if (assetError) throw assetError;

      manifest.push({
        id: assetId,
        assetType: definition.assetType,
        bucketId: "order-assets",
        storagePath: definition.storagePath,
        originalFilename: definition.filename,
        mimeType: "image/png",
        fileSize: sourceStat.size,
      });
    }

    const snapshot: GenerationBriefSnapshot = {
      orderNumber: order.order_number,
      playerName: "Jordan Testframe",
      instagramHandle: "jordan_testframe",
      players: [{ id: "synthetic-player", fullName: "Jordan Testframe" }],
      whatsapp: "+60000000000",
      tournamentName: "Synthetic DINK Open 2026",
      tournamentStartDate: "2026-09-15",
      tournamentEndDate: "2026-09-16",
      tournamentLocation: "Kuala Lumpur Test Court",
      frameType: "upcoming_event",
      announcementMessage: null,
      announcementTone: null,
      packageName: selectedPackage.name,
      posterCount: selectedPackage.poster_count,
      colorPreference: "custom",
      customColor: "#CCFF00",
      themePreference: "bold_energy",
      customNotes:
        "Automation smoke test only. Make the composition unmistakably synthetic and do not include sponsor marks.",
      referenceUrl: null,
      preferredCompletionDate: "2026-09-10",
      events: [
        {
          eventName: "Mixed Doubles 4.0",
          partnerName: "Taylor Sample",
          placement: null,
        },
        {
          eventName: "Men's Doubles 4.0",
          partnerName: "Casey Demo",
          placement: null,
        },
      ],
      sponsors: [],
    };
    const { data: settings, error: settingsError } = await supabase
      .from("automation_settings")
      .select("chatgpt_submission_mode")
      .eq("id", true)
      .single();
    if (settingsError) throw settingsError;

    const promptAssets = selectManifestForStage("prompt_generation", manifest);
    const { data: job, error: jobError } = await supabase
      .from("generation_jobs")
      .insert({
        order_id: order.id,
        stage: "prompt_generation",
        submission_mode: settings.chatgpt_submission_mode,
        input_text: buildPromptStudioMessage(snapshot),
        prompt_template_version: PROMPT_STUDIO_TEMPLATE_VERSION,
        brief_snapshot: toJson(snapshot),
        asset_manifest: toJson(promptAssets),
      })
      .select("id")
      .single();
    if (jobError) throw jobError;

    const state: SmokeState = {
      userId,
      orderId: order.id,
      orderNumber: order.order_number,
      jobId: job.id,
      storagePaths,
    };
    await mkdir(stateDirectory, { recursive: true });
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    console.log(`Created synthetic order ${order.order_number}.`);
    console.log(`Queued review-mode Prompt Studio job ${job.id}.`);
  } catch (error) {
    await cleanupPartial({ userId, orderId, storagePaths });
    throw error;
  }
}

async function showSmokeStatus() {
  const state = await readState();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("order_number, status, payment_status, admin_note")
    .eq("id", state.orderId)
    .maybeSingle();
  if (orderError) throw orderError;
  const { data: jobs, error: jobsError } = await supabase
    .from("generation_jobs")
    .select("id, stage, status, submission_mode, last_error")
    .eq("order_id", state.orderId)
    .order("created_at");
  if (jobsError) throw jobsError;
  console.log({ order, jobs });
}

async function cleanupSmokeOrder() {
  const state = await readState();
  const { data: order, error } = await supabase
    .from("orders")
    .select("admin_note")
    .eq("id", state.orderId)
    .maybeSingle();
  if (error) throw error;
  if (order && order.admin_note !== marker) {
    throw new Error(
      "Cleanup refused: the order is not marked as synthetic smoke data.",
    );
  }

  await cleanupPartial(state);
  const automationRoot = path.resolve(
    process.cwd(),
    ".dinkframe",
    "automation",
  );
  const localOrderDirectory = path.resolve(automationRoot, state.orderNumber);
  if (!localOrderDirectory.startsWith(`${automationRoot}${path.sep}`)) {
    throw new Error("Cleanup refused: invalid synthetic automation path.");
  }
  await rm(localOrderDirectory, { recursive: true, force: true });
  await rm(statePath, { force: true });
  console.log(
    `Removed synthetic order ${state.orderNumber}, its private assets, and its local draft.`,
  );
}

async function queueSmokeImageJob() {
  const state = await readState();
  const promptPath = process.argv[3];
  if (!promptPath) {
    throw new Error(
      "Pass the path to the manually copied Prompt Studio response.",
    );
  }
  const generatedPrompt = (
    await readFile(path.resolve(promptPath), "utf8")
  ).trim();
  if (generatedPrompt.length < 100) {
    throw new Error(
      "The copied image-generation prompt is unexpectedly short.",
    );
  }

  const [orderResult, promptJobResult, assetsResult, existingResult] =
    await Promise.all([
      supabase
        .from("orders")
        .select("admin_note")
        .eq("id", state.orderId)
        .maybeSingle(),
      supabase
        .from("generation_jobs")
        .select("brief_snapshot, submission_mode, status")
        .eq("id", state.jobId)
        .eq("order_id", state.orderId)
        .eq("stage", "prompt_generation")
        .maybeSingle(),
      supabase
        .from("order_assets")
        .select(
          "id, asset_type, bucket_id, storage_path, original_filename, mime_type, file_size",
        )
        .eq("order_id", state.orderId),
      supabase
        .from("generation_jobs")
        .select("id")
        .eq("order_id", state.orderId)
        .eq("stage", "image_generation")
        .limit(1),
    ]);
  const lookupError =
    orderResult.error ??
    promptJobResult.error ??
    assetsResult.error ??
    existingResult.error;
  if (lookupError) throw lookupError;
  if (orderResult.data?.admin_note !== marker) {
    throw new Error("Image queueing refused: this is not the synthetic order.");
  }
  if (promptJobResult.data?.status !== "submitted") {
    throw new Error("Mark the Prompt Studio smoke job submitted first.");
  }
  if (existingResult.data?.length) {
    throw new Error("The synthetic order already has an image-generation job.");
  }

  const manifest: GenerationAssetManifestItem[] = (assetsResult.data ?? []).map(
    (asset) => ({
      id: asset.id,
      assetType: asset.asset_type,
      bucketId: asset.bucket_id,
      storagePath: asset.storage_path,
      originalFilename: asset.original_filename,
      mimeType: asset.mime_type,
      fileSize: asset.file_size,
    }),
  );
  const manifestError = validateManifestForStage("image_generation", manifest);
  if (manifestError) throw new Error(manifestError);

  const { data: job, error } = await supabase
    .from("generation_jobs")
    .insert({
      order_id: state.orderId,
      stage: "image_generation",
      submission_mode: promptJobResult.data.submission_mode,
      input_text: generatedPrompt,
      prompt_template_version: IMAGE_GENERATION_TEMPLATE_VERSION,
      brief_snapshot: promptJobResult.data.brief_snapshot,
      asset_manifest: toJson(
        selectManifestForStage("image_generation", manifest),
      ),
    })
    .select("id")
    .single();
  if (error) throw error;

  state.imageJobId = job.id;
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  console.log(`Queued review-mode synthetic image job ${job.id}.`);
}

async function retrySmokeJob() {
  const state = await readState();
  const retryJobId = state.imageJobId ?? state.jobId;
  const { data, error } = await supabase
    .from("generation_jobs")
    .update({
      status: "queued",
      runner_id: null,
      claimed_at: null,
      lease_expires_at: null,
      completed_at: null,
      last_error: null,
    })
    .eq("id", retryJobId)
    .eq("order_id", state.orderId)
    .eq("status", "failed")
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("The synthetic job is not failed and retryable.");
  console.log(`Requeued synthetic job ${retryJobId}.`);
}

async function cleanupPartial({
  userId,
  orderId,
  storagePaths,
}: {
  userId: string | null;
  orderId: string | null;
  storagePaths: string[];
}) {
  if (storagePaths.length) {
    const { error } = await supabase.storage
      .from("order-assets")
      .remove(storagePaths);
    if (error)
      console.error("Synthetic Storage cleanup failed:", error.message);
  }
  if (orderId) {
    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    if (error) console.error("Synthetic order cleanup failed:", error.message);
  }
  if (userId) {
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) console.error("Synthetic user cleanup failed:", error.message);
  }
}

async function readState() {
  return JSON.parse(await readFile(statePath, "utf8")) as SmokeState;
}

async function fileExists(filename: string) {
  try {
    await stat(filename);
    return true;
  } catch {
    return false;
  }
}

function describeError(error: unknown) {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}
