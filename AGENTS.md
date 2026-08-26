<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## DINKFRAME project memory

Before changing product behavior, read `docs/MEMORY_PALACE.md`, then the relevant section of `DINKFRAME_APP_BUILD.md`. `docs/ARCHITECTURE.md` records trust boundaries and request paths; `docs/DECISIONS.md` records accepted architecture decisions.

Non-negotiable invariants:

- RLS remains enabled on every exposed application table and both Storage buckets remain private.
- Browser values never decide price snapshots, order numbers, amendment billing, payment confirmation, admin access, or production status.
- Admin routes require the configured `ADMIN_EMAIL`; database access separately requires the admin profile role.
- Original uploads are preserved. Never add destructive image compression.
- Permanent deletion is admin-only and follows Export → Verify → Archive → explicit confirmation.
