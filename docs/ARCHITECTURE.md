# Architecture

## Deployment shape

One Next.js application and one Supabase project serve both domains. Marketing routes are public. Client and admin routes opt out of indexing and require authenticated server layouts. Hostname-specific rewrites can be added after core flows work without splitting the repository.

## Trust boundaries

| Boundary               | Trusted for                                          | Never trusted for                         |
| ---------------------- | ---------------------------------------------------- | ----------------------------------------- |
| Browser                | UX state, previews, local draft recovery             | Prices, access, status, payment, counters |
| Next.js server         | Input validation, identity gates, orchestration      | Bypassing RLS as a convenience            |
| Supabase RLS/functions | Ownership, admin policy, transactions, audit history | UI-friendly error copy                    |
| Private Storage        | Original files                                       | Permanent public delivery URLs            |

## Request paths

### Read an order

Browser navigation → protected server layout → verified Supabase claims → server query → RLS ownership check → rendered page.

### Submit an order

Wizard validation → reserve an RLS-owned `order_drafts` ID → upload originals to private `orders/{draft_id}` paths → server action validates counts and paths → PostgreSQL function locks the draft, verifies Storage objects, and either snapshots a new authoritative package plus receipt or locks and consumes one activated `frame_entitlements` credit without a receipt → order, entitlement counters, append-only ledger, metadata/events/history, and draft deletion commit atomically → submitted paths become client read-only → confirmation returns the order number. Row locks prevent two simultaneous submissions from spending the same last frame.

### Advance production

Admin performs the meaningful business action → `ADMIN_EMAIL` guard → RLS admin role → one database transaction updates the action result, status, status history, and client event. Payment confirmation starts production; image approval enters finishing; review publication opens amendments; final publication completes the order. The status is an outcome, not a second admin task.

### Run Hermes creative production

Admin starts a paid order workflow → server reloads and snapshots the authoritative order/assets → admin-only prompt job → local runner authenticates to a narrow Next.js API → service-role RPC atomically leases the job → short-lived signed assets → Hermes creative-director skill through `openai-codex` → prompt with an attached owner-only Telegram decision keyboard → opaque local action resolves the hashed one-time token → approval queues one image job → Hermes generates one image and saves a durable owner-machine copy → image with an attached Telegram decision keyboard → manual finishing and explicit client publication. The Hermes user plugin subclasses the bundled Telegram adapter for `df:` callbacks and intercepts revision feedback before the LLM. Artifact delivery is single-attempt; retries and paid fallbacks are never automatic.

### Publish a poster to a client

Admin browser uploads an image directly to the private `order-assets` bucket under an exact order-scoped `deliveries/review` or `deliveries/final` path → admin server action validates the untrusted upload description and rechecks the admin identity → database RPC locks and verifies the paid active order, exact Storage object, MIME type, and size → `order_assets` records the poster as temporary review or permanent final → the same transaction advances the order and creates a client-visible event → the server sends one idempotent lifecycle email → the authenticated owner receives only a five-minute signed view/download URL.

### Email an order milestone

Authenticated client/admin action completes first → narrow server-only service-role helper reloads the authoritative order and profile → unique `order_notification_deliveries(order_id, notification_kind)` receipt claims the milestone → Resend API sends branded HTML/text with a deterministic idempotency key → receipt records success or failure. The CTA points to an allowlisted same-origin post-login path. Login verifies identity; the order query and private Storage URLs still require ownership RLS.

### Delete an archive

Admin export route streams metadata and private assets into a ZIP → export RPC records `exported_at` and resets any earlier verification → owner opens the local ZIP → verification RPC records `archive_verified_at` → archive RPC advances status → exact order-number confirmation → server action enumerates and deletes Storage objects → audited database RPC writes a deletion receipt and removes the order cascade.

## Naming decisions

- `order_event_details` means the competitive events entered by the player;
  congratulations orders also snapshot a validated 1st–6th placement per
  event. `orders.frame_type` controls upcoming-event, congratulations, or
  announcement prompt routing, while announcement copy and tone remain on the
  owning order row.
- `order_events` means the operational/audit event stream.
- `order_status_history` is the immutable status-only timeline.
- Monetary values use `*_myr` or snapshot names and PostgreSQL `numeric(10,2)`.
- Machine states use database enums and human labels stay in TypeScript.

## State ownership

- Public portfolio: local configuration in v1.
- Package and theme configuration: Supabase tables.
- Order form text draft: local storage plus an RLS-owned durable draft ID.
- Uploaded originals: private Supabase Storage.
- Order/payment/status truth and frame/amendment entitlements: Supabase Postgres. Clients have read-only entitlement access; only security-definer workflows consume allowances.
- Admin email: server environment plus matching admin profile role.
- Payment instructions and QR path: singleton `payment_settings` row managed by the owner.
- Legacy Playwright submission mode: singleton `automation_settings` row, readable and writable only by the admin. The Hermes workflow always requires Telegram decisions regardless of this fallback preference.
- Automation jobs: admin-only `generation_jobs` rows own input/asset snapshots, generated prompt or owner-local image path, revision feedback, and hashed one-time approval state. The local runner receives short-lived downloads through a bearer-token API; it never receives the Supabase service-role key.
- Notification receipts: service-role writes only; authenticated admin read-only. A URL or email address never substitutes for an authenticated owner query.
