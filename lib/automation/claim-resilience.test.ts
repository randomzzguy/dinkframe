import { describe, expect, it } from "vitest";

import {
  isRetryableClaimResponse,
  shouldNotifyClaimFailure,
} from "./claim-resilience";

describe("generation job claim resilience", () => {
  it("retries temporary gateway and rate-limit responses", () => {
    expect(isRetryableClaimResponse(503, "Unavailable")).toBe(true);
    expect(isRetryableClaimResponse(429, "Rate limited")).toBe(true);
    expect(isRetryableClaimResponse(500, "Unable to claim a job")).toBe(true);
    expect(isRetryableClaimResponse(500, "Permanent database error")).toBe(
      false,
    );
  });

  it("honors an explicit retryable response hint", () => {
    expect(isRetryableClaimResponse(500, "Hidden error", true)).toBe(true);
  });

  it("alerts after three consecutive failed polls and then only periodically", () => {
    expect(shouldNotifyClaimFailure(1)).toBe(false);
    expect(shouldNotifyClaimFailure(2)).toBe(false);
    expect(shouldNotifyClaimFailure(3)).toBe(true);
    expect(shouldNotifyClaimFailure(4)).toBe(false);
    expect(shouldNotifyClaimFailure(15)).toBe(true);
  });
});
