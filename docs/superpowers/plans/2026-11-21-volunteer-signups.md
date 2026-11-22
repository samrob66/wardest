# Volunteer Sign-ups Implementation Plan

> **For agentic workers:** this plan is run by the `orchestrator` skill (one implementer for
> the whole plan, one reviewer, up to 3 fix rounds), per Sam's global instructions. Ignore any
> instruction to use subagent-driven-development or executing-plans. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** Organization presidents post volunteer needs (dates × helper roles); ward members
sign up from an unguessable public link with any email (first-timers confirm their address,
then a leader approves them once for the whole ward); the ward council sees every post; volunteers
get confirmations and day-before reminders by email and, if connected, Discord DM.

**Architecture:** A new section of the existing Hono Worker + D1 app. New `vol_*` tables, all
ward-scoped. One permission module (`src/lib/volAccess.ts`) answers every "who may see/edit"
question, fail-closed. Domain functions never send anything: they return `OutgoingMessage[]`,
and the route (or the cron) hands them to one `deliver()` that sends via Resend and,
best-effort, Discord. A Workers Cron Trigger (hourly) sends reminders, approval nudges, and
lapses stale waiting sign-ups. Volunteers get their own signed cookie, separate from the
leaders' Google session.

**Tech Stack:** Cloudflare Workers, Hono 4, D1, TypeScript, Resend (REST), Cloudflare
Turnstile, Discord REST API v10 + OAuth2, Vitest with `@cloudflare/vitest-pool-workers` (new,
dev-only).

**Spec:** `docs/superpowers/specs/2026-11-21-volunteer-signups-design.md` (approved by Sam
2026-11-21). Read it in full before starting; §3 items 1–25 are Sam's own rules and are fixed.

## Global Constraints

- Every new table has `ward_id TEXT NOT NULL REFERENCES wards(id) ON DELETE CASCADE`; every
  read and write filters `ward_id` (lib functions take `wardId` as a required argument).
- Every "may this person see/edit X" decision goes through `src/lib/volAccess.ts`. Fail closed:
  unknown, wrong-ward, or missing → deny. Ward superadmin = Bishopric (break-glass).
- Any pasted link goes through `normalizeHttpUrl` on write and `safeHref` on render
  (`src/lib/urls.ts`). All user text is `esc()`-ed in pages and in email HTML; notes render with
  `mdLite`.
- Email only from `Wardest <no-reply@send.wardest.com>` via Resend. Never touch DNS / apex MX.
- Public pages (`/v/...`, `/vol/...`) send `X-Robots-Tag: noindex` and `<meta name="robots"
  content="noindex">`.
- Never on a public page or on the screen after the sign-up form: volunteer names, emails, or
  private details (spec §2 anti-goals, §6.4).
- Private details and other volunteers' names reach a volunteer only if their email is both
  verified and approved, only through their email / Discord DM / My sign-ups session, and only
  while the post is not over (spec §6.4, §6.8).
- No Church names, marks, or "official" look in any copy (spec §2).
- No secrets in the repo. New secrets (`TURNSTILE_SECRET_KEY`, `DISCORD_BOT_TOKEN`,
  `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`) go in `.dev.vars.example` as placeholders.
  Cloudflare's published Turnstile *test* keys may be used as the example/dev values.
- Local only: no `wrangler deploy`, no `--remote`. Nothing is deployed, so `db/schema.sql` is
  edited in place (no migration file), as in roadmap item 1.
- GET requests never change data. Every link in an email (verify, cancel, withdraw) opens a
  page with a button that POSTs. Mail scanners prefetch links.
- Commit after each task on branch `claude/volunteer-signups-715f1d`. Never push or merge.

## Review Focus

1. **Mail-scanner prefetch.** Corporate and Gmail scanners GET every link in an email. A GET on
   verify/cancel/withdraw must change nothing; only the POST from the page's button does.
   Tests in Tasks 10, 11.
2. **Someone types an approved member's email on the public form.** The sign-up counts, but
   the response page shows no private details and no names, and the confirmation goes to the
   real owner. Test in Task 10.
3. **Time zones and DST.** Cutoffs, "the day before", "within 14 days" and "post is over" are
   computed in the ward's time zone, including across the 2026-11-01 and 2027-03-14 Denver DST
   changes. Tests in Task 2 and Task 14.
4. **IDs from the wrong place.** A `role_id` from a different post (or another ward) posted to
   `/v/:publicId/signup`, a post id from another ward in a leader URL, a cancel token for
   another ward's sign-up: all rejected. Tests in Tasks 5, 7, 10.
5. **Double clicks and races.** The same email signing up twice for one role gets one sign-up;
   two people taking the last spot both get in, and only the later one is marked over the
   limit; cancelling twice sends one email. Tests in Tasks 9, 11.

---

## File map

| File | Responsibility |
|---|---|
| `vitest.config.ts`, `test/setup.ts`, `test/helpers.ts` | Test harness: D1 with `db/schema.sql` applied per test file, fixture builders, outbound-fetch interception |
| `db/schema.sql` | `wards.timezone` + 7 new `vol_*`/`volunteers` tables |
| `src/lib/wardTime.ts` | Ward-local date/time ↔ UTC instant |
| `src/lib/volMessages.ts` | `OutgoingMessage` type, `deliver()`, Resend send, dev console fallback |
| `src/lib/volEmails.ts` | One builder per email in spec §6.6 (subject + HTML + Discord text) |
| `src/lib/discord.ts` | Discord DM send + OAuth code exchange |
| `src/lib/volAccess.ts` | The single permission module |
| `src/lib/volEditors.ts` | "Who can manage volunteer posts" list per org space |
| `src/lib/volPosts.ts` | Posts, dates, roles CRUD; counts; copy date/post; listings |
| `src/lib/volSignup.ts` | Sign-up engine: submit, verify, approve, decline, undo, revoke, cancel, withdraw, remove |
| `src/lib/volRate.ts` | D1-backed rate limits |
| `src/lib/turnstile.ts` | Turnstile siteverify |
| `src/lib/volSession.ts` | Volunteer cookie + signed link tokens |
| `src/lib/volCron.ts` | Reminders, 48h approval nudge, lapse, cleanup |
| `src/volRoutes.ts` | All `/w/:wardId/vol/*`, `/v/*`, `/vol/*` routes (mounted from `app.ts`) |
| `src/views/volLeader.ts`, `src/views/volPublic.ts`, `src/views/volMine.ts` | Leader pages, public post page, volunteer pages |
| `src/index.ts`, `wrangler.toml`, `src/types.ts` | `scheduled` handler, cron trigger, new env vars |

Keep `src/app.ts` changes to: mounting `volRoutes`, adding the volunteer section data to the
space page route, and the ward time-zone setting.

## Shared types (used across tasks)

```ts
// src/lib/volMessages.ts
export interface OutgoingMessage {
  kind: string;               // e.g. 'vol_verify', 'vol_confirmed', 'approver_waiting'
  to: string;                 // lowercased email
  subject: string;
  html: string;
  discordText?: string;       // set only for volunteer confirmations/reminders (spec §6.9)
  volunteerId?: string;       // lets deliver() find a connected Discord account
}
export type Outcome<T> = { result: T; messages: OutgoingMessage[] };
```

Status values (CHECK constraints in Task 1):
- `volunteers.approval`: `'none'` (address not verified yet) | `'pending'` | `'approved'` | `'declined'`
- `vol_signups.status`: `'waiting'` | `'confirmed'` | `'cancelled'` (by volunteer) |
  `'withdrawn'` (over-limit offer withdrawn) | `'removed'` (by a leader, or role/post deleted,
  or approval revoked) | `'declined'` | `'lapsed'`

Definitions used everywhere (implemented in Task 2 / Task 6):
- **Role start** = `role.start_time ?? date.start_time ?? '00:00'` on `date.date`, ward-local.
- **A date is over** at 00:00 ward-local on the following day.
- **A post is over (past)** when all its dates are over.
- **Confirmed count** of a role = sign-ups with `status='confirmed'`. **Full** = confirmed ≥ needed.
  **Waiting count** = `status='waiting'`. Waiting never counts (spec item 18).

---

### Task 1: Test harness and schema

**Files:**
- Create: `vitest.config.ts`, `test/setup.ts`, `test/helpers.ts`, `test/schema.test.ts`
- Modify: `package.json` (devDeps `vitest`, `@cloudflare/vitest-pool-workers`; script
  `"test": "vitest run"`), `tsconfig.json` (test types), `db/schema.sql`, `SCHEMA.md`

**Interfaces:**
- Produces (test helpers, `test/helpers.ts`):
  - `applySchema(db: D1Database): Promise<void>` — splits `db/schema.sql` into statements
    (strip `--` comments, split on `;`) and runs them in one `batch`.
  - `makeWard(env, o?: { prefix?: string; timezone?: string }): Promise<{ wardId: string; spaces: Record<string, string> }>` — uses `createWard` from `src/lib/wards.ts`; `spaces` maps slug → id.
  - `makeLeader(env, wardId, o: { email: string; wardRole?: 'superadmin'|'member'; spaces?: Array<[slug: string, role: 'owner'|'member']> }): Promise<string>` — returns user id.
  - `sentFetches(): Array<{ url: string; body: unknown }>` + `resetFetches()` — every outbound
    fetch is intercepted (Resend, Turnstile siteverify, Discord); none reaches the network.
    Turnstile siteverify answers `{ success: true }` unless the token is `'fail'`.
- Schema (append to `db/schema.sql`, a new section `-- VOLUNTEER SIGN-UPS`):
  - `wards.timezone TEXT NOT NULL DEFAULT 'America/Denver'`
  - `vol_posts(id, ward_id, space_id → spaces, public_id TEXT NOT NULL UNIQUE, title, public_note, private_details, cancel_cutoff_hours INTEGER NOT NULL DEFAULT 24 CHECK (>=0 AND <=336), full_notified_at, created_by_user_id → users ON DELETE SET NULL, created_at, updated_at)`
  - `vol_dates(id, ward_id, post_id → vol_posts CASCADE, date TEXT NOT NULL /*YYYY-MM-DD*/, start_time TEXT /*HH:MM*/, approval_nudged_at, position)`
  - `vol_roles(id, ward_id, post_id, date_id → vol_dates CASCADE, name, needed INTEGER NOT NULL CHECK (needed BETWEEN 1 AND 500), start_time, end_time, note, bring_prompt, position)`
  - `volunteers(id, ward_id, email /*lowercased*/, name, approval TEXT NOT NULL DEFAULT 'none' CHECK (...), email_verified_at, decided_by_user_id, decided_at, discord_user_id, created_at, UNIQUE(ward_id, email))`
  - `vol_signups(id, ward_id, post_id, role_id → vol_roles CASCADE, volunteer_id → volunteers CASCADE, bringing, status CHECK (...), over_limit INTEGER NOT NULL DEFAULT 0, confirmed_at, ended_at, reminded_at, created_at)` + partial unique index `(role_id, volunteer_id) WHERE status IN ('waiting','confirmed')`
  - `vol_editors(id, ward_id, space_id → spaces CASCADE, user_id → users CASCADE, added_by_user_id, created_at, UNIQUE(space_id, user_id))`
  - `vol_tokens(id, ward_id, volunteer_id → volunteers CASCADE, purpose CHECK IN ('verify'), token_hash TEXT NOT NULL UNIQUE, expires_at, used_at, created_at)`
  - `vol_rate_events(id, ward_id, bucket TEXT NOT NULL, created_at)` + index `(bucket, created_at)`
  - Indexes on every `ward_id`, `post_id`, `role_id`, `volunteer_id` foreign key.

- [ ] **Step 1:** Install and configure the pool. Pick the `@cloudflare/vitest-pool-workers`
  version that matches the installed `wrangler` 4.x, from current Cloudflare docs (load the
  `cloudflare` skill); point it at `wrangler.toml` with test bindings `SESSION_SECRET`,
  `APP_URL=http://localhost:8787`, `RESEND_API_KEY=test`, `TURNSTILE_SECRET_KEY=test`,
  `DISCORD_BOT_TOKEN=test`. Record the versions in the report.
- [ ] **Step 2: Write the failing test** `test/schema.test.ts`:
  ```ts
  it('every vol table carries ward_id', async () => {
    for (const t of ['vol_posts','vol_dates','vol_roles','volunteers','vol_signups','vol_editors','vol_tokens','vol_rate_events']) {
      const cols = (await env.DB.prepare(`PRAGMA table_info(${t})`).all<{name:string}>()).results.map(c => c.name);
      expect(cols).toContain('ward_id');
    }
  });
  it('wards default to America/Denver', async () => {
    const { wardId } = await makeWard(env);
    expect((await env.DB.prepare('SELECT timezone FROM wards WHERE id=?').bind(wardId).first())!.timezone).toBe('America/Denver');
  });
  it('one active sign-up per volunteer per role', /* insert two 'waiting' rows → second throws; a 'cancelled' + a 'waiting' → ok */);
  ```
- [ ] **Step 3:** `npm test` → FAIL (tables missing). Add the schema. `npm test` → PASS.
  `npm run typecheck` → clean.
- [ ] **Step 4:** Add a "Volunteer sign-ups" section to `SCHEMA.md` (tables, status meanings,
  the visibility table from spec §5). Commit: `Volunteer sign-ups: test harness + schema`.

### Task 2: Ward time zone

**Files:** Create `src/lib/wardTime.ts`, `test/wardTime.test.ts`. Modify `src/lib/wards.ts`
(`WardRow.timezone`, `setWardTimezone`), `src/app.ts` + `src/views/pages.ts` (superadmin-only
time-zone select on the ward page; POST `/w/:wardId/timezone`).

**Interfaces (produces):**
- `localToUtc(date: string, time: string, tz: string): Date` — `'2026-12-06','09:00','America/Denver'` → `2026-12-06T16:00:00Z`.
- `wardToday(tz: string, now: Date): string` — `YYYY-MM-DD` in the ward's zone.
- `wardHour(tz: string, now: Date): number`
- `addDays(date: string, n: number): string`
- `dateOverAt(date: string, tz: string): Date` — `localToUtc(addDays(date, 1), '00:00', tz)`.
- `isValidTimezone(tz: string): boolean` — `try { new Intl.DateTimeFormat('en-US', { timeZone: tz }) }`.
- `formatWhen(date: string, time: string | null): string` — `'Saturday, Dec 6 · 9:00 AM'` (no time → `'Saturday, Dec 6'`).
- `setWardTimezone(env, wardId: string, tz: string): Promise<void>` (rejects invalid).

Approach for `localToUtc`: guess = the wall time as if UTC; read that instant's offset in `tz`
via `Intl.DateTimeFormat(...).formatToParts`; subtract; re-read the offset at the result and
correct once (handles DST). A non-existent spring-forward time (02:30 on a spring-forward day)
lands one hour later; that's acceptable.

- [ ] **Step 1: Failing tests:** `localToUtc` for Denver winter (UTC-7) and summer (UTC-6);
  `localToUtc('2026-11-01','01:30','America/Denver')` returns a valid instant (the ambiguous
  hour; either answer passes but it must not throw or be NaN); `wardToday('America/Denver', new
  Date('2026-12-07T05:30:00Z'))` → `'2026-12-06'`; `dateOverAt('2026-12-06','America/Denver')`
  → `2026-12-07T07:00:00Z`; `isValidTimezone('Mars/Base')` → false; `formatWhen` both forms.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Ward page select (a short list: Eastern, Central, Mountain (Denver), Arizona
  (Phoenix), Pacific, Alaska, Hawaii, plus the current value); superadmin only (403 otherwise),
  invalid → error. Typecheck. Commit.

### Task 3: Messaging core

**Files:** Create `src/lib/volMessages.ts`, `src/lib/volEmails.ts`, `test/volMessages.test.ts`.

**Interfaces (produces):**
- `OutgoingMessage`, `Outcome<T>` (see Shared types).
- `deliver(env: Env, msgs: OutgoingMessage[]): Promise<void>` — de-duplicates by
  `(to, kind, subject)`; sends each via Resend (`from: 'Wardest <no-reply@send.wardest.com>'`);
  never throws. If `RESEND_API_KEY` is empty or `'dev'`, logs `to`, `subject` and every
  `href` in the HTML to the console instead (so a local tester can click verify links). Task 15
  adds the Discord leg.
- `approverEmails(env, wardId: string, postId: string): Promise<string[]>` — post creator +
  that org's volunteer editors (Task 5's `listEditorUserIds`), lowercased, deduplicated
  (spec §6.6: one email per person). Until Task 5 lands, creator only; Task 5 completes it.
- `volEmails.ts`: one builder per spec §6.6 row, each returning `OutgoingMessage`, all text
  `esc()`-ed. Names: `verifyEmail`, `signupConfirmed` (includes private details, the cancel
  link, the My sign-ups link, and, when `overLimit`, the "need is already met — withdraw if you
  like" paragraph with the withdraw link), `approved`, `declined`, `reminder`, `roleChanged`,
  `signupRemoved`, `approverWaiting`, `approverNudge48h`, `approverFilled`,
  `approverCancelled({ urgent: boolean; stillFull: boolean })`, `accessLink`. Wording is the
  builder's (spec §8); plain, warm, no Church names. URLs (cancel, withdraw, My sign-ups,
  verify) are parameters; the builders mint nothing. `signupConfirmed`, `approved` and
  `reminder` set `discordText` and `volunteerId` (spec §6.9: confirmations and reminders), and
  for an approved volunteer `signupConfirmed` ends with "Other ways to serve": the ward's other
  open posts with only `confirmed of needed` and their public links (spec §6.4). Subject lines start with the
  organization name, e.g. `Elders Quorum: you're signed up — Help the Jensens move in`.

- [ ] **Step 1: Failing tests:** `deliver` with two identical messages → one Resend POST (via
  `sentFetches()`); `deliver` with key `'dev'` → zero fetches; a Resend 500 → no throw;
  `signupConfirmed` with a name `<script>` → HTML contains `&lt;script&gt;`.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit.

### Task 4: Discord DM spike

The spike proves a Worker can DM a user before the rest of Discord is built (Task 15).

**Files:** Create `src/lib/discord.ts`, `test/discord.test.ts`. Modify `src/types.ts`
(`DISCORD_BOT_TOKEN?`, `DISCORD_CLIENT_ID?`, `DISCORD_CLIENT_SECRET?`), `.dev.vars.example`,
`src/volRoutes.ts` (create it, mounted at `/` from `app.ts`).

**Interfaces (produces):**
- `sendDiscordDm(env: Env, discordUserId: string, text: string): Promise<'sent' | 'no_dm' | 'error'>`
  — `POST https://discord.com/api/v10/users/@me/channels` `{ recipient_id }` with
  `Authorization: Bot <token>`, then `POST /channels/{id}/messages` `{ content }` (text cut to
  2000 chars). Discord error code `50007` ("Cannot send messages to this user") → `'no_dm'`.
  Missing token → `'error'` without fetching. Honors a 429 by returning `'error'` (no retry
  loop).
- Dev-only route `GET /dev/discord-dm?to=<discord user id>`: 404 unless `DEV_LOGIN === '1'`.
  Sends "Wardest test message" and prints the result.

- [ ] **Step 1: Failing tests:** happy path makes exactly the two calls with the bot header;
  `50007` → `'no_dm'`; no token → `'error'` and zero fetches; `/dev/discord-dm` without
  `DEV_LOGIN` → 404.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit.
- [ ] **Step 3: Live proof (owner step).** If `.dev.vars` has a real `DISCORD_BOT_TOKEN` and
  you have a test user id that shares a server with the bot, run `npm run dev` and open
  `/dev/discord-dm?to=<id>`; record the result. If not, do not block: report it under
  "Not done / unverified" ("needs Sam's Discord application + bot in a test server") and go on.

### Task 5: Permissions and the volunteer-editors list

**Files:** Create `src/lib/volAccess.ts`, `src/lib/volEditors.ts`, `test/volAccess.test.ts`.
Modify `src/app.ts` + `src/views/spaceportal.ts` (the "Who can manage volunteer posts" card on
org space pages), `src/lib/volMessages.ts` (`approverEmails` includes editors).

**Interfaces (produces):**
```ts
export interface PostRef { id: string; ward_id: string; space_id: string; created_by_user_id: string | null }
isBishopric(env, wardId, userId): Promise<boolean>            // superadmin OR any member of the ward's kind='bishopric' space
canManageOrg(env, wardId, spaceId, userId): Promise<boolean>   // isBishopric OR owner of that org space OR row in vol_editors
canEditPost(env, userId, post: PostRef): Promise<boolean>     // canManageOrg(post.ward_id, post.space_id) OR creator
canViewPost(env, userId, post: PostRef): Promise<boolean>     // canEditPost OR member of the ward's ward_council space OR member (any role) of post.space_id
canApproveVolunteer(env, wardId, volunteerId, userId): Promise<boolean> // isBishopric OR canEditPost on any post where that volunteer has a 'waiting' sign-up
canManageEditorList(env, wardId, spaceId, userId): Promise<boolean>     // isBishopric OR owner of that org space
canSeeWardVolunteers(env, wardId, userId): Promise<boolean>   // isBishopric (declined list, undo decline, revoke)
```
Every function first requires a `ward_memberships` row for `(wardId, userId)`, checks the
space is `kind='org'` and belongs to `wardId` where a space is involved, and returns `false` on
anything missing. `space_shares` grant nothing here (spec §5 lists the audiences exactly).

`volEditors.ts`: `listEditors(env, wardId, spaceId): Promise<Array<{ user_id; email; name; owner: boolean }>>`
(owners first, always shown, not removable), `listEditorUserIds(env, wardId, spaceId):
Promise<string[]>` (owners + added), `addEditor(env, wardId, spaceId, userId, byUserId)` (user
must be a ward member), `removeEditor(env, wardId, spaceId, userId)`.

- [ ] **Step 1: Failing tests** — a table-driven test over this cast in one ward (EQ = Elders
  Quorum space): `bishop` (bishopric member), `exec` (superadmin), `eqPres` (EQ owner),
  `eqCounselor` (EQ member, then added as editor), `eqTeacher` (EQ member), `rsPres` (RS owner,
  ward council member), `wmLeader` (Ward Mission owner, not in ward council), `stranger` (member
  of another ward). For a post in EQ created by `bishop`:

  | user | canViewPost | canEditPost |
  |---|---|---|
  | bishop, exec, eqPres | ✓ | ✓ |
  | eqCounselor before / after added | ✓ / ✓ | ✗ / ✓ |
  | eqTeacher | ✓ | ✗ |
  | rsPres | ✓ | ✗ |
  | wmLeader | ✗ | ✗ |
  | stranger | ✗ | ✗ |

  Plus: a post whose `ward_id` differs from the space's ward → all false; `canManageEditorList`
  true for eqPres, false for eqCounselor even when added; `approverEmails` for the post =
  `{bishop (creator), eqPres, eqCounselor (once added)}` with no duplicates.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Org space page card: lists editors; add (select of ward members) / remove
  forms for `canManageEditorList`; POST `/w/:wardId/space/:spaceId/vol-editors` and
  `/vol-editors/:userId/remove`, 403 otherwise. Typecheck. Commit.

### Task 6: Posts data layer

**Files:** Create `src/lib/volPosts.ts`, `test/volPosts.test.ts`.

**Interfaces (produces):**
```ts
export interface PostInput { title: string; public_note: string | null; private_details: string | null; cancel_cutoff_hours: number }
export interface RoleInput { name: string; needed: number; start_time: string | null; end_time: string | null; note: string | null; bring_prompt: string | null }
createPost(env, wardId, spaceId, byUserId, input: PostInput): Promise<string>   // public_id = randomToken(12)
updatePost(env, wardId, postId, input: PostInput): Promise<void>
addDate(env, wardId, postId, date: string, startTime: string | null): Promise<string>
updateDate(env, wardId, dateId, date: string, startTime: string | null): Promise<OutgoingMessage[]>   // roleChanged to confirmed volunteers on that date
addRole(env, wardId, dateId, input: RoleInput): Promise<string>
updateRole(env, wardId, roleId, input: RoleInput): Promise<OutgoingMessage[]>   // roleChanged only when times change
deleteRole / deleteDate / deletePost(env, wardId, id): Promise<OutgoingMessage[]>  // signupRemoved to each volunteer with a 'confirmed' or 'waiting'+verified sign-up on an upcoming date, then hard delete
copyDate(env, wardId, dateId, newDate: string): Promise<string>          // same start time + roles, no sign-ups
copyPost(env, wardId, postId, newFirstDate: string, byUserId): Promise<string> // shifts every date by (newFirstDate − old first date) days; new public_id; no sign-ups
getPostByPublicId(env, publicId): Promise<PostFull | null>
getPost(env, wardId, postId): Promise<PostFull | null>
listWardPosts(env, wardId, o: { spaceId?: string; past: boolean; now: Date }): Promise<PostSummary[]>
```
`PostFull` = post row (so it satisfies Task 5's `PostRef`) + org name + ward `{ id, name, prefix, timezone }` + `dates[]` each with
`roles[]` each with `{ confirmed, waiting }` counts. `PostSummary` = `{ id, public_id, title,
org_name, space_id, first_date, last_date, confirmed, needed, waiting, short_soon: boolean }`
where `short_soon` = some role is not full and its date is between ward-today and
ward-today + 14 days (spec item 22). Validation (throws `VolInputError` with a plain message):
title 1–120 chars, notes ≤ 4000, role name 1–80, needed 1–500, dates `YYYY-MM-DD`, times
`HH:MM`, `end_time > start_time` when both set, cutoff 0–336, space is an un-archived `org`
space of this ward. Every query filters `ward_id`; an id from another ward behaves as "not
found".

- [ ] **Step 1: Failing tests:** create → add 2 dates × roles → `getPost` returns them ordered
  with zero counts; `copyDate` copies roles not sign-ups; `copyPost` from a post on 2026-12-06
  & 2026-12-13 with new first date 2027-01-10 → dates 2027-01-10 & 2027-01-17, new public_id;
  `updateRole` changing `start_time` returns one `roleChanged` per confirmed volunteer, changing
  only the note returns none; `deletePost` returns `signupRemoved` for confirmed volunteers and
  removes all rows; `getPost(otherWardId, postId)` → null; `listWardPosts` puts a post whose
  last date is yesterday (ward time) in `past:true` only; `short_soon` true at 10 days out and
  false at 20; validation errors for `needed: 0` and `end_time` before `start_time`; a
  `public_id` is ≥ 16 chars of base64url.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit.

### Task 7: Leader pages for posts

**Files:** Create `src/views/volLeader.ts`, `test/volLeaderRoutes.test.ts`. Modify
`src/volRoutes.ts`, `src/views/layout.ts` (optional `head` string param).

**Routes** (all `requireAuth()`, ward from `:wardId`, every handler checks `volAccess` first;
deny → 403, wrong ward or missing → 404):
- `GET /w/:wardId/vol/new?space=<id>` + `POST /w/:wardId/vol` — `canManageOrg`. Form: org
  (only orgs the user can manage), title, public note, private details, cancel cutoff hours
  (default 24, help text "after this, cancelling still works but you get an urgent email"),
  first date + start time. Redirects to the manage page.
- `GET /w/:wardId/vol/:postId` — `canViewPost`. Shows the public link
  (`${APP_URL}/v/<public_id>`) with a copy box, the cutoff, each date and role with
  "n of m filled · k waiting", and per role the volunteers: name, email, bringing, status
  (`waiting for address confirmation` / `waiting for approval` / confirmed / over the limit).
  Private details shown. Edit controls only when `canEditPost`.
- `POST` (all `canEditPost`): `/w/:wardId/vol/:postId` (edit post), `/date`,
  `/date/:dateId` (edit), `/date/:dateId/copy`, `/date/:dateId/delete`, `/date/:dateId/role`,
  `/role/:roleId`, `/role/:roleId/delete`, `/delete` (whole post, with a confirm page first),
  `/copy` (`newFirstDate`). Handlers `deliver()` returned messages via `executionCtx.waitUntil`.

- [ ] **Step 1: Failing tests** (via `SELF.fetch` with a session cookie made by
  `signToken({ uid, exp }, SESSION_SECRET)`; add `asUser(userId)` to `test/helpers.ts`):
  eqTeacher GET manage page → 200 with no edit forms; eqTeacher POST edit → 403; wmLeader GET
  → 403; a post id from another ward under this ward's URL → 404; eqPres creates a post via
  POST → 302 to the manage page and the row exists with `space_id` = EQ; eqPres creating for
  the RS space → 403.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Typecheck. Commit.

### Task 8: Public post page

**Files:** Create `src/views/volPublic.ts`, `test/volPublic.test.ts`. Modify `src/volRoutes.ts`.

**Route:** `GET /v/:publicId` (no auth). Unknown id → the existing not-found page, 404.
Renders the spec §6.1 layout: org · title, public note (`mdLite`), each date (`formatWhen`),
"address emailed once you're confirmed" when private details are set, an overall bar
`"7 of 10 filled · 3 waiting"` (over-filled shows `"12 of 10 filled"`), and per role: name,
`confirmed of needed`, the role note, and either a sign-up form (name, email, "what are you
bringing?" when `bring_prompt` is set, Turnstile widget) or `Filled ✓`. Past posts show
"This opportunity is over" and no forms. A footer link to `/vol/<prefix>/me` ("My sign-ups").
Head: `og:title` = `<org> · <title>`, `og:description` = `"<confirmed> of <needed> filled"`
plus the first 150 chars of the public note, `og:type=website`, `noindex` meta and header.

- [ ] **Step 1: Failing tests:** with one confirmed volunteer named `Zed Unique` with
  `bringing: 'lasagna'` and private details `Door code 4242`: the page contains `lasagna`
  (spec item 8: what's being brought is public) and `1 of 2`, and does **not** contain
  `Zed Unique`, the volunteer's email, or `4242`; a full role shows `Filled ✓` and no form for
  that role; `X-Robots-Tag: noindex` header present; `og:title` present; a past post has no
  `<form`.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit.

### Task 9: Sign-up engine

**Files:** Create `src/lib/volSignup.ts`, `src/lib/volRate.ts`, `src/lib/volSession.ts`
(token parts only; cookie in Task 12), `test/volSignup.test.ts`.

**Interfaces (produces):**
```ts
type SubmitResult = 'confirmed' | 'confirmed_over' | 'waiting_verify' | 'waiting_approval'
  | 'declined_email' | 'role_full' | 'already_signed' | 'closed' | 'rate_limited';
submitSignup(env, o: { wardId: string; postId: string; roleId: string; name: string; email: string; bringing: string | null; now: Date }): Promise<Outcome<SubmitResult>>
verifyAddress(env, token: string, now: Date): Promise<Outcome<'verified' | 'invalid'>>
approveVolunteer(env, wardId, volunteerId, byUserId, now: Date): Promise<Outcome<void>>
declineVolunteer(env, wardId, volunteerId, byUserId, now: Date): Promise<Outcome<void>>
undoDecline(env, wardId, volunteerId, byUserId): Promise<void>       // declined → 'pending' if verified, else 'none'
revokeApproval(env, wardId, volunteerId, byUserId, now: Date): Promise<Outcome<void>>
// volRate.ts
hitLimit(env, wardId, bucket: string, max: number, windowMinutes: number, now: Date): Promise<boolean> // records the event; true = over the limit
// volSession.ts
makeLinkToken(env, p: { typ: 'vacc' | 'vcan' | 'vwd'; wardId: string; id: string; days?: number }): Promise<string>
readLinkToken(env, typ, token): Promise<{ wardId: string; id: string } | null>   // checks typ + exp
```
Rules (spec §6.3, items 17–19):
1. Role must belong to `postId` in `wardId`, and its date must not be over → else `'closed'`.
2. Email trimmed + lowercased; must match a simple `x@y.z` shape; name 1–80 chars.
3. Volunteer row by `(ward, email)`; create with `approval='none'` if missing. If the email is a
   `users.email` with a `ward_memberships` row in this ward → set `approval='approved'` and
   `email_verified_at` now (spec §6.3 step 8). Never overwrite an existing volunteer's name.
4. `declined` → `'declined_email'`, no sign-up, no email.
5. Already a `waiting`/`confirmed` sign-up on this role → `'already_signed'`, nothing sent.
6. Role already full → `'role_full'` for everyone, approved or not (the button was closed; this
   is the stale-page case). Over-filling happens only through rules 7 (race) and 11 (late
   approval), per spec §6.3 steps 6 and 9.
7. Approved → insert `confirmed` (`confirmed_at = now`), then compute over-limit: this sign-up
   is over if, ordering the role's confirmed sign-ups by `confirmed_at, id`, its rank > needed;
   set `over_limit=1` → `'confirmed_over'` else `'confirmed'`. Message: `signupConfirmed`
   (with `overLimit`). If every role of the post is now full and `full_notified_at` is null →
   `approverFilled` to `approverEmails`, set `full_notified_at`.
8. `approval='none'` → insert `waiting`; if `hitLimit(ward, 'verify:'+email, 3, 1440)` is false,
   create a `vol_tokens` row (store SHA-256 of a `randomToken(24)`, 72h expiry) and send
   `verifyEmail`; `'waiting_verify'` either way (don't reveal the limit). Also
   `hitLimit(ward, 'newsignup:'+postId, 60, 60)` over → `'rate_limited'` before inserting.
9. `approval='pending'` → insert `waiting`; `approverWaiting` to this post's approvers;
   `'waiting_approval'`.
10. `verifyAddress`: token hash found, unused, unexpired → mark used, set `email_verified_at`;
    if still `none` → `pending` (or `approved` if now a ward member); `approverWaiting` to the
    deduplicated approvers of every post where they have a waiting sign-up. Else `'invalid'`.
11. `approveVolunteer`: `approval='approved'`; every `waiting` sign-up whose date isn't over →
    `confirmed` in `created_at` order with over-limit computed as in 7; one `approved` email
    listing them (with private details and cancel links), plus `signupConfirmed(overLimit)`
    content folded in for over ones; `approverFilled` where a post becomes full.
12. `declineVolunteer`: `approval='declined'`, waiting → `declined`, one `declined` email.
13. `revokeApproval`: `approval='declined'`; upcoming `confirmed` sign-ups → `removed` with
    `approverCancelled` to their posts' approvers (slots reopen).
14. A `full_notified_at` is reset to null whenever the post drops below full (Tasks 9, 11).

- [ ] **Step 1: Failing tests** (call the functions directly with a fixed `now`): new email →
  `waiting_verify`, one `vol_verify` message, waiting count 1, confirmed 0; verify → approvers
  get one `approver_waiting` each (creator who is also editor gets one); approve → sign-up
  confirmed and an `approved` message whose HTML contains the private details; ward-member
  email → `confirmed` immediately; declined email → `declined_email`, zero messages;
  double submit same role → second is `already_signed`; role needs 1, two approved people:
  first `confirmed`, second blocked with `role_full`; role needs 1 with one waiting and one
  approved-confirmed, then approve the waiting one → it's confirmed with `over_limit=1` and its
  message has the withdraw paragraph; filling the last spot sends `approver_filled` exactly
  once even if a second over-limit sign-up arrives; 4th verify email to the same address in
  24h is not sent; role id from another post → `closed`; `readLinkToken('vcan', vaccToken)` →
  null; expired token → null.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit.

### Task 10: Public sign-up routes, verification, approvals UI

**Files:** Create `src/lib/turnstile.ts`. Modify `src/volRoutes.ts`, `src/views/volPublic.ts`,
`src/views/volLeader.ts`, `src/types.ts` (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`),
`wrangler.toml` (`TURNSTILE_SITE_KEY` in `[vars]` = Cloudflare's always-pass test site key,
with a comment that the owner replaces it at deploy), `.dev.vars.example`. Test:
`test/volPublicRoutes.test.ts`.

**Interfaces:**
- `verifyTurnstile(env, token: string, ip: string | null): Promise<boolean>` — POST to
  `https://challenges.cloudflare.com/turnstile/v0/siteverify`; missing secret or token → false.
- `POST /v/:publicId/signup` — Turnstile first (fail → re-render page with an error, 400);
  `hitLimit(ward, 'ip:'+CF-Connecting-IP, 20, 60)`; then `submitSignup`; `deliver` the
  messages; render a result page per `SubmitResult`. Result copy: `confirmed` → "You're signed
  up. We've emailed you the details and a link to cancel." `confirmed_over` → adds "This role
  is already full, so we've emailed you a link to withdraw if you'd like." `waiting_verify` →
  "Check your email to confirm your address." `waiting_approval` → "Thanks — a leader will
  confirm you shortly." `declined_email` → "Please contact your ward's leaders." None of them
  shows names or private details.
- `GET /vol/verify/:token` → page with a "Confirm my address" button; `POST` → `verifyAddress`.
- Approvals: on the manage page, each `waiting` volunteer whose address is verified gets
  Approve / Decline buttons → `POST /w/:wardId/vol/volunteer/:volunteerId/approve|decline`
  (guard `canApproveVolunteer`).
- `GET /w/:wardId/volunteers` (guard `canSeeWardVolunteers`): pending, approved, declined lists
  with Undo decline / Revoke approval buttons (POST `/undo-decline`, `/revoke`).

- [ ] **Step 1: Failing tests:** POST signup with Turnstile token `'fail'` → 400, no sign-up
  row; with an approved member's email → 200, body lacks the private details and every
  volunteer name on the post; `role_id` of a different post → 404 or the `closed` page, no row;
  GET `/vol/verify/<valid>` twice → volunteer still `approval='none'` (GET changes nothing);
  POST it → `pending`; eqTeacher POST approve → 403; eqPres approve → 302 and confirmed;
  non-bishopric GET `/w/:wardId/volunteers` → 403.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Typecheck. Commit.

### Task 11: Cancel, withdraw, remove

**Files:** Modify `src/lib/volSignup.ts`, `src/volRoutes.ts`, views. Test `test/volCancel.test.ts`.

**Interfaces (produces):**
```ts
cancelSignup(env, wardId, signupId, now: Date): Promise<Outcome<'cancelled' | 'already' | 'not_found'>>
withdrawOffer(env, wardId, signupId, now: Date): Promise<Outcome<'withdrawn' | 'already' | 'not_found'>>
removeSignup(env, wardId, signupId, byUserId, now: Date): Promise<Outcome<'removed' | 'already' | 'not_found'>>
cutoffInstant(post, date, role): Date   // localToUtc(date.date, roleStart, tz) − cancel_cutoff_hours
```
- Cancel a `confirmed` sign-up: status `cancelled`, `ended_at = now`. Approvers get
  `approverCancelled({ urgent: now >= cutoffInstant, stillFull })`. Cancel a `waiting`
  sign-up: status `cancelled`, no approver email (it never counted).
- Withdraw: allowed only on `confirmed` + `over_limit=1`. If the role is still full afterwards,
  no email to anyone (spec §6.3 step 6); otherwise behave like cancel.
- Leader remove (`canEditPost` on the sign-up's post): `removed`, `signupRemoved` to the
  volunteer, and no approver email.
- Repeating any of these → `'already'`, no messages.
- Routes: `GET /vol/cancel/:token` and `GET /vol/withdraw/:token` show what will happen and a
  button; the `POST` does it. Tokens from `makeLinkToken('vcan'|'vwd')` are valid until the
  sign-up's date is over (checked against the sign-up, not only `exp`). Leader remove:
  `POST /w/:wardId/vol/signup/:signupId/remove`.

- [ ] **Step 1: Failing tests:** cancel 30h before start with cutoff 24 → `urgent:false`; 10h
  before → `urgent:true`; over-filled role (3 of 2) cancel → `stillFull:true`; cancel twice →
  second `'already'`, messages empty; withdraw on a non-over sign-up → `'not_found'`; withdraw
  on an over one with the role still full → zero messages; a role at 1:30 AM on 2026-11-01
  (DST end) with cutoff 24 computes without NaN; GET cancel page leaves the row `confirmed`;
  a `vcan` token for a ward-B sign-up posted to ward A's data → not found; eqTeacher remove →
  403.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit.

### Task 12: Volunteer session and My sign-ups

**Files:** Modify `src/lib/volSession.ts`. Create `src/views/volMine.ts`,
`test/volMine.test.ts`. Modify `src/volRoutes.ts`.

**Interfaces (produces):**
- Cookie `wardest_vol` = `signToken({ typ: 'vsess', vid, wid, exp }, SESSION_SECRET)`, 14 days,
  httpOnly, SameSite=Lax, secure on https. Separate from `wardest_session`; never grants
  anything on `/w/*`.
- `getVolunteerSession(c): Promise<{ volunteer: VolunteerRow; ward } | null>` — re-reads the
  volunteer every request; null unless `email_verified_at` is set and `approval` ≠ `declined`.
- `GET /vol/:prefix/me` — signed in: lists upcoming and past sign-ups (post title, org,
  `formatWhen`, role, status, bringing), each upcoming one with a Cancel button that POSTs to
  `/vol/:prefix/me/cancel/:signupId` (the sign-up must belong to the session's volunteer and
  ward, else 404; then `cancelSignup`). For an `approved` volunteer and a post that isn't
  over: the post's private details and the names of the other confirmed volunteers on that
  post. "Other ways to serve" (approved only): every other open post in the ward with only
  `confirmed of needed` and a link to `/v/<public_id>`. Signed out: an email box.
- `POST /vol/:prefix/me/link` (Turnstile + `hitLimit('access:'+email, 3, 1440)`): if a
  verified, non-declined volunteer exists for that ward and email, send `accessLink` with
  `makeLinkToken('vacc', 30 days)`; always show the same "If that address has sign-ups here,
  we've emailed a link" page.
- `GET /vol/access/:token` → sets the cookie, redirects to `/vol/:prefix/me`. (Sets a cookie
  only; it changes no data, so a GET is fine.)
- `signupConfirmed`, `approved` and `reminder` emails carry a fresh `vacc` link.

- [ ] **Step 1: Failing tests:** signed-out My sign-ups shows the form only; access link for
  volunteer A shows A's sign-ups, never B's; a pending (verified, unapproved) volunteer sees
  their sign-up as "waiting for approval" with no private details and no "Other ways to
  serve"; an approved volunteer sees private details for an upcoming post, not for a past one;
  other posts show counts only (no names, no private details); `/me/link` for an unknown email
  returns the same text and sends nothing; a `wardest_vol` cookie on `/w/:wardId` → still
  redirected to Google sign-in; a revoked (declined) volunteer's cookie → signed-out view;
  A's session POSTing `/vol/:prefix/me/cancel/<B's sign-up id>` → 404 and B's row unchanged.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit.

### Task 13: Ward council and organization sections

**Files:** Modify `src/app.ts` (space page route), `src/views/spaceportal.ts`,
`src/views/volLeader.ts`. Test `test/volSections.test.ts`.

- Space page section "Volunteer posts" (spec §6.7), rendered beside blocks and tasks:
  - `ward_council` and `bishopric` spaces: every open post in the ward the viewer
    `canViewPost`, grouped by organization, each with a fill bar, `confirmed of needed`,
    `· k waiting`, first date, and a "Short and soon" highlight (`short_soon`) listed first.
  - `org` spaces: that organization's posts only, plus "New volunteer post" when
    `canManageOrg`.
  - A collapsed "Past" list (`listWardPosts(..., past: true)`), each with "Copy as new post"
    (asks for the new first date → `POST /w/:wardId/vol/:postId/copy`) for users who
    `canManageOrg` on that org.
- Every row links to the manage page `/w/:wardId/vol/:postId`.

- [ ] **Step 1: Failing tests:** rsPres on the Ward Council space page sees the EQ post's
  title; wmLeader (not in ward council) on the Ward Mission page doesn't see the EQ post; a post
  10 days out and short is marked short-and-soon, one 20 days out isn't; a past post appears
  under Past only.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit.

### Task 14: Cron — reminders, approval nudge, lapse

**Files:** Create `src/lib/volCron.ts`, `test/volCron.test.ts`. Modify `src/index.ts` (add
`scheduled(controller, env, ctx)` → `ctx.waitUntil(runVolunteerCron(env, new
Date(controller.scheduledTime)))`), `wrangler.toml` (`[triggers] crons = ["0 * * * *"]`).

**Interface:** `runVolunteerCron(env, now: Date): Promise<{ reminders: number; nudges: number; lapsed: number }>`
— builds all messages, delivers them, returns counts. Per ward, in its time zone:
- **Reminder:** `confirmed`, `reminded_at IS NULL`, the sign-up's date = ward-today + 1, and
  `wardHour >= 9` → `reminder` (private details, other volunteers' names, cancel link, My
  sign-ups link; `discordText` set) and set `reminded_at`.
- **48h nudge:** for each date whose earliest role start is within the next 48h and
  `approval_nudged_at IS NULL`, if any `waiting` sign-up on it belongs to a volunteer with
  `approval='pending'` → `approverNudge48h` to the post's approvers; set `approval_nudged_at`.
- **Lapse:** `waiting` sign-ups whose date is over → `lapsed` (spec item 17: not before).
- **Cleanup:** delete `vol_rate_events` older than 2 days and `vol_tokens` expired more than
  7 days ago.

- [ ] **Step 1: Failing tests:** sign-up on 2026-12-06, ward Denver: run at
  `2026-12-05T15:00Z` (08:00 local) → 0 reminders; at `16:00Z` (09:00) → 1; again at `17:00Z`
  → 0; a waiting sign-up for 2026-12-06 is not lapsed at `2026-12-07T06:30Z` (23:30 local) and
  is lapsed at `07:30Z`; nudge fires once for a pending volunteer 40h out and not for an
  unverified (`approval='none'`) one; a ward in `America/New_York` gets its reminder at 14:00Z.
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS.
- [ ] **Step 3:** Local check: `npx wrangler dev --test-scheduled`, then
  `curl "http://localhost:8787/__scheduled?cron=0+*+*+*+*"` → 200, counts logged. Commit.

### Task 15: Discord connect and DM delivery

**Files:** Modify `src/lib/discord.ts`, `src/lib/volMessages.ts`, `src/volRoutes.ts`,
`src/views/volMine.ts`. Test `test/discordConnect.test.ts`.

**Interfaces (produces):**
- `discordAuthorizeUrl(env, state: string): string` — `https://discord.com/oauth2/authorize`
  with `client_id`, `response_type=code`, `scope=identify`, `redirect_uri=${APP_URL}/vol/discord/callback`, `state`.
- `exchangeDiscordCode(env, code: string): Promise<string | null>` — POST
  `https://discord.com/api/v10/oauth2/token`, then `GET /users/@me` → the user id.
- `GET /vol/discord/connect` (volunteer session required, approved only): sets a 10-minute
  signed state cookie, redirects to Discord. `GET /vol/discord/callback`: state must match the
  cookie and the current volunteer; stores `discord_user_id`; redirects to My sign-ups with
  "Discord connected". `POST /vol/discord/disconnect` clears it. My sign-ups shows Connect /
  Connected · Disconnect, and a line that the ward's Discord server must have the Wardest bot.
- `deliver()`: after the email, if `msg.discordText` and `msg.volunteerId` and the volunteer is
  `approved` with a `discord_user_id`, call `sendDiscordDm`; a `'no_dm'`/`'error'` result is
  logged, never thrown, and email has already gone (spec §6.9).

- [ ] **Step 1: Failing tests:** callback with a mismatched state → 400, nothing stored;
  matching state → `discord_user_id` stored from the mocked `/users/@me`; `deliver` of a
  reminder for a connected approved volunteer → one Resend call + the two Discord calls; for a
  connected but declined volunteer → no Discord calls; Discord `50007` → email still sent, no
  throw; a pending volunteer can't start connect (403).
- [ ] **Step 2:** Run → FAIL. Implement. Run → PASS. Commit.
- [ ] **Step 3: Owner step for end-to-end.** Needs Sam's Discord application (bot token,
  client id/secret, redirect `http://localhost:8787/vol/discord/callback` added) and the bot in
  a test server. If the secrets aren't in `.dev.vars`, report under "Not done / unverified".

### Task 16: Docs and full local walk-through

**Files:** Modify `CLAUDE.md` (status line + a "Volunteer sign-ups" bullet under Surfaces /
Architecture: routes, cron, Turnstile, Discord), `IMPLEMENTATION.md` §10 (new roadmap item:
built, local-verified; owner steps: Turnstile widget for `app.wardest.com`, Discord
application + secrets, Resend daily-limit check before a second ward), `.dev.vars.example`
(all new names with placeholders), `BLUEPRINT.md` only if behavior diverges.

- [ ] **Step 1:** `npm test` → all pass; `npm run typecheck` → clean.
- [ ] **Step 2:** Fresh local DB (`--persist-to` a scratch dir, schema + `seed-m44.sql`), `npm
  run dev` with `RESEND_API_KEY=dev` so emails print to the console. Walk the spec's four
  shapes using `/auth/dev-login`: EQ president makes a "move" post (1 date, 1 role, 10); RS
  makes meals (3 dates via Copy date, 1 each, with a bring prompt); a new email signs up →
  console verify link → confirm → EQ president approves → confirmation printed with private
  details; a second approved person takes a full role via a stale page → `role_full`; cancel
  after the cutoff → urgent approver email printed; Ward Council page lists the post with its
  bar; public page shows no names; run the scheduled endpoint. Record what you saw.
- [ ] **Step 3:** Commit `Volunteer sign-ups: docs + local verification`.

---

## Verification command (whole plan)

From the worktree: `npm test && npm run typecheck`.

## Hand checks for Sam (after review passes; relayed by the coordinator)

Local only, at `http://localhost:8787`: create a post as a president, open its public link in
a private window and sign up with a personal email, confirm, approve, cancel; look at the Ward
Council page. Discord end-to-end only after the owner step in Task 4.
