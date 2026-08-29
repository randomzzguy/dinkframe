# Manual test checklist

## Public site

- Verify `/`, `/work`, `/packages`, `/how-it-works`, `/about`, `/contact`, `/privacy`, and `/terms` at 375px and desktop widths.
- Confirm every primary CTA reaches login/order entry.
- Confirm keyboard focus is visible and navigation order is logical.
- Confirm authenticated routes are disallowed in `robots.txt`.

## Authentication

- Request a magic link with a new client email.
- Complete callback and land on `/dashboard`.
- Confirm an expired or invalid callback returns to login with a friendly state.
- Confirm sign-out clears the session.
- Confirm a non-admin is redirected away from `/admin`.

## Client isolation

- Run `npm run test:rls:live` with a transient `SUPABASE_SERVICE_ROLE_KEY` before production deployment.
- Create two client accounts and at least one order for each.
- Confirm client A cannot select client B’s order through Supabase API calls.
- Confirm client A cannot load client B’s `/orders/{id}` page.
- Confirm client A cannot read or guess client B’s Storage object.

## Order wizard

- Save a profile, start a new order, and confirm name, WhatsApp, and Instagram prefill.
- Complete the flow at 375px without horizontal scrolling.
- Refresh mid-flow and confirm text state returns.
- Confirm Back/Next preserves values.
- Confirm fewer than two player images, more than eight, invalid MIME types, and oversized files are rejected once upload wiring is enabled.
- Confirm package price and allowance come from the database on submission.
- Confirm payment proof upload does not auto-confirm payment.
- Confirm the current payment QR and bank/DuitNow instructions appear at payment.

## Admin production

- Confirm admin sees all orders and ordinary clients see none of the admin data.
- Confirm ordinary clients cannot query `automation_settings` or `generation_jobs`.
- Search by order number, player, tournament, WhatsApp, and client email.
- Combine status, package, tournament, player, and date filters; reset them.

## ChatGPT production companion

- Confirm an unpaid order cannot queue either production stage.
- Queue Prompt Studio with review mode and confirm the companion attaches only the tournament logo, fills the correct dedicated conversation, and does not click Send.
- Mark the reviewed job sent from the admin order page.
- Paste a Prompt Studio response and queue image generation; confirm a fresh chat receives the tournament logo and at least two player images but no payment proof or sponsor logo.
- Enable auto-send, queue a fresh job, then change the global setting back; confirm the queued job still uses its original auto-send snapshot.
- Close the runner during preparation and confirm the job becomes claimable again after its lease expires.
- Confirm login/CAPTCHA/UI mismatch failures are shown as failed jobs and never bypassed automatically.
- Confirm normal status transitions create history rows.
- Confirm unusual transitions require explicit confirmation once UI actions are wired.
- Confirm amendment submission consumes free allowance transactionally, then marks later requests paid-required.
- Edit payment settings and replace the QR; confirm the order wizard reflects both.

## Archive lifecycle

- Export one completed order and inspect metadata and every asset path.
- Confirm a fresh export clears any earlier local-verification timestamp.
- Open the ZIP and confirm metadata JSON, original assets, payment proof, and final posters are present.
- Confirm permanent delete is unavailable before export verification and archive.
- Confirm direct status controls cannot bypass the verified-archive workflow.
- Confirm a wrong order-number confirmation is rejected.
- Confirm deletion removes exact Storage objects and cascaded order rows.
- Confirm `deleted_order_log` retains only the minimal deletion receipt.

## Poster delivery

- Confirm an unpaid order cannot publish a review or final poster.
- Publish a review poster and confirm the client sees a preview, review label, download action, and client-visible update.
- Publish a final poster and confirm it is clearly distinguished from review drafts.
- Confirm another client cannot read either poster row or Storage object.
- Export the order and confirm review drafts are in `review-posters/` and approved finals are in `final-posters/`.

## Browsers

- Desktop Chrome
- Mobile Chrome
- Mobile Safari when available
