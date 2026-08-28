# Hermes and ChatGPT production automation

This workflow keeps DINKFRAME and Supabase as the source of truth. Hermes may
invoke the local companion, but it never receives the Supabase service-role key
and never decides whether a queued message may be sent.

## Production path

1. The owner confirms payment on the admin order page.
2. The owner queues **Prompt Studio**. DINKFRAME snapshots the order brief,
   tournament logo, and current review/auto-send setting.
3. The local companion claims the job through the token-protected Next.js API,
   downloads short-lived copies, opens the dedicated Prompt Studio conversation,
   verifies the composer, and pauses or sends.
4. The owner manually copies the prompt returned by ChatGPT into the order page.
5. The owner queues **Image generation**. The companion opens a fresh ChatGPT
   chat with the copied prompt, tournament logo, and player photos.
6. The owner takes over for result selection, sponsor placement, and finishing.

The companion does not extract ChatGPT responses, approve logins, handle
CAPTCHAs, or queue jobs from incoming orders automatically.

## One-time configuration

Generate a runner token locally:

```powershell
npm run automation:token
```

Place the output in `.env.local` as
`DINKFRAME_AUTOMATION_RUNNER_TOKEN`. Add the same server-only variable to the
deployed Vercel project. Never send or commit it.

For a deployed app, set the local-only value:

```dotenv
DINKFRAME_AUTOMATION_APP_URL=https://app.dinkframe.my
```

Start the dedicated companion browser:

```powershell
npm run automation:browser
```

Sign in to ChatGPT once in that browser window. It uses a separate profile under
`~/.dinkframe` and exposes Chrome DevTools only on `127.0.0.1:9223`. Keep this
window open while jobs are running.

Run one queued job manually:

```powershell
npm run automation:run
```

## Hermes connection

Hermes 0.19 or newer can use the installed `dinkframe-production` skill. Its
quiet cron wrapper is installed at
`~/.hermes/scripts/dinkframe-production.sh`. For an interactive run, give
Hermes this repository as its working directory and use:

```text
Run scripts/run-companion-once.sh and report only if it prepared, sent, or failed a DINKFRAME job.
```

The wrapper produces no output when the queue is empty, which makes it suitable
for Hermes no-agent cron. After choosing a configured delivery channel, create a
schedule similar to:

```powershell
hermes cron create "every 1m" --no-agent --script dinkframe-production.sh --workdir "C:\Users\hhcre\Desktop\DINKFRAME\webapp1.0" --deliver telegram --name "dinkframe-production"
```

Replace `telegram` with the owner's configured Hermes destination. Use
`approvals.cron_mode: deny`; the wrapper does not need dangerous shell commands.

## Failure recovery

- **Sign-in required:** open the companion browser, sign in, and retry the failed
  job from the admin order page.
- **ChatGPT UI changed:** leave the job failed, update and test the Playwright
  locators, then retry.
- **Review required:** press Send in the browser, then use **Mark sent** in the
  admin generation history.
- **Runner stopped:** claimed/preparing jobs automatically return to the queue
  after their 15-minute lease expires.
- **Wrong brief or assets:** cancel the job and queue a fresh snapshot. Never
  mutate the contents of a job already in progress.
