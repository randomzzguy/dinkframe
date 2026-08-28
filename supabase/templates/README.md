# DINKFRAME email templates

These are the source-controlled versions of every Supabase Auth email used or
available to the DINKFRAME project. The templates use email-safe tables and
inline styles, with a light layout, DINKFRAME lime accents, plain instructions,
and the production icon hosted at `https://dinkframe.my/icon.png`.

## Install them in the hosted Supabase project

The hosted dashboard does not automatically read these local files.

1. Run `npm run emails:build` after changing the generator.
2. Open the Supabase project dashboard.
3. Go to **Authentication → Email Templates**.
4. Open each template listed in `manifest.json`.
5. Copy its `subject` from `manifest.json` into the Subject field.
6. Copy the complete contents of its HTML file into the Message body.
7. Save, then send a fresh test email for that flow.

The app currently depends on **Magic Link**. Install and test
`magic-link.html` first. Its `{{ .ConfirmationURL }}` placeholder must stay
unchanged because Supabase replaces it with the one-time access URL.

The first six files in `manifest.json` are authentication messages. The
remaining files are security notifications. A notification template only sends
when that notification is enabled in Supabase; installing its design does not
require enabling a new notification.

## Resend settings

Keep Resend click/link tracking disabled for authentication emails. Tracking can
rewrite Supabase's one-time URLs and make them fail. The sender should be:

- Name: `DINKFRAME`
- Email: `no-reply@auth.dinkframe.my`

Never put the Resend API key in this directory, a template, or Git.

## Local development

The supported local authentication templates are connected in
`supabase/config.toml`. Restart the local Supabase stack after template or config
changes:

```powershell
supabase stop
supabase start
```

Hosted projects still require the dashboard copy step above (or an explicitly
authorized Management API update).
