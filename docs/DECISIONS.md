# Architecture decisions

## ADR-001 — One application for two domains

Status: accepted.

The marketing site and application share one Next.js repository and Vercel project. This keeps brand, package display, and operations in one maintainable codebase. Host routing remains a deployment concern, not an application split.

## ADR-002 — Supabase SQL over an ORM

Status: accepted.

SQL migrations, generated TypeScript types, RLS, and PostgreSQL functions keep the ownership and transaction model visible. An ORM would duplicate abstractions without improving this small relational domain.

## ADR-003 — Defense-in-depth admin identity

Status: accepted.

The Next.js server compares the authenticated email with `ADMIN_EMAIL`; database and Storage policies require the corresponding profile role. This prevents UI hiding or one misconfigured layer from becoming the only admin boundary.

## ADR-004 — Local recovery plus durable upload identity

Status: accepted.

The wizard saves text state on-device and reserves an RLS-owned `order_drafts` ID before upload. Private files use that stable ID; an atomic database function converts the same ID into a submitted order. This avoids fragile Storage moves while preserving refresh recovery.

## ADR-005 — Immutable commercial snapshots

Status: accepted.

Submitted orders copy package name, price, poster count, and free amendment allowance. Editing the package catalog never changes an existing purchase.

## ADR-006 — Human-verified archives before deletion

Status: accepted.

Generating a ZIP records an export attempt but does not authorize deletion. The owner must open the local archive and explicitly verify it. A database trigger blocks unverified archive transitions, ordinary admin RLS has no direct order-delete policy, and the permanent-delete RPC requires archived state plus the exact order number.

## ADR-007 — Human-selectable ChatGPT submission

Status: accepted.

Studio automation defaults to `review_required`, where the local companion prepares a verified message and attachments but stops before sending. The sole admin may enable `auto_send` for explicitly queued jobs. The selected mode is server-owned and will be snapshotted when a job is created; it never authorizes automatic response extraction, CAPTCHA handling, login approval, or submission when expected assets are missing.

## ADR-008 — Hermes orchestrates a deterministic local companion

Status: accepted.

Hermes may schedule and report the repository-owned runner, but does not query Supabase or control job permissions directly. A dedicated bearer token reaches only the automation job API; service-role access stays inside Next.js. Playwright attaches to a dedicated localhost-only browser profile, and job leases make interrupted work recoverable. Prompt Studio output is copied manually into the image-generation stage, preserving the prohibition on automatic ChatGPT response extraction.

## ADR-009 — Player identity is relational and photo-scoped

Status: accepted.

An order may contain one to six ordered players. `orders.player_name` remains a
backward-compatible display/search summary, while `order_players` is the source
of truth and each athlete photo references one player. The atomic submission
function validates at least one photo per player and no more than eight total.
Generation manifests repeat the player label beside every local reference path
so multi-player image generation does not treat all faces as one anonymous pool.
