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
| Code | None yet — docs + `seed/links.json` only |
| `wardest.com` DNS | On Cloudflare (nameservers moved). Google Workspace MX/SPF/DKIM/DMARC live at apex — **do not touch apex MX** |
| Email | Resend verified on `send.wardest.com` (records live at `send.send.wardest.com` + `resend._domainkey.send.wardest.com`). From: `no-reply@send.wardest.com`. Live send test passed (SPF/DKIM/DMARC) |
| `go4.cc` | Purchased; **not yet added to Cloudflare** (owner task O1) |
| Owner's Resend API key | Created (never committed; goes in via `wrangler secret put RESEND_API_KEY`) |

## 2. Owner tasks (blockers you cannot do — ask when you hit them)

- **O1.** Add `go4.cc` as a Cloudflare zone + point its nameservers at Cloudflare (same flow as
  wardest.com). Blocks Phase 0 *deploy* only — build/dev is unblocked.
- **O2.** Supply the real M44 **unit number** for the seed (placeholder until then).
- **O3.** `wrangler login` / Cloudflare API token for deploys from this machine.
- **O4.** Phase 1: create a **Google Cloud OAuth client** (web app; authorized redirect
  `https://app.wardest.com/auth/callback` + `http://localhost:8787/auth/callback` for dev).
- **O5.** Phase 1: `wrangler secret put RESEND_API_KEY` (+ `SESSION_SECRET`, `GOOGLE_CLIENT_SECRET`).
- **O6.** Choose the donate link (Stripe Payment Link / Ko-fi / PayPal) for the landing page.
- **O7.** Confirm cutover timing for the old `M44 Link in Bio` page (see §9 guardrails).

## 3. Stack decisions (settled)

- **One Worker** (`wardest`) serving all three hostnames via hostname routing in the fetch
  handler: `go4.cc/*` (redirects), `app.wardest.com/*` (app + portal render), `wardest.com/*`
  (static landing). Split into multiple Workers later only if a real reason appears.
- **TypeScript + Hono** (Workers-native router). Server-rendered HTML; minimal vanilla JS
  (QR modal, later form UX). No frontend framework. Portal pages must degrade gracefully
  without JS (QR modal is the only JS-dependent nicety).
- **D1** = source of truth (apply `db/schema.sql` as migration 0001). **KV** namespace
  `GO4_LINKS` = redirect mirror (`slug -> destination URL`, plain string values).
  **R2** bucket `wardest-files` (Phase 2+).
- **QR codes:** generate **SVG server-side** with `uqr` (zero-dep, edge-compatible; if
  unavailable, any zero-dependency SVG QR encoder — pin whatever you verify works in
  `wrangler dev`). Never use external QR APIs (the old page's `api.qrserver.com` dependency is
  one of the things we're deliberately eliminating: privacy, rasterization, third-party uptime).
- **Redirects are 302, not 301.** Editability is the product's core promise; 301s get cached
  permanently by browsers and would serve stale destinations after an edit. (Deliberate
  deviation from the historical HANDOFF.md.) SEO is irrelevant for short links.
- **Sessions (Phase 1):** stateless signed cookie — `base64url(JSON{uid, exp}) + "." +
  HMAC-SHA256 sig` via WebCrypto, secret in `SESSION_SECRET`, HttpOnly + Secure + SameSite=Lax,
  7-day expiry. No sessions table.

## 4. Cross-cutting engineering rules

1. **Tenancy:** every query on ward-scoped tables filters `ward_id`. No exceptions. Write the
   data-access layer so handlers can't forget (e.g. helpers take `wardId` as a required arg).
2. **Visibility:** implement `canViewSpaceContent` / `canViewImplementation` exactly as specified
   in SCHEMA.md §"App-layer rules", **once**, in one module, and route every read through it.
   Fail closed. Superadmins manage structure but do NOT bypass content visibility.
3. **Ownership:** only `created_by_user_id` may edit/delete a deliverable/task; only space
   owners edit portal content/shares; only superadmins edit ward structure & callings.
4. **Slugs:** lowercase on write AND lookup. Pattern `^[a-z0-9-]{2,64}$`. Must equal the ward's
   prefix or start with it. Maintain a reserved list (`api`, `app`, `admin`, `www`, `p`, `qr`,
   `auth`, `static`, `robots.txt`, `favicon.ico`, …) rejected at creation.
5. **KV mirror discipline:** D1 write → KV write in the same request (write-through). Disable or
   ward-suspend → **delete** the KV key (redirect handler's D1 fallback re-checks flags).
   Redirect path: KV hit → 302; KV miss → D1 lookup (checking `disabled`, ward `status`) →
   backfill KV on success → 302; else 404 page.
6. **FKs are enforced by D1** — insert parents before children; use `PRAGMA defer_foreign_keys`
   inside reshaping migrations only.
7. **Sanitize rich text server-side** with a strict allowlist (p, br, b/strong, i/em, u, a[href
   http/https], ul/ol/li, h3/h4). No style/script/event attributes, ever (Phase 3).
8. **Public pages:** `noindex` meta + `X-Robots-Tag: noindex` header on portals; go4.cc serves a
   `robots.txt` disallowing nothing but exposing nothing (slugs are unlisted, not secret).
9. **Secrets** never in the repo or wrangler.toml — `wrangler secret put` only.
10. **Git:** commit per milestone with working state; verify (`wrangler dev` + checks below)
    before committing; push to `main`.
11. **R2 keys (Phase 2):** `w/<ward_id>/<deliverable_id>/<filename>`; enforce size (≤10 MB) and
    content-type allowlist (pdf, png, jpg, webp, svg) at upload.

## 5. Phase 0 — go4.cc shortener + M44 public portal

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

Run locally: `npm install` → `npm run db:init:local` → `npm run db:seed:local` →
`npm run kv:seed:local` → `npm run dev`. Portal: <http://localhost:8787/p/m44>. Redirect test:
`curl -H "Host: go4.cc" http://localhost:8787/m44discord`.

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
- `wrangler.toml` has **placeholder** D1 `database_id` + KV `id`; owner replaces after
  `wrangler d1 create wardest-db` and `wrangler kv namespace create GO4_LINKS`.
- Local reset = delete `.wrangler/state` (schema.sql has no `IF NOT EXISTS` — it's the prod
  migration, run once).

**Deploy steps (owner, when O1/O3 ready):** create D1 + KV (paste real ids into `wrangler.toml`);
`wrangler d1 execute wardest-db --remote --file=./db/schema.sql`; same for `db/seed-m44.sql`;
`wrangler kv bulk put --binding=GO4_LINKS --remote ./seed/links.json`; uncomment routes;
`wrangler deploy`. Replace `TBD-M44` unit number (O2) first.

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
go4 redirect resolves), publish→portal shows it; per_space EQ owner can track, non-member (even
ward superadmin) gets 403; per_space picker when no space chosen. **Part 2 (still to build):**
visibility editor (`restricted` grants via `implementation_visibility`) + read-only share/grant
viewing routed through `src/lib/visibility.ts`; R2 file/image deliverables; publishing to
non-public spaces; ward submission→operator review pipeline; markdown rendering for how-to bodies.

**Phase 3 — portal builder.**
Per-space portals for logged-in members (Public renders as Phase 0). Rich-text `portal_blocks`
(sanitize, rule 7); `tasks` list w/ status, optional assignee, self-archive on done + "Archived"
view; drag ordering (`position`); per-portal short links; `space_shares` management UI (owners
only); print variant for every portal.

**Phase 4 — scale-out + hardening.**
Shortener abuse controls: per-ward creation rate cap (D1 count per day), optional Google Safe
Browsing check on destinations, one-click link disable + ward suspend (KV delete per rule 5).
Operator dashboard (requests, wards, links). Second-ward onboarding end-to-end. Poster/print
polish. Update `M44 Link in Bio` repo links (O7 — separate repo, after owner confirms).

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

Upgrades vs. the original: QR = inline SVG (no `api.qrserver.com`), short URLs = `go4.cc/*`,
mobile-first responsive (original max-width 480px column is good), data-driven from D1.

## 8. Definition of done (every phase)

Working code deployed (or `wrangler dev`-verified when deploy-blocked), exit checklist green,
committed + pushed, no secrets in repo, docs updated **if behavior diverged from plan** (this
file + BLUEPRINT.md stay truthful), owner walked through anything they must click.

## 9. Guardrails (do NOT)

- Don't touch apex `wardest.com` DNS/MX, the Workspace/Resend records, or nameservers.
- Don't modify `F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio` until O7 says so.
- Don't build: custom passwords, calling verification, meeting agendas/minutes, WordPress,
  per-ward subdomains, analytics — all explicitly out of scope (BLUEPRINT §12).
- Don't weaken fail-closed visibility defaults for convenience.
- Don't use 301s for editable links, external QR/font/CDN dependencies on portals, or store
  QR images (always derive).
- Don't hand-edit production KV/D1 outside migrations/seeds/app writes (except via documented
  wrangler commands).
