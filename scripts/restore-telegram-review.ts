import { createHash, randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "../lib/types/database";

const execFileAsync = promisify(execFile);
const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    HERMES_PYTHON: z.string().min(1).optional(),
  })
  .parse(process.env);
const jobId = z.uuid().parse(process.argv[2]);
const supabase = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const actionRoot = path.join(process.cwd(), ".dinkframe", "telegram-actions");
const buttonScript = path.join(
  process.cwd(),
  "hermes",
  "dinkframe-telegram-buttons.py",
);
const hermesPython =
  env.HERMES_PYTHON ??
  path.join(
    process.env.LOCALAPPDATA ?? "",
    "hermes",
    "hermes-agent",
    "venv",
    "Scripts",
    "python.exe",
  );

void main().catch((error: unknown) => {
  console.error(
    "Telegram review restoration failed:",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});

async function main() {
  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .select("id, order_id, stage, status")
    .eq("id", jobId)
    .single();
  if (jobError) throw jobError;
  if (job.status !== "awaiting_review") {
    throw new Error(
      "Only an awaiting-review job can have its buttons restored.",
    );
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("order_number")
    .eq("id", job.order_id)
    .single();
  if (orderError) throw orderError;

  const actionId = randomBytes(16).toString("hex");
  const approvalToken = randomBytes(24).toString("hex");
  const action = {
    actionId,
    jobId: job.id,
    approvalToken,
    stage: job.stage,
    orderLabel: order.order_number,
    createdAt: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("generation_jobs")
    .update({
      approval_token_hash: createHash("sha256")
        .update(approvalToken)
        .digest("hex"),
      approval_requested_at: new Date().toISOString(),
    })
    .eq("id", job.id)
    .eq("status", "awaiting_review");
  if (updateError) throw updateError;

  await mkdir(actionRoot, { recursive: true });
  await writeFile(
    path.join(actionRoot, `${actionId}.json`),
    `${JSON.stringify(action, null, 2)}\n`,
    { encoding: "utf8", flag: "wx" },
  );
  await execFileAsync(hermesPython, [buttonScript, JSON.stringify(action)], {
    cwd: process.cwd(),
    timeout: 45_000,
    windowsHide: true,
  });

  console.log(
    `Restored Telegram review buttons for ${order.order_number} ${job.stage}.`,
  );
}
