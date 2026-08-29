import { describe, expect, it } from "vitest";

import { orderDraftSchema } from "./order";

const baseOrder = {
  playerName: "Jamie Lee",
  instagramHandle: "@jamie",
  whatsapp: "+60123456789",
  tournamentName: "Kuala Lumpur Open",
  tournamentStartDate: "2026-09-10",
  tournamentEndDate: "2026-09-12",
  tournamentLocation: "Kuala Lumpur",
  frameType: "upcoming_event" as const,
  announcementMessage: undefined,
  announcementTone: undefined,
  events: [
    {
      eventName: "Mixed Doubles",
      partnerName: "Alex",
      placement: undefined,
      sortOrder: 0,
    },
  ],
  sponsors: [],
  colorPreference: "surprise",
  customColor: undefined,
  themePreference: "surprise",
  customNotes: undefined,
  referenceUrl: undefined,
  preferredCompletionDate: undefined,
  packageSlug: "single-frame",
  confirmedAccurate: true as const,
};

describe("order draft validation", () => {
  it("accepts the existing upcoming-event brief", () => {
    expect(orderDraftSchema.safeParse(baseOrder).success).toBe(true);
  });

  it("requires a placement for each congratulations event", () => {
    const missingPlacement = orderDraftSchema.safeParse({
      ...baseOrder,
      frameType: "congratulations",
    });
    expect(missingPlacement.success).toBe(false);

    const complete = orderDraftSchema.safeParse({
      ...baseOrder,
      frameType: "congratulations",
      events: [{ ...baseOrder.events[0], placement: 1 }],
    });
    expect(complete.success).toBe(true);
  });

  it("requires an announcement message and tone together", () => {
    expect(
      orderDraftSchema.safeParse({
        ...baseOrder,
        frameType: "announcement",
      }).success,
    ).toBe(false);

    expect(
      orderDraftSchema.safeParse({
        ...baseOrder,
        frameType: "announcement",
        announcementMessage: "Jamie joins Team DINKFRAME.",
        announcementTone: "bold",
      }).success,
    ).toBe(true);
  });
});
