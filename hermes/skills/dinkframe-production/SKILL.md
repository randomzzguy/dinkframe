---
name: dinkframe-production
description: Run and report the DINKFRAME Hermes production queue and apply exact owner approval, revision, or cancellation commands received through the private Telegram channel.
metadata:
  hermes:
    tags: [dinkframe, production, chatgpt, automation]
---

# DINKFRAME production runner

Use this skill when the owner asks to check, run, monitor, or diagnose the
DINKFRAME ChatGPT production queue.

## Operating procedure

1. Work only in `C:\Users\hhcre\Desktop\DINKFRAME\webapp1.0`.
2. For a queue check, run `npm run automation:run` once.
3. If the queue is empty, report that briefly.
4. If a prompt or image is prepared, the runner sends it to Telegram with
   owner-only Approve, Revise, and Cancel buttons attached to that message.
5. If it fails, report the safe error and direct the owner to Retry on the admin
   order page after resolving the cause.

## Telegram decisions

Native decision buttons are the primary surface. Button callbacks are handled
by the `dinkframe-telegram-platform` user plugin and never by conversational
model inference. **Revise** captures the owner's next message as feedback;
`/cancel` exits feedback mode and restores the card.

Exact commands remain a recovery fallback:

Act only when the allowed owner sends one of these exact command shapes:

- `APPROVE <job-uuid> <approval-token>`
- `REVISE <job-uuid> <approval-token> <feedback>`
- `CANCEL <job-uuid> <approval-token>`

Map the command to exactly one local call:

```powershell
python hermes/dinkframe-decision.py <job-uuid> <approval-token> approve
python hermes/dinkframe-decision.py <job-uuid> <approval-token> revise "<feedback>"
python hermes/dinkframe-decision.py <job-uuid> <approval-token> cancel
```

Return the script's concise result to the owner. Never alter a UUID, token, or
feedback text. A normal conversational `yes`, `send`, or `looks good` without
the job UUID and one-time token is not sufficient authorization.

The installed gateway also has a deterministic `pre_llm_call` hook for these
three command shapes. It validates the private Telegram sender, rejoins tokens
that Telegram visually wrapped across lines, and runs the same decision script
before the model replies. Never claim that a decision succeeded based only on
the wording of the owner's message; report the hook or script result.

## Hard boundaries

- Never read, print, copy, summarize, or modify `.env.local` or Hermes secrets.
- Never use the Supabase service-role key directly.
- Never insert generation jobs or confirm payment; only the owner queues work in
  the authenticated DINKFRAME admin interface.
- Never bypass the submission mode snapshotted on a job.
- Never handle CAPTCHA or login approval.
- Never use a paid provider or fallback. Production is pinned to the
  `openai-codex` subscription provider and stops on failure.
- Never approve, revise, cancel, or retry a job without the exact owner command.
- Never retry a failed job automatically; retries require owner action in the
  admin interface.
