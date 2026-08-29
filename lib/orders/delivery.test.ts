import { describe, expect, it } from "vitest";

import {
  createPosterDeliveryStoragePath,
  posterDeliveryLabel,
  validatePosterDeliveryFile,
} from "./delivery";

describe("poster delivery files", () => {
  it("builds an order-scoped path without unsafe filename characters", () => {
    expect(
      createPosterDeliveryStoragePath({
        orderId: "order-id",
        kind: "review",
        filename: "Jordan FINAL (v2).png",
        uniqueId: "asset-id",
      }),
    ).toBe("orders/order-id/deliveries/review/asset-id-jordan-final-v2.png");
  });

  it("accepts supported poster images within the private bucket limit", () => {
    expect(
      validatePosterDeliveryFile({
        name: "poster.webp",
        size: 2_000_000,
        type: "image/webp",
      }),
    ).toBeNull();
  });

  it("rejects unsupported or oversized deliverables", () => {
    expect(
      validatePosterDeliveryFile({
        name: "poster.pdf",
        size: 1_000,
        type: "application/pdf",
      }),
    ).toContain("JPEG");
    expect(
      validatePosterDeliveryFile({
        name: "poster.png",
        size: 25 * 1024 * 1024 + 1,
        type: "image/png",
      }),
    ).toContain("25 MB");
  });

  it("labels temporary and permanent poster deliveries clearly", () => {
    expect(posterDeliveryLabel(true)).toBe("Review poster");
    expect(posterDeliveryLabel(false)).toBe("Final poster");
  });
});
