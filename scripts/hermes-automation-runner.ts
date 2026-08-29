import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { copyFile, mkdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { z } from "zod";

import type {
  ClaimedGenerationAsset,
  GenerationJobStage,
} from "../lib/automation/generation";

const execFileAsync = promisify(execFile);
const env = z
  .object({
    DINKFRAME_AUTOMATION_RUNNER_TOKEN: z.string().min(32),
    DINKFRAME_AUTOMATION_APP_URL: z.url().optional(),
  })
  .parse(process.env);
const appUrl = (
  env.DINKFRAME_AUTOMATION_APP_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const runnerId = `hermes-${os.hostname()}`.slice(0, 120);
const durableRoot = path.join(process.cwd(), ".dinkframe", "automation");
const telegramActionRoot = path.join(
  process.cwd(),
  ".dinkframe",
  "telegram-actions",
);
const hermesPython = path.join(
  process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
  "hermes",
  "hermes-agent",
  "venv",
  "Scripts",
  "python.exe",
);
const telegramButtonScript = path.join(
  process.cwd(),
  "hermes",
  "dinkframe-telegram-buttons.py",
);

type ClaimedJob = {
  id: string;
  orderId: string;
  orderNumber: string | null;
  stage: GenerationJobStage;
  submissionMode: "review_required" | "auto_send";
  inputText: string;
  revisionFeedback: string | null;
  assets: ClaimedGenerationAsset[];
};

type TelegramActionRecord = {
  actionId: string;
  jobId: string;
  approvalToken: string;
  stage: GenerationJobStage;
  orderLabel: string;
  createdAt: string;
  messageId?: string;
};

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Unknown Hermes runner failure",
  );
  process.exit(1);
});

async function main() {
  let job: ClaimedJob | null = null;
  let workDirectory: string | null = null;
  try {
    job = await claimJob();
    if (!job) {
      console.log("No DINKFRAME generation jobs are queued.");
      return;
    }

    await updateStatus(job.id, { status: "preparing" });
    workDirectory = path.join(durableRoot, "work", job.id);
    await mkdir(workDirectory, { recursive: true });
    const localAssets = await downloadAssets(job.assets, workDirectory);
    const inputPath = path.join(workDirectory, "input.txt");
    await writeFile(inputPath, `${job.inputText.trim()}\n`, "utf8");

    if (job.stage === "prompt_generation") {
      await runPromptJob(job, inputPath, localAssets);
    } else {
      await runImageJob(
        job,
        inputPath,
        localAssets.map((asset) => asset.localPath),
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Hermes runner failure";
    if (job) {
      await updateStatus(job.id, { status: "failed", error: message }).catch(
        () => undefined,
      );
    }
    throw new Error(`DINKFRAME Hermes job failed: ${message}`);
  } finally {
    if (workDirectory)
      await rm(workDirectory, { recursive: true, force: true });
  }
}

async function runPromptJob(
  job: ClaimedJob,
  inputPath: string,
  assets: Array<ClaimedGenerationAsset & { localPath: string }>,
) {
  const tournamentLogo = assets.find(
    (asset) => asset.assetType === "tournament_logo",
  )?.localPath;
  const instruction = job.revisionFeedback
    ? [
        "Revision mode. The exact previously approved/generated prompt is stored at:",
        inputPath,
        "Apply only this owner feedback:",
        job.revisionFeedback,
        "Return one complete revised production prompt only. Do not generate an image.",
      ].join("\n")
    : [
        "Prompt mode. The complete DINKFRAME order brief is stored at:",
        inputPath,
        "The tournament logo reference is stored at:",
        tournamentLogo ?? "No logo path supplied",
        "Act as the DINKFRAME Creative Director and return one polished production prompt only. Do not generate an image.",
      ].join("\n");
  const output = await runHermes(instruction);
  if (output.trim().length < 100) {
    throw new Error("Hermes returned an unexpectedly short production prompt.");
  }

  const token = createApprovalToken();
  await updateStatus(job.id, {
    status: "awaiting_review",
    outputText: output.trim(),
    approvalToken: token,
  });
  await deliverReview(
    job,
    token,
    [
      `DINKFRAME ${job.orderNumber ?? job.orderId} — PROMPT READY`,
      "",
      output.trim(),
      "",
      "Review the prompt, then choose an option below.",
    ].join("\n"),
  );
}

async function runImageJob(
  job: ClaimedJob,
  inputPath: string,
  assetPaths: string[],
) {
  const instruction = [
    "Image mode. The owner explicitly approved the exact prompt stored at:",
    inputPath,
    "Read it without rewriting it. Generate exactly one portrait draft using image_generate.",
    "Use these reference images in this exact manifest order:",
    ...assetPaths,
    "Use the configured openai-codex image provider. Return only the saved image path. Do not retry and do not use another provider.",
  ].join("\n");
  const output = await runHermes(instruction);
  const generatedPath = extractGeneratedImagePath(output);
  const generatedStat = await stat(generatedPath).catch(() => null);
  if (!generatedStat?.isFile()) {
    throw new Error("Hermes did not return a valid generated image file.");
  }

  const orderDirectory = path.join(durableRoot, job.orderNumber ?? job.orderId);
  await mkdir(orderDirectory, { recursive: true });
  const extension = path.extname(generatedPath) || ".png";
  const durablePath = path.join(orderDirectory, `${job.id}${extension}`);
  await copyFile(generatedPath, durablePath);

  const token = createApprovalToken();
  await updateStatus(job.id, {
    status: "awaiting_review",
    outputLocalPath: durablePath,
    approvalToken: token,
  });
  await deliverReview(
    job,
    token,
    [
      `MEDIA:${durablePath.replaceAll("\\", "/")}`,
      `DINKFRAME ${job.orderNumber ?? job.orderId} — IMAGE READY`,
      "Review the draft, then choose an option below.",
    ].join(" "),
  );
}

async function deliverReview(
  job: ClaimedJob,
  approvalToken: string,
  artifactMessage: string,
) {
  const action = await createTelegramAction(job, approvalToken);
  try {
    const messageId = await sendTelegram(artifactMessage);
    action.messageId = messageId;
    await writeTelegramAction(action);
    await attachTelegramDecisionButtons(action);
  } catch (error) {
    await rm(path.join(telegramActionRoot, `${action.actionId}.json`), {
      force: true,
    });
    throw error;
  }
}

async function createTelegramAction(
  job: ClaimedJob,
  approvalToken: string,
): Promise<TelegramActionRecord> {
  await mkdir(telegramActionRoot, { recursive: true });
  const action: TelegramActionRecord = {
    actionId: randomBytes(16).toString("hex"),
    jobId: job.id,
    approvalToken,
    stage: job.stage,
    orderLabel: job.orderNumber ?? job.orderId,
    createdAt: new Date().toISOString(),
  };
  await writeTelegramAction(action, "wx");
  return action;
}

async function writeTelegramAction(
  action: TelegramActionRecord,
  flag: "w" | "wx" = "w",
) {
  await writeFile(
    path.join(telegramActionRoot, `${action.actionId}.json`),
    `${JSON.stringify(action, null, 2)}\n`,
    { encoding: "utf8", flag },
  );
}

async function attachTelegramDecisionButtons(action: TelegramActionRecord) {
  const payload = JSON.stringify({
    actionId: action.actionId,
    orderLabel: action.orderLabel,
    stage: action.stage,
    messageId: action.messageId,
  });
  await execFileAsync(hermesPython, [telegramButtonScript, payload], {
    cwd: process.cwd(),
    timeout: 45_000,
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  });
}

async function runHermes(instruction: string) {
  const { stdout, stderr } = await execFileAsync(
    "hermes",
    [
      "--provider",
      "openai-codex",
      "-m",
      "gpt-5.5",
      "--skills",
      "dinkframe-creative-director",
      "-z",
      instruction,
    ],
    {
      cwd: process.cwd(),
      timeout: 10 * 60 * 1000,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (!stdout.trim()) {
    throw new Error(stderr.trim() || "Hermes returned no output.");
  }
  return stdout.trim();
}

async function sendTelegram(message: string) {
  const { stdout } = await execFileAsync(
    "hermes",
    ["send", "--json", "--to", "telegram", message],
    {
      cwd: process.cwd(),
      timeout: 45_000,
      maxBuffer: 2 * 1024 * 1024,
      windowsHide: true,
    },
  );
  const result = z
    .object({ success: z.literal(true), message_id: z.coerce.string().min(1) })
    .parse(JSON.parse(stdout));
  return result.message_id;
}

async function claimJob(): Promise<ClaimedJob | null> {
  const response = await fetch(`${appUrl}/api/automation/jobs/claim`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ runnerId }),
  });
  if (response.status === 204) return null;
  if (!response.ok)
    throw new Error(await responseError(response, "claim a job"));
  return ((await response.json()) as { job: ClaimedJob }).job;
}

async function updateStatus(
  jobId: string,
  body:
    | { status: "preparing" | "submitted" }
    | { status: "failed"; error: string }
    | {
        status: "awaiting_review";
        outputText?: string;
        outputLocalPath?: string;
        approvalToken: string;
      },
) {
  const response = await fetch(
    `${appUrl}/api/automation/jobs/${jobId}/status`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ runnerId, ...body }),
    },
  );
  if (!response.ok) {
    throw new Error(
      await responseError(response, `mark the job ${body.status}`),
    );
  }
}

async function downloadAssets(
  assets: ClaimedGenerationAsset[],
  directory: string,
) {
  const downloaded: Array<ClaimedGenerationAsset & { localPath: string }> = [];
  for (const [index, asset] of assets.entries()) {
    const response = await fetch(asset.downloadUrl);
    if (!response.ok)
      throw new Error(`Could not download ${asset.originalFilename}.`);
    const safeName = asset.originalFilename.replace(/[^a-zA-Z0-9._-]+/g, "-");
    const localPath = path.join(directory, `${index + 1}-${safeName}`);
    await writeFile(localPath, Buffer.from(await response.arrayBuffer()));
    downloaded.push({ ...asset, localPath });
  }
  return downloaded;
}

function extractGeneratedImagePath(output: string) {
  const candidates = output.match(
    /[A-Za-z]:[\\/][^\r\n"']+?\.(?:png|jpe?g|webp)/gi,
  );
  if (candidates?.length) return candidates.at(-1)?.trim() ?? "";
  const lastLine = output
    .trim()
    .split(/\r?\n/)
    .at(-1)
    ?.replace(/^['"]|['"]$/g, "");
  return lastLine ? path.resolve(lastLine) : "";
}

function createApprovalToken() {
  return randomBytes(24).toString("hex");
}

function authHeaders() {
  return {
    Authorization: `Bearer ${env.DINKFRAME_AUTOMATION_RUNNER_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function responseError(response: Response, action: string) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: string };
    return parsed.error ?? `Unable to ${action}.`;
  } catch {
    return `Unable to ${action}.`;
  }
}
