import { describe, expect, it } from "vitest";

import type { UploadedAssetInput } from "./order";
import {
  getOrderWizardStepError,
  type WizardDraftValidationInput,
} from "./order-wizard";

const completeDraft: WizardDraftValidationInput = {
  playerName: "Jamie Lee",
  instagramHandle: "@jamie",
  whatsapp: "+60123456789",
  tournamentName: "Kuala Lumpur Open",
  tournamentStartDate: "2026-09-10",
  tournamentEndDate: "2026-09-12",
  tournamentLocation: "Kuala Lumpur",
  frameType: "upcoming_event",
  announcementMessage: "",
  announcementTone: "celebratory",
  events: [{ eventName: "Mixed Doubles", partnerName: "Alex", placement: "" }],
  sponsors: [],
  colorPreference: "surprise",
  customColor: "#d8ff36",
  themePreference: "surprise",
  customNotes: "",
  referenceUrl: "",
  packageSlug: "single-frame",
  confirmedAccurate: true,
};

const assets: UploadedAssetInput[] = [
  asset("tournament_logo", "order-assets", "logo.png"),
  asset("player_photo", "order-assets", "player-1.png"),
  asset("player_photo", "order-assets", "player-2.png"),
  asset("payment_proof", "payment-proofs", "receipt.png"),
];

describe("order wizard step validation", () => {
  it("marks every step complete when all required information exists", () => {
    expect(
      Array.from({ length: 9 }, (_, index) =>
        getOrderWizardStepError(index, completeDraft, assets),
      ),
    ).toEqual(Array.from({ length: 9 }, () => null));
  });

  it("marks an incomplete tab without blocking validation of other tabs", () => {
    const incompleteDraft = { ...completeDraft, tournamentName: "" };

    expect(getOrderWizardStepError(0, incompleteDraft, assets)).toBeNull();
    expect(getOrderWizardStepError(1, incompleteDraft, assets)).toBe(
      "Complete the tournament name, dates, and location.",
    );
  });

  it("keeps final submission locked until every step and confirmation pass", () => {
    expect(
      getOrderWizardStepError(
        8,
        { ...completeDraft, confirmedAccurate: false },
        assets,
      ),
    ).toBe("Confirm that the order information and assets are correct.");

    expect(getOrderWizardStepError(8, completeDraft, assets.slice(0, -1))).toBe(
      "Upload one payment proof.",
    );
  });

  it("accepts an owned frame credit without another payment proof", () => {
    const creditDraft = {
      ...completeDraft,
      frameEntitlementId: "00000000-0000-4000-8000-000000000001",
    };
    const assetsWithoutReceipt = assets.filter(
      (item) => item.assetType !== "payment_proof",
    );

    expect(
      getOrderWizardStepError(7, creditDraft, assetsWithoutReceipt),
    ).toBeNull();
    expect(
      getOrderWizardStepError(8, creditDraft, assetsWithoutReceipt),
    ).toBeNull();
  });

  it("requires a placement for every congratulations event", () => {
    expect(
      getOrderWizardStepError(
        2,
        { ...completeDraft, frameType: "congratulations" },
        assets,
      ),
    ).toBe("Choose a placement from 1st to 6th for every event.");

    expect(
      getOrderWizardStepError(
        2,
        {
          ...completeDraft,
          frameType: "congratulations",
          events: [
            {
              eventName: "Mixed Doubles",
              partnerName: "Alex",
              placement: "1",
            },
          ],
        },
        assets,
      ),
    ).toBeNull();
  });

  it("requires a message and valid tone for announcements", () => {
    expect(
      getOrderWizardStepError(
        2,
        { ...completeDraft, frameType: "announcement" },
        assets,
      ),
    ).toBe("Describe the announcement in 2 to 500 characters.");

    expect(
      getOrderWizardStepError(
        2,
        {
          ...completeDraft,
          frameType: "announcement",
          announcementMessage: "Aisyah joins Team DINKFRAME.",
          announcementTone: "bold",
        },
        assets,
      ),
    ).toBeNull();
  });
});

function asset(
  assetType: UploadedAssetInput["assetType"],
  bucketId: UploadedAssetInput["bucketId"],
  filename: string,
): UploadedAssetInput {
  return {
    assetType,
    bucketId,
    storagePath: `orders/00000000-0000-4000-8000-000000000000/${filename}`,
    originalFilename: filename,
    mimeType: "image/png",
    fileSize: 1024,
  };
}
