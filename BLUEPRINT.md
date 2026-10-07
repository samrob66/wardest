# Wardest.com — Product Blueprint

> **Thesis:** Wardest teaches ward leaders how to stand up a curated set of (mostly Google-based)
> digital solutions, tracks which they've implemented, and assembles the resulting links / files /
> QR codes into shareable, printable **portal** pages scoped to the right audience.

This is the single source of truth for *what Wardest is*. `HANDOFF.md` is the original (shortener-only)
spec and is now historical. Where they disagree, this file wins. The phase plan at the bottom is how
we build it.

---

## 1. The two halves

- **Learn & Build** — a role-organized **catalog** of how-to solutions (optional video + steps +
  optional "make a copy" template). Leaders work through them, mark each **Implemented**, and produce
  a **deliverable** (a link, file, image, or auto-generated QR).
- **Publish & Share** — **portals**: audience-scoped pages that assemble a ward's deliverables +
  rich-text blocks + a lightweight task list, each printable at poster quality, each shareable by a
  `zippa.run` short link.

## 2. Surfaces (domains)

| Domain | Role |
|---|---|
| `wardest.com` | Static marketing / landing + "Sign in with Google" + Donate. Cloudflare Pages. |
| `app.wardest.com` | The authenticated app (catalog, tracker, portal builder, dashboards). |
| `zippa.run` | Short links for deliverables **and** portals, e.g. `zippa.run/m44Links`. A separate, live project (`../zipa.run`) — see §7. |

Per-ward subdomains (`provo4th.wardest.com`) are **deferred** — `zippa.run` links + login-based
tenant resolution make them unnecessary early, and they add wildcard-TLS/routing complexity.

## 3. Core concepts (conceptual model)

- **Ward** — the tenant. Isolated by **row-level tenancy** (`ward_id` on every row), not separate infra.
  Identified for de-duplication by **unit number**; has a short **prefix** (e.g. `m44`) — the same
  prefix its creators are bound to on zippa.run.
- **User** — a Google identity (email). May belong to **multiple wards**.
- **Membership** — links a user to a ward with a **role**, and to one or more **spaces**.
- **Space** — an audience (Public, Bishopric, Ward Council, per-org). The **visibility boundary**.
- **Solution** — a catalog entry (global, curated). Has category, how-to, optional video, optional
  template asset.
- **Implementation** — a ward's record for a solution: implemented?, owner, deliverable, space
  assignment, include-in-portal.
- **Deliverable** — the output: a URL, uploaded file (R2), image, or auto-QR. Free-form deliverables
  ("Add link/URL/QR") can exist without a catalog solution.
- **Portal** — the rendered page for a space: included deliverables + rich-text blocks + task list.
- **Short link** — a `zippa.run` slug → destination, made on zippa.run under the ward's prefix.
  Wardest stores the link and derives an SVG QR from it.
- **Task** — lightweight item on a portal: text + status, self-archives when done (archived items
  stay viewable). *(Open: assignee? per-space vs per-portal — decide in data-model step.)*

## 4. Roles & permissions

- **Superadmin** (multiple allowed) — ward-level admin and **break-glass**: can view and manage
  everything in the ward, including org spaces they don't belong to (every system needs someone
  who can fix anything). First signup is superadmin and can **grant/revoke** superadmin to other
  members (hand it to the Bishop, as ward head, and the Exec Secretary, who does most setup); the
  app refuses to remove the **last** superadmin. Fills the **chart of callings**, which
  auto-provisions each org's president + secretary as **owners** of that org's space.
  Break-glass is bounded to Wardest's own data — it does **not** grant access to a link's
  destination (a linked Google Doc keeps its own sharing).
- **Owner** (multiple per space) — can edit that space's shared portal content (rich-text, ordering,
  which deliverables show).
- **Member** — belongs to spaces; can add their **own** deliverables.

Two invariants:
- **Ward is the visibility boundary** — same-ward leaders in a space see everything in it.
- **Individual is the edit/ownership boundary** — you can only edit/delete deliverables **you** created,
  even within your ward (a ward **superadmin** is the exception — break-glass).

Note: short links and public portals are **inherently public** (they exist to be shared). "Private"
means the *management dashboard and the listing of what exists* are scoped — not that published
links/portals are secret. The Public portal is `noindex` (unlisted, not hidden behind auth).

## 5. Solutions catalog & tracker

- **Categories = roles:** Executive Secretary, Ward Clerk, Bishopric, Org Presidencies,
  Activities Committee, Ward Mission.
- Each solution: collapsible section — optional video on top, how-to content, owner (who implemented /
  will implement), and the outcome/deliverable.
- **Templates:** Google-based solutions can carry a **"make a copy"** asset (Google's `/copy` URL);
  non-Google solutions (AI-based, etc.) carry whatever asset fits. **We maintain template assets.**
- **Submission → review:** wards can submit new solutions; if valuable, we add them to the global
  catalog in that category.
- **Ad-hoc:** an **"Add link/URL/QR"** option lets a ward create a deliverable that didn't originate
  in Wardest.

## 6. Spaces & portals

- Every ward gets a **default set** of spaces (Public, Bishopric, Ward Council, + one per standard org:
  EQ, RS, YW, YM, Primary, Sunday School, Activities Committee, Ward Mission) and can
  **rename / hide / add**.
- **No automatic top-down visibility.** A deliverable is *published into* one or more spaces
  (opt-in shared spaces, like channels). The Ward Council space does not expose orgs' individual
  portals; the Bishopric keeps items the Council never sees; etc.
- **Opt-in sharing widens visibility when wanted:** a space's owners can share the space
  **read-only** with other spaces (e.g. Activities Committee → Ward Council + Bishopric), and an
  individual tracker entry can be granted to **multiple** audiences. Sharing only ever widens
  from fail-closed defaults; never automatic.
- **Portal content:** included deliverables (card/button layout in the spirit of the existing
  `M44 Link in Bio/index.html`), rich-text blocks (notices, evergreen action items), and the task list.
- **QR:** every URL deliverable gets an auto-generated **SVG** QR (crisp at any size).
- **Print/poster:** portals export to PDF at any size. Vector content (text, layout, QR) stays crisp;
  **user-uploaded raster images/screenshots will be grainy blown up** — inherent, accepted.
- The Public portal is shared through a `zippa.run` short link pointing at it (e.g.
  `zippa.run/m44Links`). Access-gated portals require Google login + space membership.

## 7. Shortener (`zippa.run` — a separate project)

*Changed 2026-10:* the planned `go4.cc` domain was never transferred (refunded). The shortener was
built instead as **zippa.run**, its own live project (`../zipa.run`, with its own decision
records). Facts that shape Wardest:
- **Ward prefixes.** Each ward has a short prefix (`m44` = Mapleton 44th) so its links read as a
  set. Slugs are custom, case-folded, and **never reused** — a deleted link stays burned.
- **Multi-user, ward by ward** (zippa.run decision 0019). A ward's Exec Sec asks to join on
  `app.zippa.run` (Cloudflare Access + Google). The operator approves and binds them to the ward's
  prefix, after which they create that prefix's links themselves. A slug outside the prefix is a
  second request the operator approves. The abuse controls (join approval, Web Risk destination
  scanning) live there, so Wardest doesn't need its own. "Get your zippa.run creator access" is
  a step in the Exec Sec setup track.
- **No API, by design** (zippa.run decision 0008). Wardest therefore cannot mint links
  automatically: a leader creates the link on zippa.run and pastes it into Wardest, which stores
  it and derives the QR. (Adding a scripted surface would reverse a zippa.run decision — that
  belongs in that project, not here.)
- The Phase 0–3 code still contains a built-in `go4.cc` shortener; retiring it is roadmap item 1
  in IMPLEMENTATION.md §10.

## 8. Identity & auth

- **Sign in with Google (OAuth / OIDC) implemented directly in the app.** We manage sessions +
  authorization; Google manages credentials (zero passwords for us).
- **Not Cloudflare Access** — its free tier caps at 50 users total (won't scale across wards) and it
  can't express per-space authorization. (This deliberately reverses the original spec.)

## 9. Onboarding & anti-abuse

- **Request-a-workspace gate:** ward creation requires a short request (ward name, unit number,
  requester name/calling/email) that the operator **approves**. This gatekeeps abuse — it does **not**
  attempt to verify callings (unwinnable, forgeable, and not the real need).
- **Duplicate prevention:** match on **unit number** before creating; if a workspace exists, route the
  requester to "request to join" the existing superadmin.
- **Onboarding wizard** (distinct from per-solution how-tos): create ward → claim/assign superadmins →
  fill the callings chart (this *is* the membership-provisioning step) → pick default spaces to keep →
  set up the public portal basics.

## 10. Email

- **Provider: Resend** (HTTPS API, Worker-friendly; free tier 3,000/mo + 100/day, ongoing — far above
  our invite volume).
- **Sending domain:** `send.wardest.com` (subdomain; Resend's MX/SPF/DKIM live here, so Google keeps
  the apex MX). **From:** `no-reply@send.wardest.com`.
- **Uses:** invites (callings-chart additions), workspace approved/denied. No broader notification
  system.
- API key stored as a Worker secret (`RESEND_API_KEY`), never in the repo.

## 11. Infrastructure & cost

- **Cloudflare:** Workers (app), **D1** (structured data), **R2** (uploaded files, free
  egress), **Pages** (static marketing site). Short links run on zippa.run's own infrastructure.
- **~$0/month hosting** at ward scale. Hard costs: the `wardest.com` domain (~$10/yr) — plus
  optional **$5/mo** Workers Paid if free limits are ever exceeded.
- Not GCP (overkill and pricier for this workload). Donations via a **static link/embed**
  (Stripe/PayPal/Ko-fi) — **no WordPress**. (Non-nonprofit donations aren't tax-deductible; separate
  question if that matters.)

## 12. Non-goals / deferred

- Per-ward `*.wardest.com` subdomains.
- In-app meeting management (agendas/minutes live in **Google Docs**; Wardest only surfaces the task
  list).
- Identity/calling verification.
- WordPress / any CMS.

## 13. Micro-decisions (resolved during the data-model pass — see SCHEMA.md)

1. Tasks: per-space (= per-portal, they're 1:1), optional assignee. ✔
2. Callings chart: free-text titles + a standard LDS org set shipped as seed data. ✔
3. Transactional email: invites + workspace approved/denied only. ✔
4. Tracker visibility: per-implementation `visibility_space_id` — some entries Bishopric-only,
   others Ward Council or ward-wide; not blanket ward-visible. ✔
5. Duplicate-unit "request to join" flow: modeled as `workspace_requests.kind='join'`, reviewed
   by that ward's superadmins. ✔
6. Multi-audience visibility: tracker entries can be granted to several spaces
   (`implementation_visibility`), and whole spaces can be shared read-only with other spaces
   (`space_shares`). ✔
7. Activities Committee + Ward Mission added as catalog categories and default spaces. ✔

---

## 14. Phase plan (work backward from the blueprint)

Design the **full data model up front** so early phases don't box us in, but **build incrementally**.
Each phase ships something usable.

### Phase 0 — Public portal + shortener for Mapleton 44th
*Deliver value immediately (replace tinyurl/tiny.cc) and de-risk the whole stack in miniature.*
- Shortener Worker + storage, prefix-namespaced; seed the 6 M44 links (`seed/links.json`).
  *(Built for `go4.cc`; superseded 2026-10 — M44's links live on zippa.run.)*
- A data-driven **public portal** for M44 (successor to `M44 Link in Bio/index.html`) with auto **SVG
  QR** per link and poster-quality print/PDF.
- `wardest.com` static landing + Donate button; `app.wardest.com` stub.
- **Exit:** M44's links resolve through short links; public portal live and printable.

### Phase 1 — Identity, tenancy, spaces, onboarding
- Google sign-in (OIDC) + sessions.
- D1 schema: wards, users, memberships, spaces, roles.
- Request-a-workspace + approval; onboarding wizard; callings chart; duplicate detection (unit number);
  multi-ward membership.
- **Resend** wired for invites/approvals (`no-reply@send.wardest.com`).
- **Exit:** M44 is a real tenant with real users, roles, and spaces; superadmin can invite + assign.

### Phase 2 — Solutions catalog + implementation tracker
- Catalog content (role categories, how-tos, optional video, templates / `/copy` links).
- Implementation records: mark implemented, owner, attach deliverable (link / file via R2 / auto-QR),
  assign to space(s), include-in-portal toggle.
- Submission → review pipeline.
- **Exit:** leaders can work the catalog and produce deliverables that land in the tracker.

### Phase 3 — Full portal builder
- Multiple portals per ward (Public, Bishopric, Ward Council, per-org) with owners.
- Rich-text blocks; self-archiving task list; per-portal short links (built on go4; becomes a
  pasted zippa.run link).
- Access-gated portals vs public; enforce the visibility/ownership invariants end-to-end.
- **Exit:** the full spaces/portal experience works for M44.

### Phase 4 — Onboard other wards + polish
- Smooth onboarding at (small) scale; poster-export polish; operator dashboard for approvals.
  (Shortener abuse controls dropped from this phase — zippa.run already has them.)
- **Exit:** a second ward onboarded end-to-end.
