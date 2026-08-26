import { describe, expect, it } from "vitest";

import {
  createAssetArchivePath,
  createOrderExportFilename,
  sanitizeArchiveSegment,
} from "@/lib/orders/export";

describe("order export paths", () => {
  it("creates a recognizable safe ZIP filename", () => {
    expect(
      createOrderExportFilename({
        orderNumber: "DF-2026-0001",
        playerName: "Aisyah / Lee",
        tournamentName: "KL Open: Finals",
      }),
    ).toBe("DF-2026-0001-Aisyah-Lee-KL-Open-Finals.zip");
  });

  it("keeps assets in predictable folders without trusting filenames", () => {
    expect(
      createAssetArchivePath(
        {
          id: "12345678-1234-1234-1234-123456789012",
          asset_type: "payment_proof",
          original_filename: "../Bank Proof (paid).PNG",
        },
        2,
      ),
    ).toBe("assets/payment/03-12345678-Bank-Proof-paid.png");
  });

  it("falls back when a segment contains no safe characters", () => {
    expect(sanitizeArchiveSegment("⚡️")).toBe("untitled");
  });
});
