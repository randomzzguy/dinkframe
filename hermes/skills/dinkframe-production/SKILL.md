---
name: dinkframe-production
description: Run and report the local DINKFRAME ChatGPT production queue without accessing secrets or bypassing owner-controlled Send permissions.
version: 1.0.0
metadata:
  hermes:
    tags: [dinkframe, production, chatgpt, automation]
---

# DINKFRAME production runner

Use this skill when the owner asks to check, run, monitor, or diagnose the
DINKFRAME ChatGPT production queue.

## Operating procedure

1. Work only in `C:\Users\hhcre\Desktop\DINKFRAME\webapp1.0`.
2. Run `npm run automation:run` once.
3. If the queue is empty, report that briefly.
4. If a review-required job is prepared, tell the owner to review the dedicated
   browser and press Send, then mark it sent from the admin order page.
5. If an auto-send job succeeds, report the order/job identifiers printed by the
   runner.
6. If it fails, report the safe error text and direct the owner to Retry on the
   admin order page after resolving the cause.

## Hard boundaries

- Never read, print, copy, summarize, or modify `.env.local` or Hermes secrets.
- Never use the Supabase service-role key directly.
- Never insert generation jobs or confirm payment; only the owner queues work in
  the authenticated DINKFRAME admin interface.
- Never bypass the submission mode snapshotted on a job.
- Never handle CAPTCHA or login approval.
- Never scrape, copy, or extract ChatGPT responses. The owner moves Prompt Studio
  output into the image-generation stage manually.
- Never retry a failed job automatically; retries require owner action in the
  admin interface.
