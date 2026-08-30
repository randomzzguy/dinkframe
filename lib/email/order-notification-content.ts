export const ORDER_NOTIFICATION_KINDS = [
  "submission_received",
  "payment_confirmed",
  "review_draft_ready",
  "final_poster_ready",
] as const;

export type OrderNotificationKind = (typeof ORDER_NOTIFICATION_KINDS)[number];

type NotificationContentInput = {
  kind: OrderNotificationKind;
  clientName: string;
  orderNumber: string;
  playerName: string;
  tournamentName: string;
  orderUrl: string;
  logoUrl: string;
  usedFrameCredit?: boolean;
};

const copy: Record<
  OrderNotificationKind,
  {
    subject: (orderNumber: string) => string;
    eyebrow: string;
    title: string;
    body: string;
    cta: string;
  }
> = {
  submission_received: {
    subject: (orderNumber) => `We received your DINKFRAME order ${orderNumber}`,
    eyebrow: "ORDER RECEIVED",
    title: "Your frame is in.",
    body: "We have received your poster details and payment proof. We will review everything and let you know when production begins.",
    cta: "View your order",
  },
  payment_confirmed: {
    subject: (orderNumber) =>
      `Payment confirmed — ${orderNumber} is now in production`,
    eyebrow: "PRODUCTION STARTED",
    title: "We’re creating your frame.",
    body: "Your payment has been confirmed and your poster is now in production. We will contact you again when the first draft is ready.",
    cta: "Track your frame",
  },
  review_draft_ready: {
    subject: (orderNumber) =>
      `Your first DINKFRAME draft is ready — ${orderNumber}`,
    eyebrow: "DRAFT READY",
    title: "Your first frame is ready.",
    body: "Open your private order page to review the draft. If you need changes, submit your amendment from the same page.",
    cta: "Review your draft",
  },
  final_poster_ready: {
    subject: (orderNumber) =>
      `Your final DINKFRAME poster is ready — ${orderNumber}`,
    eyebrow: "FINAL FRAME READY",
    title: "Ready to download.",
    body: "Your final poster has been published in full quality. Sign in securely to your order page to view and download it.",
    cta: "Download your frame",
  },
};

export function renderOrderNotification(input: NotificationContentInput) {
  const content =
    input.kind === "submission_received" && input.usedFrameCredit
      ? {
          ...copy.submission_received,
          body: "We have received your new poster brief and applied one of your existing frame credits. No new payment receipt is needed, and production has started.",
        }
      : copy[input.kind];
  const clientName = escapeHtml(input.clientName || "there");
  const orderNumber = escapeHtml(input.orderNumber);
  const playerName = escapeHtml(input.playerName);
  const tournamentName = escapeHtml(input.tournamentName);
  const orderUrl = escapeHtml(input.orderUrl);
  const logoUrl = escapeHtml(input.logoUrl);

  const text = [
    `Hi ${input.clientName || "there"},`,
    "",
    content.title,
    content.body,
    "",
    `${input.orderNumber} · ${input.playerName} · ${input.tournamentName}`,
    "",
    input.orderUrl,
    "",
    "This secure link asks you to sign in before showing any order files.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(content.subject(input.orderNumber))}</title></head>
<body style="margin:0;background:#f2f3ed;color:#11130e;font-family:Arial,Helvetica,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.body)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f3ed;padding:28px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #dfe2d8;border-radius:22px;overflow:hidden">
      <tr><td style="padding:28px 32px 20px"><img src="${logoUrl}" width="176" alt="DINKFRAME" style="display:block;max-width:176px;height:auto"></td></tr>
      <tr><td style="padding:4px 32px 34px">
        <p style="margin:0 0 14px;color:#68705e;font-size:11px;font-weight:800;letter-spacing:2px">${content.eyebrow}</p>
        <h1 style="margin:0 0 16px;font-size:34px;line-height:1.08;letter-spacing:-1.2px">${content.title}</h1>
        <p style="margin:0 0 10px;color:#555b50;font-size:16px;line-height:1.65">Hi ${clientName},</p>
        <p style="margin:0 0 26px;color:#555b50;font-size:16px;line-height:1.65">${content.body}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 26px;background:#f7f8f2;border-left:4px solid #d8ff36;border-radius:12px"><tr><td style="padding:17px 18px">
          <strong style="font-size:15px">${orderNumber}</strong><br>
          <span style="color:#62685d;font-size:13px;line-height:1.6">${playerName} · ${tournamentName}</span>
        </td></tr></table>
        <a href="${orderUrl}" style="display:inline-block;background:#d8ff36;color:#11130e;border-radius:12px;padding:15px 22px;font-size:15px;font-weight:800;text-decoration:none">${content.cta} &nbsp;→</a>
        <p style="margin:22px 0 0;color:#858a80;font-size:12px;line-height:1.6">For your privacy, you must sign in with the email used for this order before any poster or order details are shown.</p>
      </td></tr>
      <tr><td style="background:#11130e;padding:20px 32px;color:#c9cec2;font-size:12px;line-height:1.6">YOUR GAME. OUR FRAME.<br><span style="color:#8f9589">DINKFRAME · Malaysia</span></td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  return { subject: content.subject(input.orderNumber), html, text };
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
