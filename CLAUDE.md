# CLAUDE.md

Renamed from Wardest to WardForward on 2026-11-22.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status: Phase 0 + 1 + 2 + 3 COMPLETE, built & local-verified; built-in shortener retired (2026-10, short links are pasted `zippa.run` links). Volunteer sign-ups built & local-verified 2026-11-21 (IMPLEMENTATION.md §10 item 9; Turnstile + Discord owner steps pending). Renamed to WardForward and email moved to Cloudflare Email Service 2026-11-22. Service opportunities, requests, bulk invitations and portal sections built & local-verified 2026-11-22 (IMPLEMENTATION.md §10 item 10). Deploy + real Google/email pending owner (IMPLEMENTATION.md §2 O2–O11, §5b). Next: see IMPLEMENTATION.md §10 (roadmap)

Reading order: `BLUEPRINT.md` (what WardForward is) → `SCHEMA.md` + `db/schema.sql` (data model +
canonical visibility rules) → `IMPLEMENTATION.md` (the execution playbook: stack decisions,
engineering rules, phase milestones, owner-task blockers). `HANDOFF.md` is historical; where docs
disagree, blueprint wins on product, IMPLEMENTATION.md on build order. This file is the quick
operational reference. The strategy is settled — don't re-open settled decisions.

## What WardForward is (one line)

WardForward teaches ward leaders how to stand up a curated set of (mostly Google-based) digital solutions,
tracks which they've implemented, and assembles the resulting links / files / QR codes into shareable,
printable **portal** pages scoped to the right audience. Two halves: **Learn & Build** (catalog +
implementation tracker) and **Publish & Share** (portals).

## Surfaces

- `wardforward.com` — static marketing/landing + Google sign-in + Donate (Cloudflare Pages, no WordPress).
- `app.wardforward.com` — the authenticated app.
- `zippa.run` — short links for deliverables and portals (e.g. `zippa.run/m44Links`). A **separate,
  live project** (`../zipa.run`), not part of this Worker. It has no API by design (its decision
  0008), so WardForward can't create links there. Instead it's multi-user (its decision 0019): a
  ward's Exec Sec asks to join on `app.zippa.run`, the operator approves and binds them to the
  ward's prefix, and they create that prefix's links themselves (any other slug is a second
  request the operator approves). `go4.cc` is dead (the domain was never transferred).

## Architecture (all Cloudflare)

- **Workers** — the app (one Worker: `app.wardforward.com` + the `wardforward.com` landing). It stores
  pasted short links (`deliverables.short_url`, `spaces.share_url`) and derives QR codes from
  them; it never creates or serves short links. (The Phase 0–3 `go4.cc` shortener was retired
  in 2026-10.)
- **D1** (SQLite) — structured data: wards, users, memberships, spaces, solutions, implementations,
  portals, tasks. **Row-level tenancy** (`ward_id` on every row); one DB, not one-per-ward.
- **R2** — uploaded files/images (free egress).
- **Pages** — the static `wardforward.com` site.
- **Auth: Sign in with Google (OAuth/OIDC) implemented in-app.** NOT Cloudflare Access (50-user free
  cap; can't do per-space authz). We manage sessions + authorization; Google manages credentials.
- **Email: Cloudflare Email Service** (Email Sending) through the `EMAIL` `send_email` binding in
  `wrangler.toml` — no API key; needs the Workers Paid plan and `send.wardforward.com` onboarded
  (subdomain so Google keeps the apex MX). `src/lib/mail.ts` is the only code that sends email.
  Two streams: `notify` (`WardForward <no-reply@send.wardforward.com>`: invites, volunteer
  messages) and `invitations` (`WardForward invitations <invite@send.wardforward.com>`: the coming
  bulk invitations). Every message has exactly one recipient (a multi-address `to` is refused);
  headers are allow-listed (`List-Unsubscribe`, `List-Unsubscribe-Post`, `X-*`); `sendMailBatch`
  sends many, bounded concurrency, never throws. Locally `EMAIL_DELIVERY=log` (in `.dev.vars`)
  prints every email (with its links) to the `wrangler dev` console; without it the local binding
  is Wrangler's simulator (logs, saves to files, never sends). With no binding, mail prints only
  when `APP_URL` is localhost/127.0.0.1; anywhere else it is refused (`no_binding`, logged as
  `[mail] EMAIL binding missing`) and never printed, since it can hold sign-in links. Tests swap `EMAIL` for a recording
  fake (`sentEmails()` / `mockEmail()` in `test/helpers.ts`).
- **Volunteer sign-ups** (spec `docs/superpowers/specs/2026-11-21-volunteer-signups-design.md`).
  Routes live in `src/volRoutes.ts`: leader pages `/w/:wardId/vol/*` and `/w/:wardId/volunteers`
  (Google session), the public post page `/v/:publicId` (random id, `noindex`, never names /
  emails / private details), and volunteer pages `/vol/*` (verify, cancel, withdraw, My sign-ups
  at `/vol/:prefix/me`, Discord connect). Volunteers sign in by emailed link into a separate
  `wardforward_vol` cookie (path `/vol`). Every permission decision goes through
  `src/lib/volAccess.ts` (fail closed). Domain functions return messages; `deliver()` in
  `src/lib/volMessages.ts` sends them (email via `src/lib/mail.ts`, plus a best-effort Discord DM). An hourly **Cron
  Trigger** (`wrangler.toml [triggers]`, `src/lib/volCron.ts`) sends day-before reminders and 48h
  approval nudges and lapses stale waiting sign-ups, in each ward's `wards.timezone`. Public
  forms are protected by **Cloudflare Turnstile** (`TURNSTILE_SITE_KEY` var, `TURNSTILE_SECRET_KEY`
  secret; test keys locally) plus D1 rate limits. **Discord** DMs use one WardForward application
  (`DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` secrets). Emailed links open
  a page whose button POSTs (mail scanners prefetch links).
- **Service opportunities, requests and portal sections** (spec
  `docs/superpowers/specs/2026-11-22-service-opportunities-requests-design.md`). Routes in
  `src/serviceRoutes.ts`: leader pages `/w/:wardId/service` (hub), `/w/:wardId/service/category/:id`
  (managers: settings, delegates, fill warnings, Discord webhook), `/w/:wardId/service/mine`,
  `/w/:wardId/requests[/:id]` (inbox), `/w/:wardId/vol/:postId/invite/*` (bulk invitations); public
  `/serve/:prefix` (open opportunities by brothers/sisters/youth/children), `/help/:prefix[/:slug]`
  (request tiles and minimal forms), `/help/verify/:token`, `/unsub/:token` (RFC 8058 one-click).
  Every category/delegate/request decision goes through `src/lib/serviceAccess.ts` (posts still
  through `src/lib/volAccess.ts`); both fail closed, and confidential request categories (Christmas,
  Other) are hidden from bishopric members who don't own the space. Every post has a
  `service_categories` category and audiences; `vol_signups.child_name` lets a parent sign up a
  child. New requests notify leaders by email with no details; requests are purged 30 days after
  they close. Invitations go out on the `invitations` stream, one recipient each, pumped from D1 by
  an every-minute cron (`src/lib/invitations.ts`) under a per-ward daily ceiling
  (`wards.invite_daily_cap`, operator-editable). The public portal starts with the Service
  Opportunities and Service Requests sections (ward settings: short links, on/off), then the ward's
  `portal_sections`, then "Links". The hourly cron also sends fill warnings
  (`src/lib/serviceWarnings.ts`) and purges requests.
- **Independence disclaimer** (General Handbook 38.8.21.2). Every page shell (landing, `layout()`,
  portal, print, not-found) renders `siteFooter()` from `src/views/footer.ts`: "WardForward is an
  independent tool made by Church members. It is not an official product of, or sponsored by, The
  Church of Jesus Christ of Latter-day Saints." plus `Contact: <mailto>` when the `CONTACT_EMAIL`
  var is set (`""` hides it). `src/lib/mail.ts` appends the same text (and contact) to the html
  and text of every email. New page shells must render `siteFooter()` too. Never use the Church's
  official name as our branding, or its wordmark or symbol. Unknown paths and uncaught errors
  on both hosts get branded 404/500 pages (`installErrorPages`, `src/views/errorPages.ts`).

Key invariants: **ward = visibility boundary**, **individual = edit/ownership boundary**. Spaces are
opt-in shared audiences with **no automatic top-down visibility**. Public portals are `noindex` but
otherwise public; short links are inherently public (they exist to be shared). Every pasted link
is http(s)-only, normalized on write and guarded on render (`src/lib/urls.ts`).

## Repo contents

- `BLUEPRINT.md` — full product spec + phase plan.
- `SCHEMA.md` + `db/schema.sql` — D1 data model, audit trail, canonical visibility algorithm.
- `IMPLEMENTATION.md` — execution playbook (stack, rules, milestones, owner blockers).
- `HANDOFF.md` — historical original spec.
- `src/` (Hono Worker) + `wrangler.toml` + `db/` (schema + seeds; `db/seed-m44.sql` carries M44's
  six real zippa.run links).

## Build order (see BLUEPRINT.md §14 for detail)

- **Phase 0** — M44 public portal (auto SVG QR, poster print). Its `go4.cc` shortener was
  retired in 2026-10 for pasted zippa.run links.
- **Phase 1** — Google auth, tenancy, spaces, onboarding + email invites.
- **Phase 2** — solutions catalog + implementation tracker.
- **Phase 3** — full portal builder (rich-text, tasks, per-portal share links).
- **Phase 4** — onboard other wards + polish. (Shortener abuse controls are zippa.run's job and
  already built there.)

## Deploy / develop

Cloudflare Wrangler (Wrangler ≥ 3.60.0 uses space-separated subcommands; the colon form is
deprecated). Prefix with `npx ` if not installed globally. The lockfile pins **wrangler 4.157.0**
(miniflare 5.20261103.0-beta), pulled in with the test harness in 2026-11.

- Local: `npm run db:init:local` → `npm run db:seed:local` → `npm run db:seed:solutions:local` →
  `npm run dev` (portal at `http://localhost:8787/p/m44`; `/auth/dev-login?email=…` needs
  `.dev.vars`). `db/schema.sql` has no `IF NOT EXISTS`, so to reset, delete `.wrangler/state`
  first — or point at a scratch DB with `--persist-to <dir>` on both `d1 execute` and `dev`.
  An existing local DB made before 2026-11-22 needs
  `npx wrangler d1 execute wardforward-db --local --file=./db/upgrade-2026-11-22-service.sql`
  (service categories, requests, invitations, portal sections; run once), or delete
  `.wrangler/state` to reset.
- `npm run typecheck` — `tsc --noEmit`.
- `npm test` — Vitest inside the Workers runtime (`@cloudflare/vitest-plugin`); applies
  `db/schema.sql` to a test D1, intercepts every outbound fetch and fakes the `EMAIL` binding. Run `npm test && npm run
  typecheck` before committing. Rules that keep it green on a busy machine (2026-11-22 flake fix):
  work a route hands to `waitUntil` is awaited with `settle()` (`test/helpers.ts`), never polled,
  and setup settles after every test; a test that runs on the real clock uses `futureDate()` or
  passes `now`, never a fixed calendar date; one leader page view per test where a page runs
  ~150+ D1 queries (service hub, space pages); no test should take more than ~0.5 s alone (the
  2,000-invitation volume test has its own measured timeout).
- Cron locally: `npx wrangler dev --test-scheduled`, then
  `curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"` (hourly: reminders, nudges, lapses,
  fill warnings, request purges) or `cron=*+*+*+*+*` (every minute: the invitation pump).
- `wrangler deploy` — deploy (full owner steps: IMPLEMENTATION.md §5b + §10 item 2).
- `wrangler d1 execute wardforward-db --remote --file=<sql>` — run schema/seeds against prod D1.
- `wrangler email sending enable send.wardforward.com` — onboard the sending domain (owner, once).

## Anti-abuse posture

Ward creation is gated by a **request → operator approves** step (gatekeep spam; do NOT try to verify
callings). Duplicate wards prevented by matching **unit number**. Link abuse is handled on the
zippa.run side (join requests the operator approves, creators bound to a ward prefix, Web Risk
destination scanning).

## Related project — M44 Link in Bio (the pattern WardForward generalizes)

`F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio` is the Mapleton 44th Ward build that WardForward is the
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
migrated into WardForward and never edited from here. WardForward needs its own **demo / example copy**
for new wards (roadmap). The Playbook feeds WardForward's **Solutions catalog** as Executive-Secretary
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

`wardforward.com` DNS goes on Cloudflare (owner step, if it isn't already). Sam adds
wardforward.com to Google Workspace as an alias domain himself, so Google owns the apex MX — don't
touch it. Cloudflare Email Sending's records (SPF/DKIM, bounce MX) live on the `send.` subdomain.
