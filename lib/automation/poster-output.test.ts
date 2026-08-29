import { describe, expect, it } from "vitest";

import { calculateFourByFivePlacement } from "@/lib/automation/poster-output";

describe("poster output normalization", () => {
  it("contains a tall provider image without cropping protected content", () => {
    expect(calculateFourByFivePlacement(997, 1577)).toEqual({
      width: 853,
      height: 1350,
      x: 113,
      y: 0,
    });
  });

  it("contains a wide provider image without cropping protected content", () => {
    expect(calculateFourByFivePlacement(1400, 1350)).toEqual({
      width: 1080,
      height: 1041,
      x: 0,
      y: 154,
    });
  });

  it("preserves an existing 4:5 canvas", () => {
    expect(calculateFourByFivePlacement(1080, 1350)).toEqual({
      width: 1080,
      height: 1350,
      x: 0,
      y: 0,
    });
  });
});
