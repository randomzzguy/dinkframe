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
  packageName: "Single Frame",
  posterCount: 1,
  colorPreference: "custom",
  customColor: "electric blue",
  themePreference: "bold_energy",
  customNotes: "Feature the backhand pose.",
  referenceUrl: null,
  preferredCompletionDate: null,
  events: [{ eventName: "Mixed doubles", partnerName: "Kai" }],
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
    expect(message).toContain("Mixed doubles with Kai");
    expect(message).toContain("electric blue");
    expect(message).toContain("Acme");
    expect(message).toContain("350 and 650 words");
    expect(message).toContain("not color alone");
    expect(message).toContain("plain lowercase list");
    expect(message).toContain("hard TEXT EXCLUSION");
    expect(message).toContain("faux glyphs, seals, stamps, or pseudo-writing");
    expect(message).not.toContain("@aisyah");
    expect(message).not.toContain("Instagram:");
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
