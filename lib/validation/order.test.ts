import { describe, expect, it } from "vitest";

import { orderDraftSchema, orderSubmissionSchema } from "./order";

const draftId = "00000000-0000-4000-8000-000000000000";
const entitlementId = "00000000-0000-4000-8000-000000000001";
const playerId = "00000000-0000-4000-8000-000000000002";

const order = {
  players: [{ id: playerId, fullName: "Jamie Lee" }],
  whatsapp: "+60123456789",
  tournamentName: "Kuala Lumpur Open",
  tournamentStartDate: "2026-09-10",
  tournamentEndDate: "2026-09-12",
  tournamentLocation: "Kuala Lumpur",
  frameType: "upcoming_event" as const,
  events: [{ eventName: "Mixed Doubles", sortOrder: 0 }],
  sponsors: [],
  colorPreference: "orange",
  themePreference: "futuristic",
  packageSlug: "duo-frame",
  confirmedAccurate: true as const,
};

const standardAssets = [
  asset("player_photo", "order-assets", "player-a.png", playerId),
  asset("tournament_logo", "order-assets", "logo.png"),
  asset("payment_proof", "payment-proofs", "receipt.png"),
];

describe("order draft validation", () => {
  it("accepts the existing upcoming-event brief", () => {
    expect(orderDraftSchema.safeParse(order).success).toBe(true);
  });

  it("supports up to six named players", () => {
    expect(
      orderDraftSchema.safeParse({
        ...order,
        players: Array.from({ length: 6 }, (_, index) => ({
          id: `00000000-0000-4000-8000-00000000000${index + 2}`,
          fullName: `Player ${index + 1}`,
        })),
      }).success,
    ).toBe(true);
    expect(
      orderDraftSchema.safeParse({
        ...order,
        players: Array.from({ length: 7 }, (_, index) => ({
          id: `00000000-0000-4000-8000-00000000000${index + 2}`,
          fullName: `Player ${index + 1}`,
        })),
      }).success,
    ).toBe(false);
  });

  it("requires a placement for each congratulations event", () => {
    expect(
      orderDraftSchema.safeParse({
        ...order,
        frameType: "congratulations",
      }).success,
    ).toBe(false);
    expect(
      orderDraftSchema.safeParse({
        ...order,
        frameType: "congratulations",
        events: [{ ...order.events[0], placement: 1 }],
      }).success,
    ).toBe(true);
  });

  it("requires an announcement message and tone together", () => {
    expect(
      orderDraftSchema.safeParse({ ...order, frameType: "announcement" })
        .success,
    ).toBe(false);
    expect(
      orderDraftSchema.safeParse({
        ...order,
        frameType: "announcement",
        announcementMessage: "Jamie joins Team DINKFRAME.",
        announcementTone: "bold",
      }).success,
    ).toBe(true);
  });
});

describe("order submission payment validation", () => {
  it("accepts one photo for a one-player poster", () => {
    expect(
      orderSubmissionSchema.safeParse({
        draftId,
        order,
        assets: standardAssets,
      }).success,
    ).toBe(true);
  });

  it("requires a receipt for a new package purchase", () => {
    const result = orderSubmissionSchema.safeParse({
      draftId,
      order,
      assets: standardAssets.slice(0, -1),
    });
    expect(result.success).toBe(false);
  });

  it("accepts no receipt for a frame credit and rejects an extra receipt", () => {
    const creditOrder = { ...order, frameEntitlementId: entitlementId };
    expect(
      orderSubmissionSchema.safeParse({
        draftId,
        order: creditOrder,
        assets: standardAssets.slice(0, -1),
      }).success,
    ).toBe(true);
    expect(
      orderSubmissionSchema.safeParse({
        draftId,
        order: creditOrder,
        assets: standardAssets,
      }).success,
    ).toBe(false);
  });
});

function asset(
  assetType: "player_photo" | "tournament_logo" | "payment_proof",
  bucketId: "order-assets" | "payment-proofs",
  filename: string,
  playerId?: string,
) {
  return {
    assetType,
    bucketId,
    storagePath: `orders/${draftId}/${filename}`,
    originalFilename: filename,
    mimeType: "image/png",
    fileSize: 1024,
    playerId,
  };
}
