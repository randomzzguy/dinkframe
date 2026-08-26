import { describe, expect, it } from "vitest";

import {
  classifyNextAmendment,
  getFreeAmendmentsRemaining,
} from "./amendments";

describe("amendment calculation", () => {
  it("never returns a negative free balance", () => {
    expect(getFreeAmendmentsRemaining({ freeTotal: 2, freeUsed: 7 })).toBe(0);
  });

  it("uses free allowance before requiring payment", () => {
    expect(
      classifyNextAmendment({ freeTotal: 2, freeUsed: 1, paidUsed: 0 }),
    ).toEqual({
      kind: "free",
      freeRemaining: 0,
      additionalPriceMyr: 0,
    });
    expect(
      classifyNextAmendment({ freeTotal: 2, freeUsed: 2, paidUsed: 0 }),
    ).toEqual({
      kind: "paid_required",
      freeRemaining: 0,
      additionalPriceMyr: 10,
    });
  });
});
