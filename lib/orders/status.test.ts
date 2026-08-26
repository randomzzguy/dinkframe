import { describe, expect, it } from "vitest";

import { isStandardStatusTransition } from "./status";

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
});
