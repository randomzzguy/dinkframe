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

Wizard validation → reserve an RLS-owned `order_drafts` ID → upload originals to private `orders/{draft_id}` paths → server action validates counts and paths → PostgreSQL function locks the draft, verifies Storage objects, snapshots the authoritative package, creates the order with the same ID, records metadata/events/history, and deletes the draft atomically → submitted paths become client read-only → confirmation returns the order number.

### Advance production

Admin server action → `ADMIN_EMAIL` guard → RLS admin role → transition validation → update order → database trigger appends status history → optional client-visible event.

### Run ChatGPT production

Admin queues a paid order stage → server reloads order/assets from Supabase and snapshots the submission mode → admin-only `generation_jobs` row → local runner authenticates to a narrow Next.js API with a dedicated token → service-role RPC atomically leases one job → short-lived signed assets → localhost-only Playwright connection verifies the ChatGPT composer → pause before Send or click Send according to the snapshot → runner records the outcome. ChatGPT response collection remains manual.

### Delete an archive

Admin export route streams metadata and private assets into a ZIP → export RPC records `exported_at` and resets any earlier verification → owner opens the local ZIP → verification RPC records `archive_verified_at` → archive RPC advances status → exact order-number confirmation → server action enumerates and deletes Storage objects → audited database RPC writes a deletion receipt and removes the order cascade.

## Naming decisions

- `order_event_details` means the competitive events entered by the player.
- `order_events` means the operational/audit event stream.
- `order_status_history` is the immutable status-only timeline.
- Monetary values use `*_myr` or snapshot names and PostgreSQL `numeric(10,2)`.
- Machine states use database enums and human labels stay in TypeScript.

## State ownership

- Public portfolio: local configuration in v1.
- Package and theme configuration: Supabase tables.
- Order form text draft: local storage plus an RLS-owned durable draft ID.
- Uploaded originals: private Supabase Storage.
- Order/payment/status/amendment truth: Supabase Postgres.
- Admin email: server environment plus matching admin profile role.
- Payment instructions and QR path: singleton `payment_settings` row managed by the owner.
- Studio submission mode: singleton `automation_settings` row, readable and writable only by the admin. Review-before-send is the default; a future queued job copies the current mode so changing the global toggle cannot alter a job already in progress.
- Automation jobs: admin-only `generation_jobs` rows own immutable input and asset snapshots. The local runner receives short-lived downloads through a bearer-token API; it never receives the Supabase service-role key.
