import { describe, expect, it } from "vitest";

import { renderOrderNotification } from "./order-notification-content";

const input = {
  clientName: "Aisyah <script>alert(1)</script>",
  orderNumber: "DF-2026-0042",
  playerName: "Aisyah Lee",
  tournamentName: "Dink Open",
  orderUrl:
    "https://app.dinkframe.my/login?next=%2Forders%2F00000000-0000-4000-8000-000000000042",
  logoUrl: "https://dinkframe.my/upscaledlogo.png",
} as const;

describe("order notification content", () => {
  it.each([
    "submission_received",
    "payment_confirmed",
    "review_draft_ready",
    "final_poster_ready",
  ] as const)("renders the %s lifecycle email", (kind) => {
    const result = renderOrderNotification({ ...input, kind });
    expect(result.subject).toContain("DF-2026-0042");
    expect(result.html).toContain(input.orderUrl.replace("&", "&amp;"));
    expect(result.text).toContain(input.orderUrl);
  });

  it("escapes client-controlled text in HTML", () => {
    const result = renderOrderNotification({
      ...input,
      kind: "submission_received",
    });
    expect(result.html).not.toContain("<script>alert(1)</script>");
    expect(result.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("does not ask for another receipt when an existing frame credit was used", () => {
    const result = renderOrderNotification({
      ...input,
      kind: "submission_received",
      usedFrameCredit: true,
    });
    expect(result.text).toContain("existing frame credits");
    expect(result.text).toContain("No new payment receipt is needed");
  });
});
