import { describe, expect, it } from "vitest";

import { renderAdminOrderNotification } from "./admin-order-notification-content";

const paidOrder = {
  orderNumber: "DF-2026-0042",
  playerName: "Aisyah <script>alert(1)</script>",
  clientName: "Aisyah Lee",
  clientEmail: "aisyah@example.com",
  clientWhatsapp: "+60123456789",
  tournamentName: "Dink Open",
  packageName: "Double Frame",
  packageAmount: 150,
  receiptStatus: "attached" as const,
  receiptFilename: "gxbank-receipt.pdf",
  adminOrderUrl:
    "https://app.dinkframe.my/auth/admin-order-action?order=00000000-0000-4000-8000-000000000042&decision=open",
  confirmPaymentUrl:
    "https://app.dinkframe.my/auth/admin-order-action?order=00000000-0000-4000-8000-000000000042&decision=confirm",
  rejectPaymentUrl:
    "https://app.dinkframe.my/auth/admin-order-action?order=00000000-0000-4000-8000-000000000042&decision=reject",
  logoUrl: "https://dinkframe.my/upscaledlogo.png",
  usedFrameCredit: false,
};

describe("admin new-order email content", () => {
  it("includes the order, package, receipt, and secure payment review links", () => {
    const result = renderAdminOrderNotification(paidOrder);

    expect(result.subject).toContain("DF-2026-0042");
    expect(result.text).toContain("Double Frame · RM150.00");
    expect(result.text).toContain("gxbank-receipt.pdf");
    expect(result.html).toContain("Review &amp; confirm payment");
    expect(result.html).toContain("Review &amp; reject");
    expect(result.text).toContain("one deliberate confirmation click");
  });

  it("escapes client-controlled text", () => {
    const result = renderAdminOrderNotification(paidOrder);

    expect(result.html).not.toContain("<script>alert(1)</script>");
    expect(result.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("starts a credit-funded frame without showing payment actions", () => {
    const result = renderAdminOrderNotification({
      ...paidOrder,
      packageAmount: 0,
      receiptStatus: "not_required",
      receiptFilename: undefined,
      confirmPaymentUrl: undefined,
      rejectPaymentUrl: undefined,
      usedFrameCredit: true,
    });

    expect(result.text).toContain("production has started automatically");
    expect(result.text).toContain("Not required — frame credit used");
    expect(result.text).not.toContain("Review & confirm payment:");
    expect(result.html).toContain("Open production order");
  });
});
