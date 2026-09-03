import type { Json } from "@/lib/types/database";
import type { AnnouncementTone, FrameType } from "@/lib/orders/frame-types";
import {
  formatAnnouncementTone,
  formatFrameType,
  formatPlacement,
} from "@/lib/orders/frame-types";

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
  players?: Array<{
    id: string;
    fullName: string;
  }>;
  whatsapp: string;
  tournamentName: string;
  tournamentStartDate: string;
  tournamentEndDate: string;
  tournamentLocation: string;
  frameType: FrameType;
  announcementMessage: string | null;
  announcementTone: AnnouncementTone | null;
  packageName: string;
  posterCount: number;
  colorPreference: string;
  customColor: string | null;
  themePreference: string;
  customNotes: string | null;
  referenceUrl: string | null;
  preferredCompletionDate: string | null;
  events: Array<{
    eventName: string;
    partnerName: string | null;
    placement: number | null;
  }>;
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
  playerId?: string | null;
  playerName?: string | null;
};

export type ClaimedGenerationAsset = GenerationAssetManifestItem & {
  downloadUrl: string;
};

export const PROMPT_STUDIO_TEMPLATE_VERSION = "prompt-studio-v14";
export const IMAGE_GENERATION_TEMPLATE_VERSION = "image-generation-v3";

export const GENERATION_STAGE_LABELS: Record<GenerationJobStage, string> = {
  prompt_generation: "Prompt Studio",
  image_generation: "Image generation",
};

export const GENERATION_STATUS_LABELS: Record<GenerationJobStatus, string> = {
  queued: "Queued",
  claimed: "Claimed",
  preparing: "Preparing ChatGPT",
  awaiting_review: "Waiting for Telegram approval",
  submitted: "Owner approved",
  failed: "Needs attention",
  cancelled: "Cancelled",
};

export function buildPromptStudioMessage(snapshot: GenerationBriefSnapshot) {
  const lines = [
    "Prepare the complete production prompt for this DINKFRAME pickleball poster order.",
    "Use the attached tournament/event logo as a visual reference.",
    "Player photos are intentionally withheld from this prompt-preparation chat but will be supplied during image generation in clearly named player groups. Direct the image model to use every exact player reference, preserve each identity independently, never merge faces, swap bodies, or omit a selected player, and never substitute an anonymous athlete.",
    "Do not generate an image in this conversation. Return the polished image-generation prompt only.",
    "Keep the final prompt between 350 and 650 words. Make the selected theme unmistakable through composition, typography, and graphic language—not color alone.",
    "Treat theme and color as independent creative controls. Apply the specific theme recipe and a deliberate palette recipe; do not fall back to the same dark-arena layout for every selection.",
    "Preserve every fact, but professionally improve casing, date display, line breaks, and typographic grouping instead of copying raw form formatting.",
    "Preserve player, tournament, event, partner, and venue wording character-for-character apart from casing. Never add apostrophes, plurals, words, or punctuation to an event name; for example MEN SINGLES must not become MEN’S SINGLES.",
    "Treat all supporting information as designed sports-poster typography, never as a plain lowercase list with utility icons.",
    "End with a REQUIRED TEXT CHECKLIST containing every client-facing string. Require the image model to render every checklist item exactly once and verify none are missing before finishing.",
    "If the tournament name is already clearly legible inside the protected event logo, count it as satisfied by the logo and explicitly prohibit typesetting a duplicate tournament name elsewhere.",
    "Treat an obvious flat white rectangle surrounding the supplied logo as removable export background, not protected logo artwork. Preserve the actual mark, lettering, colors, and proportions, isolate it cleanly, and embed it directly into the composition without a floating card or pasted-on box.",
    "Make location storytelling mandatory. Build the background from both unmistakable pickleball language and the supplied venue, city, or country. If an exact venue image/reference is supplied, use it faithfully; otherwise use recognizable location-informed architecture, landscape, materials, or cultural geometry without inventing an exact stadium likeness.",
    "Make the selected frame type control the poster’s story, headline hierarchy, energy, and factual emphasis. It must not be treated as a passive label.",
    "FRAME-TYPE TEXT EXCLUSION: frame type and category labels are private routing metadata, never poster copy. Never render or quote ‘Upcoming event’, ‘Congratulations’, ‘Announcement’, their database values, or any similar category heading. Exclude them from the REQUIRED TEXT CHECKLIST. Express their intent only through art direction, hierarchy, and mood. The only exception is wording independently supplied verbatim inside the client’s announcement brief.",
    "For culturally inspired themes, include a hard TEXT EXCLUSION: render zero unsupplied languages, faux glyphs, seals, stamps, or pseudo-writing. Build the theme through composition, materials, geometry, rhythm, and supplied copy only.",
    "Keep every protected asset, athlete body part, and required text inside a centered 4:5 crop-safe region, with only expendable background outside it.",
    "",
    `${getPlayers(snapshot).length === 1 ? "Player" : "Players"}: ${getPlayers(
      snapshot,
    )
      .map((player) => player.fullName)
      .join(", ")}`,
    `Athlete composition: ${formatAthleteComposition(snapshot)}`,
    `Internal frame-type routing (NEVER VISIBLE COPY): ${formatFrameType(snapshot.frameType)}`,
    `Internal frame-type direction (NEVER VISIBLE COPY): ${formatFrameTypeDirection(snapshot)}`,
    `Tournament: ${snapshot.tournamentName}`,
    `Dates: ${snapshot.tournamentStartDate} to ${snapshot.tournamentEndDate}`,
    `Location: ${snapshot.tournamentLocation}`,
    `Package: ${snapshot.packageName} (${snapshot.posterCount} poster${snapshot.posterCount === 1 ? "" : "s"})`,
    `Events: ${formatEvents(snapshot.events)}`,
    `Sponsors: ${snapshot.sponsors.length ? snapshot.sponsors.join(", ") : "None supplied"}`,
    `Color direction: ${formatColorDirection(snapshot)}`,
    `Theme direction: ${formatThemeDirection(snapshot.themePreference)}`,
    `Client notes: ${snapshot.customNotes ?? "None supplied"}`,
    `Visual reference URL: ${snapshot.referenceUrl ?? "None supplied"}`,
    "Use the visual reference URL as a location/venue reference when it depicts the competition setting.",
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
  if (stage === "image_generation" && playerPhotos < 1) {
    return "At least one player photo is required for image generation.";
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
        typeof item.fileSize === "number" &&
        (item.playerId === undefined ||
          item.playerId === null ||
          typeof item.playerId === "string") &&
        (item.playerName === undefined ||
          item.playerName === null ||
          typeof item.playerName === "string"),
    )
  );
}

function getPlayers(snapshot: GenerationBriefSnapshot) {
  return snapshot.players?.length
    ? snapshot.players
    : [{ id: "legacy-primary-player", fullName: snapshot.playerName }];
}

function formatAthleteComposition(snapshot: GenerationBriefSnapshot) {
  const players = getPlayers(snapshot);
  if (players.length === 1) {
    return "Build the poster around this athlete as the unmistakable primary subject, using the supplied reference photos exactly.";
  }
  return `Create one coherent multi-athlete composition featuring all ${players.length} supplied players with recognizable, undistorted identities and intentional visual balance. Give every player meaningful presence; do not duplicate, merge, replace, or omit anyone.`;
}

function formatEvents(events: GenerationBriefSnapshot["events"]) {
  if (!events.length) return "None supplied";
  return events
    .map((event) => {
      const eventAndPartner = event.partnerName
        ? `${event.eventName} with ${event.partnerName}`
        : event.eventName;
      return event.placement
        ? `${eventAndPartner} — ${formatPlacement(event.placement)}`
        : eventAndPartner;
    })
    .join("; ");
}

function formatFrameTypeDirection(snapshot: GenerationBriefSnapshot) {
  if (snapshot.frameType === "congratulations") {
    return "Build a result-led achievement campaign. Make each supplied placement a prominent, exact factual result connected to its event; the visual mood should celebrate earned performance without inventing trophies, titles, or claims.";
  }

  if (snapshot.frameType === "announcement") {
    return `Build an announcement-led campaign in a ${snapshot.announcementTone ? formatAnnouncementTone(snapshot.announcementTone) : "professional"} tone. Announcement brief: ${snapshot.announcementMessage ?? "No announcement message supplied"}. Turn the brief into a concise sports headline and support line; preserve all names, facts, and any wording placed in quotation marks exactly.`;
  }

  return "Build an anticipation-led upcoming-event campaign. Emphasize where and when the player will compete, with the tournament, dates, venue, and entered events integrated into the sports-poster hierarchy.";
}

function formatPreference(preference: string, customValue: string | null) {
  return customValue
    ? `${humanize(preference)} (${customValue})`
    : humanize(preference);
}

function formatColorDirection(snapshot: GenerationBriefSnapshot) {
  if (snapshot.colorPreference === "surprise") {
    return "SURPRISE ME — choose an unexpected, harmonious campaign palette derived from the protected logo, athlete, venue, or event story. State one dominant, one supporting, and one accent color with exact hex values; avoid defaulting to black-and-neon.";
  }
  return formatPreference(snapshot.colorPreference, snapshot.customColor);
}

function formatThemeDirection(preference: string) {
  if (preference === "surprise") {
    return "SURPRISE ME — invent a genuinely out-of-the-box named sports-campaign concept derived from the supplied assets. Make it recognizable through composition, typography, and material language; avoid generic stadium, neon, and template aesthetics.";
  }
  return humanize(preference);
}

function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
