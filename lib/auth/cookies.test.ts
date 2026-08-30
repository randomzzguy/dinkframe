import { describe, expect, it } from "vitest";

import { getSharedAuthCookieOptions } from "./cookies";

describe("shared DINKFRAME auth cookies", () => {
  it("shares production sessions across the site and app subdomain", () => {
    expect(getSharedAuthCookieOptions("dinkframe.my")?.domain).toBe(
      ".dinkframe.my",
    );
    expect(getSharedAuthCookieOptions("app.dinkframe.my")?.domain).toBe(
      ".dinkframe.my",
    );
  });

  it("does not attach production cookie scope to local or preview hosts", () => {
    expect(getSharedAuthCookieOptions("localhost:3000")).toBeUndefined();
    expect(getSharedAuthCookieOptions("preview.vercel.app")).toBeUndefined();
    expect(getSharedAuthCookieOptions("notdinkframe.my")).toBeUndefined();
  });
});
