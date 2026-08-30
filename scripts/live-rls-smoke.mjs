import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
}

const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};
const admin = createClient(url, serviceRoleKey, clientOptions);
const runId = randomUUID();
const password = `${randomUUID()}Aa1!`;
const createdUserIds = [];
let draftId;
let uploadedPath;
let workflowOrderId;
const workflowPaths = [];
let creditEntitlementId;
let creditOrderId;
let exhaustedCreditDraftId;
const creditPaths = [];

try {
  const firstUser = await createTestUser(
    `dinkframe-rls-a-${runId}@example.com`,
  );
  const secondUser = await createTestUser(
    `dinkframe-rls-b-${runId}@example.com`,
  );
  const firstClient = await signedInClient(firstUser.email);
  const secondClient = await signedInClient(secondUser.email);

  const { data: draft, error: draftError } = await firstClient
    .from("order_drafts")
    .insert({ client_id: firstUser.id })
    .select("id")
    .single();
  assertNoError(draftError, "client A could not create its draft");
  draftId = draft.id;

  const { data: ownDraft, error: ownReadError } = await firstClient
    .from("order_drafts")
    .select("id")
    .eq("id", draftId)
    .maybeSingle();
  assertNoError(ownReadError, "client A could not read its draft");
  assert(
    ownDraft?.id === draftId,
    "client A draft read returned the wrong row",
  );

  const { data: foreignDrafts, error: foreignReadError } = await secondClient
    .from("order_drafts")
    .select("id")
    .eq("id", draftId);
  assertNoError(foreignReadError, "client B draft query failed unexpectedly");
  assert(foreignDrafts.length === 0, "client B could read client A's draft");

  uploadedPath = `orders/${draftId}/player_photo/rls-smoke.png`;
  const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const { error: uploadError } = await firstClient.storage
    .from("order-assets")
    .upload(uploadedPath, pngSignature, { contentType: "image/png" });
  assertNoError(uploadError, "client A could not upload to its draft path");

  const { error: foreignDownloadError } = await secondClient.storage
    .from("order-assets")
    .download(uploadedPath);
  assert(
    Boolean(foreignDownloadError),
    "client B could download client A's file",
  );

  const { error: foreignUploadError } = await secondClient.storage
    .from("order-assets")
    .upload(`orders/${draftId}/player_photo/foreign.png`, pngSignature, {
      contentType: "image/png",
    });
  assert(
    Boolean(foreignUploadError),
    "client B could write to client A's draft",
  );

  const { data: clientAutomationSettings, error: clientSettingsError } =
    await secondClient.from("automation_settings").select("id");
  assertNoError(
    clientSettingsError,
    "client automation-settings query failed unexpectedly",
  );
  assert(
    clientAutomationSettings.length === 0,
    "a client could read admin automation settings",
  );

  const { data: clientGenerationJobs, error: clientGenerationJobsError } =
    await secondClient.from("generation_jobs").select("id");
  assertNoError(
    clientGenerationJobsError,
    "client generation-jobs query failed unexpectedly",
  );
  assert(
    clientGenerationJobs.length === 0,
    "a client could read admin generation jobs",
  );

  const {
    data: clientNotificationReceipts,
    error: clientNotificationReceiptsError,
  } = await secondClient.from("order_notification_deliveries").select("id");
  assertNoError(
    clientNotificationReceiptsError,
    "client notification-receipts query failed unexpectedly",
  );
  assert(
    clientNotificationReceipts.length === 0,
    "a client could read order notification receipts",
  );

  const { error: clientNotificationWriteError } = await secondClient
    .from("order_notification_deliveries")
    .insert({
      order_id: randomUUID(),
      notification_kind: "submission_received",
      recipient_email: secondUser.email,
    });
  assert(
    clientNotificationWriteError,
    "a client could insert an order notification receipt",
  );

  const { error: clientCreditGrantError } = await secondClient
    .from("frame_entitlements")
    .insert({
      client_id: secondUser.id,
      source_order_id: randomUUID(),
      package_id: randomUUID(),
      package_name_snapshot: "Forged package",
      frames_total: 999,
      amendments_total: 999,
      activated_at: new Date().toISOString(),
    });
  assert(
    clientCreditGrantError,
    "a client could grant themselves frame credits",
  );

  const { error: clientCreditUpdateError } = await secondClient
    .from("frame_entitlements")
    .update({ frames_total: 999 })
    .eq("client_id", secondUser.id);
  assert(
    clientCreditUpdateError,
    "a client could alter their frame-credit balance",
  );

  const { error: clientLedgerWriteError } = await secondClient
    .from("frame_entitlement_ledger")
    .insert({
      entitlement_id: randomUUID(),
      entry_kind: "package_granted",
      frame_delta: 999,
      amendment_delta: 999,
    });
  assert(
    clientLedgerWriteError,
    "a client could write a forged frame-credit ledger entry",
  );

  const { error: clientClaimError } = await secondClient.rpc(
    "claim_generation_job",
    {
      target_runner_id: "unauthorized-client",
      lease_seconds: 900,
    },
  );
  assert(
    clientClaimError,
    "an authenticated client could execute the runner-only claim function",
  );

  const { error: promoteError } = await admin
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", firstUser.id);
  assertNoError(promoteError, "temporary admin promotion failed");

  const { data: isAdmin, error: adminRpcError } =
    await firstClient.rpc("is_admin");
  assertNoError(adminRpcError, "admin role RPC check failed");
  assert(isAdmin === true, "promoted profile was not recognized as admin");

  const { data: visibleProfiles, error: adminReadError } = await firstClient
    .from("profiles")
    .select("id")
    .in("id", [firstUser.id, secondUser.id]);
  assertNoError(adminReadError, "admin could not read client profiles");
  assert(
    visibleProfiles.length === 2,
    "admin could not read all scoped profiles",
  );

  const { data: automationSettings, error: automationSettingsError } =
    await firstClient
      .from("automation_settings")
      .select("chatgpt_submission_mode")
      .eq("id", true)
      .single();
  assertNoError(
    automationSettingsError,
    "admin could not read automation settings",
  );
  assert(
    automationSettings?.chatgpt_submission_mode === "review_required" ||
      automationSettings?.chatgpt_submission_mode === "auto_send",
    "admin received an invalid ChatGPT submission mode",
  );

  const { error: adminGenerationJobsError } = await firstClient
    .from("generation_jobs")
    .select("id")
    .limit(1);
  assertNoError(
    adminGenerationJobsError,
    "admin could not read generation jobs",
  );

  const { error: adminNotificationReceiptsError } = await firstClient
    .from("order_notification_deliveries")
    .select("id")
    .limit(1);
  assertNoError(
    adminNotificationReceiptsError,
    "admin could not read order notification receipts",
  );

  const { data: packageRow, error: packageError } = await admin
    .from("packages")
    .select("id, name, price_myr, poster_count, free_amendments")
    .eq("active", true)
    .gte("poster_count", 2)
    .order("sort_order")
    .limit(1)
    .single();
  assertNoError(packageError, "could not load a package for workflow smoke");

  const { data: workflowOrder, error: workflowOrderError } = await admin
    .from("orders")
    .insert({
      client_id: secondUser.id,
      player_name: "RLS Workflow Test",
      whatsapp: "+60111111111",
      tournament_name: "Synthetic Workflow Open",
      tournament_start_date: "2026-09-15",
      tournament_end_date: "2026-09-16",
      tournament_location: "Kuala Lumpur",
      package_id: packageRow.id,
      package_name_snapshot: packageRow.name,
      package_price_snapshot: packageRow.price_myr,
      poster_count_snapshot: packageRow.poster_count,
      free_amendments_total: packageRow.free_amendments,
      color_preference: "blue",
      theme_preference: "japanese-inspired",
      payment_status: "proof_uploaded",
      status: "request_received",
    })
    .select("id")
    .single();
  assertNoError(workflowOrderError, "could not create workflow smoke order");
  workflowOrderId = workflowOrder.id;

  const { data: creditEntitlement, error: creditEntitlementError } = await admin
    .from("frame_entitlements")
    .insert({
      client_id: secondUser.id,
      source_order_id: workflowOrderId,
      package_id: packageRow.id,
      package_name_snapshot: packageRow.name,
      frames_total: 2,
      frames_used: 1,
      amendments_total: packageRow.free_amendments,
      amendments_used: 0,
    })
    .select("id")
    .single();
  assertNoError(
    creditEntitlementError,
    "could not create workflow frame entitlement",
  );
  creditEntitlementId = creditEntitlement.id;
  const { error: linkEntitlementError } = await admin
    .from("orders")
    .update({ frame_entitlement_id: creditEntitlementId })
    .eq("id", workflowOrderId);
  assertNoError(linkEntitlementError, "could not link workflow entitlement");

  const { data: paidOrder, error: paymentError } = await firstClient.rpc(
    "change_payment_status",
    {
      target_order_id: workflowOrderId,
      next_payment_status: "confirmed",
      payment_note: "RLS workflow smoke",
    },
  );
  assertNoError(paymentError, "payment confirmation workflow failed");
  assert(
    paidOrder.payment_status === "confirmed" &&
      paidOrder.status === "design_in_progress",
    "payment confirmation did not start production",
  );

  const { data: activatedEntitlement, error: activatedEntitlementError } =
    await secondClient
      .from("frame_entitlements")
      .select("activated_at, frames_used")
      .eq("id", creditEntitlementId)
      .single();
  assertNoError(
    activatedEntitlementError,
    "client could not read their activated entitlement",
  );
  assert(
    activatedEntitlement.activated_at && activatedEntitlement.frames_used === 1,
    "payment confirmation did not activate the frame entitlement",
  );

  const { data: creditDraft, error: creditDraftError } = await secondClient
    .from("order_drafts")
    .insert({ client_id: secondUser.id })
    .select("id")
    .single();
  assertNoError(creditDraftError, "could not create credit-funded draft");
  const creditAssetSpecs = [
    ["player_photo", "player-a.png"],
    ["player_photo", "player-b.png"],
    ["tournament_logo", "tournament.png"],
  ];
  const creditAssets = [];
  for (const [assetType, filename] of creditAssetSpecs) {
    const path = `orders/${creditDraft.id}/${assetType}/${filename}`;
    creditPaths.push(path);
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const { error: assetUploadError } = await secondClient.storage
      .from("order-assets")
      .upload(path, bytes, { contentType: "image/png" });
    assertNoError(
      assetUploadError,
      `credit asset upload failed for ${filename}`,
    );
    creditAssets.push({
      assetType,
      bucketId: "order-assets",
      storagePath: path,
      originalFilename: filename,
      mimeType: "image/png",
      fileSize: bytes.byteLength,
    });
  }
  const { data: creditOrder, error: creditOrderError } = await secondClient.rpc(
    "submit_order_from_draft",
    {
      target_draft_id: creditDraft.id,
      order_payload: {
        playerName: "Credit Workflow Test",
        whatsapp: "+60112223333",
        tournamentName: "Credit Open",
        tournamentStartDate: "2026-10-15",
        tournamentEndDate: "2026-10-16",
        tournamentLocation: "Kuala Lumpur",
        frameType: "upcoming_event",
        events: [{ eventName: "Mixed Doubles", sortOrder: 0 }],
        sponsors: [],
        colorPreference: "orange",
        themePreference: "futuristic",
        packageSlug: packageRow.id,
        frameEntitlementId: creditEntitlementId,
      },
      asset_payload: creditAssets,
    },
  );
  assertNoError(creditOrderError, "credit-funded order submission failed");
  creditOrderId = creditOrder.id;
  const { data: consumedEntitlement, error: consumedEntitlementError } =
    await secondClient
      .from("frame_entitlements")
      .select("frames_total, frames_used")
      .eq("id", creditEntitlementId)
      .single();
  assertNoError(
    consumedEntitlementError,
    "could not read consumed entitlement",
  );
  assert(
    consumedEntitlement.frames_total === 2 &&
      consumedEntitlement.frames_used === 2,
    "credit-funded order did not consume exactly one frame",
  );
  const { error: amendmentPeriodError } = await firstClient.rpc(
    "change_order_status",
    {
      target_order_id: creditOrderId,
      next_status: "amendment_period",
      change_note: "Entitlement smoke",
      force_transition: true,
    },
  );
  assertNoError(amendmentPeriodError, "could not open amendment smoke period");
  const { data: amendment, error: amendmentError } = await secondClient.rpc(
    "submit_amendment",
    {
      target_order_id: creditOrderId,
      request_body: "Synthetic shared amendment allowance test.",
    },
  );
  assertNoError(amendmentError, "shared amendment submission failed");
  assert(amendment.billing_kind === "free", "shared amendment was not free");
  const { data: amendedEntitlement, error: amendedEntitlementError } =
    await secondClient
      .from("frame_entitlements")
      .select("amendments_used")
      .eq("id", creditEntitlementId)
      .single();
  assertNoError(
    amendedEntitlementError,
    "could not read shared amendment usage",
  );
  assert(
    amendedEntitlement.amendments_used === 1,
    "shared amendment allowance was not consumed exactly once",
  );
  const { data: exhaustedDraft, error: exhaustedDraftError } =
    await secondClient
      .from("order_drafts")
      .insert({ client_id: secondUser.id })
      .select("id")
      .single();
  assertNoError(exhaustedDraftError, "could not create exhausted-credit draft");
  exhaustedCreditDraftId = exhaustedDraft.id;
  const { error: exhaustedCreditError } = await secondClient.rpc(
    "submit_order_from_draft",
    {
      target_draft_id: exhaustedCreditDraftId,
      order_payload: {
        frameType: "upcoming_event",
        events: [{ eventName: "Mixed Doubles", sortOrder: 0 }],
        frameEntitlementId: creditEntitlementId,
      },
      asset_payload: [],
    },
  );
  assert(exhaustedCreditError, "an exhausted entitlement funded another frame");

  const { error: clientFinishingError } = await secondClient.rpc(
    "mark_order_finishing_after_image_approval",
    { target_order_id: workflowOrderId },
  );
  assert(
    clientFinishingError,
    "a client could invoke the automation-only finishing transition",
  );
  const { data: finishingOrder, error: finishingError } = await admin.rpc(
    "mark_order_finishing_after_image_approval",
    { target_order_id: workflowOrderId },
  );
  assertNoError(finishingError, "automation finishing transition failed");
  assert(
    finishingOrder.status === "finishing_touches",
    "image approval did not enter finishing touches",
  );

  const deliveryBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const reviewPath = `orders/${workflowOrderId}/deliveries/review/${randomUUID()}.png`;
  workflowPaths.push(reviewPath);
  const { error: reviewUploadError } = await admin.storage
    .from("order-assets")
    .upload(reviewPath, deliveryBytes, { contentType: "image/png" });
  assertNoError(reviewUploadError, "review smoke upload failed");
  const { error: reviewPublishError } = await firstClient.rpc(
    "publish_poster_delivery",
    {
      target_order_id: workflowOrderId,
      target_storage_path: reviewPath,
      target_original_filename: "review.png",
      target_mime_type: "image/png",
      target_file_size: deliveryBytes.byteLength,
      target_is_review: true,
      client_message: "Review smoke",
    },
  );
  assertNoError(reviewPublishError, "review publication workflow failed");

  const finalPath = `orders/${workflowOrderId}/deliveries/final/${randomUUID()}.png`;
  workflowPaths.push(finalPath);
  const { error: finalUploadError } = await admin.storage
    .from("order-assets")
    .upload(finalPath, deliveryBytes, { contentType: "image/png" });
  assertNoError(finalUploadError, "final smoke upload failed");
  const { error: finalPublishError } = await firstClient.rpc(
    "publish_poster_delivery",
    {
      target_order_id: workflowOrderId,
      target_storage_path: finalPath,
      target_original_filename: "final.png",
      target_mime_type: "image/png",
      target_file_size: deliveryBytes.byteLength,
      target_is_review: false,
      client_message: "Final smoke",
    },
  );
  assertNoError(finalPublishError, "final publication workflow failed");
  const { data: completedOrder, error: completedOrderError } = await admin
    .from("orders")
    .select("status, completed_at")
    .eq("id", workflowOrderId)
    .single();
  assertNoError(completedOrderError, "completed workflow order lookup failed");
  assert(
    completedOrder.status === "completed" && completedOrder.completed_at,
    "final publication did not complete the order",
  );

  console.log("Live RLS smoke test passed.");
} finally {
  if (creditPaths.length) {
    await admin.storage.from("order-assets").remove(creditPaths);
  }
  if (exhaustedCreditDraftId) {
    await admin.from("order_drafts").delete().eq("id", exhaustedCreditDraftId);
  }
  if (creditEntitlementId) {
    await admin
      .from("frame_entitlement_ledger")
      .delete()
      .eq("entitlement_id", creditEntitlementId);
    await admin
      .from("orders")
      .update({ frame_entitlement_id: null })
      .eq("frame_entitlement_id", creditEntitlementId);
  }
  if (creditOrderId) {
    await admin.from("orders").delete().eq("id", creditOrderId);
  }
  if (creditEntitlementId) {
    await admin
      .from("frame_entitlements")
      .delete()
      .eq("id", creditEntitlementId);
  }
  if (workflowPaths.length) {
    await admin.storage.from("order-assets").remove(workflowPaths);
  }
  if (workflowOrderId) {
    await admin.from("orders").delete().eq("id", workflowOrderId);
  }
  if (uploadedPath) {
    await admin.storage.from("order-assets").remove([uploadedPath]);
  }
  if (draftId) {
    await admin.from("order_drafts").delete().eq("id", draftId);
  }
  for (const userId of createdUserIds) {
    await admin.auth.admin.deleteUser(userId);
  }
}

async function createTestUser(email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assertNoError(error, `could not create temporary user ${email}`);
  createdUserIds.push(data.user.id);
  return data.user;
}

async function signedInClient(email) {
  const client = createClient(url, publishableKey, clientOptions);
  const { error } = await client.auth.signInWithPassword({ email, password });
  assertNoError(error, `temporary user ${email} could not sign in`);
  return client;
}

function assertNoError(error, message) {
  if (error) throw new Error(`${message}: ${error.message}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
