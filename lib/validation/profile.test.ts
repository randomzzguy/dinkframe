import { describe, expect, it } from "vitest";

import { profileDetailsSchema } from "./profile";

describe("profile details validation", () => {
  it("requires a full name", () => {
    expect(
      profileDetailsSchema.safeParse({
        fullName: "",
        whatsapp: "",
        instagramHandle: "",
      }).success,
    ).toBe(false);
  });

  it("allows WhatsApp and Instagram to be skipped", () => {
    const result = profileDetailsSchema.safeParse({
      fullName: "Jamie Lee",
      whatsapp: "",
      instagramHandle: "",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        fullName: "Jamie Lee",
        whatsapp: undefined,
        instagramHandle: undefined,
      });
    }
  });

  it("normalizes an Instagram handle", () => {
    const result = profileDetailsSchema.parse({
      fullName: "Jamie Lee",
      whatsapp: "+60123456789",
      instagramHandle: "@@jamie",
    });

    expect(result.instagramHandle).toBe("jamie");
  });
});
