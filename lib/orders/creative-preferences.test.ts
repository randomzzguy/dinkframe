import { describe, expect, it } from "vitest";

import {
  formatThemeName,
  getThemePromptDirection,
} from "@/lib/orders/creative-preferences";

const naturalThemeSlugs = [
  "soft-editorial",
  "contemporary-lifestyle",
  "art-print",
  "organic-modern",
  "quiet-luxury",
  "analog-film",
] as const;

describe("creative theme prompt directions", () => {
  it.each(naturalThemeSlugs)(
    "gives %s a real recipe instead of returning only its label",
    (slug) => {
      const label = formatThemeName(slug);
      const direction = getThemePromptDirection(slug);

      expect(direction).toContain(`${label} — `);
      expect(direction.length).toBeGreaterThan(label.length + 80);
    },
  );

  it("gives established themes specific naturalness-aware direction", () => {
    expect(getThemePromptDirection("clean-premium")).toContain("light-led");
    expect(getThemePromptDirection("cinematic")).toContain("photographic");
    expect(getThemePromptDirection("powerful-athletic")).toContain(
      "generic dark stadium",
    );
  });
});
