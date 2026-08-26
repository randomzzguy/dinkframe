import { describe, expect, it } from "vitest";

import { calculatePackagePrice, getPackageBySlug } from "./catalog";

describe("package catalog", () => {
  it("returns the configured MYR price", () => {
    expect(calculatePackagePrice("triple-frame")).toBe(155);
  });

  it("keeps allowance data with each package", () => {
    expect(getPackageBySlug("five-frame")?.freeAmendments).toBe(10);
  });

  it("rejects an unknown package", () => {
    expect(() => calculatePackagePrice("mystery-frame")).toThrow(
      "Unknown package",
    );
  });
});
