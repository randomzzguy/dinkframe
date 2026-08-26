import { describe, expect, it } from "vitest";

import { formatOrderNumber, isOrderNumber } from "./order-number";

describe("order numbers", () => {
  it("formats the yearly sequence", () => {
    expect(formatOrderNumber(2026, 42)).toBe("DF-2026-0042");
  });

  it("recognizes valid order numbers", () => {
    expect(isOrderNumber("DF-2026-0042")).toBe(true);
    expect(isOrderNumber("42")).toBe(false);
  });
});
