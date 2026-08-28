import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const cdpPort = Number(process.env.DINKFRAME_BROWSER_CDP_PORT ?? "9223");
const cdpUrl = `http://127.0.0.1:${cdpPort}`;
const profileDirectory =
  process.env.DINKFRAME_BROWSER_PROFILE_DIR ??
  path.join(homedir(), ".dinkframe", "chatgpt-browser-profile");

if (await browserIsReady()) {
  console.log(`DINKFRAME companion browser is already ready at ${cdpUrl}.`);
  process.exit(0);
}

const executable = findBrowserExecutable();
if (!executable) {
  throw new Error(
    "Chrome, Brave, or Edge was not found. Set DINKFRAME_BROWSER_EXECUTABLE_PATH in .env.local.",
  );
}

await mkdir(profileDirectory, { recursive: true });
const browser = spawn(
  executable,
  [
    `--remote-debugging-port=${cdpPort}`,
    "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${profileDirectory}`,
    "--no-first-run",
    "--no-default-browser-check",
    "https://chatgpt.com/",
  ],
  { detached: true, stdio: "ignore" },
);
browser.unref();

for (let attempt = 0; attempt < 30; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (await browserIsReady()) {
    console.log(`DINKFRAME companion browser is ready at ${cdpUrl}.`);
    console.log(
      "Sign in to ChatGPT in that dedicated window once, then leave it open.",
    );
    process.exit(0);
  }
}

throw new Error(
  "The companion browser started but its local CDP port did not become ready.",
);

async function browserIsReady() {
  try {
    const response = await fetch(`${cdpUrl}/json/version`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function findBrowserExecutable() {
  const configured = process.env.DINKFRAME_BROWSER_EXECUTABLE_PATH;
  if (configured && existsSync(configured)) return configured;

  const localAppData = process.env.LOCALAPPDATA;
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env["ProgramFiles(x86)"];
  const candidates = [
    localAppData &&
      path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    localAppData &&
      path.join(
        localAppData,
        "BraveSoftware",
        "Brave-Browser",
        "Application",
        "brave.exe",
      ),
    programFiles &&
      path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    programFiles &&
      path.join(
        programFiles,
        "BraveSoftware",
        "Brave-Browser",
        "Application",
        "brave.exe",
      ),
    programFilesX86 &&
      path.join(
        programFilesX86,
        "Microsoft",
        "Edge",
        "Application",
        "msedge.exe",
      ),
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}
