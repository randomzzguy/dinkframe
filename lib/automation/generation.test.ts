import { describe, expect, it } from "vitest";

import {
  buildPromptStudioMessage,
  selectManifestForStage,
  validateManifestForStage,
  type GenerationAssetManifestItem,
  type GenerationBriefSnapshot,
} from "@/lib/automation/generation";

const snapshot: GenerationBriefSnapshot = {
  orderNumber: "DF-2026-0042",
  playerName: "Aisyah Lee",
  instagramHandle: "aisyah",
  whatsapp: "+60123456789",
  tournamentName: "Dink Open",
  tournamentStartDate: "2026-09-01",
  tournamentEndDate: "2026-09-02",
  tournamentLocation: "Kuala Lumpur",
  frameType: "upcoming_event",
  announcementMessage: null,
  announcementTone: null,
  packageName: "Single Frame",
  posterCount: 1,
  colorPreference: "custom",
  customColor: "electric blue",
  themePreference: "bold_energy",
  customNotes: "Feature the backhand pose.",
  referenceUrl: null,
  preferredCompletionDate: null,
  events: [{ eventName: "Mixed doubles", partnerName: "Kai", placement: null }],
  sponsors: ["Acme"],
};

const asset = (
  assetType: GenerationAssetManifestItem["assetType"],
): GenerationAssetManifestItem => ({
  id: crypto.randomUUID(),
  assetType,
  bucketId: "order-assets",
  storagePath: `orders/order/${assetType}.png`,
  originalFilename: `${assetType}.png`,
  mimeType: "image/png",
  fileSize: 1024,
});

describe("generation automation", () => {
  it("builds a prompt-studio request without asking that chat to generate an image", () => {
    const message = buildPromptStudioMessage(snapshot);
    expect(message).toContain("Do not generate an image");
    expect(message).toContain("Player photos are intentionally withheld");
    expect(message).toContain("never substitute an anonymous athlete");
    expect(message).toContain("character-for-character apart from casing");
    expect(message).toContain("MEN SINGLES must not become MEN’S SINGLES");
    expect(message).toContain("Mixed doubles with Kai");
    expect(message).toContain("Upcoming event");
    expect(message).toContain("anticipation-led upcoming-event campaign");
    expect(message).toContain("FRAME-TYPE TEXT EXCLUSION");
    expect(message).toContain("private routing metadata, never poster copy");
    expect(message).toContain("Exclude them from the REQUIRED TEXT CHECKLIST");
    expect(message).toContain(
      "Internal frame-type routing (NEVER VISIBLE COPY)",
    );
    expect(message).toContain("electric blue");
    expect(message).toContain("Acme");
    expect(message).toContain("350 and 650 words");
    expect(message).toContain("not color alone");
    expect(message).toContain("plain lowercase list");
    expect(message).toContain("REQUIRED TEXT CHECKLIST");
    expect(message).toContain("exactly once");
    expect(message).toContain("satisfied by the logo");
    expect(message).toContain("prohibit typesetting a duplicate");
    expect(message).toContain("removable export background");
    expect(message).toContain("without a floating card or pasted-on box");
    expect(message).toContain("Make location storytelling mandatory");
    expect(message).toContain("both unmistakable pickleball language");
    expect(message).toContain("hard TEXT EXCLUSION");
    expect(message).toContain("faux glyphs, seals, stamps, or pseudo-writing");
    expect(message).not.toContain("@aisyah");
    expect(message).not.toContain("Instagram:");
    expect(message).not.toContain("DF-2026-0042");
    expect(message).not.toContain("Order:");
    expect(message).toContain("centered 4:5 crop-safe region");
  });

  it("turns congratulations placements into exact achievement direction", () => {
    const message = buildPromptStudioMessage({
      ...snapshot,
      frameType: "congratulations",
      events: [
        { eventName: "Mixed doubles", partnerName: "Kai", placement: 2 },
      ],
    });

    expect(message).toContain("Congratulations");
    expect(message).toContain("Mixed doubles with Kai — 2nd place");
    expect(message).toContain("result-led achievement campaign");
    expect(message).toContain("without inventing trophies");
  });

  it("uses the selected announcement message and tone as the story", () => {
    const message = buildPromptStudioMessage({
      ...snapshot,
      frameType: "announcement",
      announcementMessage: "Aisyah joins Team DINKFRAME.",
      announcementTone: "bold",
    });

    expect(message).toContain("Announcement");
    expect(message).toContain("Bold / dramatic tone");
    expect(message).toContain("Aisyah joins Team DINKFRAME.");
    expect(message).toContain("announcement-led campaign");
  });

  it("turns surprise selections into explicit out-of-the-box art direction", () => {
    const message = buildPromptStudioMessage({
      ...snapshot,
      colorPreference: "surprise",
      customColor: null,
      themePreference: "surprise",
    });

    expect(message.match(/SURPRISE ME/g)).toHaveLength(2);
    expect(message).toContain("exact hex values");
    expect(message).toContain("genuinely out-of-the-box named");
    expect(message).toContain("avoid generic stadium");
  });

  it("only sends the tournament logo to Prompt Studio", () => {
    const assets = [asset("player_photo"), asset("tournament_logo")];
    expect(selectManifestForStage("prompt_generation", assets)).toHaveLength(1);
    expect(
      selectManifestForStage("prompt_generation", assets)[0]?.assetType,
    ).toBe("tournament_logo");
  });

  it("requires a logo and two player photos for image generation", () => {
    const incomplete = [asset("tournament_logo"), asset("player_photo")];
    expect(validateManifestForStage("image_generation", incomplete)).toMatch(
      /two player photos/i,
    );

    expect(
      validateManifestForStage("image_generation", [
        ...incomplete,
        asset("player_photo"),
      ]),
    ).toBeNull();
  });
});
