import type { Json } from "@/lib/types/database";

export const GENERATION_JOB_STAGES = [
  "prompt_generation",
  "image_generation",
] as const;

export const GENERATION_JOB_STATUSES = [
  "queued",
  "claimed",
  "preparing",
  "awaiting_review",
  "submitted",
  "failed",
  "cancelled",
] as const;

export type GenerationJobStage = (typeof GENERATION_JOB_STAGES)[number];
export type GenerationJobStatus = (typeof GENERATION_JOB_STATUSES)[number];

export type GenerationBriefSnapshot = {
  orderNumber: string;
  playerName: string;
  instagramHandle: string | null;
  whatsapp: string;
  tournamentName: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  tournamentLocation: string;
  packageName: string;
  posterCount: number;
  colorPreference: string;
  customColor: string | null;
  themePreference: string;
  customNotes: string | null;
  referenceUrl: string | null;
  preferredCompletionDate: string | null;
  events: Array<{ eventName: string; partnerName: string | null }>;
  sponsors: string[];
};

export type GenerationAssetManifestItem = {
  id: string;
  assetType:
    | "player_photo"
    | "tournament_logo"
    | "sponsor_logo"
    | "payment_proof"
    | "final_poster";
  bucketId: string;
  storagePath: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
};

export type ClaimedGenerationAsset = GenerationAssetManifestItem & {
  downloadUrl: string;
};

export const PROMPT_STUDIO_TEMPLATE_VERSION = "prompt-studio-v1";
export const IMAGE_GENERATION_TEMPLATE_VERSION = "image-generation-v1";

export const GENERATION_STAGE_LABELS: Record<GenerationJobStage, string> = {
  prompt_generation: "Prompt Studio",
  image_generation: "Image generation",
};

export const GENERATION_STATUS_LABELS: Record<GenerationJobStatus, string> = {
  queued: "Queued",
  claimed: "Claimed",
  preparing: "Preparing ChatGPT",
  awaiting_review: "Waiting for you to send",
  submitted: "Sent to ChatGPT",
  failed: "Needs attention",
  cancelled: "Cancelled",
};

export function buildPromptStudioMessage(snapshot: GenerationBriefSnapshot) {
  const lines = [
    "Prepare the complete production prompt for this DINKFRAME pickleball poster order.",
    "Use the attached tournament/event logo as a visual reference.",
    "Do not generate an image in this conversation. Return the polished image-generation prompt only.",
    "",
    `Order: ${snapshot.orderNumber}`,
    `Player: ${snapshot.playerName}`,
    `Instagram: ${snapshot.instagramHandle ? `@${snapshot.instagramHandle}` : "Not supplied"}`,
    `Tournament: ${snapshot.tournamentName}`,
    `Dates: ${snapshot.tournamentStartDate} to ${snapshot.tournamentEndDate}`,
    `Location: ${snapshot.tournamentLocation}`,
    `Package: ${snapshot.packageName} (${snapshot.posterCount} poster${snapshot.posterCount === 1 ? "" : "s"})`,
    `Events: ${formatEvents(snapshot.events)}`,
    `Sponsors: ${snapshot.sponsors.length ? snapshot.sponsors.join(", ") : "None supplied"}`,
    `Color direction: ${formatPreference(snapshot.colorPreference, snapshot.customColor)}`,
    `Theme direction: ${humanize(snapshot.themePreference)}`,
    `Client notes: ${snapshot.customNotes ?? "None supplied"}`,
    `Visual reference URL: ${snapshot.referenceUrl ?? "None supplied"}`,
    `Preferred completion date: ${snapshot.preferredCompletionDate ?? "Not specified"}`,
    "",
    "Keep sponsor logos out of the generated artwork; they will be added manually during finishing.",
  ];

  return lines.join("\n");
}

export function selectManifestForStage(
  stage: GenerationJobStage,
  assets: GenerationAssetManifestItem[],
) {
  const allowed =
    stage === "prompt_generation"
      ? new Set(["tournament_logo"])
      : new Set(["player_photo", "tournament_logo"]);

  return assets.filter((asset) => allowed.has(asset.assetType));
}

export function validateManifestForStage(
  stage: GenerationJobStage,
  assets: GenerationAssetManifestItem[],
) {
  const selected = selectManifestForStage(stage, assets);
  const tournamentLogos = selected.filter(
    (asset) => asset.assetType === "tournament_logo",
  ).length;
  const playerPhotos = selected.filter(
    (asset) => asset.assetType === "player_photo",
  ).length;

  if (tournamentLogos < 1) {
    return "Upload a tournament logo before queuing this stage.";
  }
  if (stage === "image_generation" && playerPhotos < 2) {
    return "At least two player photos are required for image generation.";
  }
  return null;
}

export function toJson(
  value: GenerationBriefSnapshot | GenerationAssetManifestItem[],
): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export function isGenerationBriefSnapshot(
  value: Json,
): value is GenerationBriefSnapshot & Json {
  if (!value || Array.isArray(value) || typeof value !== "object") return false;
  return (
    typeof value.orderNumber === "string" &&
    typeof value.playerName === "string" &&
    typeof value.tournamentName === "string" &&
    Array.isArray(value.events) &&
    Array.isArray(value.sponsors)
  );
}

export function isGenerationAssetManifest(
  value: Json,
): value is GenerationAssetManifestItem[] & Json {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        !Array.isArray(item) &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.assetType === "string" &&
        typeof item.bucketId === "string" &&
        typeof item.storagePath === "string" &&
        typeof item.originalFilename === "string" &&
        typeof item.mimeType === "string" &&
        typeof item.fileSize === "number",
    )
  );
}

function formatEvents(events: GenerationBriefSnapshot["events"]) {
  if (!events.length) return "None supplied";
  return events
    .map((event) =>
      event.partnerName
        ? `${event.eventName} with ${event.partnerName}`
        : event.eventName,
    )
    .join("; ");
}

function formatPreference(preference: string, customValue: string | null) {
  return customValue
    ? `${humanize(preference)} (${customValue})`
    : humanize(preference);
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
