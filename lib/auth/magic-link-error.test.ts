import { describe, expect, it } from "vitest";

import { getMagicLinkErrorMessage } from "./magic-link-error";

describe("magic-link error messages", () => {
  it("explains the hourly email limit", () => {
    expect(
      getMagicLinkErrorMessage({ code: "over_email_send_rate_limit" }),
    ).toContain("about an hour");
  });

  it("distinguishes the short request cooldown", () => {
    expect(
      getMagicLinkErrorMessage({ code: "over_request_rate_limit" }),
    ).toContain("one minute");
  });

  it("keeps unexpected provider errors generic", () => {
    expect(getMagicLinkErrorMessage({ status: 500 })).toBe(
      "We couldn't send the sign-in link. Please wait a moment and try again.",
    );
  });
});
