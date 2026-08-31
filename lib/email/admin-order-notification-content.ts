export type AdminReceiptStatus = "attached" | "unavailable" | "not_required";

type AdminOrderNotificationInput = {
  orderNumber: string;
  playerName: string;
  clientName: string;
  clientEmail: string;
  clientWhatsapp: string;
  tournamentName: string;
  packageName: string;
  packageAmount: number;
  receiptStatus: AdminReceiptStatus;
  receiptFilename?: string;
  adminOrderUrl: string;
  confirmPaymentUrl?: string;
  rejectPaymentUrl?: string;
  logoUrl: string;
  usedFrameCredit: boolean;
};

export function renderAdminOrderNotification(
  input: AdminOrderNotificationInput,
) {
  const subject = `New DINKFRAME order — ${input.orderNumber} · ${input.playerName}`;
  const amount = `RM${input.packageAmount.toFixed(2)}`;
  const receiptLine = receiptCopy(input);
  const productionCopy = input.usedFrameCredit
    ? "An existing frame credit was used, so no payment review is needed and production has started automatically."
    : input.receiptStatus === "attached"
      ? "Review the attached receipt, then use one of the secure buttons below. The link itself never changes the order."
      : "Open the protected order to review the payment proof, then use one of the secure buttons below. The link itself never changes the order.";

  const textLines = [
    "NEW DINKFRAME ORDER",
    "",
    `${input.orderNumber} · ${input.playerName}`,
    `Client: ${input.clientName} (${input.clientEmail})`,
    `WhatsApp: ${input.clientWhatsapp}`,
    `Tournament: ${input.tournamentName}`,
    `Package: ${input.packageName} · ${amount}`,
    receiptLine,
    "",
    productionCopy,
    "",
    `Open order: ${input.adminOrderUrl}`,
  ];

  if (input.confirmPaymentUrl && input.rejectPaymentUrl) {
    textLines.push(
      `Review & confirm payment: ${input.confirmPaymentUrl}`,
      `Review & reject payment: ${input.rejectPaymentUrl}`,
    );
  }

  textLines.push(
    "",
    "Payment links require the DINKFRAME admin account and one deliberate confirmation click.",
  );

  const rows = [
    ["Order", input.orderNumber],
    ["Player", input.playerName],
    ["Client", `${input.clientName} · ${input.clientEmail}`],
    ["WhatsApp", input.clientWhatsapp],
    ["Tournament", input.tournamentName],
    ["Package", `${input.packageName} · ${amount}`],
    ["Receipt", receiptLine],
  ]
    .map(
      ([label, value]) => `<tr>
        <td style="padding:9px 12px;color:#747a6f;font-size:12px;font-weight:700;vertical-align:top">${escapeHtml(label)}</td>
        <td style="padding:9px 12px;color:#181b15;font-size:14px;font-weight:700;vertical-align:top">${escapeHtml(value)}</td>
      </tr>`,
    )
    .join("");

  const paymentButtons =
    input.confirmPaymentUrl && input.rejectPaymentUrl
      ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 14px"><tr>
          <td style="padding:0 10px 10px 0"><a href="${escapeHtml(input.confirmPaymentUrl)}" style="display:inline-block;background:#d8ff36;color:#11130e;border-radius:12px;padding:14px 18px;font-size:14px;font-weight:800;text-decoration:none">Review &amp; confirm payment →</a></td>
          <td style="padding:0 0 10px"><a href="${escapeHtml(input.rejectPaymentUrl)}" style="display:inline-block;background:#ffffff;color:#9f241d;border:1px solid #e3aaa5;border-radius:12px;padding:13px 18px;font-size:14px;font-weight:800;text-decoration:none">Review &amp; reject</a></td>
        </tr></table>`
      : `<a href="${escapeHtml(input.adminOrderUrl)}" style="display:inline-block;background:#d8ff36;color:#11130e;border-radius:12px;padding:14px 20px;font-size:14px;font-weight:800;text-decoration:none">Open production order →</a>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;background:#f2f3ed;color:#11130e;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(`${input.orderNumber} · ${input.playerName} · ${input.packageName}`)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f3ed;padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border:1px solid #dfe2d8;border-radius:22px;overflow:hidden">
      <tr><td style="padding:28px 32px 18px"><img src="${escapeHtml(input.logoUrl)}" width="176" alt="DINKFRAME" style="display:block;max-width:176px;height:auto"></td></tr>
      <tr><td style="padding:4px 32px 34px">
        <p style="margin:0 0 12px;color:#68705e;font-size:11px;font-weight:800;letter-spacing:2px">NEW ORDER</p>
        <h1 style="margin:0 0 12px;font-size:32px;line-height:1.1;letter-spacing:-1px">${escapeHtml(input.playerName)} is ready for review.</h1>
        <p style="margin:0 0 24px;color:#555b50;font-size:15px;line-height:1.65">${escapeHtml(productionCopy)}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 25px;background:#f7f8f2;border-left:4px solid #d8ff36;border-radius:12px">${rows}</table>
        ${paymentButtons}
        <p style="margin:14px 0 0;color:#858a80;font-size:12px;line-height:1.6">Security: these buttons only open a protected review screen. You must be signed in as the configured DINKFRAME admin and confirm once more before payment changes.</p>
        <p style="margin:10px 0 0;font-size:12px"><a href="${escapeHtml(input.adminOrderUrl)}" style="color:#555b50">Open the full admin order</a></p>
      </td></tr>
      <tr><td style="background:#11130e;padding:20px 32px;color:#c9cec2;font-size:12px;line-height:1.6">YOUR GAME. OUR FRAME.<br><span style="color:#8f9589">DINKFRAME · Malaysia</span></td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject, html, text: textLines.join("\n") };
}

function receiptCopy(input: AdminOrderNotificationInput) {
  if (input.receiptStatus === "not_required")
    return "Not required — frame credit used";
  if (input.receiptStatus === "attached") {
    return input.receiptFilename
      ? `Attached · ${input.receiptFilename}`
      : "Attached to this email";
  }
  return "Could not be attached — open the admin order to review it";
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}
