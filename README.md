# DINKFRAME

DINKFRAME is a mobile-first ordering and production tracker for premium pickleball posters. One Next.js application serves the public marketing site, authenticated client portal, and single-owner admin workspace.

The original product specification is in [`DINKFRAME_APP_BUILD.md`](./DINKFRAME_APP_BUILD.md). Start new engineering sessions with [`docs/MEMORY_PALACE.md`](./docs/MEMORY_PALACE.md).

## Current foundation

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4
- shadcn/ui primitives using Base UI
- Supabase SSR clients, magic-link callback, request-time session refresh, client/admin guards
- Public marketing pages and SEO route metadata
- Client dashboard, editable profile/prefill, rich order details, amendment submission, and a nine-step locally autosaved order wizard
- Private browser-to-Supabase uploads with resumable transfer for files over 6 MB
- Atomic order submission that verifies stored assets and snapshots authoritative package pricing
- Admin overview, searchable/filterable queue, private asset downloads, payment review, controlled status updates, and client-visible production messages
- Owner-managed bank/DuitNow instructions and private payment QR
- Streaming ZIP export with metadata and organized original assets
- Human-verified archive lifecycle and order-number-confirmed audited deletion
- Admin-queued Hermes creative production with one-time Telegram prompt/image
  approvals, subscription-backed generation, and a legacy Playwright fallback
- Normalized PostgreSQL schema, durable order drafts, seed records, RLS policies, private Storage buckets, safe yearly order numbering, status audit trigger, and amendment transaction
- Typed package, order-status, amendment, order-number, validation, and upload-limit modules with unit tests

The remaining launch work is live Supabase migration/RLS validation, browser smoke testing, and Vercel/domain configuration.

## Local setup

Requirements: Node.js 20.9 or newer, npm, and a Supabase project (local CLI or hosted).

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and replace every required placeholder.

3. Apply the migrations. With a linked hosted project:

   ```bash
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   For a fully local stack:

   ```bash
   npx supabase start
   npx supabase db reset
   ```

4. Start the application:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:3000`.

## Environment variables

| Variable                               | Runtime      | Purpose                                                      |
| -------------------------------------- | ------------ | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public       | Supabase project URL                                         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public       | Supabase publishable/anon key                                |
| `SUPABASE_SERVICE_ROLE_KEY`            | Server only  | Narrow automation API and live RLS verification              |
| `DINKFRAME_AUTOMATION_RUNNER_TOKEN`    | Server/local | Authenticates the local runner without exposing service role |
| `DINKFRAME_AUTOMATION_APP_URL`         | Local only   | Deployed or local DINKFRAME origin used by the runner        |
| `DINKFRAME_BROWSER_CDP_URL`            | Local only   | Legacy Playwright fallback browser endpoint                  |
| `ADMIN_EMAIL`                          | Server only  | Sole admin email enforced by protected layouts               |
| `NEXT_PUBLIC_APP_URL`                  | Public       | Client app origin and magic-link callback base               |
| `NEXT_PUBLIC_SITE_URL`                 | Public       | Marketing origin, canonical URLs, and sitemap                |

Never expose the service-role key to a Client Component or prefix it with `NEXT_PUBLIC_`.

## Studio automation

After payment is confirmed, the owner starts one Hermes workflow from the admin
order. The local runner creates a professional prompt, sends it to private
Telegram with owner-only Approve, Revise, and Cancel buttons, generates exactly
one image only after approval, and returns that image with a second decision
keyboard attached directly to it. Button payloads contain opaque local action IDs rather than approval
tokens. The workflow is pinned
to the subscription-backed `openai-codex` provider with no paid fallback. Setup,
commands, and failure recovery are documented in
[`docs/HERMES_AUTOMATION.md`](./docs/HERMES_AUTOMATION.md).

## Supabase setup

### Database

Migrations live in `supabase/migrations` and are the source of truth. They build the relational domain, private Storage buckets, durable order submission workflow, and verified archive/deletion safeguards in dependency order.

Package prices and amendment allowances are snapshotted onto submitted orders. Changing a package later never rewrites historical totals.

After any schema change, refresh the checked-in database type:

```bash
npx supabase gen types typescript --linked > lib/types/database.ts
```

Review the generated diff before committing it.

### Authentication

In Supabase Auth URL configuration, set the production site URL and allow both callback origins:

- `https://app.dinkframe.my/auth/callback`
- `http://localhost:3000/auth/callback`

Email/password entry is intentionally absent. Clients sign in through email OTP/magic link.

### Branded authentication emails

DINKFRAME's Supabase authentication and security-notification templates live in
`supabase/templates`. Run `npm run emails:build` to regenerate them, then follow
`supabase/templates/README.md` to install them in the hosted Supabase dashboard.
The live magic-link flow depends on the `{{ .ConfirmationURL }}` placeholder, so
it must not be edited or wrapped by Resend link tracking.

### Admin setup

1. Sign in once with the address configured as `ADMIN_EMAIL`; this creates the profile.
2. Promote that profile using the Supabase SQL editor:

   ```sql
   update public.profiles
   set role = 'admin'
   where lower(email) = lower('owner@example.com');
   ```

The server guard checks `ADMIN_EMAIL`, while RLS checks the admin profile role. Both must agree. This is deliberate defense in depth.

### Storage buckets

Migrations create two private buckets:

- `order-assets`: player images, tournament logos, sponsor logos, private review drafts, and final posters
- `payment-proofs`: payment images and PDFs

Order creation first reserves a database draft ID. Files upload directly to `orders/{draft_id}/...`; the final transaction converts that same ID into the submitted order, so no fragile post-submission file move is required. Policies allow writes only while the draft exists, then make submitted originals read-only to clients. Admin previews and downloads use five-minute signed URLs.

Paid active orders also accept admin-published poster deliveries under `orders/{order_id}/deliveries/...`. Review drafts are retained as temporary final-poster assets, approved finals are permanent assets, and clients receive only short-lived signed URLs from their own order page.

## Quality checks

Run the complete local gate:

```bash
npm run check
```

Or run parts independently with `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

After linking a disposable or intended Supabase project, run the hosted RLS smoke test with a service-role key available only in the current shell:

```bash
npm run test:rls:live
```

The test creates two temporary confirmed users, verifies draft and private-file isolation, verifies the database admin role, and removes all temporary users, rows, and objects in a `finally` cleanup. Never commit the service-role key or place it in a public environment variable.

The unit suite covers:

- package pricing
- amendment allowance and paid-amendment classification
- valid order status transitions
- order-number formatting
- safe, predictable ZIP and asset paths

The manual browser checklist is in [`docs/MANUAL_TEST_CHECKLIST.md`](./docs/MANUAL_TEST_CHECKLIST.md).

## Vercel deployment

1. Push the repository to GitHub.
2. Import the repository into Vercel using the Next.js preset.
3. Add the environment variables for Production and Preview environments.
4. Configure `dinkframe.my` and `app.dinkframe.my` on the same Vercel project.
5. Set the matching Supabase Auth redirect URLs.
6. Apply migrations before enabling real order submissions.
7. Run the production smoke-test checklist.

Normal paths work before hostname-specific routing is enabled. The public site is at `/`; client and admin surfaces are at `/login`, `/dashboard`, `/orders/*`, and `/admin/*`.

## Archive, export, and delete workflow

The intended invariant is:

1. Complete the order.
2. Export an archive ZIP containing metadata and every stored asset; successful generation records `exported_at`.
3. Open and verify the local archive; explicit confirmation records `archive_verified_at`.
4. Archive the order.
5. Require an explicit order-number confirmation before permanent deletion.
6. Delete Storage objects first, then the database order, and write a minimal row to `deleted_order_log`.

Do not automate permanent deletion in v1. A new export invalidates earlier verification. Payment proof is exported and removed with the archived order instead of retained indefinitely.

## Project map

- `app/(marketing)` — public conversion pages
- `app/(auth)` — magic-link entry and callback
- `app/(client)` — authenticated client experience
- `app/admin` — owner-only production workspace
- `components` — shared primitives and surface-specific UI
- `lib/auth` and `lib/supabase` — identity and data clients
- `lib/orders`, `lib/packages`, `lib/storage`, `lib/validation` — business rules
- `lib/types/database.ts` — checked-in Supabase contract
- `supabase/migrations` — database, RLS, functions, and Storage source of truth
- `docs` — memory palace, architecture, decisions, and test handoff

## Working rules

- RLS remains enabled on every exposed table.
- Business-critical mutations happen on the server or in audited PostgreSQL functions.
- Clients never choose authoritative package prices, order numbers, amendment balances, payment confirmation, or status transitions.
- Files stay in private Storage; Postgres stores metadata only.
- Completed orders are never deleted automatically.
