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
  rich-text blocks + a lightweight task list, each printable at poster quality, each with its own
  short link.

## 2. Surfaces (domains)

| Domain | Role |
|---|---|
| `wardest.com` | Static marketing / landing + "Sign in with Google" + Donate. Cloudflare Pages. |
| `app.wardest.com` | The authenticated app (catalog, tracker, portal builder, dashboards). |
| `go4.cc` | All short links **and** public portal links, e.g. `go4.cc/p4thbulletin`. |

Per-ward subdomains (`provo4th.wardest.com`) are **deferred** — `go4.cc` + login-based tenant
resolution make them unnecessary early, and they add wildcard-TLS/routing complexity.

## 3. Core concepts (conceptual model)

- **Ward** — the tenant. Isolated by **row-level tenancy** (`ward_id` on every row), not separate infra.
  Identified for de-duplication by **unit number**; picks a short **prefix** (e.g. `p4th`) for its
  `go4.cc` links.
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
- **Short link** — a `go4.cc` slug → destination, prefix-namespaced per ward, with an auto SVG QR.
- **Task** — lightweight item on a portal: text + status, self-archives when done (archived items
  stay viewable). *(Open: assignee? per-space vs per-portal — decide in data-model step.)*

## 4. Roles & permissions

- **Superadmin** (multiple allowed) — ward-level admin. First signup is superadmin and can grant it to
  others (e.g. Bishop grants it to the Exec Secretary). Fills the **chart of callings**, which
  auto-provisions each org's president + secretary as **owners** of that org's space.
- **Owner** (multiple per space) — can edit that space's shared portal content (rich-text, ordering,
  which deliverables show).
- **Member** — belongs to spaces; can add their **own** deliverables.

Two invariants:
- **Ward is the visibility boundary** — same-ward leaders in a space see everything in it.
- **Individual is the edit/ownership boundary** — you can only edit/delete deliverables **you** created,
  even within your ward.

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
- Public portal lives at a `go4.cc` short link (e.g. `go4.cc/p4th`). Access-gated portals require
  Google login + space membership.

## 7. Shortener (`go4.cc`)

- One **shared namespace across all wards** → links are **auto-prefixed with the ward's short code**
  (editable, but the prefix guarantees no cross-ward collision). Store slugs lower-cased for
  case-insensitive lookup.
- **Integrated, not a destination site:** the app mints short links + QR behind the scenes when a
  deliverable/portal is created. Users never "visit the shortener."
- **Abuse controls (protect domain reputation):** only authenticated members mint links; optional
  Google Safe Browsing check on destinations; per-tenant rate limits; one-click disable + tenant
  suspend. This matters because a blocklisted `go4.cc` would break *every* ward's links.

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

- **Cloudflare:** Workers (app + shortener), **D1** (structured data), **R2** (uploaded files, free
  egress), **Pages** (static marketing site).
- **~$0/month hosting** at ward scale. Hard costs: domains — `wardest.com` (~$10/yr) + `go4.cc`
  (~$30–40/yr) — plus optional **$5/mo** Workers Paid if free limits are ever exceeded.
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
- `go4.cc` shortener Worker + storage, prefix-namespaced; seed the 6 M44 links (`seed/links.json`).
- A data-driven **public portal** for M44 (successor to `M44 Link in Bio/index.html`) with auto **SVG
  QR** per link and poster-quality print/PDF.
- `wardest.com` static landing + Donate button; `app.wardest.com` stub.
- **Exit:** M44's 6 links live on `go4.cc`; public portal live and printable.

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
- Rich-text blocks; self-archiving task list; per-portal short links.
- Access-gated portals vs public; enforce the visibility/ownership invariants end-to-end.
- **Exit:** the full spaces/portal experience works for M44.

### Phase 4 — Onboard other wards + polish
- Smooth onboarding at (small) scale; shortener abuse controls (Safe Browsing, rate limits, suspend);
  poster-export polish; operator dashboard for approvals.
- **Exit:** a second ward onboarded end-to-end.
