# Wardest.com — Implementation Playbook (handoff for execution)

**Audience:** the Claude model executing the build (Opus). **Author:** strategy phase
(blueprint by Opus 4.8, audit + this playbook by Fable 5), all decisions confirmed by the owner.

**Reading order:** [`BLUEPRINT.md`](BLUEPRINT.md) (what Wardest is) → [`SCHEMA.md`](SCHEMA.md) +
[`db/schema.sql`](db/schema.sql) (data model + canonical visibility rules) → this file (how to
build it, in order). `HANDOFF.md` is historical; ignore where it conflicts.

**The strategy is settled. Do not re-open settled decisions** (stack, domains, auth approach,
visibility model, phasing). If reality contradicts this document (an API changed, a tool is
gone), fix pragmatically, note the deviation in the commit message, and keep the *intent*.

---

## 1. Current state (verified, July 2026)

| Item | State |
|---|---|
| Repo | `github.com/samrob66/wardest`, `main`, push access verified |
| Code | Phases 0–3 built + local-verified (`src/` Worker, `db/` schema + seeds); built-in shortener retired 2026-10 (§10 item 1) |
| `wardest.com` DNS | On Cloudflare (nameservers moved). Google Workspace MX/SPF/DKIM/DMARC live at apex — **do not touch apex MX** |
| Email | Resend verified on `send.wardest.com` (records live at `send.send.wardest.com` + `resend._domainkey.send.wardest.com`). From: `no-reply@send.wardest.com`. Live send test passed (SPF/DKIM/DMARC) |
| `go4.cc` | **Dead (2026-10)** — the seller never transferred it; refunded. Short links are on `zippa.run`, a separate live project (`../zipa.run`). See BLUEPRINT §7 |
| Owner's Resend API key | Created (never committed; goes in via `wrangler secret put RESEND_API_KEY`) |

## 2. Owner tasks (blockers you cannot do — ask when you hit them)

- ~~**O1.** Add `go4.cc` as a Cloudflare zone.~~ **Obsolete** — go4.cc is dead (2026-10).
- **O2.** Supply the real M44 **unit number** for the seed (placeholder until then).
- **O3.** `wrangler login` / Cloudflare API token for deploys from this machine.
- **O4.** Phase 1: create a **Google Cloud OAuth client** (web app; authorized redirect
  `https://app.wardest.com/auth/callback` + `http://localhost:8787/auth/callback` for dev).
- **O5.** Phase 1: `wrangler secret put RESEND_API_KEY` (+ `SESSION_SECRET`, `GOOGLE_CLIENT_SECRET`).
- **O6.** Choose the donate link (Stripe Payment Link / Ko-fi / PayPal) for the landing page.
- ~~**O7.** Confirm cutover timing for the old `M44 Link in Bio` page.~~ **Obsolete** — the M44
  site is the ward's property, already on zippa.run, and is never migrated (see §9).

## 3. Stack decisions (settled)

- **One Worker** (`wardest`) serving two hostnames via hostname routing in the fetch handler:
  `app.wardest.com/*` (app + portal render) and `wardest.com/*` (static landing). Split into
  multiple Workers later only if a real reason appears. *(Until 2026-10 it also served `go4.cc`
  redirects; that shortener is retired — short links are zippa.run's, a separate project.)*
- **TypeScript + Hono** (Workers-native router). Server-rendered HTML; minimal vanilla JS
  (QR modal, later form UX). No frontend framework. Portal pages must degrade gracefully
  without JS (QR modal is the only JS-dependent nicety).
- **D1** = source of truth (apply `db/schema.sql` as migration 0001). **R2** bucket
  `wardest-files` (Phase 2+). No KV (the `GO4_LINKS` redirect mirror went with the shortener).
- **QR codes:** generate **SVG server-side** with `uqr` (zero-dep, edge-compatible; if
  unavailable, any zero-dependency SVG QR encoder — pin whatever you verify works in
  `wrangler dev`). Never use external QR APIs (the old page's `api.qrserver.com` dependency is
  one of the things we're deliberately eliminating: privacy, rasterization, third-party uptime).
- **Short links are pasted, not minted.** A leader makes them on zippa.run (which redirects with
  302 + `no-store`, so edits take effect at once) and pastes them into Wardest:
  `deliverables.short_url` and `spaces.share_url`. A QR encodes the short link when set, else
  the destination. Wardest itself never redirects.
- **Sessions (Phase 1):** stateless signed cookie — `base64url(JSON{uid, exp}) + "." +
  HMAC-SHA256 sig` via WebCrypto, secret in `SESSION_SECRET`, HttpOnly + Secure + SameSite=Lax,
  7-day expiry. No sessions table.

## 4. Cross-cutting engineering rules

1. **Tenancy:** every query on ward-scoped tables filters `ward_id`. No exceptions. Write the
   data-access layer so handlers can't forget (e.g. helpers take `wardId` as a required arg).
2. **Visibility:** implement `canViewSpaceContent` / `canViewImplementation` exactly as specified
   in SCHEMA.md §"App-layer rules", **once**, in one module, and route every read through it.
   Fail closed. **Ward superadmin is break-glass**: `canView*` returns true for a superadmin of
   the row's ward (view + manage anything in-ward). This is bounded to Wardest's own data — a
   link's destination (e.g. a Google Doc) keeps its own permissions.
3. **Ownership:** only `created_by_user_id` may edit/delete a deliverable/task; only space
   owners edit portal content/shares; only superadmins edit ward structure & callings. A ward
   **superadmin overrides all of these within their ward** (break-glass). Superadmins may
   grant/revoke the superadmin role to other members via the ward page; the app refuses to
   remove the last superadmin. First signup is superadmin; hand it to the Bishop + Exec Sec.
4. **Ward prefixes:** lowercase, `^[a-z0-9]{2,12}$`, unique; the public portal lives at
   `/p/<prefix>`. Assign the ward's zippa.run prefix (e.g. `m44`) so the two match. *(The old
   slug rules retired with the shortener in 2026-10; zippa.run enforces its own.)*
5. **Pasted links:** every user-supplied link (deliverable URL, short link, share link) goes
   through `normalizeHttpUrl` (`src/lib/urls.ts`) on write — http(s) only, so a `javascript:` or
   `data:` URL never reaches an href — and through `safeHref` on render. *(Replaces the retired
   KV-mirror rule.)*
6. **FKs are enforced by D1** — insert parents before children; use `PRAGMA defer_foreign_keys`
   inside reshaping migrations only.
7. **Sanitize rich text server-side** with a strict allowlist (p, br, b/strong, i/em, u, a[href
   http/https], ul/ol/li, h3/h4). No style/script/event attributes, ever (Phase 3).
8. **Public pages:** `noindex` meta + `X-Robots-Tag: noindex` header on portals and served files.
9. **Secrets** never in the repo or wrangler.toml — `wrangler secret put` only.
10. **Git:** commit per milestone with working state; verify (`wrangler dev` + checks below)
    before committing; push to `main`.
11. **R2 keys (Phase 2):** `w/<ward_id>/<deliverable_id>/<filename>`; enforce size (≤10 MB) and
    content-type allowlist (pdf, png, jpg, webp, svg) at upload.

## 5. Phase 0 — go4.cc shortener + M44 public portal

> **Superseded in part (2026-10).** go4.cc never transferred; the shortener now lives at
> zippa.run (separate project). §5 and §5b are kept as the record of what was built. The
> shortener half is retired by roadmap item 1 (§10); the portal half stands.

Goal: replace tinyurl/tiny.cc for M44 and prove the stack. Build/dev now; deploy blocked only by O1.

- **0.1 Scaffold.** `npm` project, TypeScript, Hono, `wrangler.toml` (name `wardest`, D1 binding
  `DB`, KV binding `GO4_LINKS`, routes for all three hostnames), `wrangler dev` runs locally.
- **0.2 Database.** `wrangler d1 create wardest-db`; migration `0001_init.sql` = `db/schema.sql`
  verbatim. Seed script `db/seed-m44.sql`: M44 ward (prefix `m44`, unit number from O2 or
  placeholder `TBD-M44`), default spaces (Public, Bishopric, Ward Council, EQ, RS, YW, YM,
  Primary, Sunday School, Activities Committee, Ward Mission — Public `portal_published=1`),
  6 deliverables (type `url`, from `seed/links.json` destinations) published to the Public space
  via `deliverable_spaces`, 6 `short_links` rows (target_type `deliverable`), + 1 portal short
  link `m44` (target_type `portal` → Public space). Keep `seed/links.json` in KV bulk format for 0.4.
- **0.3 Redirect handler** (hostname `go4.cc`): per rule 4/5 above. 404 = small branded page
  ("This link doesn't exist — Wardest"). `robots.txt` + favicon stub.
- **0.4 KV seed.** `wrangler kv bulk put --binding=GO4_LINKS seed/links.json` (add the `m44`
  portal slug → portal URL). Verify each key.
- **0.5 Public portal render.** `GET app.wardest.com/p/<prefix>` → D1: ward by prefix → Public
  space → included `deliverable_spaces` (ordered) → render. Design per §7. Each card: label,
  link (the go4.cc URL), QR sub-button opening inline-SVG QR modal, mono `go4.cc/<slug>` caption.
  Master-QR block for the portal's own `m44` short link. Disclaimer line. `noindex` (rule 8).
  No external requests of any kind (fonts/QR/images all local or inline).
- **0.6 Print variant.** `GET /p/<prefix>/print?size=letter|a4|tabloid|poster-18x24|poster-24x36`
  → same data, print-optimized layout (`@page` size from param, pt/in units,
  `print-color-adjust: exact`, larger QR). All vector (text + SVG QR) so any size stays crisp.
  Owner prints via browser print-to-PDF.
- **0.7 Landing.** `wardest.com` → static page from the same Worker: name, one-line thesis,
  "Sign in (coming soon)", donate placeholder (O6). (Deviation from blueprint's "Pages" — one
  Worker is fewer moving parts; move to Pages if/when marketing grows.)
- **0.8 Deploy + verify** (needs O1, O3): routes live on all three hostnames.

**Phase 0 exit checklist:** all 6 `go4.cc/m44*` links 302 to correct destinations; uppercase
variants (`go4.cc/M44Discord`) work; unknown slug → branded 404; `go4.cc/m44` → portal; portal
renders with working links + scannable QR codes (test with a phone); print variant produces a
crisp PDF at letter AND poster-24x36 (zoom to 400% — text/QR must stay vector-sharp);
`X-Robots-Tag: noindex` present on portal; zero external requests in devtools network tab;
Workers logs clean.

## 5b. Phase 0 build status — BUILT, local-verified (deploy pending O1/O2/O3)

Milestones 0.1–0.7 complete and verified against **local** D1/KV via `wrangler dev`. 0.8 (deploy)
is blocked only by owner tasks. Code: `src/` (Hono, one Worker), `db/schema.sql` +
`db/seed-m44.sql`, `wrangler.toml`, `seed/links.json` (+ `m44` portal key).

Run locally *(current as of 2026-10, after the shortener retirement)*: `npm install` →
`npm run db:init:local` → `npm run db:seed:local` → `npm run db:seed:solutions:local` →
`npm run dev`. Portal: <http://localhost:8787/p/m44>. A local DB created before 2026-10 has the
old schema: delete `.wrangler/state` and re-run the three db scripts.

**Verified (exit checklist):** all 6 `m44*` + 2 legacy slugs 302 to correct destinations;
uppercase `M44Discord` works; unknown slug → branded 404; `m44` → portal; portal renders all 6
labels with inline-SVG QR; **zero external resource requests**; `X-Robots-Tag: noindex` present;
print renders at letter + poster-24x36 (`@page` size switches); D1-fallback + KV backfill work;
host routing correct across all three surfaces. **Owner acceptance still needed:** phone-scan a
QR and print a poster to PDF — both only meaningful **after deploy** (QRs encode live `go4.cc`
URLs).

**Deviations from plan (all intentional):**
- `@cloudflare/workers-types` is **v5** (`^5.2026…`) — wrangler 4.111's peer; the playbook's
  implied v4 was stale.
- Per-card QR is a **pure-CSS `:target` modal** (no JS) rather than a JS modal — honors the
  "modal" intent, needs zero JS, zero external requests, degrades perfectly.
- Legacy slugs `setmeapart` / `maplecanyonstake` are **grandfathered non-prefixed** in the seed
  (still globally unique). The prefix rule (§4) governs app-created links from Phase 1 on.
- Landing is served from the **Worker** (plan 0.7 already flagged this vs. Pages).
- `wrangler.toml` has a **placeholder** D1 `database_id`; owner replaces it after
  `wrangler d1 create wardest-db`. (The KV namespace is gone with the shortener.)
- Local reset = delete `.wrangler/state` (schema.sql has no `IF NOT EXISTS` — it's the prod
  migration, run once).

**Deploy steps (owner, when O3 is ready; current as of 2026-10):** create D1 (paste the real id
into `wrangler.toml`) and `wrangler r2 bucket create wardest-files`;
`wrangler d1 execute wardest-db --remote --file=./db/schema.sql`; same for `db/seed-m44.sql` and
`db/seed-solutions.sql`; uncomment the `wardest.com` + `app.wardest.com` routes; `wrangler deploy`.
Replace the `TBD-M44` unit number (O2) first.

## 6. Phases 1–4 (milestone level — detail when you get there)

**Phase 1 — identity, tenancy, onboarding.**
Google OAuth: authorization-code flow w/ `state`+`nonce`; exchange code server-side; verify ID
token (or hit `userinfo`); upsert `users` on `google_sub`, refreshing email/name (SCHEMA.md app
rules). Session cookie per §3. Then: request-a-workspace form (public) → operator review UI
(operator = emails in `OPERATOR_EMAILS` var) → approval creates ward + default spaces + first
superadmin membership; unit-number dedupe routes to `kind='join'` requests reviewed by that
ward's superadmins. Onboarding wizard (callings chart → `invites` + `invite_space_roles`,
Resend emails via HTTPS API, president+secretary of each org auto-flagged as space owners).
Invite acceptance materializes memberships (re-invites UPDATE the row). Home = list of your
wards/spaces. Authz middleware = the visibility module (rule 2).

**Phase 1 build status — BUILT, local-verified (real Google login pending O4/O5).**
Implemented: HMAC signed-cookie sessions; Google OAuth authorization-code flow (state+nonce,
token exchange, id_token claim checks) + `dev-login` bypass gated by `DEV_LOGIN` (404 in prod);
`loadUser`/`requireAuth`/operator middleware; request-a-workspace with unit-number dedupe
(create/join); operator console + ward provisioning (11 default spaces + superadmin + public
portal short link mirrored to KV); ward page; invite/callings flow (`upsert invite` +
`invite_space_roles`, president/secretary → space owner by choosing owner role, Resend
best-effort with the accept link also shown in the admin UI, acceptance materializes ward+space
memberships, one-time-use + email-match enforced); canonical visibility module
(`src/lib/visibility.ts`) for Phase 2/3. Verified via dev-login: sign-in/out,
request→approve→ward, join dedupe+approve, invite→accept→memberships, invite reuse/mismatch/
logged-out paths, Phase 0 regressions. NOT yet exercised: real Google round-trip (needs O4
client + O5 secrets) and live Resend send (dummy key in dev — send returns false, link shown in
UI). Config: `[vars]` APP_URL/OPERATOR_EMAILS + secrets via `.dev.vars` (`.dev.vars.example`).
New deploy steps: `wrangler secret put SESSION_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
RESEND_API_KEY`; set OPERATOR_EMAILS + APP_URL in `[vars]`; create the Google OAuth client (O4)
with redirect `https://app.wardest.com/auth/callback`.

**Phase 2 — catalog + tracker.**
Operator authoring UI for `solutions` (markdown body, optional video URL, template asset,
`implementation_scope`, category incl. Activities Committee / Ward Mission). Ward-facing
catalog: collapsible sections by category; implement/track flow (status, owner, notes);
deliverable attach: URL (auto-offer short link + QR), or R2 upload (rule 11). Publishing UI →
`deliverable_spaces` (spaces multi-select + include-in-portal). Visibility editor per entry
(`ward`/`restricted` + grant spaces multi-select). Submission pipeline (`submitted` → operator
review → `published`/`rejected`).

**Phase 2 build status — PART 1 BUILT, local-verified.** Implemented: operator solution
authoring (create/edit/publish across the 6 categories, slugified unique slugs) + example seed
(`db/seed-solutions.sql`); ward catalog grouped by category (collapsible) with ward-level status;
implementation tracking (status/owner/notes) — `ward_singleton` (space_id NULL, visibility
`ward`, any ward member) and `per_space` (space picker, gated fail-closed to space members);
URL deliverables that mint a prefix-namespaced go4.cc short link (D1 + KV write-through) + derive
an SVG QR; publish-to-Public so the deliverable appears on `/p/<prefix>`. Verified via dev-login:
author→publish, catalog, track ward_singleton→implemented, add deliverable (slug `p4weeklybulletin`,
go4 redirect resolves), publish→portal shows it; per_space EQ owner can track, per_space picker
when no space chosen. **Part 2a DONE (superadmin break-glass + visibility editor + markdown):**
ward superadmin views/manages everything in-ward (per_space non-members otherwise 403); ward
role grant/revoke with last-superadmin guard; per-implementation visibility editor
(`ward`/`restricted` + multi-space grants) with catalog + detail reads routed through
`canViewImplementation`/`canEditImplementation` (restricted hides from unauthorized, grants are
view-only, superadmin bypass); markdown-lite (links/bold) for how-to bodies. Verified via
dev-login. **Part 2b DONE (submission + non-public publishing):** ward suggest→operator
approve/reject pipeline (submitted→published/rejected, shows in catalog once published);
deliverables publish to ANY space (multi-space) + unpublish, with **Public gated to superadmin**
and other spaces to their owners (RS owner publishes to RS portal; asks a superadmin to promote
to Public); category-based default publish target (Bishopric group → Bishopric portal; Exec Sec
+ Ward Clerk are Bishopric-group callings). Verified via dev-login. **Part 2c DONE — PHASE 2
COMPLETE:** R2 file/image deliverables — upload (PDF/PNG/JPEG/WebP/SVG, ≤10 MB, type-validated)
to the `FILES` bucket, each minting a go4 short link → the `/f/<id>` serving route; serving is
public when the deliverable is published to a public space, else gated through
`canViewImplementation`/`canViewDeliverable`. Verified: upload 302, bad type 400, unpublished
file → creator/ward-member/superadmin 200, non-member 403, anon → login; publish to Public →
anon 200. Prod deploy adds `wrangler r2 bucket create wardest-files`. NOTE: non-public space
portals still don't *render* — that's Phase 3 (portal builder).

**Phase 3 — portal builder.**
Per-space portals for logged-in members (Public renders as Phase 0). Rich-text `portal_blocks`
(sanitize, rule 7); `tasks` list w/ status, optional assignee, self-archive on done + "Archived"
view; drag ordering (`position`); per-portal short links; `space_shares` management UI (owners
only); print variant for every portal.

**Phase 3 build status — COMPLETE, local-verified.** Per-space portals
(`/w/:ward/space/:id`) render for logged-in members (gated by `canViewSpaceContent`; non-public
portals now display) with deliverables + markdown-lite rich-text blocks (owner CRUD + reorder;
safe by construction via the shared `mdLite` — no raw-HTML sanitizer) + a task list (add,
optional assignee, Done self-archives, Archived view w/ reopen/delete; participation = space
members + superadmin). `space_shares` UI (owners): share a space read-only with another space —
verified the *effect* (a Ward Council member gains read-only EQ access only while shared, no
manage controls; removed → blocked). Per-portal go4 short links (minted on demand — since
2026-10 a pasted share link instead, §10 item 1). Print variant for every space portal. Ward page
lists each user's accessible portals. Verified via dev-login on p4. Only R2-served files still
await deploy (O3).

**Phase 4 — scale-out + hardening.**
Operator dashboard (requests, wards). Second-ward onboarding end-to-end. Poster/print polish.
*(2026-10: shortener abuse controls dropped — zippa.run already has creator approval and Web Risk
scanning. The M44 repo update is void — the ward owns that site and it stays on zippa.run.)*

## 7. Portal design spec (from `M44 Link in Bio/index.html` + `print.html`)

Recreate the established look, upgraded. Tokens:

| Token | Value |
|---|---|
| Font | Georgia, serif |
| Ink / headings | `#1d3557` (navy) |
| Body text | `#2c3a4a`; subtitle `#6b7a8d`; muted mono `#8fa0b5` |
| Accent | `#4a6fa5` (links/icons); gold `#c9b882` (avatar ring, master-QR label, divider) |
| Card | white, 1px `#dde3ed` border, 14px radius, shadow `0 2px 10px rgba(29,53,87,0.07)`, hover lift |
| Card anatomy | chevron icon + bold label (main tap target) · right-side "Show QR Code" sub-button (`#f9fafc` bg, left border) · mono short-URL caption row under a top border |
| Master QR | navy `#1d3557` rounded block: gold uppercase label ("Scan to share this page"), white title, QR on white tile, mono URL |
| Header | ward name + small uppercase disclaimer ("Not an official website of The Church of Jesus Christ of Latter-day Saints") |
| Page bg | soft image w/ white gradient overlay in the original — Phase 0 may ship a plain gradient; per-ward hero images are a later nicety (raster imagery = grainy at poster size; keep posters vector-only) |
| Print | pt/in units, fixed `@page` size (parameterized per §5 0.6), `print-color-adjust: exact`, decorative arrow + QR emphasis as in `print.html` |

Upgrades vs. the original: QR = inline SVG (no `api.qrserver.com`), short URLs = `zippa.run/*`,
mobile-first responsive (original max-width 480px column is good), data-driven from D1.

## 8. Definition of done (every phase)

Working code deployed (or `wrangler dev`-verified when deploy-blocked), exit checklist green,
committed + pushed, no secrets in repo, docs updated **if behavior diverged from plan** (this
file + BLUEPRINT.md stay truthful), owner walked through anything they must click.

## 9. Guardrails (do NOT)

- Don't touch apex `wardest.com` DNS/MX, the Workspace/Resend records, or nameservers.
- Don't modify `F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio` or `github.com/m44ward/m44links` —
  the site is Mapleton 44th's property. Wardest gets its own demo copy (§10).
- Don't modify `../zipa.run` from here; it's a separate project with its own decision records.
- Don't build: custom passwords, calling verification, meeting agendas/minutes, WordPress,
  per-ward subdomains, analytics — all explicitly out of scope (BLUEPRINT §12).
- Don't weaken fail-closed visibility defaults for convenience.
- Don't use 301s for editable links, external QR/font/CDN dependencies on portals, or store
  QR images (always derive).
- Don't hand-edit production KV/D1 outside migrations/seeds/app writes (except via documented
  wrangler commands).

## 10. Roadmap from here (2026-10-06)

Items 1–2 get Wardest live; 3–7 build the Executive Secretary resource; 8 is Phase 4. Sam's
Notion Master Tasks (Area `Wardest.com`) tracks the same list.

1. ✅ **DONE 2026-10-06 — built-in shortener retired; links are pasted zippa.run links.**
   Removed: the `go4.cc` host route (`src/go.ts`), the `GO4_LINKS` KV binding,
   `seed/links.json`, the `short_links` table and all short-link minting.
   Added:
   - `deliverables.short_url` (set when adding a deliverable, or later by its creator or a
     superadmin)
   - `spaces.share_url` (set by space owners on the portal page, which shows the address to
     point the zippa.run link at)
   - `src/lib/urls.ts`, which accepts only http(s) links (rule 5). It closes the `javascript:`
     href hole that removing the redirect would otherwise have opened on public portals.

   A QR encodes the short link when one is set, otherwise the destination. A portal's master QR
   uses the share link, otherwise the portal's own address, and non-public portals now print
   their own address rather than the public one. The M44 seed carries its six real zippa.run
   links. Nothing had been deployed, so `db/schema.sql` was edited in place, with no migration.
   Verified locally on a fresh D1: portal, print, share-link set/clear/reject, deliverable
   create/reject, short-link permissions, file upload, and print for a non-public portal.
2. **Deploy.** Owner: O2 (M44 unit number), O3 (`wrangler login`), O4 (Google OAuth client), O5
   (secrets), O6 (donate link). Then create D1 + R2 (`wardest-files`), migrate + seed, deploy,
   and verify a real Google sign-in and a live Resend invite.
3. **Spec the Executive Secretary setup track** — the guided, ordered path for a new bishopric's
   Exec Sec. Discuss first, review as .docx, then build. Draft order (from the Playbook): role
   account → Google plan → calendars → booking pages → interview router → zippa.run creator +
   links → ward links site / portal → flyer → Zoom → assignment rotations → Wardest spaces +
   callings.
4. **Catalog how-tos from the Playbook.** Revise the 3 drafted solutions (zippa.run + demo site),
   seed them in place of `sol_ex_interviews` / `sol_ex_bulletin`, and ship the generalized
   `InterviewRouter` template with the real calendar IDs stripped. Then the remaining Playbook
   sections, in the track order from item 3.
5. **Assignment rotation trackers** (Bishopric Meeting + Ward Council). These were built
   2026-07 and are described in CLAUDE.md under "Related tools". The **Apps Script version** is the
   template asset for two catalog solutions. Bishopric Meeting goes under `bishopric`. Ward Council
   goes under `exec_secretary`, which is proposed and awaiting Sam's confirmation (the schema has
   no Ward Council category). It's a Google-based tool each ward owns, which keeps it within
   BLUEPRINT §12. Harden it
   before publishing:
   - Generate a random PIN on first run instead of shipping the fixed default `1830`.
   - Throttle wrong PIN guesses.
   - Use the generic calling list only.
   - Make the setup guide match the code.
   Wardest hosts the code and guide; it doesn't run the tracker.
6. **Demo / example ward links site.** A generic copy of the M44 hub and its interview sub-pages
   that new wards can see and copy. Agreed 2026-10-06: a GitHub template repo with Pages, owned by
   a Wardest GitHub account (not samrob66, not m44ward). Creating that account is an owner step.
7. **Other Exec Sec templates** from the same Drive folder (meeting agendas + minutes, speaker
   planner, tithing declaration sign-up, missionary dinner calendar, new & returning members) —
   catalog candidates once Sam confirms they're current.
8. **Phase 4** — second ward onboarded end-to-end; operator dashboard; print polish.
9. ✅ **BUILT 2026-11-21, local-verified — Volunteer sign-ups** (spec
   `docs/superpowers/specs/2026-11-21-volunteer-signups-design.md`, plan
   `docs/superpowers/plans/2026-11-21-volunteer-signups.md`). Organization presidents post needs
   (dates × helper roles); ward members sign up from an unguessable public link `/v/<id>` with any
   email (first-timers confirm their address, then a leader approves them once for the ward);
   the Ward Council and Bishopric space pages list every post, org pages their own; volunteers
   get confirmations and day-before reminders by email and, if connected, Discord DM; an hourly
   cron sends reminders and 48h approval nudges and lapses stale waiting sign-ups. Schema:
   `wards.timezone` + the `vol_*` / `volunteers` tables (edited in place; nothing deployed).
   Tests: `npm test` (Vitest in the Workers runtime). Owner steps before it can go live:
   - **Turnstile:** create a widget for `app.wardest.com`; put its site key in `wrangler.toml`
     `[vars] TURNSTILE_SITE_KEY` (today: Cloudflare's always-pass test key) and
     `wrangler secret put TURNSTILE_SECRET_KEY`.
   - **Discord:** register one Wardest Discord application (bot + OAuth2, redirect
     `https://app.wardest.com/vol/discord/callback`, plus the localhost one for testing);
     `wrangler secret put` `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`; each
     ward's Discord admin adds the bot to the ward's server. Live DM not yet proven (no token).
   - **Resend:** check the plan's daily send limit before a second ward goes live (reminders and
     confirmations count against it).
   - Cron: the `[triggers]` hourly cron deploys with the Worker; nothing else to set up.
