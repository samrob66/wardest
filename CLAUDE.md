# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status: strategy complete, execution not started

Reading order: `BLUEPRINT.md` (what Wardest is) → `SCHEMA.md` + `db/schema.sql` (data model +
canonical visibility rules) → `IMPLEMENTATION.md` (the execution playbook: stack decisions,
engineering rules, phase milestones, owner-task blockers). `HANDOFF.md` is historical; where docs
disagree, blueprint wins on product, IMPLEMENTATION.md on build order. This file is the quick
operational reference. The strategy is settled — don't re-open settled decisions.

## What Wardest is (one line)

Wardest teaches ward leaders how to stand up a curated set of (mostly Google-based) digital solutions,
tracks which they've implemented, and assembles the resulting links / files / QR codes into shareable,
printable **portal** pages scoped to the right audience. Two halves: **Learn & Build** (catalog +
implementation tracker) and **Publish & Share** (portals).

## Surfaces

- `wardest.com` — static marketing/landing + Google sign-in + Donate (Cloudflare Pages, no WordPress).
- `app.wardest.com` — the authenticated app.
- `go4.cc` — all short links and public portal links (e.g. `go4.cc/p4thbulletin`), prefix-namespaced
  per ward.

## Architecture (all Cloudflare)

- **Workers** — the app and the `go4.cc` shortener (shortener is an integrated internal service, not a
  separate site).
- **D1** (SQLite) — structured data: wards, users, memberships, spaces, solutions, implementations,
  portals, tasks, short links. **Row-level tenancy** (`ward_id` on every row); one DB, not one-per-ward.
- **R2** — uploaded files/images (free egress).
- **Pages** — the static `wardest.com` site.
- **Auth: Sign in with Google (OAuth/OIDC) implemented in-app.** NOT Cloudflare Access (50-user free
  cap; can't do per-space authz). We manage sessions + authorization; Google manages credentials.
- **Email: Resend**, sending from `no-reply@send.wardest.com` (subdomain so Google keeps the apex MX).
  API key is a Worker secret `RESEND_API_KEY` — never commit it.

Key invariants: **ward = visibility boundary**, **individual = edit/ownership boundary**. Spaces are
opt-in shared audiences with **no automatic top-down visibility**. Public portals are `noindex` but
otherwise public; short links are inherently public (they exist to be shared).

## Repo contents

- `BLUEPRINT.md` — full product spec + phase plan.
- `SCHEMA.md` + `db/schema.sql` — D1 data model, audit trail, canonical visibility algorithm.
- `IMPLEMENTATION.md` — execution playbook (stack, rules, milestones, owner blockers).
- `HANDOFF.md` — historical original spec.
- `seed/links.json` — the 6 Mapleton 44th Ward links in `wrangler kv bulk put` format (keys lower-cased).
- Worker code + `wrangler.toml` — to be built (see IMPLEMENTATION.md Phase 0).

## Build order (see BLUEPRINT.md §14 for detail)

- **Phase 0** — `go4.cc` shortener + M44 public portal (auto SVG QR, poster print). Ships first, replaces
  tinyurl/tiny.cc, de-risks the stack.
- **Phase 1** — Google auth, tenancy, spaces, onboarding + Resend invites.
- **Phase 2** — solutions catalog + implementation tracker.
- **Phase 3** — full portal builder (rich-text, tasks, per-portal short links).
- **Phase 4** — onboard other wards + abuse controls + polish.

## Deploy / develop (once the Worker exists)

Cloudflare Wrangler, current syntax (Wrangler ≥ 3.60.0 uses space-separated `kv ...`; the colon form
`kv:...` is deprecated). Prefix with `npx ` if not installed globally.

- `wrangler dev` — run a Worker locally.
- `wrangler deploy` — deploy.
- `wrangler kv namespace create <KV_BINDING>` — create a KV namespace; paste the printed block into
  `wrangler.toml`.
- `wrangler kv bulk put --binding=<KV_BINDING> seed/links.json` — seed the shortener links (`--preview`
  targets the preview namespace).
- `wrangler d1 execute <DB> --file=<schema.sql>` — run D1 migrations (once D1 is set up).
- `wrangler secret put RESEND_API_KEY` — store the Resend key.

## Anti-abuse posture

Ward creation is gated by a **request → operator approves** step (gatekeep spam; do NOT try to verify
callings). Duplicate wards prevented by matching **unit number**. Shortener protected by
authenticated-only creation, optional Safe Browsing checks, rate limits, and suspend — because a
blocklisted `go4.cc` breaks every ward's links.

## Related project — do not break

`F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio` (repo `github.com/samrob66/m44links`, `index.html` +
`print.html` + `build_pdf.py`) is a separate link-in-bio page that hardcodes the old tinyurl/tiny.cc
links. **After** the shortener is live, update those to the new `go4.cc/...` links. Its `index.html` is
the design reference for the Phase 0 public portal. Not part of this repo's build.

## Heads-up

Nameserver/DNS for `wardest.com` is on Cloudflare and already runs Google Workspace email (MX + SPF +
DKIM + DMARC are set). Don't touch the apex MX. Resend records live on the `send.` subdomain.
