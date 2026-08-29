# Hermes creative production automation

This workflow keeps DINKFRAME and Supabase as the source of truth. The local
runner authenticates only to narrow DINKFRAME endpoints. Hermes never receives
the Supabase service-role key, and every generated artifact requires a one-time
owner decision token.

## Production path

1. The owner confirms payment on the admin order page.
2. The owner starts **Hermes production**. DINKFRAME snapshots the complete
   brief and tournament logo.
3. The local runner claims the job, downloads short-lived copies, and invokes
   the `dinkframe-creative-director` skill through the `openai-codex`
   subscription provider.
4. Hermes sends the complete prompt and a one-time decision command to the
   owner's private Telegram chat.
5. An exact `APPROVE` command queues one image job with the approved prompt,
   tournament logo, and player photos. `REVISE` queues a prompt revision.
6. Hermes generates exactly one image, saves a durable local copy, and sends it
   to Telegram with a second one-time decision command.
7. The owner approves it for manual finishing or requests a new creative prompt.
8. After sponsor placement and finishing, the owner publishes a review or final
   file from the DINKFRAME admin order page.

The runner never retries automatically, uses a paid fallback, adds sponsors, or
publishes generated drafts to clients.

## One-time configuration

Generate a runner token locally:

```powershell
npm run automation:token
```

Place it in `.env.local` and the deployed Vercel project as
`DINKFRAME_AUTOMATION_RUNNER_TOKEN`. Never send or commit it. For production,
the local-only app URL is:

```dotenv
DINKFRAME_AUTOMATION_APP_URL=https://dinkframe.my
```

Authenticate Hermes to the subscription-backed provider and pin image
generation to the same provider:

```powershell
hermes auth add openai-codex
hermes config set image_gen.provider openai-codex
hermes config set image_gen.model gpt-image-2-medium
```

Run one queued job manually:

```powershell
npm run automation:run
```

The legacy Playwright companion remains available for troubleshooting:

```powershell
npm run automation:browser
npm run automation:run:legacy
```

## Telegram decisions

The runner supplies the exact command. Supported shapes are:

```text
APPROVE <job-uuid> <one-time-token>
REVISE <job-uuid> <one-time-token> <feedback>
CANCEL <job-uuid> <one-time-token>
```

Hermes maps the command to `hermes/dinkframe-decision.py`. A casual `yes` or
`send` without the job UUID and token cannot advance production. Tokens are
stored remotely only as SHA-256 hashes and are cleared after use.

The Hermes gateway routes these signed commands through a deterministic hook
before the language model responds. The hook is restricted to the configured
owner Telegram ID and accepts visual line wrapping inside the 48-character
token, preventing a conversational acknowledgement from being mistaken for a
real approval.

## Scheduled runner

The quiet Windows wrapper is `hermes/dinkframe-production.py`. It emits nothing
when the queue is empty, so the existing no-agent, once-per-minute Hermes cron
can continue using it. Detailed prompt/image review messages are sent directly
to Telegram by the runner.

## Failure recovery

- **Codex sign-in required:** run `hermes auth add openai-codex`, then use Retry
  on the admin order page.
- **Telegram delivery failed:** the job becomes failed; resolve connectivity and
  use Retry. Image generation itself is not silently repeated.
- **Runner stopped:** claimed/preparing jobs return to the queue after their
  15-minute lease expires.
- **Wrong brief or assets:** cancel the job and start a fresh immutable snapshot.
- **Lost approval command:** cancel or retry from the admin page; never recreate
  a token manually.
