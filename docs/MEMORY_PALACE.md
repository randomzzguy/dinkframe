# DINKFRAME Memory Palace

Use this document to reload the project into your head in a few minutes. Imagine DINKFRAME as a compact sports-design studio with seven rooms. Every room maps to a product surface, code area, and security boundary.

## The street-facing window — public marketing

What you see: `YOUR GAME. OUR FRAME.`, selected work, four packages, and one dominant order CTA.

Where it lives:

- Routes: `app/(marketing)`
- Shared chrome: `components/marketing/site-header.tsx` and `site-footer.tsx`
- Display fallback package data: `lib/packages/catalog.ts`

Rule to remember: the window converts; it does not become a CMS or social platform. Portfolio data stays local in v1. Pricing shown here is a fallback; authoritative purchase pricing comes from Supabase.

## The wristband desk — identity

What happens: a client enters an email, receives a one-time link, and returns through `/auth/callback`.

Where it lives:

- Login action: `app/(auth)/login/actions.ts`
- Callback: `app/(auth)/auth/callback/route.ts`
- Cookie clients: `lib/supabase/browser.ts`, `server.ts`, and `proxy.ts`
- Route guards: `lib/auth/guards.ts`
- Request refresh: root `proxy.ts` (Next.js 16 name for middleware)

Rule to remember: the wristband proves identity, but every room still checks access. Server layouts guard navigation; RLS guards the underlying data.

## The courtside messenger — account email

What happens: Supabase creates one-time account links and security messages,
then Resend delivers them through the DINKFRAME sending domain.

Where it lives:

- Template generator: `scripts/generate-email-templates.mjs`
- Generated email-safe HTML: `supabase/templates`
- Local template wiring: `supabase/config.toml`
- Hosted installation guide: `supabase/templates/README.md`

Rule to remember: Supabase owns the one-time token and its destination. Keep
template variables such as `{{ .ConfirmationURL }}` unchanged, use absolute
public image URLs, disable Resend link tracking, and never place SMTP secrets in
Git.

## The player tunnel — client ordering

What happens: authenticated players see their orders and walk through the nine-step order brief.

Where it lives:

- Routes: `app/(client)`
- Wizard: `components/client/order-wizard.tsx`
- Repeat-client profile: `app/(client)/profile` and `components/client/profile-form.tsx`
- Validation: `lib/validation/order.ts`
- Upload policy constants: `lib/storage/constants.ts`

Rule to remember: the experience should feel like `Upload → choose style → pay → done.` The wizard is mobile-first, recovers form and uploaded-file metadata locally, uses resumable private uploads for larger files, and submits through an atomic PostgreSQL function.

## The design floor — admin production

What happens: the owner confirms payment, downloads assets, advances status, responds to amendments, completes work, and prepares archives.

Where it lives:

- Routes: `app/admin`
- Admin shell: `components/shared/app-shell.tsx`
- Searchable production queue: `app/admin/orders/page.tsx`
- Payment settings: `app/admin/settings` and `components/admin/payment-settings-form.tsx`
- Legacy Playwright submission mode: `components/admin/automation-settings-form.tsx`
- Per-order production queue: `components/admin/generation-controls.tsx`
- Review/final delivery: `components/admin/poster-delivery-uploader.tsx` and `public.publish_poster_delivery`
- Hermes/local companion runbook: `docs/HERMES_AUTOMATION.md`
- Sole-admin server check: `lib/auth/guards.ts`

Rule to remember: there is one owner, not a team-permissions product. The configured `ADMIN_EMAIL` and the `profiles.role = 'admin'` RLS identity must both match. Hermes production always requires an owner-only, one-time Telegram decision. Native buttons carry opaque local action IDs; a normal conversational “yes” is not approval. The older auto-send setting applies only to the legacy Playwright fallback.

Poster delivery rule: the admin uploads directly to a private order-scoped Storage path, but the browser cannot publish it by itself. The server and database verify the order, payment, path, object, type, and size before a review draft or final poster becomes visible to the client. Review drafts use `final_poster` with `is_temporary = true`; approved finals use `is_temporary = false`.

## The job board — order state

Every order moves through this controlled path:

`request_received → payment_confirmed → design_in_progress → finishing_touches → amendment_period → completed → archived`

Cancellation is an escape route; an admin may make an unusual correction only with deliberate confirmation in the future UI.

Where it lives:

- Type and labels: `lib/types/domain.ts`, `lib/orders/status.ts`
- Database enum and history trigger: first Supabase migration
- Client timeline source: `order_status_history` and `order_events`

Rule to remember: uploading proof does not confirm payment. Only the owner changes `payment_status` to `confirmed` and advances the order.

## The locked vault — Supabase

What it holds:

- Postgres: profiles, order metadata, package snapshots, events, amendments, automation settings, generation jobs, and audit records
- Private Storage: original creative assets and payment proofs

Where it lives:

- Schema/RLS: `supabase/migrations/202608260001_foundation.sql`
- Buckets/policies: `supabase/migrations/202608260002_storage.sql`
- Submission workflow: `supabase/migrations/202608260003_order_workflow.sql`
- Archive safeguards: `supabase/migrations/202608260004_archive_and_settings.sql`
- Type contract: `lib/types/database.ts`
- Runner endpoints: `app/api/automation/jobs`

Rule to remember: files never live in Postgres. A client must not read another client’s row or object even if they guess an ID or path. Service-role access is reserved for narrow server-only operations. Automation approval tokens are hashed, generated images remain owner-local until finishing, and only the explicit poster-publication path exposes a file to the client.

## The amendment counter — commercial rules

Package allowances are 2, 4, 6, and 10 free amendments. Once consumed, each additional amendment is RM10 and must be manually confirmed.

Where it lives:

- Pure calculations: `lib/orders/amendments.ts`
- Transaction and row lock: `public.submit_amendment` in the first migration
- Package source: `packages` table, snapshotted onto `orders`

Rule to remember: counters, billing classification, and snapshots are server-owned. Never trust a client calculation.

## The archive loading bay — retention

What happens: `Complete → Export → Verify → Archive → Explicit delete`.

Where it lives:

- Order timestamps: `completed_at`, `exported_at`, `archived_at`
- Export stream: `app/admin/orders/[id]/export/route.ts`
- Archive controls: `components/admin/archive-controls.tsx`
- Minimal deletion receipt: `deleted_order_log`
- Full procedure: README archive section

Rule to remember: nothing is permanently deleted automatically. Payment proof is sensitive and leaves Supabase when the verified archive is purged.

## Three alarm lights

If any of these turn red, stop and fix the foundation before adding features:

1. A client can query another client’s order or object.
2. A browser can set a price, order number, amendment balance, admin role, payment confirmation, or production status.
3. A delete path can run without a verified export and explicit order-number confirmation.

## Current build marker

Local MVP foundation complete: project configuration, all route surfaces, public site, magic-link session plumbing, guarded layouts, editable repeat-client profiles, durable draft IDs, resumable private uploads, atomic order submission, signed asset views, client amendments, a searchable admin queue, admin payment/status actions, payment settings and QR management, an order-linked Hermes creative-director pipeline with hashed approvals, native owner-only Telegram decision buttons, revision feedback interception, and owner-local image capture, private review/final poster publication and client downloads, streaming ZIP exports, verified archive/delete controls, typed domain logic, tests, schema, seeds, RLS, and private buckets.

Next slice: run a synthetic button-based revision/approval smoke test, then exercise the workflow on the next real paid order.
