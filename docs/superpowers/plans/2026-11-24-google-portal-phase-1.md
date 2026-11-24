# Google-only volunteer portal, phase 1 — Implementation Plan

> **For agentic workers:** this plan is run by the orchestrator skill (one implementer for the
> whole plan, then one reviewer). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship phase 1 of the Google-only portal: request forms routed into private request
sheets (detail-free notices, 30-day purge, monthly rotation), and simple volunteer sign-ups
(leader page to create and publish opportunities, public serve/post pages, sign-up with a
confirmation email and cancel link, day-before reminder, leader cancel notices), plus the hub
sections and a click-by-click setup guide.

**Architecture:** One Apps Script project bound to the Service Sheet, written as plain JS files in
`google-portal/apps-script/` and concatenated by `google-portal/build.mjs` into ONE paste-ready
`google-portal/dist/Code.gs` (with every page embedded as a string) plus
`google-portal/dist/appsscript.json`. The same page files are served two ways from one renderer:
as hub files the ward copies into its GitHub Pages hub (they `fetch` the web app), and by the
script itself through `HtmlService` as the fallback (they use `google.script.run`). All Google
calls that tests must fake go through `platform.js`; everything else is pure and tested under
Vitest in Node by loading the source files into a `vm` context with in-memory fakes.

**Tech Stack:** Google Apps Script (V8), SpreadsheetApp, FormApp, DriveApp + Drive advanced
service v3, MailApp, LockService, CacheService, PropertiesService, HtmlService, ContentService;
plain HTML/CSS/JS pages (no framework, no build step for the ward); Node 20+ for `build.mjs`;
Vitest 5 (Node environment) for tests.

**Spec:** `docs/superpowers/specs/2026-11-24-google-only-alternative-design.md` (approved).
Phase 1 scope is its §10 "Phase 1"; everything in its §10 "Phase 2" and "Later" is out of scope
here except where a phase 1 piece needs a column or tab to exist (tabs are created complete so
phase 2 adds no migration).

**Why paste, not clasp:** Sam does every Google step himself in a browser and wants no CLI. Two
pastes (`appsscript.json`, `Code.gs`) beat a dozen files; the build check keeps `dist/` honest.

## Global Constraints

- Nothing in `src/`, `db/`, `content/`, `templates/` changes. `npm test && npm run typecheck`
  stay green. Never run more than 2 `npm test` processes at once.
- Everything lives under `google-portal/`. Commit on branch `claude/google-portal-db7cee` only;
  never push or merge.
- No real member data anywhere (code, tests, sample rows, guide). Invented ward
  "Riverbend 1st Ward (example)", prefix `rb1`, invented people (e.g. "Sister Example",
  "Brother Sample", `sister.example@example.test`). No real account addresses in any file; the
  guide says "the bishopric's shared account", never an address.
- No Church name as branding, no Church symbols. Page footer text, verbatim:
  `This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.`
  Email footer text, verbatim:
  `This email comes from an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.`
  Form description footer: same sentence beginning `This form is an independent tool…`.
  Each is followed by `Contact: <contact_email from Settings>` when set.
- Gemini rule (spec §8.1), verbatim in the Read me tab and the guide: `Do not ask Gemini to read, summarize or draft from the Service Sheet, the request sheets or request notices.`
- Public answers (api `serve`, `post`, `help`, `tokenInfo`) never contain a volunteer's name or
  email, private details, or request contents.
- Every email goes to exactly one recipient (one `MailApp.sendEmail` per address), with
  `replyTo` = Settings contact email and `name` = `<ward_name> Service`.
- Tokens and leader links: random (≥ 128 bits), stored only as SHA-256 hex in the System Sheet,
  carried after `#` in page addresses, sent to the script only in POST bodies.
- Every write to a sheet goes through `store.js`, which (a) finds columns by header name and
  (b) neutralizes formula injection: a string starting with `=`, `+`, `-` or `@` is written with a
  leading `'`.
- Every read-modify-write of Posts/Slots/Sign-ups/Tokens runs inside
  `LockService.getScriptLock()` (wait up to 10 s; on timeout answer "Busy, please try again").
- Dates are stored as text `YYYY-MM-DD`, times as text `HH:mm` (24 h), local date-times as
  `YYYY-MM-DD HH:mm`, all in the ward's time zone (Settings `time_zone`). Those columns get
  number format `@` so Sheets never converts them. A cell that comes back as a `Date` anyway is
  normalized by `util.js`.
- Email budget (spec §7): reserve default 30; a message that would take the remaining quota to
  the reserve or below is queued in the Outbox (priority `high` messages may use the reserve).
- Abuse limits (spec §7.3, phase 1 values): 3 sign-up emails per address per day; Settings
  `signup_limit_per_day` (default 40) sign-ups per day in total; 10 sign-ups per minute per post;
  3 leader-link requests per address per day. Past a limit: `Too many sign-ups right now. Please try again later or contact <contact_email>.`
- Audiences, exactly: `Brothers`, `Sisters`, `Youth`, `Children`.

## Phase 1 decisions the spec left open (the reviewer checks these, not against the spec)

1. **Private details in phase 1** (no first-time approval yet): never in the confirmation email
   or on any page. They go out in the day-before reminder, so leaders have until then to remove
   anyone they don't recognize; the leader page says so above each sign-up list. A sign-up made
   after its reminder ran gets none automatically; the leader page shows "Details not sent" with
   a **Send details** button. Phase 2 replaces this with "confirmed and approved only".
2. **Full roles refuse new sign-ups** (phase 1 has no waiting state, and the lock makes the check
   exact). Phase 2 brings over-limit sign-ups with withdraw.
3. **Past posts stay in the Posts tab with status `Past`** instead of moving to a separate tab
   (moving rows breaks id lookups; the Sheet's filter shows them).
4. **One request folder per request category** ("Requests – Moving" …) instead of per group.
5. **Leader roles are four checkbox columns** (Bishopric, Ward council, Org editor, Coordinator)
   instead of one text cell, so the bishopric can't mistype them.
6. **Administrators** for alert emails = Leaders whose Calling is `Bishop` or
   `Executive Secretary` (case-insensitive).
7. **Hub files are generated by the script** (menu Make hub files) into a Drive folder, with the
   ward name, web app address, preview title and contact already filled in. The hub owner
   downloads and uploads them; nobody edits HTML by hand.

## Review Focus

1. A public sign-up whose name is `=IMPORTXML("http://x","//a")` or `+1-555`: stored as text,
   never a formula. Test in Task 2 and Task 6.
2. An org editor's leader link asking for another organization's post or its names, or saving
   one: refused, and the serve feed never leaks names. Tests in Task 6 and Task 7.
3. A leader removed from the Leaders tab (or whose email changed) using an old link: refused at
   once. Test in Task 5.
4. Sheets turning `2026-12-03` / `08:00` into Date objects: the reader normalizes back to text,
   and a slot at 00:30 or a 23:30 cutoff computes correctly. Tests in Task 1 and Task 3.
5. The email quota at the reserve with reminders due: reminders (high) still go, confirmations
   queue and go out on the next 10-minute run in order. Test in Task 4.

---

## File structure

```
google-portal/
  README.md                       what this folder is, how to rebuild, where the guide is
  SETUP-GUIDE.md                  Exec Sec guide, phase 1 (Task 12)
  LEADER-GUIDE.md                 one page for leaders using the leader page (Task 12)
  build.mjs                       concatenates sources + embeds pages → dist/ ; --check mode
  vitest.config.mjs               Node environment, include google-portal/test/**/*.test.mjs
  apps-script/
    appsscript.json               manifest (V8, Drive v3, webapp USER_DEPLOYING/ANYONE_ANONYMOUS)
    00-config.js                  tab names, headers, statuses, texts, defaults
    01-platform.js                every Google call tests fake: now, tokens, hash, lock, cache, props, mail
    02-util.js                    pure: dates, text, escape, sanitizeCell, ids
    03-store.js                   Table: header-mapped read/append/update over a sheet
    04-rules.js                   pure volunteer rules: validation, counts, sign-up checks, cutoff, reminders, permissions
    05-requests-rules.js          pure request + sharing rules: readers, purge, carry, sharingDiff
    06-mail.js                    templates, footer, outbox, quota reserve
    07-tokens.js                  cancel tokens, leader links
    08-api-public.js              serve, post, help, signup, tokenInfo, cancel, requestLeaderLink
    09-api-leader.js              whoami, listPosts, getPost, savePost, removeSignup, sendDetails, signOutEverywhere
    10-web.js                     doGet, doPost, gpApi, page rendering (fallback + hub files)
    11-requests.js                forms, onRequestSubmit, notices, closed-on, purge, rotation
    12-setup.js                   menu, Set up, Sync sharing, Install triggers, Check health, Make hub files, Send leader links
    13-jobs.js                    gpTenMinute, gpHourly, gpDaily
  pages/
    gp.css  gp.js                 shared look and client code (inlined into each page by build)
    serve.html post.html help.html confirm.html leader.html
    hub-sections.html             snippet: the two hub sections
  dist/
    Code.gs  appsscript.json      GENERATED, committed; what Sam pastes
  test/
    harness.mjs                   loads sources into vm with fakes; seed helpers
    fakes.mjs                     in-memory Spreadsheet/Sheet/Range, MailApp, Lock, Cache, Props, Form, Drive
    *.test.mjs
```

Root changes: `package.json` scripts `gp:build`, `gp:build:check`, `gp:test`, and `test` becomes
`vitest run && vitest run --config google-portal/vitest.config.mjs` (sequential: one process at a
time). `vitest.config.ts` adds `'google-portal/**'` to `exclude` (the Workers pool can't run
`vm`). `CLAUDE.md` gets a short "Google-only portal" section (Task 12).

---

### Task 1: Scaffolding, build, harness, pure utilities

**Files:**
- Create: `google-portal/build.mjs`, `google-portal/vitest.config.mjs`,
  `google-portal/apps-script/appsscript.json`, `00-config.js`, `01-platform.js`, `02-util.js`,
  `google-portal/test/harness.mjs`, `google-portal/test/fakes.mjs`,
  `google-portal/test/util.test.mjs`, `google-portal/test/build.test.mjs`
- Modify: `package.json` (scripts), `vitest.config.ts` (exclude `google-portal/**`)

**Interfaces:**
- Produces (build): `build.mjs` exports `SOURCE_ORDER` (array of `apps-script/*.js` names, numeric
  order), `PAGE_NAMES` (`['serve','post','help','confirm','leader']`), `buildCode(): string`,
  `buildManifest(): string`. Run as `node google-portal/build.mjs` writes `dist/`; with
  `--check` exits 1 and prints the stale file when `dist/` differs. Pages: `<!-- GP:CSS -->` and
  `<!-- GP:JS -->` in each page are replaced by `<style>`/`<script>` with `gp.css`/`gp.js`; the
  result is emitted as `var GP_PAGES = {serve: "...", ...};` (JSON-encoded) at the end of
  `Code.gs`. `Code.gs` starts with a comment: generated file, do not edit, how to update.
- Produces (harness): `loadPortal(opts?) → ctx` where `ctx` is the vm context with every
  top-level function from `SOURCE_ORDER` plus `ctx.fakes` (`spreadsheet`, `system`, `mail`,
  `props`, `cache`, `forms`, `drive`, `setNow(local: string)`, `setQuota(n)`). `opts.seed` runs
  `gpEnsureTabs_()` (Task 2) and fills Settings and Leaders with the Riverbend example rows.
- Produces (platform, `01-platform.js`): `nowLocal_(): string` ('YYYY-MM-DD HH:mm' in
  Settings time zone), `newToken_(): string` (64 hex chars from two `Utilities.getUuid()` digests),
  `sha256Hex_(s: string): string`, `withLock_(fn)`, `cache_()`, `props_()`,
  `mailQuota_(): number`, `sendMailNow_({to, subject, html, text})`. Fakes replace these
  services, not these functions.
- Produces (util, pure): `isDateStr(s)`, `isTimeStr(s)`, `normDate(v)` / `normTime(v)` (accept
  text or `Date`, return text or `''`), `addDays(dateStr, n)`, `weekday(dateStr) → 0..6`,
  `localMinusHours(localDT, h)`, `cmpLocal(a, b)`, `sanitizeCell(v)`, `esc(s)` (HTML),
  `isEmail(s)`, `normEmail(s)` (trim, lower), `newId_(prefix)` (prefix + 10 base32 chars from a
  token), `clip(s, n)`.

- [ ] **Step 1: Write failing tests** `util.test.mjs`:
  `sanitizeCell('=IMPORTXML("x")') === "'=IMPORTXML(\"x\")"`, same for `+1-555`, `-2`, `@a`;
  `sanitizeCell('Sister Example') === 'Sister Example'`; `sanitizeCell(7) === 7`.
  `normDate(new Date(2026,11,3)) === '2026-12-03'`; `normTime(new Date(1899,11,30,8,0)) === '08:00'`
  (Sheets' time-only epoch); `normDate('2026-02-30') === ''`.
  `addDays('2026-12-31', 1) === '2027-01-01'`; `localMinusHours('2026-12-03 00:30', 24) === '2026-12-02 00:30'`;
  `localMinusHours('2026-12-03 08:00', 9) === '2026-12-02 23:00'`.
  `esc('<b>"&\'') === '&lt;b&gt;&quot;&amp;&#39;'`. `isEmail('a@b.test')`, `!isEmail('a@b')`.
  `build.test.mjs`: `buildCode()` equals `dist/Code.gs` on disk (stale dist fails `npm test`);
  `buildCode()` contains `var GP_PAGES` with one key per `PAGE_NAMES`; no page string contains
  `<!-- GP:`.
- [ ] **Step 2:** `npx vitest run --config google-portal/vitest.config.mjs` → FAIL.
- [ ] **Step 3:** Implement the files above. Manifest: `runtimeVersion: "V8"`,
  `timeZone: "America/Denver"` (the guide tells Sam to set the ward's), `exceptionLogging:
  "STACKDRIVER"`, `dependencies.enabledAdvancedServices: [{userSymbol: "Drive", serviceId:
  "drive", version: "v3"}]`, `webapp: {executeAs: "USER_DEPLOYING", access: "ANYONE_ANONYMOUS"}`.
  `00-config.js` holds every tab name, header list, status value, footer text and default named
  in Tasks 2–13 (one place). Fakes: a Sheet is a 2D array; implement only `getName, getLastRow,
  getLastColumn, getRange(r,c,nr,nc){getValues,setValues,setNumberFormat,setDataValidation,
  setValue,getValue,insertCheckboxes}, appendRow, deleteRow, setFrozenRows, protect,
  getProtections, hideSheet` and Spreadsheet `getSheetByName, insertSheet, getSheets, getId,
  getUrl, getName`. Any other Google call in setup code may be a recording no-op (Proxy).
- [ ] **Step 4:** Run `node google-portal/build.mjs` then the gp tests → PASS. Then `npm test && npm run typecheck` → PASS.
- [ ] **Step 5: Commit** `google-portal: scaffolding, build, harness, utilities`.

### Task 2: Tables (store) and the Service Sheet layout

**Files:** Create `apps-script/03-store.js`, `test/store.test.mjs`. Modify `00-config.js`.

**Interfaces:**
- Produces: `table_(sheet) → {rows(): object[], find(col, value): object|null,
  append(obj): object, update(rowObj, changes): void, remove(rowObj): void, headers: string[]}`.
  Row objects carry a hidden `_row` (1-based sheet row). Values are keyed by header text.
  `append` fills unknown headers with `''`, sanitizes every string with `sanitizeCell`.
  `rows()` normalizes columns listed in `DATE_COLS`/`TIME_COLS`/`LOCAL_DT_COLS` (config).
- Produces: `gpEnsureTabs_(ss)` creates any missing tab, appends any missing header at the end
  (never reorders, never clears), freezes row 1, sets `@` format on date/time columns, adds
  checkboxes and dropdowns. `serviceTab_(name)` / `systemTab_(name)` return a `table_`.
- Service Sheet tabs and headers (exact; phase 2 columns created now and left blank):
  - `Read me`: text rows (purpose of each tab, the footer text, the Gemini rule, contact).
  - `Settings`: `Key | Value | Help`, rows for `ward_name, ward_prefix, time_zone, contact_email,
    hub_url, web_app_url, preview_image_url, serve_short_link, help_short_link, reminder_hour
    (18), default_cancel_cutoff_hours (24), email_reserve (30), signup_limit_per_day (40),
    organizations ("Bishopric, Elders Quorum, Relief Society, Young Men, Young Women, Primary,
    Sunday School, Ward Mission, Temple and Family History, Activities"), discord (off)`.
    `settings_()` returns an object with typed values and defaults.
  - `Leaders`: `Name | Email | Calling | Organization | Bishopric | Ward council | Org editor |
    Coordinator | Send leader link | Link sent` (the four role columns and Send leader link are
    checkboxes; Organization is a dropdown from Settings organizations).
  - `Categories`: `Id | Name | Icon | Kind | Owning organizations | Default audiences |
    Coordinators | Any ward council may create | Confidential | Warn hours | Also warn | Discord |
    Archived`. Seeded once (only when empty): requests `moving` 🚚 "Moving help" (owners Elders
    Quorum, Relief Society), `christmas` 🎄 "Christmas help" (Bishopric, Confidential),
    `other` 💬 "Other help" (Bishopric, Confidential); opportunities `meals` 🍲 Meals
    (Relief Society), `moving-help` 📦 Moving (Elders Quorum), `service-project` 🛠️ Service
    project, `activity` 🎉 Activity help, `temple` Temple and family history,
    `youth` Youth activity help, `children` Primary help, `other-service` Other service.
  - `Posts`: `Post id | Public id | Organization | Category | Title | Audiences | Public note |
    Private details | Cancel cutoff hours | Status | Created by | Created at | Last changed by |
    Last changed at`. Status ∈ `Draft, Open, Closed, Past`.
  - `Slots`: `Slot id | Post id | Date | Start | End | Role | Needed | Role note | Bringing prompt
    | Filled | Waiting`.
  - `Sign-ups`: `Sign-up id | Post id | Slot id | Email | Name | Child first name | Bringing |
    Status | Signed up at | Reminded at | Details sent at | Over limit | Removed by | Cancelled at`.
    Status (phase 1 uses) `Confirmed, Cancelled, Removed`.
  - `Volunteers`: `Email | Name | Status | Decided by | Decided at | First post` (phase 2).
  - `Needs help soon` (phase 2; created empty).
- System Sheet tabs: `Tokens` (`Hash | Kind | Subject | Expires | Created`), `Outbox` (`Id |
  Queued at | To | Subject | Html | Text | Priority | Status | Error`), `Log` (`At | What |
  Detail`), `Request files` (`Category id | Folder id | Form id | Sheet id | Month`).
  Script-written tabs (`Posts, Slots, Sign-ups, Volunteers, Needs help soon`) are protected so
  only the owner edits (done in Task 11's Sync sharing).

- [ ] **Step 1: Failing tests** `store.test.mjs`: `gpEnsureTabs_` on an empty spreadsheet makes
  every tab with the exact headers; run twice → identical (idempotent); a sheet with a missing
  header and an extra user column keeps the user column and gets the missing header appended at
  the end; `table_(posts).append({Title: '=HYPERLINK("x")'})` stores `'=HYPERLINK("x")`;
  columns are found by name after a user inserts a column in the middle; `rows()` turns a `Date`
  in `Date` into `'2026-12-03'`; Categories seeded once, not re-seeded after the user deletes a
  row; `settings_()` returns defaults for blank values and `organizations` as an array.
- [ ] **Step 2:** run gp tests → FAIL. **Step 3:** implement. **Step 4:** PASS.
- [ ] **Step 5: Commit** `google-portal: tables and the Service Sheet layout`.

### Task 3: Volunteer rules (pure)

**Files:** Create `apps-script/04-rules.js`, `test/rules.test.mjs`.

**Interfaces (all pure, plain objects keyed as in the tabs):**
- `validatePost(input, ctx) → {ok: true, post, slots} | {ok: false, errors: {field: message}}`.
  `input = {postId?, organization, category, title, audiences[], publicNote, privateDetails,
  cutoffHours, slots: [{slotId?, date, start, end, role, needed, roleNote, bringingPrompt}]}`;
  `ctx = {allowedOrgs[], categoryIds[], todayLocal, publish: boolean}`. Rules: title 1–100
  chars; organization in `allowedOrgs`; category in `categoryIds` (opportunity kind) or blank;
  audiences non-empty subset of the four; public note ≤ 2000; private details ≤ 1000; cutoff
  integer 0–168 (blank → Settings default, applied by the caller); 1–100 slots; each slot: valid
  date, start/end blank or `HH:mm`, end after start when both, role 1–60 chars, needed integer
  1–200, role note ≤ 300, bringing prompt ≤ 100; when `publish`, no slot date before
  `todayLocal`. Error keys: `title`, `organization`, `audiences`, `slots[3].needed`, … Messages
  are short and plain ("Pick at least one audience").
- `countsBySlot(signups) → {[slotId]: {filled, waiting}}` (filled = Confirmed; waiting = 0 in
  phase 1, counted from `Waiting-email`/`Waiting-approval` statuses for phase 2).
- `slotStart(slot) → localDT` (date + start, or date + `00:00`).
- `postSummary(post, slots, counts, todayLocal) → {publicId, title, organization, category,
  audiences, publicNote, firstDate, lastDate, needed, filled, full: boolean, status}` (only
  future-or-today slots counted; `full` when every such slot is filled).
- `publicPost(post, slots, counts, todayLocal) → {publicId, title, organization, audiences,
  publicNote, cutoffHours, status, slots: [{slotId, date, start, end, role, needed, filled,
  roleNote, bringingPrompt, full, past}]}` — no other fields.
- `checkSignup({post, slot, counts, existing, email, todayLocal, nowLocal}) → {ok} | {ok:false,
  error}`: post `Open`; slot belongs to post; slot start not before `nowLocal`; not full; no
  `Confirmed` sign-up with the same normalized email on the same slot. Errors: `This
  opportunity is not open.`, `That date has passed.`, `This role is full.`, `You're already
  signed up for this role.`
- `cancelIsLate(slot, cutoffHours, nowLocal) → boolean` (now ≥ slotStart − cutoff).
- `remindersDue(signups, slotsById, postsById, nowLocal, reminderHour) → signupIds`: Confirmed,
  `Reminded at` blank, post not Closed, slot date == tomorrow (local) and now's hour ≥
  reminderHour.
- `postsToMarkPast(posts, slotsByPost, todayLocal) → postIds` (Open/Closed with every slot date
  < today).
- `leaderAccess(leader, organizations) → {isBishopric, seeAllNames, editOrgs[], createOrgs[]}`:
  Bishopric → see all, edit and create for every organization; Ward council → see all names,
  edit/create for own organization; Org editor → see/edit/create own organization only;
  Coordinator alone → nothing in phase 1 (phase 2 adds categories).
- `canSeePost(access, post)`, `canEditPost(access, leaderEmail, post)` (creator always may edit).
- `noticeRecipients(post, leaders) → emails`: post creator + Leaders with Org editor ticked in
  the post's organization, de-duplicated by normalized email.
- `rateCheck(counts, limits) → null | 'message'` for the four §7.3 limits.

- [ ] **Step 1: Failing tests** `rules.test.mjs`, one `describe` per function, including:
  past-date publish refused but past-date draft accepted; `needed: 0` and `201` refused;
  `end 09:00 start 10:00` refused; error key `slots[1].role`; a slot starting 00:30 tomorrow
  with cutoff 24 → `cancelIsLate` false at `today 00:29`, true at `today 00:30`;
  `remindersDue` at reminder hour 18: 17:59 none, 18:00 the Confirmed one, never Cancelled or
  already-reminded, and a sign-up made at 21:00 the day before still due at the 22:00 run;
  `checkSignup` duplicate detection with `Sister.Example@Example.test ` vs lower-case;
  `publicPost` output's JSON has no `Email`, `Name`, `Private details`, `privateDetails` keys
  or values; Org editor of Primary can't edit a Relief Society post but its creator can;
  Ward council member of Elders Quorum sees Relief Society names but can't edit them.
- [ ] **Steps 2–4:** FAIL → implement → PASS. **Step 5: Commit** `google-portal: volunteer rules`.

### Task 4: Mail, footer and outbox

**Files:** Create `apps-script/06-mail.js`, `test/mail.test.mjs`.

**Interfaces:**
- `emailFooterHtml_(settings)`, `emailFooterText_(settings)` — the email footer text +
  `Contact: <contact>`.
- `sendOrQueue_(msg: {to, subject, html, text, priority: 'high'|'normal'}) → 'sent'|'queued'|
  'refused'`: refuses (logs `bad recipient`) unless `to` is one valid address. Appends footer.
  Sends now when `mailQuota_() - 1 > reserve`, or when `priority === 'high'` and
  `mailQuota_() > 0`; else appends to Outbox `Queued`.
- `drainOutbox_() → {sent, left}`: oldest first, `high` before `normal`, same budget rule;
  sent rows are deleted and one `Log` line (`mail sent`, `to | subject`) is written; a send error
  marks the row `Failed` with the message and moves on.
- Templates (each returns `{subject, html, text}`; every value HTML-escaped):
  `tplSignupConfirmed_(s, post, slot, signup, cancelUrl)` (no private details; says details come
  in the reminder the day before), `tplReminder_(s, post, slot, signup, cancelUrl)` (includes
  private details), `tplDetails_(s, post, slot)` (private details, from Send details),
  `tplCancelNotice_(s, post, slot, signup, late: boolean, stillFull: boolean)` (subject
  `Cancellation: <title>`; late → `You're now short: <title>` unless stillFull),
  `tplRemoved_(s, post, slot)`, `tplLeaderLink_(s, leader, url)`,
  `tplRequestNotice_(s, categoryName, folderUrl)` (exactly:
  `A new <name> request came in. Open your Requests folder: <url>` and nothing about the
  request), `tplAdminAlert_(s, lines[])`.
  Priorities: reminders, cancel notices, request notices, admin alerts → `high`; the rest
  `normal`.

- [ ] **Step 1: Failing tests:** with quota 31 and reserve 30 a normal message queues, a high
  one sends; quota 0 → both queue; `drainOutbox_` after `setQuota(100)` sends high first then
  normal in queue order and empties the Outbox; a two-address `to` is refused; every sent html
  and text contains the email footer sentence and `Contact: help@riverbend.example`; a title
  `<script>` is escaped in html; `tplRequestNotice_` text has no field other than the category
  name and URL; `tplSignupConfirmed_` never contains the post's private details string.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: mail, footer, outbox`.

### Task 5: Tokens and leader links

**Files:** Create `apps-script/07-tokens.js`, `test/tokens.test.mjs`.

**Interfaces:**
- `issueToken_(kind: 'cancel'|'leader', subject: string, expiresLocal) → rawToken` (stores
  `sha256Hex_(raw)`; a new `leader` token deletes that leader's older ones).
- `readToken_(raw, kind) → {subject, expires} | null` (null when unknown, wrong kind, expired).
- `revokeTokens_(kind, subject)`.
- `leaderFromLink_(raw) → leader row | null`: the token's subject is the leader's normalized
  email; returns null unless that email is on the Leaders tab now.
- `pageUrl_(settings, page, hash: object) → string`: `hub_url` set → `<hub_url>/<page>.html#…`
  (one slash); else `<web_app_url>?page=<page>#…`. Hash is `k=` / `t=` / `p=` encoded.
- `sendLeaderLink_(leader) → 'sent'|'queued'` (90 days; template from Task 4).
- `processLeaderLinkTicks_()` (for each ticked `Send leader link`: send, untick, stamp
  `Link sent` with local date-time).
- `requestLeaderLink_(email) → {ok: true, message}` — always the same message (`If that
  address is on the ward's leader list, a link is on its way.`); sends only for a Leaders-tab
  address within the 3-per-day limit.

- [ ] **Step 1: Failing tests:** stored value is the hash, never the raw token; `readToken_`
  null after `setNow` passes expiry; cancel token can't be read as `leader`; removing the
  leader's row → `leaderFromLink_` null; changing the leader's email → null; second issue
  invalidates the first leader link; `requestLeaderLink_` for an unknown address sends nothing
  and returns the same message as for a known one; 4th request in a day sends nothing;
  `pageUrl_` with `hub_url` `https://example.github.io/rb1links/` and without.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: tokens and leader links`.

### Task 6: Public API

**Files:** Create `apps-script/08-api-public.js`, `test/api-public.test.mjs`.

**Interfaces:** each handler returns a plain object `{ok: true, ...} | {ok: false, error,
fields?}`; never throws to the caller (Task 9 wraps).
- `apiServe_()` → `{ok, ward: {name, contact, serveLink, helpLink}, posts: postSummary[]}` for
  `Open` posts with at least one slot today or later; cached 60 s under `serve` (`cache_()`);
  the cache is cleared by every write in Tasks 6–7.
- `apiPost_(publicId)` → `{ok, ward, post: publicPost}`; Draft or unknown → `{ok:false, error:
  'This opportunity was not found.'}`; Past → post with `status: 'Past'` (page shows no form).
- `apiHelp_()` → `{ok, ward, tiles: [{id, name, icon, url}]}` from request categories with a
  form in `Request files` (url = form's published URL), not archived.
- `apiSignup_({publicId, slotId, name, email, bringing})`: name 1–80, email valid, bringing
  ≤ 200; rate limits; in the lock: `checkSignup`, append Sign-up `Confirmed`, refresh that
  slot's `Filled`, issue a cancel token expiring the day after the slot, `sendOrQueue_` the
  confirmation. Answer: `{ok, message: "You're signed up. We sent a confirmation to your email."}`
  (the answer never repeats private details or other names).
- `apiTokenInfo_({t})` → for a cancel token: `{ok, kind: 'cancel', title, date, start, role,
  status}`; no name or email.
- `apiCancel_({t})`: Confirmed → `Cancelled` + `Cancelled at`, refresh Filled, cancel notice
  (late per `cancelIsLate`) to `noticeRecipients`, revoke the token. Already cancelled/removed →
  `{ok: true, message: 'This sign-up is already cancelled.'}`.
- `apiRequestLeaderLink_({email})` → Task 5.

- [ ] **Step 1: Failing tests** (harness seeded with Riverbend, one Open meals post with private
  details `123 Example Lane`, one Draft post): serve JSON lists the Open post only, and
  `JSON.stringify` of serve/post/tokenInfo answers contains no seeded volunteer name, email, or
  `123 Example Lane`; sign-up stores name `=IMPORTXML(...)` with a leading `'`; second sign-up
  for a 1-needed role → `This role is full.`; the confirmation email has a cancel link whose hash
  token reads back via `apiTokenInfo_`; cancel before cutoff → notice subject `Cancellation:`,
  after cutoff → `You're now short:`; 4th sign-up email to one address in a day refused with
  the limit message; 11th sign-up on a post within one minute refused; serve answer is cached
  (second call does no sheet read) and a sign-up clears it.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: public API`.

### Task 7: Leader API

**Files:** Create `apps-script/09-api-leader.js`, `test/api-leader.test.mjs`.

**Interfaces:** every handler takes `{k, ...}` and starts with `leaderFromLink_(k)`; null →
`{ok:false, error: 'This leader link has expired or is no longer valid. Ask for a new one.',
relink: true}`. Access from `leaderAccess`.
- `apiWhoami_({k})` → `{ok, leader: {name, calling, organization}, access: {isBishopric,
  createOrgs, editOrgs}, organizations, categories: [{id, name, icon}] (opportunity kind, not
  archived), defaults: {cutoffHours}}`.
- `apiListPosts_({k})` → posts the leader may see (not Past by default; `{past: true}` lists
  Past), each with slots, counts and — when `canSeePost` — `signups: [{signupId, slotId, name,
  childName, bringing, status, detailsSent: boolean}]` (Confirmed only; no emails except for
  posts the leader may edit) and `canEdit`.
- `apiGetPost_({k, postId})` → full post for editing (private details included) when
  `canEditPost`; else refused.
- `apiSavePost_({k, action: 'draft'|'publish'|'close', post})`: `validatePost` with
  `allowedOrgs = createOrgs` for new posts and `canEditPost` for existing; writes Posts (new:
  `Post id` and random `Public id` via `newId_`, Created by = leader email, Created at) and
  Slots (match by `slotId`; removed slots with no Confirmed sign-ups are deleted; a removed slot
  that has sign-ups is refused: `Remove the people signed up for this date first.`); sets
  `Last changed by` = leader name, `Last changed at`. Answer `{ok, postId, publicId, publicUrl}`
  (publicUrl from `pageUrl_(…, 'post', {p: publicId})`).
- `apiRemoveSignup_({k, signupId})`: `canEditPost` → status `Removed`, `Removed by` = leader
  name, refresh Filled, `tplRemoved_` to the volunteer, revoke their cancel token.
- `apiSendDetails_({k, signupId})`: `canEditPost`, Confirmed → `tplDetails_`, stamp
  `Details sent at`.
- `apiSignOutEverywhere_({k})`: revoke all of the leader's links, send a new one, answer
  `{ok, message: 'We emailed you a new leader link. The old one no longer works.'}`.

- [ ] **Step 1: Failing tests:** an Org editor of Primary: list shows Primary posts with names
  and no Relief Society posts; `apiGetPost_`/`apiSavePost_`/`apiRemoveSignup_` on a Relief
  Society post refused; a Ward council member of Elders Quorum sees the Relief Society post's
  names but no emails and `canEdit: false`; a Bishopric member edits any post; new post saved as
  draft is not in serve, publish puts it there; publish with a past date returns `fields`
  `slots[0].date`; removing a slot with a Confirmed sign-up refused; remove sends the volunteer
  the removed email and the slot reopens; a removed leader's link answers `relink: true`;
  `Last changed by` holds the leader's name.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: leader API`.

### Task 8: Pages (hub sub-pages and fallback) and hub sections

**Files:** Create `pages/gp.css`, `pages/gp.js`, `pages/serve.html`, `pages/post.html`,
`pages/help.html`, `pages/confirm.html`, `pages/leader.html`, `pages/hub-sections.html`,
`test/pages.test.mjs`.

**Interfaces:**
- Placeholders substituted by `renderPage_` (Task 9): `{{WARD_NAME}}`, `{{WEB_APP_URL}}`,
  `{{CONTACT_EMAIL}}`, `{{PREVIEW_IMAGE}}`, `{{FALLBACK}}` (`true`/`false`), `{{PAGE_TITLE}}`.
  Every substituted value is HTML-escaped (and JSON-encoded inside `<script>`).
- `gp.js` exposes `GP` with: `GP.call(action, data) → Promise<object>` (hub: GET
  `?api=<action>&…` for `serve`, `post`, `help`; everything else POST of
  `JSON.stringify({action, ...data})` as a plain string body, `redirect: 'follow'`; fallback:
  `google.script.run.gpApi({action, ...data})`); `GP.hash() → Promise<object>` (hub:
  `location.hash`; fallback: `google.script.url.getLocation`); `GP.el(tag, attrs, children)`
  (DOM building with `textContent` only, never `innerHTML` with data); `GP.footer()`;
  `GP.unreachable(page)` (shows `Can't load right now. Try this link instead:` + the fallback
  address `<web app>?page=<page>`); pure helpers `GP.expandDates(start, end, weekdays[]) →
  dateStr[]` (max 100), `GP.groupByAudience(posts) → {Brothers: [], Sisters: [], Youth: [],
  Children: []}` (a post in several audiences appears in each; full posts last in each group),
  `GP.fmtDate(dateStr) → 'Tue, Dec 3'`, `GP.fmtTime('18:30') → '6:30 PM'`.
- Pages, each with `<meta name="robots" content="noindex">`, viewport meta, `og:title`
  `{{WARD_NAME}} · <Page title>`, `og:image` when set, and the page footer + contact:
  - `serve.html`: groups with fill bars (`7 of 10`), "Filled ✓" items at the bottom, each links
    to `post.html#p=<publicId>`; a "Request help" link to `help.html`.
  - `post.html`: post, slots by date with roles, counts, Filled ✓ roles closed; sign-up form
    (pick role, name, email, "what are you bringing?" when the role has a prompt); the
    answer's message replaces the form. No names shown.
  - `help.html`: tiles (icon, name) opening each form in a new tab; a line that nothing is
    emailed back and a leader will reach out.
  - `confirm.html`: reads `#t=`, shows `apiTokenInfo_` and one **Cancel my sign-up** button
    (POST only on click).
  - `leader.html`: without `#k=`: email box → `requestLeaderLink`. With it: "Signed in as …";
    tabs **My opportunities** (each post: counts per slot, sign-up list with Remove and Send
    details, the phase 1 note `Private details go to volunteers in their reminder the day before.
    Remove anyone you don't recognize before then.`, Edit, Copy this post, Close, public link
    with a Copy button) and **New opportunity** (fields of `validatePost`; per date: Add role,
    Copy this date, Remove; Add date; Add dates (start, end, weekdays) via `GP.expandDates`;
    Save as draft / Publish; field errors shown next to their fields by error key); **Sign out
    everywhere**. `relink: true` answers show the request-a-link form.
  - `hub-sections.html`: an HTML snippet with two sections, "Service Opportunities" (link to
    `serve.html`, short link text, QR image placeholder `serve-qr.png`) and "Service Requests"
    (link to `help.html`, `help-qr.png`), styled to sit on the hub page; comment at top says
    where to paste it and how to make the QR images (zippa.run's QR, as the hub does today).
- Look: read `F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio\m44links\` (READ ONLY) for the hub's
  fonts, colours and card style; reproduce the look with CSS variables at the top of `gp.css`
  (so another ward can recolour). Copy no M44 text, names, links or images. Mobile first,
  readable at 360 px, buttons ≥ 44 px tall.

- [ ] **Step 1: Failing tests** `pages.test.mjs` (load `gp.js` into a `vm` context with a
  minimal `document`/`window` stub, or test its pure helpers exported on `GP`):
  `expandDates('2026-12-01','2026-12-14',[1,3])` → the 4 Mon/Wed dates; cap at 100;
  `groupByAudience` places a Youth+Children post in both and full posts last; `fmtTime('00:30')
  === '12:30 AM'`; every page file contains `noindex`, `{{WARD_NAME}}`, the page footer
  sentence and `{{CONTACT_EMAIL}}`; no page file contains `innerHTML =` with a variable
  (grep test: `innerHTML` appears only as `innerHTML = ''`).
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: hub pages and fallback pages`.

### Task 9: Web entry points and page rendering

**Files:** Create `apps-script/10-web.js`, `test/web.test.mjs`.

**Interfaces:**
- `doGet(e)`: `api` in `serve|post|help|ping` → JSON (`ContentService`, MIME JSON) from the
  Task 6 handler (`post` reads `e.parameter.p`; `ping` → `{ok: true, at}`); `page` in
  `PAGE_NAMES` → `HtmlService.createHtmlOutput(renderPage_(page, settings_(), true))` with
  title and viewport meta; anything else → JSON `{ok:false, error:'Not found.'}`.
- `doPost(e)`: parse `e.postData.contents` as JSON (bad → `{ok:false, error:'Bad request.'}`),
  dispatch `action` through `dispatch_(action, data)`; allowed actions: `signup, tokenInfo,
  cancel, requestLeaderLink, whoami, listPosts, getPost, savePost, removeSignup, sendDetails,
  signOutEverywhere` (anything else → `Not found.`).
- `gpApi(req)` (fallback, `google.script.run`): same `dispatch_`, also allows `serve`, `post`,
  `help`.
- `dispatch_` catches every exception: logs `api error | <action> | <message>` to Log and
  answers `{ok:false, error: 'Something went wrong. Please try again later or contact <contact>.'}`
  (no stack, no details).
- `renderPage_(name, settings, fallback: boolean) → html` from `GP_PAGES` with the Task 8
  placeholders.

- [ ] **Step 1: Failing tests:** `doGet({parameter:{api:'serve'}})` returns a ContentService
  fake whose text parses to `{ok:true,…}`; `doPost` with `{"action":"nope"}` → `Not found.`;
  `doPost` with non-JSON → `Bad request.`; an exception inside a handler → generic message and a
  Log row; `renderPage_('serve', s, false)` contains the escaped ward name in `og:title`, the
  web app URL, the contact, and no `{{`; a ward name `<Riverbend & Co>` is escaped.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: web entry points and rendering`.

### Task 10: Requests (forms, routing, purge, rotation) and sharing rules

**Files:** Create `apps-script/05-requests-rules.js`, `apps-script/11-requests.js`,
`test/requests.test.mjs`.

**Interfaces:**
- Pure (`05-requests-rules.js`): `requestReaders(category, leaders) → emails` (Coordinators
  column ∪ (Confidential ? Leaders whose Calling is `Bishop` : Leaders whose Organization is in
  Owning organizations)), normalized and de-duplicated; `REQUEST_HEADERS` = `Request id |
  Received | Kind | Name | Phone or email | Moving | Moving date | For | Note | Status |
  Assigned to | Leader note | Closed on`; Status ∈ `New, In progress, Done, Declined`;
  `stampClosed(rows, todayLocal) → [{row, closedOn}]` (Done/Declined with blank Closed on →
  today; reopened rows with Closed on → `''`); `rowsToPurge(rows, todayLocal)` (Closed on ≤
  today − 30); `rowsToCarry(rows, todayLocal)` (everything not purged); `needsRotation(lastMonth,
  todayLocal) → boolean` (month changed); `sharingDiff(current: {email: role}, desired: {email:
  role}, ownerEmail) → {add: [{email, role}], change: [{email, role}], remove: [email]}` (never
  removes the owner).
- `buildRequestForms_(settings, categories)`: for each request category without a form in
  `Request files`: `FormApp.create('<Name> — <ward_name>')`, `setCollectEmail(false)`,
  questions — all: Name (required, ≤ 80), Phone or email (required, ≤ 100); Moving: Moving in
  or out (multiple choice), Date (date item); Christmas: For (`My family` / `Another family`);
  every form: Note (optional paragraph, ≤ 200 via validation). Description: who will see it
  (`Only the <owner names> leaders see this request.` / confidential: `Only the bishop and the
  people he names see this request.`), `Nothing is emailed back to you; a leader will contact
  you.`, the form footer + contact. Confirmation message: `Thank you. A leader will contact
  you.` Creates folder `Requests – <Name>` inside the Service Portal folder and the month's
  sheet `Requests – <Name> – <YYYY-MM>` in it (headers, Status dropdown, frozen row, `@` on dates);
  records `Request files`.
- `gpOnRequestSubmit(e)`: find the category by `e.source.getId()`; append a row (`Request id` via
  `newId_('r')`, Received = now, answers mapped by question title, Status `New`; every value
  through `sanitizeCell`); `e.source.deleteResponse(e.response.getId())`; one
  `tplRequestNotice_` per `requestReaders` address (`high`). Errors → Log + admin alert, never
  the request text.
- `dailyRequests_()`: for each request file: apply `stampClosed`, delete `rowsToPurge` rows
  (bottom-up); on `needsRotation`: create the new month's sheet in the same folder, copy header +
  `rowsToCarry`, update `Request files`, then permanently delete the old file with
  `Drive.Files.remove(id)` (fall back to `Drive.Files['delete']`); if that throws, trash it with
  `DriveApp` and send an admin alert.

- [ ] **Step 1: Failing tests:** `requestReaders` for Moving = EQ + RS leaders + coordinators,
  for Christmas = the Bishop + coordinators only (not counselors); `rowsToPurge` with Closed on
  exactly 30 days ago → purged, 29 → kept; a Done row with blank Closed on gets today; a row
  moved back to In progress loses Closed on; `needsRotation('2026-11', '2026-12-01 03:00')`
  true, same month false; `sharingDiff` adds, changes reader→writer, removes a stale address,
  keeps the owner; `gpOnRequestSubmit` with a fake form event: the row lands in the Moving sheet,
  the fake form's response is deleted, each reader gets one notice, and no notice contains the
  requester's name, contact or note; a name `=1+1` is stored with `'`.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: request forms, routing, purge, rotation`.

### Task 11: Setup menu, sharing, triggers, health, jobs

**Files:** Create `apps-script/12-setup.js`, `apps-script/13-jobs.js`, `test/jobs.test.mjs`.

**Interfaces:**
- `onOpen()` menu **Service Portal**: `Set up`, `Sync sharing`, `Install triggers`,
  `Make hub files`, `Send leader links now`, `Check health`.
- `gpMenuSetUp()`: `gpEnsureTabs_` + Read me text; if any of `ward_name, time_zone,
  contact_email` is blank → alert `Fill in Settings (ward name, time zone, contact email) and the
  Leaders tab, then run Set up again.` and stop. Else: create the `Service Portal` folder (once)
  and move the Service Sheet into it, create the System Sheet `<ward_name> – Service System
  (private)` there (once; id in Script Properties `SYSTEM_ID`), `buildRequestForms_`, warn when
  `time_zone` ≠ `Session.getScriptTimeZone()` (tell how to change it in Project Settings).
  Re-runnable: never duplicates a folder, form or file.
- `gpMenuSyncSharing()`: desired Service Sheet access = Bishopric → writer, Ward council →
  reader; each request folder → `requestReaders` as writer; System Sheet and Service Portal
  folder: nobody. Apply `sharingDiff` with `Drive.Permissions.create(…, {sendNotificationEmail:
  false})` / `update` / `delete`; per-address failures (e.g. no Google account) are collected and
  shown in one alert, not thrown. Protects `Posts, Slots, Sign-ups, Volunteers, Needs help soon`
  (owner only, warning-free) and leaves `Settings, Leaders, Categories` editable.
- `gpMenuInstallTriggers()`: deletes this project's existing triggers for the handler names
  below, then creates: `gpTenMinute` every 10 minutes, `gpHourly` every hour, `gpDaily` daily
  at 2 am, and one `gpOnRequestSubmit` form-submit trigger per form in `Request files`.
- `gpMenuMakeHubFiles()`: writes `serve.html, post.html, help.html, confirm.html, leader.html`
  (`renderPage_(…, false)`) and `hub-sections.html` (short links filled in) into a Drive folder
  `Hub files (copy to the hub)` inside Service Portal, replacing older copies; alert gives the
  folder link.
- `gpMenuCheckHealth()` → alert with one `OK`/`PROBLEM` line each: Settings complete, web app URL
  set and `?api=ping` answers (`UrlFetchApp.fetch`), hub reachable when `hub_url` set (fetch
  `<hub_url>/serve.html`, 200), triggers present (names listed), System Sheet present, request
  forms present, email quota left (`MailApp.getRemainingDailyQuota()`), Outbox queued count,
  time zone match.
- Jobs (each wraps in try/catch → Log + one admin alert per job per day):
  `gpTenMinute()`: `drainOutbox_`, `processLeaderLinkTicks_`, refresh `Filled` on every Slots
  row from `countsBySlot`.
  `gpHourly()`: send `remindersDue` (reminder template, cancel link, stamp `Reminded at` and
  `Details sent at`); mark `postsToMarkPast` as `Past`; clear the serve cache.
  `gpDaily()`: `dailyRequests_`, delete expired Tokens, delete Log rows older than 90 days,
  delete leftover `Failed` Outbox rows older than 7 days after one admin alert listing them.

- [ ] **Step 1: Failing tests** `jobs.test.mjs`: `gpHourly` at 18:00 sends one reminder
  containing the private details and stamps the row, and a second run sends nothing;
  reminder emails have a working cancel link; a post whose last date was yesterday becomes
  `Past` and leaves serve; `gpDaily` deletes an expired token and keeps a live one, and rotates
  request files on the 1st (old file id passed to the fake `Drive.Files.remove`, open rows
  carried); `gpTenMinute` drains a queued confirmation after quota returns; `gpMenuSetUp` twice
  creates one System Sheet and one form per request category (fake FormApp/DriveApp).
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: setup menu, sharing, triggers, jobs`.

### Task 12: Setup guide, leader guide, README, final build

**Files:** Create `google-portal/SETUP-GUIDE.md`, `google-portal/LEADER-GUIDE.md`,
`google-portal/README.md`. Modify `CLAUDE.md` (add a short "Google-only portal
(`google-portal/`)" section: what it is, `npm run gp:build` / `gp:build:check` / `gp:test`, that
`dist/` is generated and committed, spec + plan paths). Regenerate `dist/`.

The setup guide is for Sam clicking in a browser, signed in to the bishopric's shared account
(or a second bishopric-owned account if the router measurement says so — spec §7.4). No CLI.
Numbered steps, each one action, saying exactly what to click and what he should see. Sections:
1. Before you start (bishop's approval, 38.8.21.2; the router runtime check, spec §7.4; two
   administrators; the Gemini rule verbatim).
2. Make the Service Sheet: sheets.new → name it `Service Sheet` → Extensions → Apps Script →
   name the project → Project Settings: tick "Show appsscript.json", set Time zone → paste
   `dist/appsscript.json` → paste `dist/Code.gs` (select all, replace) → Save → reload the Sheet.
   Where to get the files: open them on GitHub (raw) or from this repo folder; say how to
   select-all and copy.
3. Service Portal → Set up (authorize: the exact "unverified app" clicks for the account owner
   only), fill Settings (a table of every key, what to type, Riverbend example values) and
   Leaders, Set up again.
4. Deploy the web app (Execute as Me, Anyone), paste the URL into Settings `web_app_url`. How to
   update later without changing the URL (Manage deployments → pencil → New version).
5. Install triggers; Sync sharing (what each person gets; the no-Google-account case).
6. Hub: Make hub files → download each → the hub owner uploads them to the hub repo root and
   pastes `hub-sections.html` into the hub's index page; short links on zippa.run for
   `serve.html` and `help.html` (as today); QR images. **If the hub test failed or there is no
   hub:** skip, set `hub_url` blank, and use `<web app>?page=serve` / `?page=help` as the short
   links' targets.
7. Send leader links (tick, Send leader links now).
8. Check health (every line OK; what to do for each PROBLEM).
9. Test checklist (tick boxes): create a draft and publish on the leader page; open serve on a
   phone; sign up with your own email; get the confirmation; cancel from the email; the leader
   gets the cancellation notice; sign up again for tomorrow, run `gpHourly` from the editor at the
   reminder hour (or set reminder_hour to now) and get the reminder with details; Remove a
   sign-up and get the removed email; submit each request form from a private window; the right
   leaders get a detail-free notice; the request appears in its folder's sheet and the form's
   Responses tab shows 0; mark it Done; Check health all OK.
10. Day to day and hand-off (spec §9.2–9.3), updating the script (paste new `Code.gs`, Manage
    deployments → New version), what phase 2 will add.
`LEADER-GUIDE.md`: one page for org leaders: get your link, create an opportunity (Add dates for
meals), publish and share the link, watch sign-ups, remove someone you don't recognize before the
reminder, Send details for late sign-ups, sign out everywhere; the Gemini rule; requests live in
your Requests folder (status, assigned to, note; never copy request details into email).

- [ ] **Step 1:** Write the three docs and the CLAUDE.md section.
- [ ] **Step 2:** `node google-portal/build.mjs --check` → exit 0; `npm test && npm run typecheck`
  → PASS; grep the whole `google-portal/` tree for `@gmail.com`, `m44`, `Mapleton` → no matches.
- [ ] **Step 3: Commit** `google-portal: setup guide, leader guide, README`.
