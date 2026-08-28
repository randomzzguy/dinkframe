import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const outputDirectory = resolve(projectRoot, "supabase", "templates");

const brand = {
  lime: "#d8ff36",
  ink: "#11130e",
  muted: "#62665b",
  canvas: "#f3f5ed",
  panel: "#ffffff",
  border: "#e2e5da",
  logo: "https://dinkframe.my/icon.png",
  website: "https://dinkframe.my",
  supportEmail: "hello@dinkframe.my",
};

const templates = [
  {
    key: "magic_link",
    file: "magic-link.html",
    dashboardName: "Magic Link",
    subject: "Your secure DINKFRAME sign-in link",
    preheader:
      "Use this secure one-time link to access your DINKFRAME dashboard.",
    eyebrow: "SECURE ACCOUNT ACCESS",
    title: "Your dashboard is ready.",
    intro:
      "Use the button below to securely sign in and view or manage your poster orders.",
    actionUrl: "{{ .ConfirmationURL }}",
    actionLabel: "Sign in to DINKFRAME",
    note: "This link expires in 60 minutes and can only be used once. If you did not request it, you can safely ignore this email.",
  },
  {
    key: "confirmation",
    file: "confirm-signup.html",
    dashboardName: "Confirm signup",
    subject: "Confirm your email for DINKFRAME",
    preheader:
      "Confirm your email address to finish creating your DINKFRAME account.",
    eyebrow: "WELCOME TO DINKFRAME",
    title: "Confirm your email.",
    intro:
      "You are one step away from your poster-order dashboard. Confirm this email address to finish setting up your account.",
    actionUrl: "{{ .ConfirmationURL }}",
    actionLabel: "Confirm email address",
    note: "This confirmation link expires in 60 minutes. If you did not create a DINKFRAME account, you can ignore this email.",
  },
  {
    key: "invite",
    file: "invite-user.html",
    dashboardName: "Invite user",
    subject: "You’re invited to DINKFRAME",
    preheader: "Accept your invitation to join DINKFRAME.",
    eyebrow: "YOUR INVITATION",
    title: "Come frame the game.",
    intro:
      "You have been invited to DINKFRAME. Accept the invitation below to access your account and poster-order dashboard.",
    actionUrl: "{{ .ConfirmationURL }}",
    actionLabel: "Accept invitation",
    note: "This invitation is intended for {{ .Email }}. If you were not expecting it, you can safely ignore this email.",
  },
  {
    key: "recovery",
    file: "reset-password.html",
    dashboardName: "Reset password",
    subject: "Reset your DINKFRAME password",
    preheader: "Use this secure link to reset your DINKFRAME password.",
    eyebrow: "ACCOUNT RECOVERY",
    title: "Reset your password.",
    intro:
      "We received a request to reset the password for your DINKFRAME account.",
    actionUrl: "{{ .ConfirmationURL }}",
    actionLabel: "Reset password",
    note: "This link expires in 60 minutes and can only be used once. If you did not request a password reset, you can safely ignore this email.",
  },
  {
    key: "email_change",
    file: "change-email.html",
    dashboardName: "Change email address",
    subject: "Confirm your new DINKFRAME email",
    preheader: "Confirm the new email address for your DINKFRAME account.",
    eyebrow: "ACCOUNT UPDATE",
    title: "Confirm your new email.",
    intro:
      "A request was made to change the email on your DINKFRAME account to {{ .NewEmail }}.",
    actionUrl: "{{ .ConfirmationURL }}",
    actionLabel: "Confirm new email",
    note: "If you did not request this change, do not click the button and contact us at hello@dinkframe.my.",
  },
  {
    key: "reauthentication",
    file: "reauthentication.html",
    dashboardName: "Reauthentication",
    subject: "{{ .Token }} is your DINKFRAME verification code",
    preheader: "Use this one-time code to verify your identity.",
    eyebrow: "IDENTITY CHECK",
    title: "Your verification code.",
    intro:
      "Enter this code in DINKFRAME to confirm it is really you before continuing:",
    code: "{{ .Token }}",
    note: "This code expires shortly and can only be used once. Never share it with anyone, including DINKFRAME support.",
  },
  {
    key: "password_changed_notification",
    file: "password-changed.html",
    dashboardName: "Password changed",
    subject: "Your DINKFRAME password was changed",
    preheader: "A security update was made to your DINKFRAME account.",
    eyebrow: "SECURITY NOTICE",
    title: "Your password was changed.",
    intro: "The password for your DINKFRAME account was recently changed.",
    actionUrl: "{{ .SiteURL }}",
    actionLabel: "Review your account",
    note: "If you made this change, no action is needed. If you did not, secure your email account and contact us immediately at hello@dinkframe.my.",
  },
  {
    key: "email_changed_notification",
    file: "email-changed.html",
    dashboardName: "Email address changed",
    subject: "Your DINKFRAME email address was changed",
    preheader: "The email address on your DINKFRAME account has changed.",
    eyebrow: "SECURITY NOTICE",
    title: "Your email was changed.",
    intro:
      "The email address on your DINKFRAME account was changed from {{ .OldEmail }} to {{ .Email }}.",
    actionUrl: "{{ .SiteURL }}",
    actionLabel: "Review your account",
    note: "If you made this change, no action is needed. If you did not, contact us immediately at hello@dinkframe.my.",
  },
  {
    key: "phone_changed_notification",
    file: "phone-changed.html",
    dashboardName: "Phone number changed",
    subject: "Your DINKFRAME phone number was changed",
    preheader: "The phone number on your DINKFRAME account has changed.",
    eyebrow: "SECURITY NOTICE",
    title: "Your phone number was changed.",
    intro:
      "The phone number on your DINKFRAME account was changed from {{ .OldPhone }} to {{ .Phone }}.",
    actionUrl: "{{ .SiteURL }}",
    actionLabel: "Review your account",
    note: "If you made this change, no action is needed. If you did not, contact us immediately at hello@dinkframe.my.",
  },
  {
    key: "identity_linked_notification",
    file: "sign-in-method-linked.html",
    dashboardName: "Sign-in method linked",
    subject: "A sign-in method was added to DINKFRAME",
    preheader: "A new sign-in method was connected to your DINKFRAME account.",
    eyebrow: "SECURITY NOTICE",
    title: "A sign-in method was added.",
    intro:
      "A new {{ .Provider }} sign-in method was linked to your DINKFRAME account.",
    actionUrl: "{{ .SiteURL }}",
    actionLabel: "Review your account",
    note: "If you added this method, no action is needed. If you did not, contact us immediately at hello@dinkframe.my.",
  },
  {
    key: "identity_unlinked_notification",
    file: "sign-in-method-removed.html",
    dashboardName: "Sign-in method removed",
    subject: "A sign-in method was removed from DINKFRAME",
    preheader: "A sign-in method was disconnected from your DINKFRAME account.",
    eyebrow: "SECURITY NOTICE",
    title: "A sign-in method was removed.",
    intro:
      "The {{ .Provider }} sign-in method was removed from your DINKFRAME account.",
    actionUrl: "{{ .SiteURL }}",
    actionLabel: "Review your account",
    note: "If you removed this method, no action is needed. If you did not, contact us immediately at hello@dinkframe.my.",
  },
  {
    key: "mfa_factor_enrolled_notification",
    file: "verification-method-added.html",
    dashboardName: "Verification method added",
    subject: "A verification method was added to DINKFRAME",
    preheader: "A new verification method was added to your DINKFRAME account.",
    eyebrow: "SECURITY NOTICE",
    title: "Verification method added.",
    intro:
      "A new {{ .FactorType }} verification method was added to your DINKFRAME account.",
    actionUrl: "{{ .SiteURL }}",
    actionLabel: "Review your account",
    note: "If you added this method, no action is needed. If you did not, contact us immediately at hello@dinkframe.my.",
  },
  {
    key: "mfa_factor_unenrolled_notification",
    file: "verification-method-removed.html",
    dashboardName: "Verification method removed",
    subject: "A verification method was removed from DINKFRAME",
    preheader: "A verification method was removed from your DINKFRAME account.",
    eyebrow: "SECURITY NOTICE",
    title: "Verification method removed.",
    intro:
      "A {{ .FactorType }} verification method was removed from your DINKFRAME account.",
    actionUrl: "{{ .SiteURL }}",
    actionLabel: "Review your account",
    note: "If you removed this method, no action is needed. If you did not, contact us immediately at hello@dinkframe.my.",
  },
];

function renderButton(url, label) {
  return `
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
                        <tr>
                          <td bgcolor="${brand.lime}" style="border-radius: 12px; text-align: center;">
                            <a href="${url}" style="display: inline-block; padding: 15px 24px; border: 1px solid ${brand.lime}; border-radius: 12px; background: ${brand.lime}; color: ${brand.ink}; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 800; line-height: 18px; text-decoration: none;">${label} &nbsp;&rarr;</a>
                          </td>
                        </tr>
                      </table>`;
}

function renderFallback(url) {
  return `
                      <p style="margin: 0 0 8px; color: #777b70; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px;">Button not working? Copy and paste this secure link into your browser:</p>
                      <p style="margin: 0; overflow-wrap: anywhere; word-break: break-word; color: #50544a; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px;"><a href="${url}" style="color: #506800; text-decoration: underline;">${url}</a></p>`;
}

function renderCode(code) {
  return `
                      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 28px;">
                        <tr>
                          <td align="center" bgcolor="#f7f8f2" style="padding: 22px; border: 1px solid ${brand.border}; border-left: 4px solid ${brand.lime}; border-radius: 12px; color: ${brand.ink}; font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 8px; line-height: 42px;">${code}</td>
                        </tr>
                      </table>`;
}

function renderTemplate(template) {
  const primaryAction = template.code
    ? renderCode(template.code)
    : renderButton(template.actionUrl, template.actionLabel);
  const fallback = template.actionUrl?.includes("ConfirmationURL")
    ? renderFallback(template.actionUrl)
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${template.subject}</title>
  </head>
  <body style="margin: 0; padding: 0; background: ${brand.canvas}; color: ${brand.ink};">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">${template.preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="${brand.canvas}" style="width: 100%; background: ${brand.canvas};">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="width: 100%; max-width: 600px;">
            <tr>
              <td bgcolor="${brand.ink}" style="padding: 24px 34px; border-radius: 22px 22px 0 0; background: ${brand.ink};">
                <a href="${brand.website}" style="display: inline-block; text-decoration: none;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-right: 12px; vertical-align: middle;">
                        <img src="${brand.logo}" width="76" alt="" style="display: block; width: 76px; height: auto; border: 0;">
                      </td>
                      <td style="vertical-align: middle;">
                        <p style="margin: 0 0 3px; color: #ffffff; font-family: Arial, Helvetica, sans-serif; font-size: 21px; font-weight: 800; letter-spacing: -0.5px; line-height: 23px;">DINKFRAME</p>
                        <p style="margin: 0; color: ${brand.lime}; font-family: Arial, Helvetica, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: 1.5px; line-height: 12px;">PICKLEBALL CREATIVE STUDIO</p>
                      </td>
                    </tr>
                  </table>
                </a>
              </td>
            </tr>
            <tr>
              <td bgcolor="${brand.panel}" style="padding: 42px 38px 38px; border-right: 1px solid ${brand.border}; border-left: 1px solid ${brand.border}; background: ${brand.panel};">
                <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <p style="margin: 0 0 14px; color: #587000; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 2px; line-height: 16px;">${template.eyebrow}</p>
                      <h1 style="margin: 0 0 16px; color: ${brand.ink}; font-family: Arial, Helvetica, sans-serif; font-size: 32px; font-weight: 800; letter-spacing: -1px; line-height: 38px;">${template.title}</h1>
                      <p style="margin: 0 0 28px; color: ${brand.muted}; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 25px;">${template.intro}</p>${primaryAction}
                      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 24px;">
                        <tr>
                          <td bgcolor="#f7f8f2" style="padding: 16px 18px; border: 1px solid ${brand.border}; border-left: 4px solid ${brand.lime}; border-radius: 10px; color: #5d6157; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 20px;"><strong style="color: ${brand.ink};">Keep your account safe.</strong><br>${template.note}</td>
                        </tr>
                      </table>${fallback}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#f9faf5" style="padding: 22px 38px; border: 1px solid ${brand.border}; border-top: 0; border-radius: 0 0 22px 22px; background: #f9faf5;">
                <p style="margin: 0 0 6px; color: ${brand.ink}; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: 800; letter-spacing: 1.2px; line-height: 18px;">DINKFRAME &middot; WE FRAME THE GAME</p>
                <p style="margin: 0; color: #7a7e73; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px;">Need help? <a href="mailto:${brand.supportEmail}" style="color: #506800; text-decoration: underline;">${brand.supportEmail}</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

await mkdir(outputDirectory, { recursive: true });

for (const template of templates) {
  await writeFile(
    resolve(outputDirectory, template.file),
    renderTemplate(template),
    "utf8",
  );
}

await writeFile(
  resolve(outputDirectory, "manifest.json"),
  `${JSON.stringify(
    templates.map(({ key, file, dashboardName, subject }) => ({
      key,
      dashboardName,
      subject,
      file,
    })),
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Generated ${templates.length} DINKFRAME email templates.`);
