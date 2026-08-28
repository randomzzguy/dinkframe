import { describe, expect, it } from "vitest";

import { needsOnboarding } from "./onboarding";

describe("onboarding requirement", () => {
  it("requires onboarding when the profile name is missing", () => {
    expect(needsOnboarding(null)).toBe(true);
    expect(needsOnboarding("   ")).toBe(true);
  });

  it("allows named clients into the app", () => {
    expect(needsOnboarding("Jamie Lee")).toBe(false);
  });
});
