# Rename to WardForward, and move email to Cloudflare — design

Status: APPROVED to build, 2026-11-22. Sam: "I just want you to move forward (skip my approval)."
Coordinator: session `local_a8b6bffb-9340-4139-aeaa-52d78581c2e0`.

## 1. Why

The product is now **WardForward** (Sam bought WardForward.com; Lori approved; trademark search
clean). Nothing is deployed yet, so the rename happens before the first deploy (Sam: "Rename
before deploying"). Sam pays for every email the hosted app sends, and the next feature (service
opportunities, separate spec `2026-11-22-service-opportunities-requests-design.md`) sends bulk
invitations to whole organizations, so email moves to the cheaper Cloudflare Email Service at
the same time (Sam: "Agree, let's try for Cloudflare").

## 2. Settled with Sam (don't reopen)

1. Name is **WardForward**, written exactly that way (two capitals) wherever people read it;
   lowercase only in addresses and identifiers.
2. No redirect from wardest.com. Sam lets wardest.com lapse ("Nobody knows about it yet").
   Remove every wardest.com reference except in historical documents (`HANDOFF.md`, dated
   decision records, past specs and plans, which stay as written).
3. Hosts: `wardforward.com` (landing) and `app.wardforward.com` (app). Email from
   `no-reply@send.wardforward.com` (subdomain, so Google Workspace keeps the apex MX; Sam adds
   wardforward.com as a Workspace alias domain himself).
4. The existing design canvas carries over unchanged except for the name
   (https://claude.ai/artifact/Sy3eP9ECEhhbrXU2PowhLt; Spruce #1F5141 + Marigold #E9A93B,
   Bricolage Grotesque + Atkinson Hyperlegible). The "wardest" nest mark's wordmark becomes
   "WardForward"; keep the mark's shape unless it reads "W-nest" in a way that no longer fits, in
   which case keep it anyway and tell the coordinator.
5. Sam has renamed the Discord application to WardForward. The GitHub repo will be renamed
   `samrob66/wardforward` by Sam; the demo org is `github.com/wardforward` (created).
6. One hosted WardForward for every ward (settled 2026-11-22). Not a per-ward fork.

## 3. What changes

### 3.1 Names and hosts
- Every user-facing string, page title, email subject/body, `From` display name, landing page,
  print layouts, Open Graph tags: Wardest → WardForward.
- Hosts and absolute URLs: `wardest.com` → `wardforward.com`, `app.wardest.com` →
  `app.wardforward.com`, including OAuth redirect URIs, Discord redirect URI and links in emails.
- Identifiers: `package.json` name, `wrangler.toml` Worker name, D1 database name
  (`wardest-db` → `wardforward-db`), R2 bucket (`wardest-files` → `wardforward-files`), npm
  scripts, cookie names (`wardest_*` → `wardforward_*`, e.g. the volunteer cookie), log prefixes,
  test names. Nothing is deployed, so no data migration is needed; local `.wrangler/state` can be
  reset.
- Docs: `CLAUDE.md`, `BLUEPRINT.md`, `SCHEMA.md`, `IMPLEMENTATION.md` (owner steps O2–O6 and
  §5b/§10 included), `README` if any. Historical docs listed in §2 item 2 are left alone. Add a
  one-line note at the top of `CLAUDE.md`: "Renamed from Wardest to WardForward on 2026-11-22."
- The local folder stays `F:\!SLRFam\AI\Claude-Apps\Wardest.com` (Claude's memory is keyed to it).
- Repo URL references `github.com/samrob66/wardest` → `github.com/samrob66/wardforward`.

### 3.2 Email: Resend → Cloudflare Email Service
- Replace the two Resend call sites (`src/lib/invites.ts`, `src/lib/volMessages.ts`) with one
  shared mail module that sends through Cloudflare Email Service (Workers binding). Load the
  `cloudflare-email-service` skill and follow current Cloudflare docs, not memory.
- Keep the dev behaviour exactly: locally, with no real sending configured, every message (with
  its links) prints to the `wrangler dev` console. Tests intercept it as today.
- The module must support what the service feature needs next: a separate "invitations" sending
  stream (its own `From`, e.g. `WardForward invitations <invite@send.wardforward.com>`), custom
  headers (`List-Unsubscribe`, `List-Unsubscribe-Post: List-Unsubscribe=One-Click`), and sending
  to many recipients reliably (each recipient gets their own message; never a visible To/CC list).
  Build the interface for that now; the bulk feature itself is the next spec.
- Remove `RESEND_API_KEY` from code, docs and `.dev.vars.example`. Update the owner steps:
  Workers Paid plan (needed for outbound email), add the sending domain in Cloudflare Email
  Service, DNS records on `send.wardforward.com`.
- If Cloudflare Email Service turns out unable to send to arbitrary recipients from a Worker
  (beta limits, allow-lists), stop and message the coordinator before falling back to Resend.

### 3.3 Not changing
- zippa.run (separate project). M44 seed links. The M44 GitHub Pages site (ward's property).
- Behaviour of any feature, apart from the email provider.

## 4. Done means
- `grep -ri wardest` over `src/`, `db/`, `test/`, `wrangler.toml`, `package.json` and the live docs
  finds nothing (historical docs excepted).
- `npm test && npm run typecheck` green; local run from a fresh `.wrangler/state` works: portal
  `/p/m44`, dev-login, a volunteer sign-up whose confirmation prints to the console.
- Owner steps in `IMPLEMENTATION.md` describe the WardForward deploy, with Cloudflare email.

## 5. Owner steps this creates (to the coordinator, not done by the build)
- Rename GitHub repo (Sam). Put wardforward.com DNS on Cloudflare if it isn't already. Workers
  Paid plan. Cloudflare Email Service sending domain. Google OAuth client for
  app.wardforward.com. Discord redirect `https://app.wardforward.com/vol/discord/callback`.
