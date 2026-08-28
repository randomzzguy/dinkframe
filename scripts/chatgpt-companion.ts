import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { hostname, tmpdir } from "node:os";
import path from "node:path";

import { chromium, type Page } from "playwright-core";
import { z } from "zod";

import type {
  ClaimedGenerationAsset,
  GenerationJobStage,
} from "../lib/automation/generation";

const envSchema = z.object({
  DINKFRAME_AUTOMATION_RUNNER_TOKEN: z.string().min(32),
  DINKFRAME_AUTOMATION_APP_URL: z.url().optional(),
  NEXT_PUBLIC_APP_URL: z.url(),
  DINKFRAME_BROWSER_CDP_URL: z.url().optional(),
  DINKFRAME_AUTOMATION_RUNNER_ID: z.string().trim().min(3).max(120).optional(),
});

const env = envSchema.parse(process.env);
const appUrl = normalizeLocalAppUrl(
  env.DINKFRAME_AUTOMATION_APP_URL ?? env.NEXT_PUBLIC_APP_URL,
);
const cdpUrl = env.DINKFRAME_BROWSER_CDP_URL ?? "http://127.0.0.1:9223";
const runnerId =
  env.DINKFRAME_AUTOMATION_RUNNER_ID ?? `dinkframe-${hostname()}`;

type ClaimedJob = {
  id: string;
  orderId: string;
  stage: GenerationJobStage;
  submissionMode: "review_required" | "auto_send";
  inputText: string;
  targetUrl: string;
  assets: ClaimedGenerationAsset[];
};

void main().then(() => {
  // A CDP WebSocket can keep Node alive even after the job has finished. Exiting
  // here disconnects this runner while leaving the dedicated browser open.
  process.exit(process.exitCode ?? 0);
});

async function main() {
  let activeJob: ClaimedJob | null = null;
  let temporaryDirectory: string | null = null;

  try {
    activeJob = await claimJob();
    if (!activeJob) {
      console.log("No DINKFRAME generation jobs are queued.");
      return;
    }

    console.log(
      `Claimed ${activeJob.stage} job ${activeJob.id} for order ${activeJob.orderId}.`,
    );
    await updateStatus(activeJob.id, "preparing");

    temporaryDirectory = await mkdtemp(
      path.join(tmpdir(), `dinkframe-${activeJob.id}-`),
    );
    const localAssets = await downloadAssets(
      activeJob.assets,
      temporaryDirectory,
    );

    const browser = await chromium.connectOverCDP(cdpUrl);
    const context = browser.contexts()[0];
    if (!context)
      throw new Error("The companion browser has no active context.");
    const pages = context.pages();
    const page = pages.at(-1) ?? (await context.newPage());

    await prepareChat(page, activeJob, localAssets);

    if (activeJob.submissionMode === "review_required") {
      await updateStatus(activeJob.id, "awaiting_review");
      console.log(
        "The ChatGPT message and attachments are ready. Review them in the companion browser and press Send yourself.",
      );
    } else {
      await clickVerifiedSend(page);
      await updateStatus(activeJob.id, "submitted");
      console.log("The verified ChatGPT message was sent automatically.");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown companion failure";
    console.error(`DINKFRAME companion failed: ${message}`);
    if (activeJob) {
      try {
        await updateStatus(activeJob.id, "failed", message);
      } catch (statusError) {
        console.error("The failed job could not be updated:", statusError);
      }
    }
    process.exitCode = 1;
  } finally {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
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
  const payload = (await response.json()) as { job: ClaimedJob };
  return payload.job;
}

async function updateStatus(
  jobId: string,
  status: "preparing" | "awaiting_review" | "submitted" | "failed",
  error?: string,
) {
  const response = await fetch(
    `${appUrl}/api/automation/jobs/${jobId}/status`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ runnerId, status, error }),
    },
  );
  if (!response.ok) {
    throw new Error(await responseError(response, `mark the job ${status}`));
  }
}

async function downloadAssets(
  assets: ClaimedGenerationAsset[],
  directory: string,
) {
  const localAssets: string[] = [];
  for (const [index, asset] of assets.entries()) {
    const assetDirectory = path.join(directory, String(index));
    await mkdir(assetDirectory, { recursive: true });
    const filename = safeFilename(asset.originalFilename);
    const destination = path.join(assetDirectory, filename);
    const response = await fetch(asset.downloadUrl, {
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      throw new Error(`Could not download ${asset.originalFilename}.`);
    }
    const data = Buffer.from(await response.arrayBuffer());
    if (data.byteLength !== asset.fileSize) {
      throw new Error(
        `${asset.originalFilename} did not match its snapshotted file size.`,
      );
    }
    await writeFile(destination, data);
    localAssets.push(destination);
  }
  return localAssets;
}

async function prepareChat(page: Page, job: ClaimedJob, localAssets: string[]) {
  await page.goto(job.targetUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await assertSignedIn(page);

  const composer = page.locator("#prompt-textarea").first();
  await composer.waitFor({ state: "visible", timeout: 60_000 });
  await clearUnsentAttachments(page);
  await composer.fill(job.inputText);

  if (localAssets.length) {
    const fileInput = await findFileInput(page);
    await fileInput.setInputFiles(localAssets);
    await waitForAttachedFiles(page, localAssets);
  }

  const composerValue = await composer.evaluate((element) => {
    if (element instanceof HTMLTextAreaElement) return element.value;
    if (element instanceof HTMLElement) return element.innerText;
    return element.textContent ?? "";
  });
  if (normalize(composerValue) !== normalize(job.inputText)) {
    throw new Error("The ChatGPT composer did not match the queued message.");
  }

  const sendButton = getSendButton(page);
  await sendButton.waitFor({ state: "visible", timeout: 120_000 });
  await sendButton.waitFor({ state: "attached" });
  if (await sendButton.isDisabled()) {
    throw new Error("ChatGPT is not ready to send the prepared message.");
  }
}

async function assertSignedIn(page: Page) {
  if (page.url().includes("/auth/login")) {
    throw new Error("Sign in to ChatGPT in the companion browser first.");
  }
  const loginButton = page.getByRole("button", { name: /log in/i });
  if (await loginButton.isVisible().catch(() => false)) {
    throw new Error("Sign in to ChatGPT in the companion browser first.");
  }
}

async function findFileInput(page: Page) {
  let input = page.locator('input[type="file"]:not([accept])').first();
  if ((await input.count()) > 0) return input;

  const attachmentButton = page.getByRole("button", {
    name: /attach|add photos|upload/i,
  });
  if (await attachmentButton.isVisible().catch(() => false)) {
    await attachmentButton.click();
  }
  input = page.locator('input[type="file"]').first();
  await input.waitFor({ state: "attached", timeout: 15_000 });
  return input;
}

async function clearUnsentAttachments(page: Page) {
  const removeButtons = page.locator('[aria-label^="Remove file"]');
  while ((await removeButtons.count()) > 0) {
    await removeButtons.first().click();
  }
}

async function waitForAttachedFiles(page: Page, localAssets: string[]) {
  const removeButtons = page.locator('[aria-label^="Remove file"]');
  await removeButtons.first().waitFor({ state: "visible", timeout: 120_000 });
  await page.waitForFunction(
    (expectedCount) =>
      document.querySelectorAll('[aria-label^="Remove file"]').length >=
      expectedCount,
    localAssets.length,
    { timeout: 120_000 },
  );

  const labels = await removeButtons.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("aria-label") ?? ""),
  );
  for (const assetPath of localAssets) {
    if (!labels.some((label) => label.includes(path.basename(assetPath)))) {
      throw new Error(
        `${path.basename(assetPath)} was not attached to ChatGPT.`,
      );
    }
  }
}

async function clickVerifiedSend(page: Page) {
  const sendButton = getSendButton(page);
  if (await sendButton.isDisabled()) {
    throw new Error("The Send button became unavailable before submission.");
  }
  await sendButton.click();
  await page.waitForTimeout(1_000);
}

function getSendButton(page: Page) {
  return page
    .locator(
      'button[data-testid="send-button"], button[aria-label="Send prompt"], button[aria-label="Send message"]',
    )
    .first();
}

function authHeaders() {
  return {
    Authorization: `Bearer ${env.DINKFRAME_AUTOMATION_RUNNER_TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function responseError(response: Response, action: string) {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Unable to ${action}.`;
  } catch {
    return `Unable to ${action}.`;
  }
}

function safeFilename(filename: string) {
  const sanitized = path
    .basename(filename)
    .replaceAll(/[^a-zA-Z0-9._ -]/g, "_")
    .trim();
  return sanitized || "asset";
}

function normalize(value: string) {
  return value.replaceAll("\u00a0", " ").replaceAll(/\s+/g, " ").trim();
}

function normalizeLocalAppUrl(value: string) {
  const url = new URL(value);
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  return url.toString().replace(/\/$/, "");
}
