# DINKFRAME Web App — Codex Build Specification

## 0. Mission

Build a production-ready but intentionally lightweight web application for **DINKFRAME**, a premium pickleball poster/design service.

The app has two connected experiences:

1. **Public marketing site** at `dinkframe.my`
2. **Client + admin application** at `app.dinkframe.my`

The core goal is to make ordering a poster extremely simple for players while giving the DINKFRAME owner a clean internal workflow for receiving requests, checking payment, downloading assets, managing statuses, handling amendments, and archiving/deleting completed orders.

The application should feel like a polished modern design studio, not a generic SaaS dashboard.

---

## 1. Recommended stack

Use:

- **Next.js (App Router) + TypeScript**
- **Tailwind CSS**
- **shadcn/ui** for accessible UI primitives where useful
- **Supabase** for:
  - PostgreSQL database
  - Auth
  - Storage
  - Row Level Security
- **Vercel** for deployment
- **GitHub** for source control
- **Zod** for server-side/form validation
- React Hook Form or equivalent for complex forms

Use the current official Supabase Next.js SSR/auth patterns rather than building custom authentication. Supabase supports magic-link authentication and integrates Auth with Postgres/RLS. Keep all production data protected with RLS. [Official Supabase guidance](https://supabase.com/docs/guides/auth/quickstarts/nextjs)

Use Next.js App Router conventions and current server/client patterns. [Next.js docs](https://nextjs.org/docs)

Do not introduce an ORM unless there is a strong reason. Prefer Supabase's generated TypeScript types and SQL migrations for this small project.

---

## 2. Product principles

The app must be:

- Extremely simple for clients
- Mobile-first because players will likely submit from Instagram/WhatsApp on their phones
- Light themed
- Fast
- Clean and premium
- Minimal clicks
- Easy to operate as a one-person business
- Cheap to run
- Easy to maintain
- Designed so it can grow later without rewriting the foundation

Avoid unnecessary SaaS-like complexity.

Do not build a giant CRM.
Do not add team permissions yet.
Do not build complex invoicing.
Do not build a chat system yet.
Do not build automated poster generation yet.

---

# 3. Site architecture

## Public site: `dinkframe.my`

Pages:

- `/` — homepage
- `/work` — poster portfolio / examples
- `/packages` — pricing packages
- `/how-it-works` — simple ordering explanation
- `/about` — optional lightweight studio/about section
- `/contact` — CTA/contact details
- `/privacy` — privacy policy
- `/terms` — terms/service policy

Primary CTA throughout the site:

**ORDER YOUR POSTER →**

Link it to:

`https://app.dinkframe.my`

Secondary CTA:

**VIEW OUR WORK**

The public site should also include a link/button to Instagram.

Do not make the public website too complicated. The primary goal is to convert visitors into app users.

---

# 4. Client application

Base URL:

`https://app.dinkframe.my`

Client routes:

- `/` — app landing/login
- `/login`
- `/auth/callback`
- `/dashboard`
- `/orders/new`
- `/orders/[id]`
- `/orders/[id]/edit`
- `/profile`

Client authentication should use **email magic links** through Supabase Auth.

Do not require passwords.

Login flow:

1. Client enters email.
2. App sends magic link.
3. Client clicks link.
4. Client lands in dashboard.
5. Existing client sees existing orders.
6. New client sees a clear **Create New Poster Order** CTA.

The app should make it clear that the email is used to access their order dashboard and receive future updates.

---

# 5. Admin application

Admin routes:

- `/admin`
- `/admin/orders`
- `/admin/orders/[id]`
- `/admin/settings`

There is currently **one admin only**.

Do not build multi-admin permissions yet.

The admin account should be identified by an environment variable such as:

`ADMIN_EMAIL`

Do not hard-code admin credentials in source code.

Admin pages must be protected server-side, not only hidden in the UI.

---

# 6. Client order submission flow

The order form should be a guided multi-step form rather than one giant form.

Recommended steps:

### Step 1 — Player

Fields:

- Player full name — required
- Instagram handle — optional
- WhatsApp number — required
- Email — automatically populated from authenticated account

### Step 2 — Tournament

Fields:

- Tournament name — required
- Tournament date start — required
- Tournament date end — required
- Tournament location — required
- Tournament logo — optional/required depending on order

### Step 3 — Events

Allow the client to add one or more events.

Each event should support:

- Event name
- Partner name — optional

Examples:

- U18 Boys Doubles — Partner: Chow Tak
- U18 Mixed Doubles — Partner: Madyson Peav
- Men's Singles 18+

Do not force clients to fit event names into rigid dropdowns. Use editable text fields so the system works for any tournament.

### Step 4 — Player images

Require at least **2 player images**.

Allow multiple image uploads.

Recommended:

- Minimum: 2
- Maximum: 8

Show thumbnails immediately after upload.

Allow users to remove and replace individual images before submission.

Provide a small note:

> Best results: upload clear, high-resolution photos with the player fully visible.

Important: original uploaded files should be preserved. Do not perform destructive client-side compression that harms poster quality.

### Step 5 — Sponsors

Allow the client to choose:

**No sponsors**

or

**Add sponsors**

For each sponsor:

- Sponsor/company name — required
- Logo upload — optional

This supports clients who only know the sponsor name and do not have the logo file.

### Step 6 — Creative direction

Color preference:

- Black & White
- Blue
- Cyan
- Purple
- Green
- Red
- Orange
- Custom
- Surprise Me

Custom color option should allow a hex value or simple color picker.

Theme selection:

Create a curated list of design directions, for example:

- Minimalist
- Clean & Premium
- Powerful / Athletic
- Futuristic
- Cyberpunk
- Luxury Sports
- Editorial
- Neon
- Urban
- Cinematic
- Japanese-inspired
- Tropical
- Experimental

Include thumbnails or simple visual previews for each theme.

Also provide:

**Surprise Me**

When selected, store `theme_preference = surprise` rather than selecting the actual theme immediately. The designer can choose the direction.

Add an optional field:

> Anything else you'd like us to know?

This is useful for notes such as jersey colors, brand preferences, references, special requests, etc.

### Step 7 — Package

Allow the client to select one of the current DINKFRAME packages.

Use configuration/database-driven pricing rather than hard-coded values in UI components.

Current packages:

- Single Frame — RM60 — 1 poster — 2 free amendments
- Duo Frame — RM110 — 2 posters — 4 free amendments
- Triple Frame — RM155 — 3 posters — 6 free amendments
- Five Frame — RM230 — 5 posters — 10 free amendments

Additional amendments: RM10 each.

Store the package price on the order at time of purchase so historical orders are not changed when pricing changes later.

### Step 8 — Payment

Show:

- Package selected
- Total amount
- Payment instructions
- Payment proof upload

Payment proof should be an image/PDF upload.

Do not store sensitive bank/card information in the database.

The payment proof file should live in a **private Supabase Storage bucket**.

### Step 9 — Review & submit

Show a clean order summary before submission.

Require the client to confirm:

> I confirm that the information and uploaded assets are correct.

Then:

**SUBMIT ORDER**

After submission show:

> Order received. We'll review your submission and payment shortly.

Give them their order number.

---

# 7. Important UX rule: autosave drafts

Do not make users lose a 10-minute order because they accidentally refresh or close the browser.

Implement lightweight draft saving.

Recommended approach:

- Store draft metadata in Supabase only after the user is authenticated.
- Save text/form state as the user progresses.
- Upload files immediately to a temporary/draft location.
- Mark draft assets as temporary until order submission.

However, do not over-engineer this in v1.

At minimum, preserve the form state locally in the browser and warn the client before leaving an incomplete form.

---

# 8. Order lifecycle/status system

Use a controlled order status system.

Statuses:

1. `request_received`
2. `payment_confirmed`
3. `design_in_progress`
4. `finishing_touches`
5. `amendment_period`
6. `completed`
7. `archived`
8. `cancelled`

Display friendly labels in the UI:

- Request Received
- Payment Confirmed
- Design In Progress
- Finishing Touches
- Amendment Period
- Completed
- Archived
- Cancelled

The database should store stable machine-readable values, while the UI uses human-readable labels.

Every status change should create an entry in an `order_status_history` table.

Store:

- order id
- old status
- new status
- changed by
- timestamp
- optional note

This creates a reliable audit trail.

---

# 9. Client dashboard

The client dashboard should be extremely simple.

Top area:

**Welcome, [First Name]**

Primary CTA:

**Create New Order**

Then show order cards.

Each card should show:

- Order number
- Tournament
- Main player
- Package
- Amount
- Current status
- Created date
- Latest update

Example:

`DF-2026-0042`

`Loh Yihern — Shenzhen Open 2026`

`Status: Design In Progress`

Clicking the order opens `/orders/[id]`.

---

# 10. Client order details page

Show:

### Order overview

- Player
- Tournament
- Events
- Dates
- Location
- Package
- Price
- Payment status

### Creative preferences

- Color preference
- Theme
- Custom notes

### Uploaded assets

Show thumbnails of uploaded player images, tournament logo, sponsor assets, etc.

Do not expose private storage URLs permanently if avoidable. Generate authenticated/signed URLs where appropriate.

### Status timeline

Display the lifecycle visually:

`Received → Payment Confirmed → In Progress → Finishing Touches → Amendments → Done`

Highlight the current step.

### Amendments

When the order reaches `amendment_period`, show an obvious amendment interface.

Client can submit amendment notes.

Store:

- amendment number
- request text
- timestamp
- status

Do not allow unlimited revisions.

The UI must show:

> **X free amendments remaining**

Once the free allowance is exhausted, explain that additional amendments are RM10 each.

For v1, the client does not need a complex threaded chat. A simple amendment submission form is enough.

---

# 11. Admin dashboard

The admin dashboard should be optimized for speed.

Main dashboard sections:

### Summary cards

- New requests
- Awaiting payment confirmation
- In progress
- In amendment period
- Completed

### Order table

Columns:

- Order number
- Player
- Tournament
- Package
- Amount
- Payment
- Status
- Created
- Last updated

Filters:

- Status
- Date
- Package
- Tournament
- Player

Search:

- Player name
- Order number
- Tournament name
- WhatsApp
- Email

Sort newest first by default.

---

# 12. Admin order page

This is the most important internal screen.

Layout:

### Left/main section

- Client information
- Player information
- Tournament information
- Event list
- Creative preferences
- Notes

### Asset section

For each uploaded asset show:

- filename
- type
- preview
- file size
- upload date
- download button

Provide a convenient:

**Download All Assets**

button.

Ideally generate a ZIP in-memory/server-side when practical rather than forcing the admin to download files individually.

If ZIP generation becomes too expensive or complex for v1, provide individual downloads first and add ZIP later.

### Payment section

Show payment proof preview and:

- Confirm payment
- Reject payment
- Add payment note

Do not modify payment data silently.

### Status controls

Large, obvious status dropdown/buttons.

Example:

`Payment Confirmed`

`Design In Progress`

etc.

Admin should be able to add an internal note with the status change.

### Client-visible updates

Allow admin to enter an optional message that will appear on the client order page.

Example:

> Your poster is now in the finishing touches stage.

---

# 13. Amendments system

Each order should contain an amendment allowance calculated from its package.

Suggested fields:

- `free_amendments_total`
- `free_amendments_used`
- `paid_amendments_used`

Calculate remaining free amendments server-side.

Never trust the frontend to calculate billing or remaining revisions.

When admin marks the order as `amendment_period`, the client can submit amendment requests.

When an amendment is submitted:

- Increment usage in a transaction.
- If free allowance remains, consume one free amendment.
- Otherwise flag it as `paid_required`.
- Store amendment history.

For v1, once an amendment becomes paid, the admin can manually confirm payment. Automated payment collection can be added later.

---

# 14. Email notifications — phase 2, design now for it

Do not let email complexity delay the MVP.

However, design the database so notifications can be added easily.

Future notifications:

- Order received
- Payment confirmed
- Design started
- Finishing touches
- Amendment period started
- Order completed
- Amendment requested

Create a lightweight `notifications` or `order_events` structure so notifications can later be sent through an email provider such as Resend.

For MVP, it is acceptable for client status updates to happen only inside the dashboard.

---

# 15. Database schema

Use normalized relational tables.

Recommended tables:

## `profiles`

- `id` UUID PK, references `auth.users.id`
- `email`
- `full_name`
- `whatsapp`
- `instagram_handle`
- `role` (`client` | `admin`)
- `created_at`
- `updated_at`

Do not duplicate auth secrets.

## `orders`

- `id` UUID PK
- `order_number` unique human-readable ID, e.g. `DF-2026-0042`
- `client_id` UUID FK profiles
- `player_name`
- `instagram_handle`
- `whatsapp`
- `tournament_name`
- `tournament_start_date`
- `tournament_end_date`
- `tournament_location`
- `package_id`
- `package_name_snapshot`
- `package_price_snapshot`
- `free_amendments_total`
- `free_amendments_used`
- `paid_amendments_used`
- `color_preference`
- `custom_color`
- `theme_preference`
- `custom_notes`
- `payment_status`
- `payment_proof_path`
- `status`
- `admin_note`
- `client_visible_update`
- `submitted_at`
- `completed_at`
- `archived_at`
- `created_at`
- `updated_at`

## `order_events`

General audit/event table:

- `id`
- `order_id`
- `event_type`
- `message`
- `created_by`
- `created_at`

This can support future emails and timeline events.

## `order_status_history`

- `id`
- `order_id`
- `old_status`
- `new_status`
- `note`
- `changed_by`
- `created_at`

## `order_events_details`

Each client's tournament events:

- `id`
- `order_id`
- `event_name`
- `partner_name`
- `sort_order`

## `order_assets`

- `id`
- `order_id`
- `asset_type`
- `storage_path`
- `original_filename`
- `mime_type`
- `file_size`
- `created_at`

`asset_type` examples:

- `player_photo`
- `tournament_logo`
- `sponsor_logo`
- `payment_proof`

Keep metadata in Postgres and actual binary files in Supabase Storage.

## `sponsors`

- `id`
- `order_id`
- `company_name`
- `logo_asset_id` nullable
- `created_at`

## `packages`

Seed current packages instead of hardcoding pricing in the frontend:

- Single Frame
- Duo Frame
- Triple Frame
- Five Frame

Fields:

- `id`
- `name`
- `slug`
- `poster_count`
- `price`
- `free_amendments`
- `active`
- `sort_order`
- `created_at`

## `themes`

- `id`
- `name`
- `slug`
- `description`
- `preview_image_path` nullable
- `active`
- `sort_order`

Seed the initial theme list.

---

# 16. Storage architecture

Use Supabase Storage for uploads.

Recommended private buckets:

- `order-assets`
- `payment-proofs`

Organize files by user/order:

`orders/{order_id}/players/...`

`orders/{order_id}/tournament/...`

`orders/{order_id}/sponsors/...`

`orders/{order_id}/payment/...`

Do not expose the buckets publicly.

Use authenticated access and/or short-lived signed URLs.

Important security requirement:

A client must never be able to access another client's uploaded images merely by guessing a storage path.

Supabase RLS/storage policies must enforce ownership.

---

# 17. Data retention / archive system

The owner specifically wants completed orders to be removable from Supabase to keep the project lightweight.

Do NOT immediately permanently delete completed orders without a safety mechanism.

Implement this workflow:

### Completed

Order remains visible to client/admin.

### Archive

Admin clicks:

**Archive Order**

Show warning:

> Archiving removes this order from the active workspace. You can export the order before archiving.

### Export

Provide an **Export Order** action which creates/downloads a ZIP containing:

- order metadata JSON or CSV
- player images
- tournament logo
- sponsor files
- payment proof
- any future final poster assets

Use an easily recognizable filename:

`DF-2026-0042-Loh-Yihern-Shenzhen-Open.zip`

After the owner confirms that the export has been saved locally, allow:

**Delete Permanently**

This should delete the database order and associated storage objects in a controlled transaction/server operation.

Never rely on client-side deletion logic for this.

For extra safety, consider a 7-day soft-delete window before permanent deletion.

---

# 18. Important retention improvement

Payment proof is more sensitive than normal creative assets.

Do not keep payment proof forever by default.

Add a configurable retention policy later, for example:

- Keep payment proof until order is archived.
- Export it during archive.
- Delete it when the archived order is permanently purged.

This is both cleaner and safer.

---

# 19. Admin export requirements

Build a robust export function.

Order export should include:

### `/metadata/order.json`

All order metadata excluding secrets.

### `/metadata/events.json`

Event names/partners.

### `/assets/player/`

Player photos.

### `/assets/tournament/`

Tournament logo.

### `/assets/sponsors/`

Sponsor assets.

### `/assets/payment/`

Payment proof.

Future:

### `/final/`

Final poster files.

This means the owner can maintain an external folder/archive on their computer and keep Supabase clean.

---

# 20. Order numbering

Generate readable order numbers:

`DF-YYYY-NNNN`

Examples:

- `DF-2026-0001`
- `DF-2026-0002`

The sequence must be generated safely server-side so duplicate numbers cannot occur under concurrent submissions.

---

# 21. Security requirements

This is critical.

Implement:

- Supabase RLS on every exposed table
- Private storage buckets
- Server-side authorization for admin routes
- Server-side ownership checks for client order access
- Zod validation on all important inputs
- File type validation
- File size limits
- MIME/type verification where practical
- No service-role key exposed to browser code
- No secrets committed to GitHub
- Environment variables for production secrets
- Rate limiting considerations for magic-link requests and uploads

For uploads, set sensible v1 limits, e.g.:

- Images: 15–25 MB each
- Payment proof: 10 MB
- Maximum player images: 8
- Maximum sponsor logos: 10

Make these configurable constants.

Supabase's current guidance specifically emphasizes RLS on exposed tables and secure environment-variable handling. Follow that model. [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

# 22. File validation

Only accept:

### Player images

- JPEG
- PNG
- WebP

### Logos

- PNG
- JPEG
- WebP
- SVG only if safely handled

### Payment proof

- JPEG
- PNG
- WebP
- PDF

Reject executable/document types not explicitly supported.

Do not trust file extensions alone.

---

# 23. UI design system

The overall design should be **light mode first**.

Visual direction:

- White / off-white backgrounds
- Black typography
- Charcoal secondary text
- DINKFRAME lime/yellow accent
- Very subtle blue/purple accents when appropriate
- Rounded cards, but not overly “startup SaaS” rounded
- Thin borders
- Lots of whitespace
- High-quality typography
- Large clear headings
- Strong buttons
- Subtle shadows
- Minimal gradients

The app should feel like:

**premium sports studio + modern creative agency**

rather than:

**banking dashboard / enterprise CRM**

Use the DINKFRAME logo consistently.

---

# 24. Mobile UX

Mobile is the priority for clients.

The order creation flow should work beautifully at 375px width.

Requirements:

- Large tap targets
- Sticky bottom action on mobile where useful
- Drag-and-drop upload on desktop
- Tap-to-upload on mobile
- Image preview grid
- Clear validation errors
- Minimal typing
- Progress indicator for multi-step order flow

Example step indicator:

`1 Player → 2 Tournament → 3 Events → 4 Photos → 5 Style → 6 Package → 7 Payment → 8 Review`

Allow Back/Next.

Do not force the user to scroll through one huge form.

---

# 25. Public homepage content structure

Suggested sections:

### Hero

**YOUR GAME. OUR FRAME.**

Premium custom visuals for pickleball athletes.

CTA:

**ORDER YOUR POSTER**

Secondary:

**VIEW OUR WORK**

### Work

Show selected poster examples.

### Why DINKFRAME

- Built around the player
- Tournament-specific design
- Premium visual quality
- Fast turnaround
- Social-ready

### Packages

Show all four packages.

### How it works

1. Submit your details
2. Confirm payment
3. We create your poster
4. Review & amendments
5. Receive your final poster

### CTA

**READY TO FRAME YOUR NEXT TOURNAMENT?**

CTA → app.dinkframe.my

---

# 26. Public portfolio

Create portfolio cards that can be configured from a local data file initially.

Do not build a CMS for the portfolio in v1 unless it becomes necessary.

Each portfolio item can contain:

- image
- player name
- tournament
- category/tag

Later this can be moved into Supabase.

---

# 27. Instagram integration

Do not build an official Instagram API integration in v1.

Simply link:

`https://instagram.com/dinkframe`

Optionally include an embedded/manual Instagram section later.

A real social API integration adds unnecessary complexity for the MVP.

---

# 28. Payment architecture

Do not build automated online card payment initially.

The current workflow is:

1. Client selects package.
2. App shows DINKFRAME payment instructions.
3. Client uploads payment proof.
4. Admin checks proof.
5. Admin marks payment as confirmed.

Use a configurable payment settings table or config object for:

- bank name
- account name
- account number
- QR image
- DuitNow details
- payment instructions

Do not hardcode payment information throughout the UI.

Admin should be able to update payment instructions later without code changes if practical.

---

# 29. Payment statuses

Use:

- `pending`
- `proof_uploaded`
- `confirmed`
- `rejected`

The order should not automatically move to `payment_confirmed` merely because a proof file was uploaded.

Only admin confirmation should trigger confirmed status.

---

# 30. Pricing architecture

Make package prices database-driven.

Never assume the current prices are permanent.

For every submitted order, copy the following into snapshot fields:

- package name
- package price
- poster count
- free amendment allowance

This means old orders remain historically accurate even if prices change later.

---

# 31. Suggested additional feature: order duplicate

Add a small admin action:

**Duplicate Order**

This should create a new order prefilled with the previous client's information and creative preferences, but require a fresh submission/payment.

This will be very useful for repeat customers and tournament series.

Do not duplicate payment proof or old sensitive payment information.

---

# 32. Suggested additional feature: reorder

On the client order page, after completion show:

**Create Another Order**

Prefill:

- Player name
- Instagram
- WhatsApp
- Preferred creative direction

Let them update tournament-specific details.

This is likely to become a high-value feature for repeat players.

---

# 33. Suggested additional feature: reference links

Add an optional field:

`Reference / inspiration link`

Examples:

- Instagram post
- Pinterest
- Google Drive reference
- Other poster

Do not fetch remote content automatically in v1.

Just store the URL.

---

# 34. Suggested additional feature: preferred deadline

Add:

`Preferred completion date` — optional

This helps DINKFRAME prioritize work.

Do not promise the date automatically.

Show it to admin as a scheduling preference.

---

# 35. Suggested additional feature: rush order flag

Do not add rush pricing yet unless the business is ready for it.

But store an optional admin field:

`priority`

Values:

- normal
- high
- urgent

This allows manual prioritization later without changing the workflow.

---

# 36. Suggested additional feature: design brief score

Do not require clients to write long explanations.

The theme + color + image inputs should be enough for most customers.

The free-text notes field should be optional.

The service should feel:

**“Upload → choose style → pay → done.”**

This should remain a core product principle.

---

# 37. Admin productivity features

Admin dashboard should have keyboard-friendly quick actions where practical.

For example:

- Open next pending order
- Confirm payment
- Move to design
- Move to amendments
- Mark done

But do not sacrifice clarity for keyboard shortcuts.

---

# 38. Empty states

Design useful empty states.

Examples:

Client:

> No active orders yet.
> Your next tournament poster starts here.

Admin:

> No orders need attention right now.

---

# 39. Error handling

Never show raw Supabase/database errors to users.

Use friendly messages.

Example:

> We couldn't upload that file. Please try again.

For admin, optionally provide a technical error ID in a collapsed details area.

---

# 40. Accessibility

Use semantic HTML.

Ensure:

- keyboard navigation
- visible focus states
- accessible form labels
- sufficient contrast
- accessible image upload controls
- meaningful button labels
- error messages associated with inputs

---

# 41. SEO

Public marketing site should have:

- proper title
- meta description
- Open Graph image
- canonical URL
- sitemap
- robots rules
- favicon

The app itself does not need to be indexed.

Prevent authenticated dashboard pages from appearing in search engines.

---

# 42. Analytics

Do not add heavy analytics initially.

A lightweight solution can be added later.

For MVP, only track meaningful internal events if useful:

- order submitted
- payment confirmed
- order completed

Do not track unnecessary personal behavior.

---

# 43. Environment variables

Create a `.env.example` with placeholders for all required values.

Likely values:

`NEXT_PUBLIC_SUPABASE_URL`

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`SUPABASE_SERVICE_ROLE_KEY` — server only, if required for privileged operations

`ADMIN_EMAIL`

`NEXT_PUBLIC_APP_URL`

`NEXT_PUBLIC_SITE_URL`

Optional future email provider keys should be documented separately.

Never commit `.env.local`.

---

# 44. Recommended project structure

Use a clean structure similar to:

```text
app/
  (marketing)/
    page.tsx
    work/
    packages/
    how-it-works/
    contact/
    privacy/
    terms/
  (auth)/
    login/
    auth/callback/
  (client)/
    dashboard/
    orders/
      new/
      [id]/
      [id]/edit/
    profile/
  admin/
    page.tsx
    orders/
    orders/[id]/
    settings/
  api/
    ...
components/
  ui/
  marketing/
  client/
  admin/
lib/
  supabase/
  validation/
  orders/
  storage/
  auth/
  packages/
  utils/
supabase/
  migrations/
public/
  images/
  portfolio/
```

Adapt this if a better structure is available, but keep concerns separated.

---

# 45. Database migrations

All schema changes must be represented by SQL migration files committed to GitHub.

Do not rely only on manually editing the Supabase dashboard.

Seed initial packages and themes through migrations/seed scripts.

Document how to apply migrations.

---

# 46. Type safety

Generate Supabase database types and use them throughout the project.

Avoid `any` unless absolutely unavoidable.

Use shared TypeScript types for:

- Order
- OrderStatus
- PaymentStatus
- Package
- Theme
- AssetType
- Amendment

---

# 47. Server-side business rules

Business-critical logic must happen server-side.

Examples:

- package pricing
- amendment counts
- order number generation
- order ownership
- admin authorization
- payment status changes
- archiving
- deletion

Never trust hidden form fields or client-side calculations for these.

---

# 48. Testing requirements

At minimum, add tests for:

### Unit tests

- package pricing
- amendment calculation
- order status transitions
- order number generation

### Integration tests

- authenticated client can create order
- client can only read own orders
- client cannot access another client's assets
- admin can access all orders
- non-admin cannot access admin routes
- archived orders behave correctly

### Manual test checklist

Test on:

- desktop Chrome
- mobile Chrome
- mobile Safari if available

---

# 49. Status transition validation

Do not allow arbitrary invalid status changes.

Define reasonable transitions, e.g.:

`request_received → payment_confirmed`

`payment_confirmed → design_in_progress`

`design_in_progress → finishing_touches`

`finishing_touches → amendment_period`

`amendment_period → completed`

Also allow admin to correct statuses manually when necessary, but require confirmation for unusual transitions.

---

# 50. Order deletion safety

Never expose permanent delete to ordinary clients.

Admin-only.

Before deletion:

1. Require export/confirmation.
2. Show order number and player/tournament.
3. Explain that deletion is permanent.
4. Require explicit confirmation.

Delete storage objects as well as database records.

Avoid orphaned files.

---

# 51. Supabase free-tier awareness

Architect the MVP to minimize storage and database growth.

Important practices:

- Store files in Storage, not Postgres
- Store metadata only in Postgres
- Use private buckets
- Archive completed orders
- Provide local export
- Purge old archived data manually
- Avoid storing redundant thumbnails when possible
- Do not continuously log noisy analytics/events
- Do not generate large server-side media files unnecessarily

Do not design around assumptions that a free tier can support unlimited storage/bandwidth. Keep retention intentional and make usage visible in admin settings where practical.

---

# 52. Important business/data decision

Do not delete completed orders automatically.

The owner should explicitly choose:

`Export → Verify local archive → Delete`

This prevents accidental loss of valuable customer history.

Eventually, build a simple archive list so the owner can see:

- archived order
- exported date
- deleted date

Do not add automated destructive retention jobs in v1.

---

# 53. Admin storage dashboard

Add a lightweight admin section showing:

- active order count
- archived order count
- number of stored assets
- rough storage usage if available from Supabase APIs

This makes free-tier management easier.

If exact storage usage is difficult to retrieve reliably, simply show counts and link to Supabase's storage dashboard.

---

# 54. Client communication philosophy

The app should reduce WhatsApp back-and-forth rather than replace WhatsApp.

The client can still use WhatsApp for urgent communication.

The dashboard is the source of truth for:

- order details
- files
- status
- amendments
- completion

Do not build chat unless a real business need emerges.

---

# 55. MVP scope

The first production milestone should include only:

### Public

- homepage
- portfolio
- packages
- how it works
- Instagram link
- CTA to app

### Client app

- magic-link login
- dashboard
- new order flow
- file uploads
- package selection
- payment proof
- order status
- amendment submission

### Admin

- secure admin login
- order list
- order detail page
- asset downloads
- payment confirmation
- status management
- amendment management
- client-visible updates
- export order
- archive/delete

### Infrastructure

- Supabase database
- Supabase Auth
- Supabase Storage
- RLS
- Vercel deployment
- GitHub repository
- environment variables
- migration files

Everything else can be phase 2.

---

# 56. Build order for Codex

Work through the project in this exact sequence.

## Phase 1 — Foundation

1. Initialize Next.js TypeScript App Router project.
2. Install Tailwind, shadcn/ui, Supabase SSR/client packages, Zod, and testing tools.
3. Configure linting and formatting.
4. Create `.env.example`.
5. Set up Git repository.
6. Create basic site/app/admin route groups.
7. Create shared design tokens.
8. Add DINKFRAME logo and foundational UI components.

## Phase 2 — Supabase

9. Create Supabase project configuration.
10. Implement migrations for all core tables.
11. Seed packages.
12. Seed themes.
13. Enable RLS on every applicable table.
14. Write policies for client-owned data.
15. Write admin policies.
16. Configure private storage buckets.
17. Write storage policies.
18. Generate database TypeScript types.

## Phase 3 — Authentication

19. Implement Supabase magic-link auth.
20. Implement auth callback.
21. Create profile creation/lookup logic.
22. Protect client routes.
23. Protect admin routes.
24. Enforce admin email/role server-side.

## Phase 4 — Public website

25. Build homepage.
26. Build portfolio.
27. Build packages page.
28. Build how-it-works.
29. Add CTAs to app.dinkframe.my.
30. Add SEO metadata.

## Phase 5 — Client dashboard

31. Build dashboard shell.
32. Build order cards.
33. Build new-order multi-step flow.
34. Add validation.
35. Add image uploads.
36. Add sponsor handling.
37. Add theme/color selection.
38. Add package selection.
39. Add payment proof.
40. Add order review.
41. Create order submission transaction.
42. Generate order number.

## Phase 6 — Client order management

43. Build order details page.
44. Build status timeline.
45. Build amendment interface.
46. Build reorder flow if time permits.
47. Build profile page.

## Phase 7 — Admin

48. Build admin dashboard.
49. Build filters/search.
50. Build admin order detail.
51. Add payment confirmation.
52. Add status changes.
53. Add internal notes.
54. Add client-visible updates.
55. Add asset downloads.
56. Add export ZIP.
57. Add archive.
58. Add permanent deletion.

## Phase 8 — Polish

59. Mobile optimize everything.
60. Improve error states.
61. Improve loading/skeleton states.
62. Add empty states.
63. Accessibility pass.
64. Security review.
65. RLS review.
66. File-upload security review.
67. Performance review.

## Phase 9 — Test + deploy

68. Run unit tests.
69. Run integration tests.
70. Test upload/delete lifecycle.
71. Test client isolation.
72. Test admin isolation.
73. Test mobile submission flow.
74. Connect GitHub → Vercel.
75. Configure production environment variables.
76. Configure custom domains.
77. Deploy production.
78. Run production smoke test.

---

# 57. Domain configuration

Use:

`dinkframe.my`

for the public website.

Use:

`app.dinkframe.my`

for the authenticated application.

The public site and app may live in the same Next.js repository/application initially.

Do not create two separate codebases unless there is a strong reason.

Recommended approach:

- same GitHub repository
- same Vercel project
- hostname-based routing or shared Next.js routes

If hostname-based routing makes deployment unnecessarily complex, use normal paths first and add the subdomain after the core application works.

---

# 58. Vercel deployment

Deploy through GitHub → Vercel.

Recommended workflow:

- `main` = production
- feature branches = preview deployments

Never manually upload production builds.

Environment variables should be configured in Vercel rather than committed. Vercel supports environment variables directly in project settings. [Vercel guidance](https://vercel.com/templates/next.js/seo-starter)

---

# 59. GitHub workflow

Commit in logical milestones.

Suggested commits:

- `chore: initialize next app`
- `feat: add supabase auth`
- `feat: add order schema`
- `feat: add client order flow`
- `feat: add admin dashboard`
- `feat: add storage uploads`
- `feat: add order export`
- `feat: add archive lifecycle`
- `test: add order access tests`
- `fix: harden storage policies`

Keep commits understandable so rollback is easy.

---

# 60. Codex agent behavior

When implementing this specification:

1. Inspect the existing repository before making changes.
2. Do not overwrite existing user files unnecessarily.
3. Build incrementally.
4. Keep the application runnable after each major phase.
5. Prefer small reusable components.
6. Avoid premature abstraction.
7. Do not introduce dependencies without a reason.
8. Use official current Next.js/Supabase patterns.
9. Check for security problems before declaring a feature complete.
10. Do not expose Supabase service-role secrets to client components.
11. Do not bypass RLS as a shortcut.
12. Use server-side checks for admin operations.
13. Use transactions for business-critical counters/updates.
14. Validate upload limits both client and server side.
15. Provide useful empty/loading/error states.
16. Ensure all important flows work on mobile.

When uncertain, choose the simplest implementation that preserves security and future flexibility.

---

# 61. Definition of done

The project is considered complete for MVP only when a real user can:

1. Visit `dinkframe.my`.
2. See DINKFRAME work and packages.
3. Click **Order Your Poster**.
4. Receive a magic login link.
5. Authenticate.
6. Submit player/tournament/event information.
7. Upload at least 2 player images.
8. Upload a tournament logo.
9. Add sponsor names/logos optionally.
10. Select color/theme.
11. Select a package.
12. Upload payment proof.
13. Submit the order.
14. Receive an order number.
15. See the order in their dashboard.
16. See status changes.
17. Submit amendments during the amendment period.

The owner must be able to:

18. See the new order in admin.
19. Open it.
20. Download the uploaded assets.
21. View payment proof.
22. Confirm payment.
23. Move the order through statuses.
24. Leave client-visible updates.
25. Track amendment usage.
26. Mark the order completed.
27. Export the full order.
28. Archive it.
29. Permanently delete it after export/confirmation.

No major client data should be accessible by another client.

No admin functionality should be accessible to ordinary clients.

---

# 62. Future roadmap — do not build unless requested

Potential later features:

- Automated email notifications
- WhatsApp notifications
- Online payment gateway
- Rush-order pricing
- Coupon codes
- Repeat-customer discounts
- Player profiles
- Saved player photo library
- Saved sponsor library
- Saved branding preferences
- Team orders
- Tournament organizer accounts
- Tournament-specific landing pages
- Automated poster generation
- AI-assisted design brief generation
- Final poster delivery/downloads inside the app
- Designer/admin internal kanban
- Multiple admins
- Analytics
- Customer testimonials
- Referral codes

The architecture should not prevent these features later, but the MVP must stay focused.

---

# 63. Final instruction to Codex

Build this as a **real, deployable product**, not a mockup.

Prioritize:

**Simplicity → Security → Speed → Maintainability → Future flexibility**

The most important experience is the client's order submission flow. It should feel as easy as filling out a premium Instagram order form, while the admin experience should feel like a lightweight production tracker.

Do not overbuild.

Do not add unnecessary SaaS features.

Make sensible technical decisions when implementation details are unspecified.

Before considering the project finished, run the full test/build/lint flow and fix errors rather than leaving TODOs for critical functionality.

Provide a final README explaining:

- local setup
- Supabase setup
- storage buckets
- environment variables
- migrations
- seed data
- admin setup
- local development
- Vercel deployment
- custom domain setup
- how to archive/export/delete orders

The result should be a clean foundation that DINKFRAME can actually use to receive paid poster orders.
