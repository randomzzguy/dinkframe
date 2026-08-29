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
4. Hermes sends the complete prompt with owner-only **Approve**, **Revise**,
   and **Cancel** buttons attached to that same Telegram message.
5. **Approve** queues one image job with the approved prompt, tournament logo,
   and player photos. **Revise** captures the owner's next reply as feedback
   and queues a prompt revision.
6. Hermes generates exactly one image, saves a durable local copy, and sends it
   to Telegram with a second owner-only decision keyboard attached to the image.
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

The normal review surface is a native Telegram inline keyboard:

```text
[ ✅ Approve ] [ ✏️ Revise ]
[         ❌ Cancel         ]
```

Each keyboard contains only a random opaque action ID. The raw one-time token stays
in the ignored local `.dinkframe/telegram-actions` store and remains hashed in
Supabase. The custom user-level Telegram platform plugin validates the exact
owner ID, consumes each action once, and removes the buttons after a successful
decision. Successful decisions remove the keyboard and send one concise
confirmation. Delivery is single-attempt so an ambiguous Telegram response
cannot silently duplicate an artifact; Retry remains explicit in the admin UI.
The plugin subclasses the bundled adapter, so normal Hermes messages and
commands keep their standard behavior.

Selecting **Revise** enters a one-hour feedback mode. The next owner message is
sent directly to the DINKFRAME decision API without an LLM call. `/cancel`
leaves feedback mode and restores the decision buttons.

Text commands remain a recovery fallback:

The runner supplies the exact command. Supported shapes are:

```text
APPROVE <job-uuid> <one-time-token>
REVISE <job-uuid> <one-time-token> <feedback>
CANCEL <job-uuid> <one-time-token>
```

Hermes maps the command to `hermes/dinkframe-decision.py`. A casual `yes` or
`send` without the job UUID and token cannot advance production. Tokens are
stored remotely only as SHA-256 hashes and are cleared after use.

The Hermes gateway routes fallback signed commands through a deterministic hook
before the language model responds. The hook is restricted to the configured
owner Telegram ID and accepts visual line wrapping inside the 48-character
token, preventing a conversational acknowledgement from being mistaken for a
real approval.

## Scheduled runner

The quiet Windows wrapper is `hermes/dinkframe-production.py`. It emits nothing
when the queue is empty, so the existing no-agent, once-per-minute Hermes cron
can continue using it. Detailed prompt/image review messages are sent directly
to Telegram by the runner.

The repo copy of the Telegram extension is under
`hermes/plugins/dinkframe-telegram-platform`. Its installed copy lives under
the active Hermes profile's `plugins` directory and is enabled as
`dinkframe-telegram-platform`. `dinkframe.telegram_owner_id` in Hermes config
pins button handling to the owner.

## Failure recovery

- **Codex sign-in required:** run `hermes auth add openai-codex`, then use Retry
  on the admin order page.
- **Telegram delivery failed:** the job becomes failed; resolve connectivity and
  use Retry. Image generation itself is not silently repeated.
- **Runner stopped:** claimed/preparing jobs return to the queue after their
  15-minute lease expires.
- **Wrong brief or assets:** cancel the job and start a fresh immutable snapshot.
- **Expired button:** cancel or retry from the admin page; never recreate a token
  manually.
