import { describe, expect, it } from "vitest";

import {
  getAdminPostLoginPath,
  getCrossDomainLoginRedirect,
  getSafeNextPath,
} from "./urls";

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

describe("admin post-login destinations", () => {
  it("preserves a safe admin order action after magic-link sign-in", () => {
    expect(
      getAdminPostLoginPath(
        "/admin/orders/00000000-0000-4000-8000-000000000042?paymentAction=confirm",
      ),
    ).toContain("paymentAction=confirm");
  });

  it("does not send an admin account to a client destination", () => {
    expect(getAdminPostLoginPath("/orders/abc")).toBe("/admin");
  });
});
