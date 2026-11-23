# Service Opportunities, Service Requests and Portal Sections Implementation Plan

> **For agentic workers:** this plan is run by the `orchestrator` skill (one implementer for
> the whole plan, one reviewer, up to 3 fix rounds), per Sam's global instructions. Ignore any
> instruction to use subagent-driven-development or executing-plans. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Members reach two new things from the top of the ward portal: a public Service
Opportunities page (open volunteer posts grouped by brothers / sisters / youth / children) and a
Request Help page (picture tiles → a minimal, verified, short-lived request that only the right
leaders see). Leaders get service categories with delegated coordinators and fill warnings, bulk
email invitations from a pasted list, and Discord channel announcements; ward portals get named
sections.

**Architecture:** Extends the existing Hono Worker + D1 app and the volunteer sign-ups feature.
New `service_*` / `invite_*` / `portal_sections` tables, all ward-scoped. A sibling permission
module `src/lib/serviceAccess.ts` (categories, delegates, requests) sits beside
`src/lib/volAccess.ts` (posts), both fail closed. Domain functions keep returning
`OutgoingMessage[]` for `deliver()`; invitations go through `sendMail` on the `invitations`
stream. Bulk sends are pumped from D1 by a new every-minute Cron Trigger (plus an immediate
first chunk via `waitUntil`); the hourly cron gains fill warnings and request purges.

**Tech Stack:** Cloudflare Workers, Hono 4, D1, TypeScript, Cloudflare Email Service
(`src/lib/mail.ts`), Turnstile, Discord webhooks, Vitest in the Workers runtime.

**Spec:** `docs/superpowers/specs/2026-11-22-service-opportunities-requests-design.md`
(approved). Read it in full first, plus `2026-11-21-volunteer-signups-design.md` and
`2026-11-22-wardforward-rename-design.md`. §2 items 1–13 are Sam's settled rules. Do **not**
build anything from `2026-11-22-member-roster-design.md` (on hold).

## Global Constraints

- Every new table has `ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE`; every
  read/write filters `ward_id`; lib functions take `wardId` as a required argument.
- Every permission decision goes through `src/lib/volAccess.ts` or `src/lib/serviceAccess.ts`.
  Fail closed: unknown, wrong-ward, archived-where-it-matters, or missing → deny. Ward
  superadmin = break-glass (as today), **except** confidential request categories (see Task 3).
- Public pages (`/serve/*`, `/help/*`, `/v/*`, `/unsub/*`, request verify pages) send
  `X-Robots-Tag: noindex` + `<meta name="robots" content="noindex">` and never show names,
  emails, request details or private details.
- Email only through `src/lib/mail.ts`: one recipient per message; invitations on the
  `invitations` stream with `List-Unsubscribe` and `List-Unsubscribe-Post:
  List-Unsubscribe=One-Click`; everything else on `notify`. Keep invitations invitation-shaped
  (one recipient, opportunity-specific, unsubscribe link in the body). No code outside mail.ts
  touches the `EMAIL` binding.
- Notification emails about a new request never contain the request's details (spec §6.2 copy:
  "A new Christmas request came in. Open it in WardForward.").
- GET never changes data. Every emailed link (request verify, unsubscribe) opens a page whose
  button POSTs. Exception required by RFC 8058: `POST /unsub/:token` accepts the mail client's
  one-click body `List-Unsubscribe=One-Click` with no cookie, CSRF token or Turnstile.
- Pasted links: `normalizeHttpUrl` on write, `safeHref` on render (`src/lib/urls.ts`). All user
  text `esc()`-ed in pages and email HTML.
- Invented people only in tests and seeds (`@example.test` addresses), never real member data.
- Never commit `.dev.vars` (copy it from the main checkout
  `F:\!SLRFam\AI\Claude-Apps\Wardest.com\.dev.vars` to run locally; never print its values). New
  vars go in `.dev.vars.example` as placeholders.
- Nothing is deployed: edit `db/schema.sql` in place. For existing local DBs, also add
  `db/upgrade-2026-11-22-service.sql` (ALTER/CREATE only, idempotent where SQLite allows) and
  mention it in CLAUDE.md's Deploy/develop section.
- Local only: no `wrangler deploy`, no `--remote`, no push, no merge.
- `npm test && npm run typecheck` green before every commit. Commit after each task.
- Copy: never the Church's name as our branding; "Latter-day Saint" not "LDS".

## Review Focus

1. **Same person pasted several ways** (`Ann@Example.test`, `ann@example.test`, `Ann Smith
   <ann@example.test>`, trailing `;`) → exactly one invitation. Test in Task 9.
2. **One-click unsubscribe from a mail client** (POST, no cookies) records the suppression, a
   GET to the same URL changes nothing, and a later paste of that address is counted as skipped
   and never sent. Test in Task 9.
3. **A bishopric counselor (not the bishop) on a confidential category** can't see it in the
   inbox, can't open `/w/:wardId/requests/:id` by URL (403), and isn't emailed. Test in Task 3
   and Task 8.
4. **The immediate kick and the minute cron overlap** on one batch → no address is sent twice,
   and counts add up to the total. Test in Task 9.
5. **A parent signs up themselves and two children for one role** → three heads counted; the
   same child name again (any case/whitespace) → "already signed up". Test in Task 5.

---

### Task 1: Small fold-ins (copy fixes, injectable mail retry delay)

**Files:**
- Modify: `src/views/landing.ts:10` (meta description: "LDS ward leaders" → "Latter-day Saint ward leaders")
- Modify: `src/views/pages.ts:55` (placeholder "LDS unit number" → "Unit number")
- Modify: `src/lib/mail.ts` (retry sleep injectable)
- Modify: `test/volMessages.test.ts`, `test/footer.test.ts` or a copy test as fits

Keep the portal/print "Not an official website…" subtitles unchanged.

- [ ] **Step 1: Failing tests.** `landing meta says "Latter-day Saint ward leaders"` (and no
  `LDS` anywhere in `src/views/landing.ts` output); `request form placeholder is "Unit number"`.
- [ ] **Step 2: Make the retry wait injectable.** Add `sleep: (ms: number) => Promise<void>` to
  the exported `mailRetry` object (default real `setTimeout`), used for every backoff. In the
  two `volMessages` tests that hit retries, set `mailRetry.sleep = async () => {}` (restore in
  `afterEach`). Assert those tests still see the retry count they saw before.
- [ ] **Step 3:** Implement the copy changes; run `npm test && npm run typecheck`; confirm the
  `volMessages` file no longer takes ~1.5 s (vitest's per-test durations).
- [ ] **Step 4: Commit** "Copy: Latter-day Saint wording; mail retry sleep injectable".

### Task 2: Schema, default categories, upgrade script

**Files:**
- Modify: `db/schema.sql`, `SCHEMA.md`
- Create: `db/upgrade-2026-11-22-service.sql`
- Create: `src/lib/serviceCategories.ts`
- Modify: `src/lib/wards.ts` (`createWard` seeds categories)
- Test: `test/serviceCategories.test.ts`, `test/schema.test.ts`

**Tables (names fixed; add indexes on `ward_id` and the obvious foreign keys):**
- `service_categories(id, ward_id, kind CHECK IN ('opportunity','request'), slug, name, icon,
  default_audiences TEXT NOT NULL DEFAULT '', council_may_create INTEGER NOT NULL DEFAULT 0,
  confidential INTEGER NOT NULL DEFAULT 0, opportunity_category_id TEXT NULL (request → the
  opportunity category "Turn into a service opportunity" starts in), discord_webhook_url TEXT
  NULL, position, archived INTEGER NOT NULL DEFAULT 0, created_at, UNIQUE(ward_id, slug))`
- `service_category_spaces(id, ward_id, category_id → CASCADE, space_id → spaces CASCADE,
  UNIQUE(category_id, space_id))` — the owning spaces (kind `org`, `bishopric` or
  `ward_council` only; enforce in code).
- `service_delegates(id, ward_id, category_id CASCADE, user_id → users CASCADE,
  added_by_user_id, created_at, UNIQUE(category_id, user_id))`
- `service_warn_prefs(id, ward_id, category_id CASCADE, user_id CASCADE (the manager who set
  it), warn_me INTEGER NOT NULL DEFAULT 1, hours INTEGER NOT NULL DEFAULT 48 CHECK (hours
  BETWEEN 1 AND 336), UNIQUE(category_id, user_id))`
- `service_warn_others(id, ward_id, pref_id → service_warn_prefs CASCADE, user_id CASCADE,
  UNIQUE(pref_id, user_id))`
- `vol_warn_sent(id, ward_id, date_id → vol_dates CASCADE, user_id CASCADE, sent_at,
  UNIQUE(date_id, user_id))`
- `service_requests(id, ward_id, category_id → service_categories RESTRICT, name, email,
  phone NULL, note NULL (≤200), moving_dir NULL CHECK IN ('in','out'), preferred_date NULL,
  christmas_for NULL CHECK IN ('own','other'), status CHECK IN
  ('unverified','new','in_progress','done','declined') DEFAULT 'unverified',
  assigned_user_id NULL → users SET NULL, private_note NULL (≤200), verified_at, closed_at,
  created_at)`
- `request_tokens(id, ward_id, request_id CASCADE, token_hash UNIQUE, expires_at, used_at,
  created_at)`
- `invite_batches(id, ward_id, post_id → vol_posts SET NULL, created_by_user_id → users SET
  NULL, note NULL (≤500), total, invalid_count, suppressed_count, sent INTEGER DEFAULT 0, failed
  INTEGER DEFAULT 0, status CHECK IN ('sending','waiting_cap','done','cancelled'),
  cap_notified_at NULL, created_at, finished_at NULL)`
- `invite_recipients(id, ward_id, batch_id → invite_batches CASCADE, email, claim_id NULL,
  claimed_at NULL, sent_at NULL, failed INTEGER DEFAULT 0)` — rows deleted when the batch ends.
- `invite_suppressions(id, ward_id, email_hash, created_at, UNIQUE(ward_id, email_hash))`
- `invite_daily_counts(ward_id, day TEXT (ward-local YYYY-MM-DD), sent INTEGER, PRIMARY
  KEY(ward_id, day))`
- `invite_category_delegations(id, invite_id → invites CASCADE, category_id CASCADE,
  UNIQUE(invite_id, category_id))`
- `portal_sections(id, ward_id, space_id CASCADE, title, position, created_at)`

**Column additions:** `vol_posts.category_id TEXT NOT NULL REFERENCES service_categories(id)
ON DELETE RESTRICT` (nullable in the upgrade script, then backfilled — see Step 4);
`vol_posts.audiences TEXT NOT NULL DEFAULT 'brothers,sisters'`; `vol_signups.child_name TEXT NOT
NULL DEFAULT ''` with `ux_vol_signups_active` becoming `(role_id, volunteer_id, child_name)
WHERE status IN ('waiting','confirmed')`; `deliverable_spaces.section_id TEXT NULL REFERENCES
portal_sections(id) ON DELETE SET NULL`; `wards.serve_short_url`, `wards.help_short_url` (TEXT
NULL), `wards.serve_section_on`, `wards.help_section_on` (INTEGER NOT NULL DEFAULT 1),
`wards.invite_daily_cap INTEGER NOT NULL DEFAULT 5000`; `workspace_requests.bishop_approved
INTEGER NOT NULL DEFAULT 0`.

Audiences are a comma list over exactly `brothers, sisters, youth, children` (canonical order,
no duplicates); export `AUDIENCES` and `parseAudiences(raw: string | string[]): Audience[]`
from `src/lib/serviceCategories.ts` (unknown values dropped; empty → error at the caller).

**Interfaces:**
- Produces: `ensureServiceCategories(env, wardId): Promise<void>` (idempotent: inserts any
  default whose slug is missing, never touches existing rows); `listCategories(env, wardId, o:
  { kind?: 'opportunity'|'request'; includeArchived?: boolean }): Promise<CategoryRow[]>`
  (calls `ensureServiceCategories` first); `getCategory(env, wardId, id):
  Promise<CategoryFull | null>` (`CategoryFull` = row + `spaces: {id, kind, name}[]` +
  `delegates: {user_id, name, email}[]`); `ICONS` (fixed key → inline SVG map:
  `meal, hand, activity, building, temple, primary, sundayschool, moving, present, other`);
  `DEFAULT_CATEGORIES` (the table below).

**Defaults** (spec §2 items 8–9 and §3; owner = space slug; skip a missing/archived space;
if no owner remains, use `bishopric`):

| slug | kind | name | icon | owners | audiences | flags | opp. link |
|---|---|---|---|---|---|---|---|
| meal | opportunity | Provide a Meal | meal | relief-society | sisters | | |
| helping-hand | opportunity | Lend a Helping Hand | hand | ward-council | brothers,sisters | council_may_create | |
| activity | opportunity | Help with an Activity | activity | activities-committee | brothers,sisters | | |
| clean-building | opportunity | Clean the Building | building | bishopric | brothers,sisters | | |
| clean-temple | opportunity | Clean the Temple | temple | relief-society, elders-quorum | brothers,sisters | | |
| sub-primary | opportunity | Substitute in Primary | primary | primary | brothers,sisters | | |
| sub-sunday-school | opportunity | Substitute in Sunday School | sundayschool | sunday-school | brothers,sisters | | |
| move | opportunity | Help Someone Move (in/out) | moving | elders-quorum | brothers | | |
| req-moving | request | Get Help Moving | moving | elders-quorum | | | move |
| req-christmas | request | Request a Christmas or Presents | present | bishopric | | confidential | |
| req-other | request | Other Requests | other | bishopric | | confidential | |

- [ ] **Step 1: Failing tests.** `new ward gets the 11 default categories with the owners
  above`; `ensureServiceCategories is idempotent and keeps a renamed category`;
  `clean-temple has two owning spaces`; `req-christmas and req-other are confidential`;
  `parseAudiences canonicalises and drops unknowns`; schema test: unique child-aware active
  sign-up index allows (role, volunteer, '') and (role, volunteer, 'Ana') together but not two
  `'Ana'`.
- [ ] **Step 2:** Implement schema + `serviceCategories.ts`; call `ensureServiceCategories`
  at the end of `createWard`.
- [ ] **Step 3: Backfill rule for posts without a category** (upgrade script and any code path
  that meets `category_id` NULL): the ward's opportunity category owned by the post's space with
  the lowest position, else `helping-hand`. The upgrade script only adds columns/tables (it
  can't insert per-ward defaults); `backfillPostCategories(env, wardId)` in
  `serviceCategories.ts`, called at the end of `ensureServiceCategories`, does the backfill.
  Test: `a post with NULL category gets its org's category on ensure`.
- [ ] **Step 4:** Update `SCHEMA.md` with every new table/column and its visibility rule;
  add the upgrade script and the "delete `.wrangler/state` to reset" note to CLAUDE.md.
- [ ] **Step 5:** `npm test && npm run typecheck`; commit "Service categories: schema and defaults".

### Task 3: Permissions — serviceAccess.ts and post access for new space kinds

**Files:**
- Create: `src/lib/serviceAccess.ts`
- Modify: `src/lib/volAccess.ts`, `src/lib/volMessages.ts` (`approverEmails`)
- Test: `test/serviceAccess.test.ts`, extend `test/volAccess.test.ts`

**Rules (spec §3; write them as the module's header comment):**
- *Manager* of a category: owner of any of its owning spaces; bishopric member; ward
  superadmin. **Confidential** category: only owners of its owning spaces (for the bishopric
  space, its owner = the bishop) and superadmins — **not** other bishopric members.
- *Delegate*: a `service_delegates` row **and** a current `ward_memberships` row.
- *May create* in an opportunity category (never in a request category, never archived):
  its delegates; or, when it has **no** delegates, its managers plus `vol_editors` of any owning
  `org` space; plus any member of the ward's `ward_council` space when `council_may_create`;
  plus bishopric and superadmins.
- *Request visibility*: managers and delegates of its category (confidential → as above).
  Assignment only to one of the category's delegates.
- *Who gets a category's messages*: its delegates; if none, the managers' emails as today
  (for posts: `approverEmails` today = creator + org `vol_editors`; keep that when no
  delegates); a post's creator always. For requests with no delegates: owners of the owning
  spaces; if none, superadmins.
- *Posts* (`volAccess.ts`): `storedPost` now accepts space kinds `org`, `ward_council`,
  `bishopric`. `canEditPost` = ward member AND (creator OR `canCreateInCategory(post's
  category)` OR delegate of it OR — for a NULL-category org post only — today's
  `canManageOrg`). `canViewPost` = canEdit OR manager of its category OR: org post → today's
  rule (org space member, or ward council member); `ward_council` post → ward council members;
  `bishopric` post → bishopric members. Delegates see and manage every post of their category.
  `canApproveVolunteer` keeps using `canEditPost`.

**Interfaces (all `Promise<boolean>`, all `(env, wardId, categoryId|requestId, userId)`):**
`isCategoryManager`, `isCategoryDelegate`, `canCreateInCategory`, `canSeeRequest`,
`canManageRequest` (same set as see), and `canManageCategory` (= isCategoryManager).
Plus `categoriesUserMayCreateIn(env, wardId, userId): Promise<CategoryRow[]>`,
`categoryMessageEmails(env, wardId, categoryId): Promise<string[]>` (lowercased, deduped, ward
members only) and `requestNotifyEmails(env, wardId, categoryId): Promise<string[]>`.

- [ ] **Step 1: Failing tests, one per role** (invented users): RS president manages `meal`,
  can create while no delegates, can't once a delegate exists (still views it); the delegate
  (ward member with no spaces) creates/edits meal posts, sees all meal posts, can't create
  `move`; ward-council member creates `helping-hand`, can't create `meal`; bishopric counselor
  manages `req-moving`, **can't** see `req-christmas` or `req-other` (`isCategoryManager`
  false, `canSeeRequest` false); bishop (bishopric owner) sees them; superadmin sees them;
  Christmas delegate sees only Christmas requests; someone from another ward → false
  everywhere; a removed ward member who still has a delegate row → false; nobody can create in
  a request category or an archived one; `canViewPost` on a `bishopric` post is false for a
  ward-council member who isn't in the bishopric, true for the post's category delegate;
  `approverEmails` returns delegates + creator when delegates exist, today's list otherwise.
- [ ] **Step 2:** Implement; every query ward-scoped; fail closed on any missing row.
- [ ] **Step 3:** `npm test && npm run typecheck`; commit "Service access: categories, delegates, requests".

### Task 4: Category management pages (delegates, invites, warnings, Discord webhook)

**Files:**
- Create: `src/serviceRoutes.ts` (mounted from `src/app.ts` like `volRoutes`), `src/views/service.ts`
- Modify: `src/lib/invites.ts` + the `/invite/:token` accept path in `src/app.ts`
- Create: `src/lib/serviceAdmin.ts` (category writes, delegates, warn prefs, webhook)
- Test: `test/serviceAdmin.test.ts`, `test/serviceRoutes.test.ts`

**Routes (all `requireAuth()`; each checks `serviceAccess` first, 403 otherwise):**
- `GET /w/:wardId/service` — hub: "Create Service Opportunity" (if
  `categoriesUserMayCreateIn` non-empty), category list the user manages, links to
  `/w/:wardId/requests` (if they can see any request category) and `/w/:wardId/service/mine`.
  Link to it from the ward dashboard `/w/:wardId` for anyone who manages, delegates or may
  create in at least one category.
- `POST /w/:wardId/service/category` — add a category (kind, name, icon, owning space chosen
  from spaces the user owns, or any for bishopric/superadmin).
- `GET|POST /w/:wardId/service/category/:categoryId` — rename, icon, default audiences
  (opportunities), `council_may_create`, archive/unarchive (managers).
- `POST …/:categoryId/delegates` — add an existing ward member by user id, **or** invite by
  email: if the email belongs to a ward member, add directly; otherwise create/refresh an
  `invites` row (`ward_role` member, no space roles) plus an `invite_category_delegations` row
  and send the existing invite email. Accepting the invite (existing `/invite/:token` flow)
  inserts the delegate rows. `POST …/:categoryId/delegates/:userId/remove`.
- `POST …/:categoryId/warnings` — the current manager's own pref: warn me on/off, hours
  (whole number 1–336, default 48; reject others with a form error), others to warn (ward
  members, multi-select).
- `POST …/:categoryId/discord` — set/clear webhook. Accept only
  `^https://(discord\.com|discordapp\.com)/api/webhooks/\d+/[A-Za-z0-9_-]+$`. After saving,
  the page shows only "Discord channel connected (…last 4 characters)"; never echo it in full,
  never log it.

- [ ] **Step 1: Failing tests:** non-manager gets 403 on every category route; counselor
  can't open `req-christmas`'s page; manager adds a member delegate; inviting a non-member
  email sends exactly one invite email (`sentEmails()`), accepting it makes them `member` with
  no space memberships and a delegate; hours `0`, `337`, `4.5` rejected; webhook
  `https://evil.example/api/webhooks/1/x` rejected; saved webhook not present in the page HTML
  (only the last 4).
- [ ] **Step 2:** Implement. Reuse `layout()`, `siteFooter()` via layout, existing form/CSRF
  conventions in `volRoutes.ts`.
- [ ] **Step 3:** `npm test && npm run typecheck`; commit "Service categories: management pages".

### Task 5: Posts get a category and audiences; Create Service Opportunity; child sign-ups

**Files:**
- Modify: `src/lib/volPosts.ts` (`PostInput` gains `categoryId`, `audiences`; `createPost`
  takes the space from the category), `src/volRoutes.ts` (`/w/:wardId/vol/new`, `POST
  /w/:wardId/vol`, edit), `src/views/volLeader.ts`
- Modify: `src/lib/volSignup.ts`, `src/views/volPublic.ts` (child option), `src/lib/volEmails.ts`
- Test: extend `test/volPosts.test.ts`, `test/volSignup.test.ts`, `test/volLeaderRoutes.test.ts`

**Decisions:**
- `GET /w/:wardId/vol/new` with no `?category=` shows the category picker (only
  `categoriesUserMayCreateIn`, with icon and name). With `?category=X` (and optional
  `&date=YYYY-MM-DD` for Task 8's "turn into"), opens the existing builder prefilled: audiences
  = category defaults (checkboxes, at least one required), space = the category's owning space;
  for a two-owner category a select of its owning spaces defaulting to one the user owns.
- `POST /w/:wardId/vol` re-checks `canCreateInCategory` server-side and that the chosen space is
  one of the category's owning spaces (403 otherwise).
- Posts list/edit allow changing audiences; changing category is not offered.
- **Child sign-ups** (only when the post's audiences include `youth` or `children`): the form
  asks "Who is serving?" Me / My child; "My child" requires a first name (trimmed, collapse
  spaces, 1–40 chars). Store `child_name` ('' = the parent). "Already signed up" and the active
  unique index compare `child_name` case-insensitively (store as typed; compare with
  `LOWER(TRIM())` in queries, and normalise before insert so the index holds). Each child is one
  head. Leaders' lists show "Ana (signed up by Jane Doe)". Every message goes to the parent and
  names the child. No youth/child email is ever collected.

- [ ] **Step 1: Failing tests:** picker lists only creatable categories; posting to a category
  you can't create in → 403; posting with a space not owning the category → 403; post stores
  audiences; **Review Focus 5**: parent + "Ana" + "Ben" on one role → 3 heads; " ana " again →
  already signed up; a post with only brothers/sisters audiences ignores a submitted child name;
  leader list shows "Ana (signed up by …)"; confirmation email names Ana and goes to the parent.
- [ ] **Step 2:** Implement; keep existing volunteer tests green (update fixtures to create
  posts with a category via `ensureServiceCategories`).
- [ ] **Step 3:** `npm test && npm run typecheck`; commit "Opportunities: categories, audiences, child sign-ups".

### Task 6: Public Service Opportunities page `/serve/:prefix`

**Files:**
- Create: `src/views/serve.ts`; `src/lib/serve.ts` (`listServePosts(env, wardId, now):
  Promise<ServeSection[]>`)
- Modify: `src/volRoutes.ts` or `src/serviceRoutes.ts` (route), QR via `src/lib/qr.ts`
- Test: `test/serve.test.ts`

**Decisions (spec §5.1):** sections in order Brothers, Sisters (side by side ≥ 760 px, stacked
below), Youth, Children (line "A parent signs up for their child"). Entry: category icon +
label, title, next upcoming date/time (`whenText`), fill bar from `fillBar` (sum over that
date's roles: "7 of 10 filled"), link to `/v/<publicId>`. A post whose every date is over
(`isPostOver`) is omitted; fully filled (`postIsFull` over upcoming dates) sorts last in its
section with a "Filled" tag. Empty sections hidden; nothing at all → "No open opportunities
right now." Footer: QR + link to `wards.serve_short_url` if set, else
`${APP_URL}/serve/<prefix>`. Unknown/suspended ward → branded 404. `noindex` both ways.
Signed-in users who may create in any category see a big "Create Service Opportunity" button
(→ `/w/:wardId/vol/new`); detect via the leader session, never shown to anonymous visitors.

- [ ] **Step 1: Failing tests:** a two-audience post appears under Brothers and Sisters; past
  post absent; filled post last with "Filled"; HTML never contains a volunteer's name or email,
  `private_details` or the creator's email (seed them with distinctive strings and assert
  absence); `X-Robots-Tag: noindex`; QR target uses the short link when set; Create button
  shown for a creator session, absent anonymously.
- [ ] **Step 2:** Implement; **Step 3:** test + typecheck; commit "Public serve page".

### Task 7: Fill warnings in the hourly cron

**Files:**
- Create: `src/lib/serviceWarnings.ts` (`warningsFor(env, ward, now): Promise<OutgoingMessage[]>`)
- Modify: `src/lib/volCron.ts` (call it; add `warnings` to `CronCounts`), `src/lib/volEmails.ts`
  (`fillWarning`)
- Test: `test/serviceWarnings.test.ts`

**Decisions (spec §4):** a date's start = its `start_time`, else the earliest role
`start_time`, else 00:00, in the ward's time zone (`localToUtc`). Recipients for a post's
category and their lead hours: each pref with `warn_me` → that manager at `pref.hours`; each
pref's others → at that pref's hours; delegates → at the **largest** hours among the category's
prefs, or 48 if there are none. A recipient with several sources uses the largest hours. Send
when `start - hours ≤ now < start` and some role on the date has confirmed < needed. Claim with
`INSERT OR IGNORE INTO vol_warn_sent (date_id, user_id)`; send only if the insert changed a
row. Message: post title, date, each short role "Setup: 2 of 4 (2 short)", manage link. Only
current ward members are warned.

- [ ] **Step 1: Failing tests:** short date 47 h out with default prefs → delegate warned once,
  second run sends nothing; full date → nothing; manager with warn_me off but an "other" listed
  → only the other; hours 72 → warned at 71 h, not at 73 h; a date already started → nothing;
  ward time zone respected (Denver vs. New York fixture).
- [ ] **Step 2:** Implement; **Step 3:** test + typecheck; commit "Fill warnings".

### Task 8: Requests — public help page, verification, inbox, purge, bishop-approval checkbox

**Files:**
- Create: `src/lib/serviceRequests.ts`, `src/views/help.ts`, `src/views/requests.ts`
- Modify: `src/serviceRoutes.ts`, `src/lib/volCron.ts` (purges), `src/lib/volEmails.ts` or new
  `src/lib/requestEmails.ts`
- Modify: `src/views/pages.ts` + `src/app.ts` `/request-workspace` (checkbox), `src/lib/wards.ts`,
  operator console view
- Test: `test/serviceRequests.test.ts`, `test/helpRoutes.test.ts`, `test/requestInbox.test.ts`

**Public (spec §6.1):**
- `GET /help/:prefix` — "Request Help or Service", one friendly line, one tile per active
  request category (icon + name) → `/help/:prefix/:categorySlug`; QR + link (help short link if
  set, else direct). `noindex`.
- `GET|POST /help/:prefix/:slug` — fields: name (1–80), email, optional phone (≤30), optional
  note (≤200, hint "We'll talk through the details with you in person."). `req-moving` adds
  moving in/out (required) and preferred date (optional, YYYY-MM-DD); `req-christmas` adds "for
  my family" / "for another family" (required). No other fields; extra posted fields ignored.
  Turnstile (`TURNSTILE_SITE_KEY`/`SECRET`) + rate limits via `hitLimit` with buckets
  `req:ip:<ip>` (10/hour) and `req:email:<hash>` (3/24h) — separate from volunteer buckets.
  Who-sees line from `whoSeesText(category)`: confidential → "Only the bishop and the people he
  asks to help will see this."; otherwise "Only the <owning space names joined with 'and'>
  leaders, the bishopric and the people they ask to help will see this."
- Submit creates an `unverified` request and a `request_tokens` row (sha256 hash stored, 48 h
  expiry) and emails a verify link `/help/verify/:token` (GET page with a button; POST
  verifies). Verifying sets `new`, `verified_at`, emails the requester an acknowledgment, and
  emails `requestNotifyEmails` the detail-free notice with a link to `/w/:wardId/requests/:id`.
  The thank-you page: "Thank you, we've received your request". Re-using or expired token →
  friendly invalid page, no change.

**Leaders (spec §6.2):**
- `GET /w/:wardId/requests` — requests (status ≠ unverified) of every category where
  `canSeeRequest`; filter by status; newest first.
- `GET|POST /w/:wardId/requests/:id` — status (new, in progress, done, declined), private note
  (≤200, hint "Keep details in person."), assign to one of the category's delegates. Closing
  (done/declined) sets `closed_at` and offers an optional message to the requester (≤500 chars,
  `notify` stream). "Turn into a service opportunity" shown only for non-confidential categories
  with `opportunity_category_id`, when the user `canCreateInCategory` it → link to
  `/w/:wardId/vol/new?category=<id>&date=<preferred_date>`; nothing from the request is copied.
- Purges in the hourly cron: delete requests `closed_at` older than 30 days (row and tokens);
  delete `unverified` older than 7 days; delete expired `request_tokens`.

**Workspace request checkbox (spec §6.2 last bullet):** required checkbox "Our bishop has
approved using WardForward for our ward" on `/request-workspace`; missing → form error, no row;
stored in `workspace_requests.bishop_approved`; operator console shows "Bishop approved: yes".

- [ ] **Step 1: Failing tests:** help page lists the 3 default tiles and no archived ones;
  Christmas form without "for" → error; note of 201 chars → error; unknown extra field not
  stored; submit sends exactly one verify email and no leader email; GET verify changes nothing,
  POST verifies, sends ack + leader notice; **the leader notice contains neither the name,
  email, phone nor note** (assert distinctive seeded strings absent); Christmas notice goes to
  the bishop only, not a counselor (**Review Focus 3**); counselor GET
  `/w/:wardId/requests/:id` on a Christmas request → 403 and it's absent from their inbox;
  assign to a non-delegate → rejected; closing with a message emails the requester once; cron
  purges a request closed 31 days ago and keeps one closed 29 days ago and every open one;
  turn-into button absent on Christmas; rate limit 4th submission from one email in 24 h →
  friendly refusal; workspace request without the checkbox → error.
- [ ] **Step 2:** Implement; **Step 3:** test + typecheck; commit "Service requests".

### Task 9: Bulk email invitations and unsubscribe

**Files:**
- Create: `src/lib/recipients.ts` (`parseRecipients(raw: string): { valid: string[];
  invalid: string[]; duplicates: number }`), `src/lib/invitations.ts`, `src/views/invite.ts`
- Modify: `src/serviceRoutes.ts` or `src/volRoutes.ts`, `src/index.ts` (`scheduled` dispatch by
  `controller.cron`), `wrangler.toml` (`crons = ["0 * * * *", "* * * * *"]`),
  `src/lib/volSession.ts` (`LinkTyp` gains `'unsub'`, default 3650 days), operator console
- Test: `test/recipients.test.ts`, `test/invitations.test.ts`, `test/unsubscribe.test.ts`

**Decisions (spec §7):**
- `parseRecipients` splits on commas, semicolons, whitespace and new lines, but keeps
  `Name <email>` together (extract the address inside `<>`); lowercases; validates with the
  same address rule as `mail.ts`; dedupes. It takes a string and returns addresses so a roster
  can feed the same `string[]` later.
- Per paste: at most 10,000 valid addresses (the "very high number"); more → form error.
- `GET /w/:wardId/vol/:postId/invite` (requires `canEditPost`): paste box, optional note
  (≤500), "Preview". `POST …/invite/preview`: shows valid unique count, the invalid lines, how
  many unsubscribed will be skipped, and the list re-posted in a hidden field with "Send N
  invitations" and "Send a test to me" (sends one invitation to the leader's own address,
  marked "[Test]", not counted, not suppressed-checked). `POST …/invite/send` re-parses
  server-side, re-checks suppression, creates `invite_batches` + `invite_recipients`, kicks
  `pumpInvitations(env, now, { batchId, limit: 100 })` via `c.executionCtx.waitUntil`, and
  redirects to `GET …/invite/:batchId` (progress "180 of 204 sent", auto-refresh every 5 s
  while sending; shows the daily-limit notice when `waiting_cap`).
- `pumpInvitations(env, now, o: { batchId?: string; limit: number }): Promise<{ sent: number;
  failed: number }>` — claims rows atomically (`UPDATE invite_recipients SET claim_id = ?,
  claimed_at = ? WHERE id IN (SELECT id … WHERE sent_at IS NULL AND (claim_id IS NULL OR
  claimed_at < now-10min) LIMIT ?)`, then selects by `claim_id`); stops a batch whose post was
  deleted (`cancelled`, recipients deleted); re-checks suppression per address at send time;
  sends through `sendMailBatch` (concurrency 10) on the `invitations` stream; marks
  `sent_at`/`failed`; bumps `invite_batches.sent/failed` and `invite_daily_counts`; when
  nothing is left: `done`, `finished_at`, delete the batch's recipients. Minute cron calls it
  with `limit: 400`. Check current Cloudflare Workers subrequest and Email Service limits in the
  docs and size `limit` under them; record the source in a code comment.
- **Daily ceiling:** before claiming, `remaining = wards.invite_daily_cap − today's sent`
  (ward-local day via `wardToday`). Zero → batch `waiting_cap`; email the batch creator once
  (`cap_notified_at`): "Today's safety limit is reached; the rest send tomorrow." Resumes the
  next ward-local day. The operator edits `invite_daily_cap` per ward on `/operator` and sees a
  batches table (ward, who, when, post title, total/sent/failed/skipped, status).
- **Message:** subject `Service opportunity: <post title>`; body: organization, title, upcoming
  dates (`whenText`), the note (escaped), button to `${APP_URL}/v/<publicId>`, and "Stop service
  invitations from <ward name>" link. Headers `List-Unsubscribe: <${APP_URL}/unsub/<token>>`
  and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Token = `makeLinkToken({ typ:
  'unsub', wardId, id: <email hash> })`.
- **Unsubscribe:** `GET /unsub/:token` → page with a "Stop service invitations from <ward>"
  button (no data change). `POST /unsub/:token` (from that button or a mail client's one-click
  POST) → `INSERT OR IGNORE` into `invite_suppressions` → "You won't get service invitations
  from <ward> again." `email_hash` = `sha256Hex(normalized lowercase address)`. Suppression
  never blocks `notify` mail (confirmations, reminders).

- [ ] **Step 1: Failing tests:** **Review Focus 1** parse cases (`Ann@Example.test,
  ann@example.test; Ann Smith <ann@example.test>`, blank lines, `not-an-email`) → 1 valid, 1
  invalid, 2 duplicates; 10,001 addresses → error; non-editor → 403 on all invite routes;
  preview counts suppressed; 2,000-address batch completes across several pump calls with each
  address mailed exactly once (`sentEmails()`), every message single-recipient on the
  invitations stream with both headers; **Review Focus 4** two concurrent `pumpInvitations` on
  one batch (use `barrierDb`/`hookDb` from `test/helpers.ts`) → no duplicate recipients;
  recipients rows gone after `done`; cap 50 with 120 addresses → 50 sent, `waiting_cap`, one
  cap email, resumes next ward-local day; **Review Focus 2** POST
  `/unsub/:token` with body `List-Unsubscribe=One-Click` and no cookies → suppressed; GET
  changes nothing; a later preview counts it skipped and the pump never sends to it; a reminder
  to that address still sends; tampered token → invalid page.
- [ ] **Step 2:** Implement; **Step 3:** test + typecheck; commit "Bulk invitations and unsubscribe".

### Task 10: My service opportunities (delegates and creators)

**Files:**
- Modify: `src/serviceRoutes.ts`, `src/views/service.ts`, `src/lib/volPosts.ts` (a listing query)
- Test: `test/serviceMine.test.ts`

**Decisions (spec §3, Sam: coordinators "should also be able to see all opportunities they
have created and their statuses"):** `GET /w/:wardId/service/mine` lists every post in a
category the user delegates, plus every post they created (deduped), upcoming first, past
collapsed below. Per post: each date's fill per role, sign-ups with names (child-aware
display), approvals waiting (count + link to the post's manage page), and fill warnings sent
for its dates. Every row's manage link goes to the existing `/w/:wardId/vol/:postId` (which
already enforces `canEditPost`). Each listed post is re-checked with `canViewPost`.

- [ ] **Step 1: Failing tests:** delegate sees all meal posts including ones the RS president
  created; doesn't see move posts; creator sees their own post after delegation removed; a
  member with neither sees an empty page (200, "Nothing yet").
- [ ] **Step 2:** Implement; **Step 3:** test + typecheck; commit "My service opportunities".

### Task 11: Portal sections, service cards, ward settings, M44 setup

**Files:**
- Create: `src/lib/portalSections.ts`
- Modify: `src/lib/db.ts` (`getPortalCards` → grouped), `src/types.ts` (`PortalData` gains
  `sections: PortalSection[]` and `service: { serve?: PortalCard; help?: PortalCard }`),
  `src/views/portal.ts`, `src/views/portalprint.ts`, `src/app.ts` (`/p/:prefix`,
  `/p/:prefix/print`, ward settings on `/w/:wardId`, sections UI on the public space's page),
  `src/views/spaceportal.ts` / `src/views/pages.ts`, `db/seed-m44.sql`
- Test: `test/portalSections.test.ts`, extend portal/print tests

**Decisions (spec §8):**
- Section heading style: the M44 hub's `.column-heading` (read
  `F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio\index.html`, read-only) with `border-bottom: 2px
  solid` in the portal's existing gold/Marigold token if one exists, else `#c9b882`.
- Order: Service Opportunities (card "Sign up for Service Opportunities" → serve short link or
  `${APP_URL}/serve/<prefix>`), Service Requests (card "Request Help or Service" → help short
  link or `/help/<prefix>`), then the ward's sections by position, then unsectioned published
  deliverables under a default section titled "Links" (omitted when empty). Sections lay out
  two per row ≥ 900 px, stacked below; the two service sections share the first row. Each card
  keeps its QR modal. Print layouts render the same headings and order.
- Ward settings (superadmin, on `/w/:wardId`): "Service Opportunities link" and "Service
  Requests link" (normalized http(s) or cleared) and two on/off toggles (default on). Off →
  that section is absent from portal and print.
- Arranging sections: whoever may edit the public portal today (reuse the existing permission
  check for the public space page; if none exists, bishopric/superadmin via `isBishopric`). Add /
  rename / move up-down / delete a section; per published deliverable a "Section" select.
  Deleting a section returns its items to the default section.
- `db/seed-m44.sql`: create sections "Ward Links" (position 0) and "Interviews" (position 1) on
  M44's public space and assign the seeded deliverables by title (interview-related titles →
  Interviews; read the seed to decide). Retargeting `zippa.run/m44Links` is Sam's owner step
  (do not do it); keep the GitHub Pages hub untouched.

- [ ] **Step 1: Failing tests:** portal HTML order is Service Opportunities, Service Requests,
  Ward Links, Interviews, Links; each service card's QR/href uses the short link when set and
  the direct URL otherwise; toggling off removes the section from portal and print; a
  `javascript:` short link is refused on save; non-superadmin can't change ward settings (403);
  deleting a section moves its cards to "Links"; seeded M44 portal shows both sections.
- [ ] **Step 2:** Implement; **Step 3:** test + typecheck; commit "Portal sections and service cards".

### Task 12: Discord channel announcements

**Files:**
- Modify: `src/lib/discord.ts` (`postDiscordWebhook(url: string, content: string):
  Promise<'sent' | 'error'>`), `src/volRoutes.ts` (create form + manage page), `src/views/volLeader.ts`
- Test: `test/discordAnnounce.test.ts`

**Decisions (spec §9):** the create form shows "Announce in Discord" (checked by default) only
when the post's category has a webhook; the manage page has an "Announce in Discord" button
(POST, `canEditPost`). Content: `**<title>** — <organization>\n<upcoming dates>\n<APP_URL>/v/<publicId>`,
≤2000 chars, `allowed_mentions: { parse: [] }` so no @everyone. 5 s timeout (AbortSignal).
Failure → logged as `[discord] webhook error for category=<id>` (never the URL) and a soft
notice; the post is still created.

- [ ] **Step 1: Failing tests:** creating with the box checked POSTs once to the webhook with
  the public link and `allowed_mentions.parse` empty (`sentFetches()`); unchecked → no fetch;
  webhook returns 500 or throws → post exists, page shows the notice, no URL in any
  `console` output (spy) or HTML; no box rendered when the category has no webhook.
- [ ] **Step 2:** Implement; **Step 3:** test + typecheck; commit "Discord channel announcements".

### Task 13: Docs and local walk-through

**Files:** `CLAUDE.md` (Status line, new routes/tables/cron, upgrade script), `IMPLEMENTATION.md`
§10 (mark this feature built & local-verified; owner steps: retarget `zippa.run/m44Links`,
per-ward Discord webhooks, confirm Email Sending limits), `BLUEPRINT.md` if it lists portal
structure, `.dev.vars.example` if any var was added.

- [ ] **Step 1:** Fresh local DB (`--persist-to` a scratch dir), `db:init`, seeds, `npm run dev`
  with `EMAIL_DELIVERY=log`; walk: `/p/m44` shows the two service sections then Ward Links /
  Interviews; create a meal opportunity as the RS president; it appears on `/serve/m44`; submit
  a Christmas request on `/help/m44`, verify from the printed link, see it as the bishop and
  not as a counselor; paste 5 addresses and watch them print; unsubscribe one. Record what you
  checked in the report.
- [ ] **Step 2:** Update docs; `npm test && npm run typecheck`; commit "Docs: service opportunities and requests".
