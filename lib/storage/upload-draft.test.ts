import { describe, expect, it } from "vitest";

import { validateUploadFile } from "./upload-draft";

const image = { name: "player.jpg", size: 5 * 1024 * 1024, type: "image/jpeg" };

describe("upload validation", () => {
  it("accepts supported player images", () => {
    expect(validateUploadFile("player_photo", image)).toBeNull();
  });

  it("rejects unsupported player image types", () => {
    expect(
      validateUploadFile("player_photo", { ...image, type: "image/gif" }),
    ).toContain("JPEG");
  });

  it("allows PDFs only for payment proof", () => {
    const pdf = { name: "payment.pdf", size: 1024, type: "application/pdf" };
    expect(validateUploadFile("payment_proof", pdf)).toBeNull();
    expect(validateUploadFile("tournament_logo", pdf)).not.toBeNull();
  });
});
