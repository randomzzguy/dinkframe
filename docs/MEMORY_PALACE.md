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

## The courtside messenger — account and order email

What happens: Supabase creates one-time account links and security messages.
The app sends four order milestones through Resend: received, payment confirmed,
review ready, and final ready.

Where it lives:

- Template generator: `scripts/generate-email-templates.mjs`
- Generated email-safe HTML: `supabase/templates`
- Local template wiring: `supabase/config.toml`
- Hosted installation guide: `supabase/templates/README.md`
- Order sender and templates: `lib/email/order-notifications.ts` and
  `lib/email/order-notification-content.ts`
- Delivery receipts: `order_notification_deliveries`

Rule to remember: Supabase owns the one-time token and its destination. Keep
template variables such as `{{ .ConfirmationURL }}` unchanged, use absolute
public image URLs, disable Resend link tracking, and never place SMTP or API
secrets in Git. Order email links pass through login and never bypass order RLS.

## The player tunnel — client ordering

What happens: authenticated players see their orders and walk through the nine-step order brief.

Where it lives:

- Routes: `app/(client)`
- Wizard: `components/client/order-wizard.tsx`
- Repeat-client profile: `app/(client)/profile` and `components/client/profile-form.tsx`
- Validation: `lib/validation/order.ts`
- Upload policy constants: `lib/storage/constants.ts`

Rule to remember: the first frame should feel like `Upload → choose style → pay → done.` A confirmed multi-frame package then becomes `Upload → choose style → use frame credit → done`, with no duplicate receipt. The wizard is mobile-first, recovers form and uploaded-file metadata locally, uses resumable private uploads for larger files, and submits through an atomic PostgreSQL function.

A poster may contain 1–6 players and up to eight athlete photos total. Every
player needs at least one photo. `order_players` owns the ordered identities and
`order_assets.player_id` keeps each original assigned to the correct athlete;
the prompt and image manifests preserve those labels through Hermes. Instagram
handles remain internal social-tagging metadata and never enter poster prompts.

The Events step also owns the frame narrative. `upcoming_event` keeps the
standard tournament/date/venue brief; `congratulations` requires a 1st–6th
placement for every entered event; `announcement` requires a message brief and
one controlled tone. These additions do not remove the existing player,
tournament, event, creative, upload, package, or payment requirements. The
shared labels and values live in `lib/orders/frame-types.ts`.

Frame type is routing metadata only. It changes narrative and hierarchy, but
`Upcoming event`, `Congratulations`, `Announcement`, and equivalent category
headings must never be rendered or included in a poster text checklist unless
the client independently supplied that wording as announcement copy.

## The design floor — admin production

What happens: the owner confirms payment, produces the artwork, responds to amendments, delivers files, and prepares archives. Status follows those actions automatically.

The overview cards are colored queue shortcuts. Each opens the shared order
queue with an order or payment-state filter already applied; status colors are
shared with client order cards and both admin/client detail views.

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

Action rule: confirming payment starts production; approving the generated image enters finishing touches; publishing a review opens amendments; publishing a final completes the order. Never require the owner to repeat these outcomes in a separate status form.

New-order owner alert: every successful submission also sends one idempotent
email to `ADMIN_EMAIL` with the authoritative player, package, order number,
client contact, and (for a paid package) the private payment proof as an email
attachment. Credit-funded repeat frames are labeled as already in production
and never show payment controls.

Email payment-action rule: email links never mutate an order. They pass only an
allowlisted order UUID and review intent through `/auth/admin-order-action`,
preserve that destination through magic-link login, and open the normal admin
payment form. The owner must still make one authenticated POST; the database
RPC remains the sole payment/status mutation boundary. This prevents email-link
scanners or forwarded messages from confirming or rejecting a payment.

## The job board — order state

Every order moves through this controlled path:

`request_received → payment_confirmed → design_in_progress → finishing_touches → amendment_period → completed → archived`

Cancellation is an escape route; an admin may make an unusual correction only with deliberate confirmation in the future UI.

Where it lives:

- Type and labels: `lib/types/domain.ts`, `lib/orders/status.ts`
- Database enum and history trigger: first Supabase migration
- Client timeline source: `order_status_history` and `order_events`

Rule to remember: uploading proof does not confirm payment. The owner confirms it once; the transaction updates payment, production status, history, client event, and one milestone email.

## The locked vault — Supabase

What it holds:

- Postgres: profiles, order metadata, package snapshots, frame entitlements and their append-only usage ledger, events, amendments, automation settings, generation jobs, notification receipts, and audit records
- Private Storage: original creative assets and payment proofs

Where it lives:

- Schema/RLS: `supabase/migrations/202608260001_foundation.sql`
- Buckets/policies: `supabase/migrations/202608260002_storage.sql`
- Submission workflow: `supabase/migrations/202608260003_order_workflow.sql`
- Protected multi-frame wallet: `supabase/migrations/202608300002_frame_entitlements.sql`
- Archive safeguards: `supabase/migrations/202608260004_archive_and_settings.sql`
- Type contract: `lib/types/database.ts`
- Runner endpoints: `app/api/automation/jobs`

Rule to remember: files never live in Postgres. A client must not read another client’s row or object even if they guess an ID or path. Service-role access is reserved for narrow server-only operations. Automation approval tokens are hashed, generated images remain owner-local until finishing, and only the explicit poster-publication path exposes a file to the client.

## The amendment counter — commercial rules

Package allowances are 2, 4, 6, and 10 free amendments. The allowance belongs to the package purchase and is shared across every frame created from it. Once consumed, each additional amendment is RM10 and must be manually confirmed.

Where it lives:

- Pure calculations: `lib/orders/amendments.ts`
- Transaction and row lock: current `public.submit_amendment` in the frame-entitlement migration
- Package source: `packages` table, snapshotted into `frame_entitlements` and linked orders

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

Local MVP foundation complete: project configuration, all route surfaces, public site with cross-subdomain signed-in identity, magic-link session plumbing, guarded layouts, editable repeat-client profiles, durable draft IDs, resumable private uploads, atomic order submission, server-owned multi-frame credits and shared amendment allowances, signed asset views, client amendments, a searchable admin queue, action-driven production statuses, four idempotent order emails, payment settings and QR management, an order-linked concise creative-director pipeline with theme/typography quality gates, hashed approvals, native owner-only Telegram decision buttons, revision feedback interception, and owner-local image capture, private review/final poster publication and client downloads, streaming ZIP exports, verified archive/delete controls, typed domain logic, tests, schema, seeds, RLS, and private buckets.

Next slice: configure the Resend sending key and run one full client/admin lifecycle smoke test.
