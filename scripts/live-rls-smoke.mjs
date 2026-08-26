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

  console.log("Live RLS smoke test passed.");
} finally {
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
