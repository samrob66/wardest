# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status: Phase 0 + 1 + 2 + 3 COMPLETE, built & local-verified; deploy + real Google/Resend pending owner (O2–O6 + `wrangler r2 bucket create wardest-files`). go4.cc fell through (2026-10) — short links are on `zippa.run`. Next: see IMPLEMENTATION.md §10 (roadmap)

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
- `zippa.run` — short links for deliverables and portals (e.g. `zippa.run/m44Links`). A **separate,
  live project** (`../zipa.run`), not part of this Worker. It has no API by design (its decision
  0008), so Wardest can't create links there. Instead it's multi-user (its decision 0019): a
  ward's Exec Sec asks to join on `app.zippa.run`, the operator approves and binds them to the
  ward's prefix, and they create that prefix's links themselves (any other slug is a second
  request the operator approves). `go4.cc` is dead (the domain was never transferred).

## Architecture (all Cloudflare)

- **Workers** — the app. The built-in `go4.cc` shortener from Phases 0–3 (`src/go.ts`, `GO4_LINKS`
  KV, short-link minting) is superseded by zippa.run and due to be retired (IMPLEMENTATION.md §10).
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
- `seed/links.json` — the 6 Mapleton 44th Ward links in `wrangler kv bulk put` format (keys
  lower-cased); feeds the go4 KV mirror, so it goes when the built-in shortener is retired.
- `src/` (Hono Worker) + `wrangler.toml` + `db/` (schema + seeds).

## Build order (see BLUEPRINT.md §14 for detail)

- **Phase 0** — shortener (built for `go4.cc`, now superseded by zippa.run) + M44 public portal (auto
  SVG QR, poster print).
- **Phase 1** — Google auth, tenancy, spaces, onboarding + Resend invites.
- **Phase 2** — solutions catalog + implementation tracker.
- **Phase 3** — full portal builder (rich-text, tasks, per-portal short links).
- **Phase 4** — onboard other wards + polish. (Shortener abuse controls are zippa.run's job and
  already built there.)

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
callings). Duplicate wards prevented by matching **unit number**. Link abuse is handled on the
zippa.run side (join requests the operator approves, creators bound to a ward prefix, Web Risk
destination scanning).

## Related project — M44 Link in Bio (the pattern Wardest generalizes)

`F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio` is the Mapleton 44th Ward build that Wardest is the
generalized product of. It has grown well past the old "one `index.html`" description — see its
`HANDOFF-TO-WARDEST.md` (2026-10-06) for the authoritative current state. Today it has:
- a **two-column link hub** (Ward Links / Interviews) + 4 interview sub-pages, live at
  `m44ward.github.io/m44links/` (repo `github.com/m44ward/m44links`) — still the visual reference
  for the Phase-0 public portal, just richer.
- **self-scheduled per-leader interviews**: Google Appointment Schedules + a per-minute Google
  Apps Script "router" that files each booking onto the right leader's calendar via the
  *decline-the-host* trick (frees the shared base calendar while keeping the member's cancel link
  working). Durable copies staged beside the handoff: `WardLinksPlaybook.html` (full how-to) and
  `InterviewRouter.gs.txt` (the production script).
- **Zoom-based virtual interviews** with a confidentiality posture.
- Short links on **`zippa.run`** (master `zippa.run/m44Links`) — their permanent home, not an
  interim. (The handoff's "migrate to go4.cc" step is void.)

The M44 site is **the ward's property** (repo owned by the ward's role account), so it is never
migrated into Wardest and never edited from here. Wardest needs its own **demo / example copy**
for new wards (roadmap). The Playbook feeds Wardest's **Solutions catalog** as Executive-Secretary
+ Bishopric how-tos (the interview router is a solution's template asset).

## Related tools — the assignment rotation trackers

The **Bishopric Meeting** and **Ward Council Assignment Rotation** trackers (built with Claude,
2026-07-04/05) live outside any repo, in `S:\Data\App Data\Assignments - Bishopric Mtg\` and
`...\Assignments - Ward Council\`. Each recommends who gives the opening prayer, spiritual thought
and closing prayer, choosing whoever has done that item least (ties go to fewest assignments
overall, then longest since their last turn, then calling order). It also keeps standings and
history. Each comes in two versions:
- a **standalone HTML** page (a Claude design export; data in the browser's `localStorage`, plus
  JSON backup/restore). The Ward Council copy's default list holds M44's real names, so never
  ship it.
- an **Apps Script version** (`AppScript Version\*.zip` = `Code.gs` + `Index.html`, plus a 7-step
  setup guide as PDF + .pptx). It's a web app over a Sheet the ward owns (tabs Members / History /
  Config / Editors). Anyone with the link can view; editing needs a PIN, or being on the Editors
  list (Workspace domains only). **This is the catalog asset** (roadmap item 5).

Treat these folders as read-only originals; generalized copies go in this repo.

## Heads-up

Nameserver/DNS for `wardest.com` is on Cloudflare and already runs Google Workspace email (MX + SPF +
DKIM + DMARC are set). Don't touch the apex MX. Resend records live on the `send.` subdomain.
