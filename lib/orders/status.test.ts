import { describe, expect, it } from "vitest";

import {
  ORDER_STATUS_BADGE_STYLES,
  PAYMENT_STATUS_BADGE_STYLES,
  isStandardStatusTransition,
} from "./status";

describe("status transitions", () => {
  it("allows the normal production path", () => {
    expect(
      isStandardStatusTransition("request_received", "payment_confirmed"),
    ).toBe(true);
    expect(isStandardStatusTransition("amendment_period", "completed")).toBe(
      true,
    );
    expect(isStandardStatusTransition("completed", "archived")).toBe(true);
  });

  it("rejects skipped or destructive transitions", () => {
    expect(isStandardStatusTransition("request_received", "completed")).toBe(
      false,
    );
    expect(isStandardStatusTransition("archived", "request_received")).toBe(
      false,
    );
  });

  it("uses representative colors for production and payment states", () => {
    expect(ORDER_STATUS_BADGE_STYLES.request_received.badge).toContain("sky");
    expect(ORDER_STATUS_BADGE_STYLES.design_in_progress.badge).toContain(
      "violet",
    );
    expect(ORDER_STATUS_BADGE_STYLES.amendment_period.badge).toContain(
      "orange",
    );
    expect(ORDER_STATUS_BADGE_STYLES.completed.badge).toContain("emerald");
    expect(ORDER_STATUS_BADGE_STYLES.cancelled.badge).toContain("red");
    expect(PAYMENT_STATUS_BADGE_STYLES.confirmed.badge).toContain("emerald");
    expect(PAYMENT_STATUS_BADGE_STYLES.rejected.badge).toContain("red");
  });
});
