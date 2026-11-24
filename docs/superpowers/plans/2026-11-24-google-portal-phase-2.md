# Google-only volunteer portal, phase 2 — Implementation Plan

> **For agentic workers:** this plan is run by the orchestrator skill (one implementer for the
> whole plan, then one reviewer). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Google-only portal from phase 1's "simple sign-ups" to the full spec: confirm
your address and first-time approval with records, waiting counts, over-limit notices with
withdraw, 48-hour nudges and lapses, My sign-ups, children, categories with coordinators and
fill warnings, "Needs help soon", and a daily health email.

**Architecture:** Builds on phase 1 in `google-portal/` (same build, harness, tables, rules,
outbox, tokens, pages; read `google-portal/README.md` and the phase 1 plan
`docs/superpowers/plans/2026-11-24-google-portal-phase-1.md` first). New pure rules go in
`04-rules.js` (volunteer) and a new `04b-approval-rules.js` only if `04-rules.js` would pass
~800 lines; new handlers extend `08-api-public.js` / `09-api-leader.js`; one new page `me.html`.
Phase 1 tabs already carry every phase 2 column; any column this plan adds is appended by
`gpEnsureTabs_` (re-run **Set up**), never by hand.

**Tech Stack:** as phase 1.

**Spec:** `docs/superpowers/specs/2026-11-24-google-only-alternative-design.md` §4.1–4.2, §5.6,
§6.1, §7.2–7.3, §10 "Phase 2". Behaviour details it inherits come from
`docs/superpowers/specs/2026-11-21-volunteer-signups-design.md` §6.3–6.6 and
`docs/superpowers/specs/2026-11-22-service-opportunities-requests-design.md` §3–§5.

## Global Constraints

All of phase 1's Global Constraints still hold (scope, no real data, independence texts, Gemini
rule, one recipient per email, tokens hashed and after `#`, `sanitizeCell` on every write, lock
around read-modify-write, text dates in the ward time zone, outbox and reserve). In addition:
- Phase 2 abuse limits (spec §7.3): confirm-your-address emails ≤ 3 per address per day and
  ≤ Settings `confirm_limit_per_day` (default 20) per day in total, counted in CacheService like
  phase 1's attempt counters; the phase 1 limits stay.
- **Email-only outcomes:** the answer to a public sign-up never tells whether the address was
  known, approved, declined or new. Every sign-up answer is the same sentence:
  `Thanks. Check your email to finish or see your sign-up.` (sign-ups spec §6.3 item 6).
- Private details (spec §4.1 row): only to a sign-up that is Confirmed and whose volunteer is
  Approved (or on the Leaders tab), and only in the confirmation email, the reminder, and My
  sign-ups. This **replaces** phase 1 decision 1: details now go in the confirmation email for
  approved volunteers; the leader page's Send details button and phase 1 note are removed.
- Approval is only by leaders of the organization of the volunteer's first post (`First post`),
  or the bishopric (spec §4.1). Every decision writes `Decided by` (leader name) and
  `Decided at`.

Phase 1's review decisions stand (see the phase 1 plan and `git log` 5fb421b, 02a0005): reminders
skip only Past and Cancelled posts; booked slots can't be moved; only administrators edit the
Service Sheet; refused attempts count toward limits (CacheService counters); Cancel this
opportunity / date; jobs and menus are guarded against web callers (keep
`test/web-exposure.test.mjs` passing: every new top-level function either ends in `_` or is added
to its allow-list with a visitor test); job freshness in Check health.

## Decisions taken in this plan (spec silent)

1. A Pending volunteer who has already confirmed their address once (`Email confirmed at` set)
   goes straight to `Waiting-approval` on later sign-ups (no second confirm email).
2. A Declined or Revoked address: the sign-up is stored as nothing; one email (max one a day
   per address) says `Please contact <contact_email> to sign up.` The public answer is the
   same sentence as everyone else's.
3. "Leaders skip approval": an address on the Leaders tab signs up as Confirmed with no
   Volunteers row change; if a Volunteers row exists it is set Approved, `Decided by` =
   `Leader list`.
4. Coordinators (a Leaders row with Coordinator ticked, or an email in a category's
   Coordinators column) see, create in and edit the posts of their categories only;
   approval stays with the organization's leaders and the bishopric.
5. My sign-ups links are emailed on every confirmation; `me.html` without a link offers
   "Email me my link" (same neutral answer and 3-per-day limit as leader links).

## Review Focus

1. Someone types an approved member's address: no on-screen sign of approval, the real owner
   gets the confirmation with a cancel link. Test in Task 2.
2. An Elders Quorum leader tries to approve a volunteer whose first post was Relief Society's:
   refused; a bishopric member may. Test in Task 3.
3. A confirm link clicked twice, after 48 h, or after the post is over: second click is a no-op
   message, expired says so, over-post lapses. Test in Task 2 and Task 5.
4. A My sign-ups link shows only that address's sign-ups, other volunteers' names on the same
   post (no emails), and private details only while the post is not over. Test in Task 4.
5. Children: a parent signs up two children and themselves for one role, each counts once, the
   duplicate rule is per (email, role, child name). Test in Task 2.

---

### Task 1: Volunteer rules for approval, waiting, over-limit, lapses, children

**Files:** Modify `apps-script/04-rules.js`, `apps-script/00-config.js`; test
`test/rules-phase2.test.mjs`.

**Interfaces (pure):**
- Sign-up statuses: `Waiting-email, Waiting-approval, Confirmed, Cancelled, Withdrawn, Removed,
  Lapsed`. Volunteer statuses: `Pending, Approved, Declined, Revoked`. Add Volunteers header
  `Email confirmed at`.
- `volunteerState(email, volunteersByEmail, leaderEmails) → 'leader'|'approved'|
  'pending-confirmed'|'pending-new'|'new'|'blocked'`.
- `signupStatusFor(state) → 'Confirmed'|'Waiting-approval'|'Waiting-email'|null` (null =
  blocked).
- `countsBySlot` already returns `{filled, waiting}`; waiting = Waiting-email +
  Waiting-approval.
- `checkSignup` changes: full roles no longer refuse a sign-up from a not-yet-approved address
  (it waits); an approved/leader sign-up on a full role is refused as in phase 1 (`This role is
  full.`); duplicates are per (normalized email, slot, child first name) across active statuses
  (Waiting-*, Confirmed).
- `overLimitOnConfirm(slot, counts) → boolean` (true when filled ≥ needed before this one
  counts).
- `canApprove(access, leaderEmail, volunteer, firstPost) → boolean` (bishopric, or the leader
  may edit posts of `firstPost`'s organization).
- `nudgesDue(signups, slotsById, postsById, nowLocal, sentKeys) → [{postId, date}]` (any
  Waiting-approval sign-up whose slot starts within 48 h; one per post and date, keyed so it is
  sent once).
- `lapsesDue(signups, slotsById, todayLocal) → signupIds` (Waiting-* whose slot date < today).
- `warningsDue(posts, slotsByPost, counts, categoriesById, nowLocal, sentKeys) → [{postId, date,
  short}]` (spec §4.2: per post date, when any role is short and the date starts within the
  category's `Warn hours`; once per post and date).
- `needsHelpSoon(posts, slotsByPost, counts, todayLocal) → rows` (Open posts with a slot in the
  next 14 days that is short: title, organization, date, role, `filled of needed`).
- `leaderAccess` gains `categories[]` (coordinated category ids) and `canSeePost`/`canEditPost`
  honour them; `createOrgs` adds the organizations of the leader's categories; posts created by
  a coordinator must use one of their categories. Category `Any ward council may create` lets
  every Ward council leader create in it.

- [ ] **Step 1: Failing tests:** each `volunteerState` outcome; `signupStatusFor('blocked') ===
  null`; a full role: new address → allowed (waits), approved address → `This role is full.`;
  parent + two children (`Ana`, `Ben`) on one role are 3 active sign-ups, a second `Ana` is a
  duplicate; `overLimitOnConfirm` at 10 of 10 → true; `canApprove` EQ leader vs RS first post
  false, bishopric true, RS org editor true; `nudgesDue` 47 h before → due, 49 h → not, second
  run with the key sent → not; `lapsesDue` yesterday's waiting → lapsed, today's → not;
  `warningsDue` Warn hours 72 with a short role 70 h ahead → due once; `needsHelpSoon` excludes
  full posts and posts 15 days out; a coordinator of `meals` sees and edits meals posts of any
  organization but not `service-project` posts.
- [ ] **Steps 2–4** FAIL → implement → PASS. **Step 5: Commit** `google-portal: approval and
  waiting rules`.

### Task 2: Sign-up, confirm, withdraw and cancel flow

**Files:** Modify `apps-script/08-api-public.js`, `06-mail.js`, `07-tokens.js`; test
`test/api-phase2.test.mjs`.

**Interfaces:**
- Token kinds add `confirm` (48 h, subject = sign-up id), `withdraw` (until the slot is over,
  subject = sign-up id), `me` (until the volunteer's last slot + 30 days, subject = normalized
  email; a new one replaces the old).
- `apiSignup_` (Task 1 rules; children: `childName` 1–40 chars, accepted only when the post's
  audiences include Youth or Children): writes the status from `signupStatusFor`; `Confirmed` →
  confirmation email (with private details, cancel link, My sign-ups link, "Other ways to serve"
  list of other Open posts with fill levels only) and, if `overLimitOnConfirm`, the over-limit
  email with a withdraw link instead; `Waiting-email` → creates/updates the Volunteers row
  (Pending, First post) and sends the confirm email (limits from Global Constraints; over a limit
  the sign-up is stored and lapses normally, nothing is sent); `Waiting-approval` → leader
  "new person waiting" notice to `approversFor(firstPost)`; blocked → Decision 2. Answer always
  the Global Constraints sentence.
- `apiTokenInfo_` handles `confirm`, `withdraw`, `cancel` (title, date, role, what the button
  will do; never names).
- `apiConfirm_({t})`: stamps `Email confirmed at`; that address's Waiting-email sign-ups →
  Waiting-approval; one "new person waiting" notice per affected post's approvers. Second click
  → `Your address is already confirmed.`
- `apiWithdraw_({t})`: Confirmed → `Withdrawn`; no leader email (the role is still full);
  refresh counts.
- `apiCancel_` unchanged except "still full" wording when over-filled (sign-ups spec §6.5).
- Leader notices: "fully filled" when a confirm brings a post's every role to its number (once
  per post, keyed in Log), to `noticeRecipients` plus the category's coordinators.
- `approversFor(post, leaders) → emails`: the post's organization's Org editors + Ward council
  leaders of that organization + the bishopric, de-duplicated.

- [ ] **Step 1: Failing tests:** new address → Waiting-email, confirm email sent, answer
  sentence identical to an approved address's answer (string equality); confirm → Waiting-approval
  and one notice to RS approvers; approved address → Confirmed, confirmation contains private
  details and a `me.html#t=` link; leader-list address → Confirmed without a Volunteers change;
  declined address → no sign-up row, one contact email, the second attempt the same day sends
  nothing; 4th confirm email to one address in a day not sent; over-limit confirmed sign-up
  gets the withdraw email and withdrawing sends leaders nothing; confirm link clicked after 49 h
  → `This link has expired.`; a child sign-up on a Sisters-only post refused.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: confirm, approval waiting, withdraw`.

### Task 3: Leader page — approvals, records, coordinators, Needs help soon

**Files:** Modify `apps-script/09-api-leader.js`, `pages/leader.html`, `pages/gp.js`; test
`test/api-leader-phase2.test.mjs`.

**Interfaces:**
- `apiListPosts_` adds per slot `waiting` (leaders only: `7 of 10 · 3 waiting`), sign-ups of
  every active status with their status label, child names as `Ana (signed up by <parent
  name>)`; removes `detailsSent`.
- `apiWaiting_({k})` → volunteers the leader `canApprove`, Pending with `Email confirmed at`
  set: name, email, first post title, their waiting sign-ups.
- `apiDecide_({k, email, decision: 'approve'|'decline'})`: `canApprove`; Approved → every
  Waiting-approval sign-up of that address becomes Confirmed (confirmation or over-limit email
  each), approved email; Declined → waiting sign-ups `Lapsed`, polite declined email. Writes
  `Decided by`, `Decided at`.
- `apiBishopric_({k, email, decision: 'undo'|'revoke'})` (bishopric only): undo a decline →
  Pending; revoke an approval → Revoked (future sign-ups blocked; existing Confirmed sign-ups
  stay and leaders are told in the answer how many). Recorded the same way.
- `apiNeedsHelp_({k})` (Ward council and bishopric) → `needsHelpSoon` rows.
- Leader page: tabs **Waiting for approval** (Approve / Decline), **My opportunities**
  (waiting counts, statuses), **Needs help soon** (council/bishopric), **New opportunity**
  (category picker limited to the leader's; "Who is serving" note shown when Youth/Children
  picked), bishopric **Volunteers** list with Undo decline / Revoke. Remove Send details and the
  phase 1 note.
- Remove `apiSendDetails_`, `detailsDue`, the `sendDetails` action (dispatch allow-list too) and
  the "Details not sent" UI; the phase 1 LEADER-GUIDE text about it goes too.
- Cancel this opportunity / date (phase 1) also lapses Waiting-* sign-ups on what is cancelled
  (no email to them).

- [ ] **Step 1: Failing tests:** EQ leader's `apiWaiting_` lists none of RS's first-post
  volunteers and `apiDecide_` on one is refused; RS org editor approves → `Decided by` = their
  name, waiting sign-ups Confirmed, confirmation emails contain private details; decline →
  Lapsed + declined email; bishopric undo → Pending, revoke → Revoked and a later sign-up from
  that address is blocked; a coordinator of meals sees an EQ-owned meals post; Needs help soon
  refused for an org editor not on the council; `sendDetails` → `Not found.`
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: approvals and coordinator views`.

### Task 4: My sign-ups page

**Files:** Create `pages/me.html`; modify `pages/confirm.html` (confirm / withdraw / cancel
buttons by token kind), `apps-script/08-api-public.js`, `10-web.js` (`me` in `PAGE_NAMES`,
`gpMenuMakeHubFiles` writes it), `build.mjs`; test `test/me.test.mjs`.

**Interfaces:**
- `apiMe_({t})` (`me` token) → `{ok, name, upcoming: [...], past: [...], otherWays: [...]}`:
  each sign-up: post title, date, times, role, child name, status, `cancelToken` (fresh `cancel`
  token for upcoming Confirmed/Waiting ones), other volunteers' first names on the same post
  (Confirmed only, no emails), and private details only when the volunteer is approved/leader
  and the post is not over; `otherWays` = other Open posts with fill levels only (sign-ups spec
  §6.4).
- `apiRequestMeLink_({email})` → neutral answer, 3 per day, sends only when the address has a
  sign-up.

- [ ] **Step 1: Failing tests:** `apiMe_` for one address never returns another address's
  sign-ups or any email; private details absent for a Waiting sign-up and for a past post;
  `otherWays` holds no names; `me.html` passes the phase 1 page checks (noindex, footer,
  no HTML sinks); unknown address link request sends nothing and answers the same.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: My sign-ups`.

### Task 5: Jobs — nudges, lapses, warnings, Needs help soon tab, health email

**Files:** Modify `apps-script/13-jobs.js`, `12-setup.js`; test `test/jobs-phase2.test.mjs`.

- `gpHourly` adds: `nudgesDue` → urgent nudge to `approversFor` (`high`); `lapsesDue` →
  `Lapsed` (no email); `warningsDue` → warning to the category's coordinators + `Also warn`
  (`high`); sent keys stored in Script Properties (pruned daily after 30 days).
- `gpTenMinute` adds: rewrite the `Needs help soon` tab from `needsHelpSoon`; refresh `Waiting`
  on Slots.
- `gpDaily` adds the health email (spec §5.7): runs the Check health checks (Task 11 phase 1)
  plus "trigger runtime" can't be read from Apps Script, so it reports the queue size, quota
  left, Failed outbox rows, triggers missing or owned by someone else, hub ping; emails the
  administrators only when something is PROBLEM (`high`), else nothing.
- `gpMenuCheckHealth` shows trigger owners (`ScriptApp.getProjectTriggers()[i].getTriggerSource`
  plus `Session.getEffectiveUser()`) and warns when a trigger is not the account's.

- [ ] **Step 1: Failing tests:** nudge once per post-date; lapse yesterday's waiting rows;
  warning goes to coordinators + also-warn, once; Needs help soon tab rows match the rule;
  health email sent only with a PROBLEM line and never contains volunteer or request data.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: nudges, lapses, warnings, health`.

### Task 6: Pages — children, waiting display, categories on serve

**Files:** Modify `pages/post.html`, `pages/serve.html`, `pages/gp.js`, `pages/gp.css`; tests in
`test/pages.test.mjs`.

- `post.html`: for Youth/Children posts, "Who is serving? Me / My child" with a child first-name
  box; the answer sentence from Global Constraints; no waiting counts (public pages never show
  them); over-filled shows `12 of 10`.
- `serve.html`: Brothers and Sisters side by side on wide screens, stacked on phones; Youth and
  Children with the line `A parent signs up for their child`; category icon on each card.
- [ ] **Step 1: Failing tests:** `GP.groupByAudience` unchanged; a rendered post fixture for a
  Children post contains the child field; pages still pass the HTML-sink and footer checks.
- [ ] **Steps 2–4**, **Step 5: Commit** `google-portal: children and categories on pages`.

### Task 7: Guides and rebuild

**Files:** Modify `google-portal/SETUP-GUIDE.md` (phase 2 section: re-paste Code.gs, Manage
deployments → New version, Set up again to add columns, Install triggers again, Make hub files
again and re-upload, add `me.html`; categories and coordinators; extended test checklist covering
every phase 2 behaviour), `LEADER-GUIDE.md` (approvals, waiting counts, Needs help soon,
coordinators), `README.md`, `CLAUDE.md` section; regenerate `dist/`.

- [ ] **Step 1:** write; **Step 2:** `node google-portal/build.mjs --check`, `npm test && npm run
  typecheck`, grep for `@gmail.com`, `m44`, `Mapleton` → none. **Step 3: Commit**
  `google-portal: phase 2 guides`.
