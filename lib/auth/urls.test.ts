import { describe, expect, it } from "vitest";

import { getCrossDomainLoginRedirect, getSafeNextPath } from "./urls";

const appUrl = "https://app.dinkframe.my";
const siteUrl = "https://dinkframe.my";

describe("cross-domain login redirects", () => {
  it("moves login from the marketing site to the app hostname", () => {
    const redirect = getCrossDomainLoginRedirect(
      new URL("https://dinkframe.my/login"),
      appUrl,
      siteUrl,
    );

    expect(redirect?.toString()).toBe("https://app.dinkframe.my/login");
  });

  it("preserves query parameters used for auth errors", () => {
    const redirect = getCrossDomainLoginRedirect(
      new URL("https://dinkframe.my/login?error=callback"),
      appUrl,
      siteUrl,
    );

    expect(redirect?.toString()).toBe(
      "https://app.dinkframe.my/login?error=callback",
    );
  });

  it("does not redirect an app-hosted login page", () => {
    const redirect = getCrossDomainLoginRedirect(
      new URL("https://app.dinkframe.my/login"),
      appUrl,
      siteUrl,
    );

    expect(redirect).toBeNull();
  });
});

describe("safe post-login destinations", () => {
  it("keeps an internal order path and query string", () => {
    expect(getSafeNextPath("/orders/abc?from=email")).toBe(
      "/orders/abc?from=email",
    );
  });

  it.each([
    "https://attacker.example/orders/abc",
    "//attacker.example/orders/abc",
    "/\\attacker.example/orders/abc",
  ])("rejects an external redirect attempt: %s", (value) => {
    expect(getSafeNextPath(value)).toBe("/dashboard");
  });
});
