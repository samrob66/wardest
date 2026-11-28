# Google-only portal 2.5 — Service Portal redesign (version 4) Implementation Plan

> Run by the orchestrator skill: one implementer for the whole plan, then one reviewer, up to 3 fix
> rounds. Ignore any "REQUIRED SUB-SKILL" convention. Branch `claude/google-portal-2-5-redesign-d1fdfb`
> cut from origin/main (1503ed2). Sam is testing live on 2.3.3 with test mode on: **no change to any
> tab's columns, any Settings row's meaning, or any API action's request/answer shape.**
> DEADLINE: Sam tests and goes live before Sat Nov 28, 7 pm Denver. Keep it lean.

**Goal:** Every Service Portal page takes the approved v4 design: the Hymnal look everywhere, the
Meadow layout on the leader page (tabs along the bottom, full-screen form, ••• actions, day strip,
the new scheduler), plus the hub's one-link QR poster and test plan Draft 5.

**Architecture:** UI only. `google-portal/pages/gp.css` becomes the Hymnal design system and
`gp.js` gains shared helpers (icons, status chips, scheduler date maths); each page's HTML/JS is
rewritten to the v4 mockup while calling exactly the same API actions with the same fields.
`10-web.js` `themeHead_` maps the existing theme_* Settings onto the new CSS variables. The 2.4 build
(another session) adds server features; its UI is Task 8, built against its written contract.

**Tech Stack:** Apps Script HtmlService + static GitHub Pages copies; plain HTML/CSS/ES5-style JS (no
framework, no page build step; qrcodejs from CDN only where v4 used it); Vitest in Node with the
vm + fake-DOM harness already in `google-portal/test/`.

**Spec:** `docs/superpowers/specs/2026-11-24-google-only-alternative-design.md` (decisions 1–23
stand). **Design (what the build follows):** `drafts/leader-redesign/` (the project's drafts folder, outside the repo)
— `index.html` section "What the build follows" is the checklist; `final-members.html` +
`member.js`/`member.css` (member pages + hub, `data-dir="final"`), `final-leader.html` (leader page),
`theme-b.css` + `final.css` (Hymnal tokens and Meadow-layout overrides), `common.css`/`common.js`
(icons, chips, dates, Volunteers list). Hand-over note:
`leader-redesign-mockups.md` in the coordinator's side-session notes.
Open the mockups in a browser (python -m http.server in that folder) and match them; copy their CSS
and markup patterns rather than reinventing them. **Drop** everything inside the grey dashed
"Mockup only" bars (page switcher, view-as switch, email-link switch) and the drawn QR stand-ins.

## Global Constraints

- Pages run in Apps Script HtmlService **and** as static files next to the hub's index.html: no
  relative asset that only exists in one place; inter-page links only through `GP.pageUrl`; keep
  `<base target="_top">`, `<!-- GP:CSS -->` / `<!-- GP:JS -->`, the `{{…}}` placeholders and
  `GP.init({...})` calls exactly as each page has them; `gp.js` must never contain `</script`.
- No real names, emails or links anywhere in the repo (public repo; Handbook 38.8.48.3). Invented
  examples only ("Example Ward", go.example.org).
- Every page keeps `siteFooter`-equivalent text: the independence disclaimer + Contact line already
  in each page's `<footer class="gp-footer">`.
- Every permission decision stays server-side. The UI only shows what an answer already carries; it
  never hides data the server sent "for safety" as a substitute for a server check, and never asks
  for data an action didn't return before.
- Do NOT edit `03-store.js`, `04-rules.js`, `05-requests-rules.js`, `08-api-public.js`,
  `09-api-leader.js` (2.4 owns rules/APIs). In `10-web.js` touch only `themeHead_`/`renderPage_`/
  `renderHubSections_` and page titles if needed. If a page needs a field no action returns, stop
  and report it under Blocked (the orchestrator asks 2.4).
- Status words, exactly: **Approved**, **Leader**, **Needs approval**, **Email not confirmed**,
  **Declined**, **Revoked**, and on My sign-ups **Confirmed**. Each = ringed icon + coloured word
  (theme-b `.chip`), never colour alone.
- Dates always with the weekday ("Wed, Dec 2"); tiles "WED / 2 / Dec" on Service Opportunities.
  Date strings stay `YYYY-MM-DD` and weekday maths uses UTC (`GP.utc`/`GP.iso`), never local `Date`.
- Buttons ≥ 44px tall; navy filled = main action, white + navy outline = the rest, red outline =
  Remove / Decline / Cancel. Layout works at 360px wide with no horizontal scroll.
- `npm run gp:build` after every page/script change; `dist/` is generated and committed, never
  hand-edited. Verification: `npm test && npm run typecheck && npm run gp:build:check`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Editing an existing post round-trips.** getPost → form → savePost with no change must send the
   same slots with the same `slotId`s (sign-ups hang off them); changing roles on one date or
   skipping a date in Every week must not re-id the other dates' slots. Test in Task 5.
2. **Every week across month ends and DST** (e.g. Mon/Wed/Fri from Fri Oct 30 to Mon Nov 9, 2026):
   correct dates and weekday labels; Until before From → a clear error, no dates; > 60 dates refused
   with a message. Test in Task 2.
3. **Old sheet data with today's answers**: a sign-up status/volunteer status the UI doesn't know
   (or a missing field) shows a neutral chip with the raw word, never crashes the page. Test in Task 2.
4. **Theme settings still apply**: theme_background_url becomes the top band picture, theme_accent /
   theme_font / theme_heading_font still recolour/re-font, bad values still ignored (existing
   theme tests updated, not deleted). Test in Task 1.
5. **Filled and full posts**: filled rows greyed and not selectable (keyboard too), a post whose
   every row is filled shows "All filled" and no submit; Youth/Children ask "Me / My child" as today.
   Test in Task 4.

---

### Task 1: Hymnal design system (gp.css, theme hook)

**Files:** Modify `google-portal/pages/gp.css` (rewrite), `google-portal/apps-script/10-web.js`
(`themeHead_` only); Test `google-portal/test/theme.test.mjs`.

**Interfaces — Produces:** CSS variables `--gp-band` (top band image), `--gp-accent`, `--gp-link`,
`--gp-button`, `--gp-font`, `--gp-heading-font`, `--gp-gold-deep`; classes `.gp-chip.gp-chip-{ok,leader,wait,email,bad,neutral}`
with `.gp-ic`, `.gp-btn`, `.gp-btn.gp-light`, `.gp-btn.gp-danger`, `.gp-tile`, `.gp-rows` (date/role
radio rows), `.gp-filters`, plus the leader layout classes (`.gp-appbar`, `.gp-tabs`, `.gp-full`,
`.gp-sheet`, `.gp-strip`, `.gp-cal`). Keep the `gp-` prefix on every class.

- [ ] Port theme-b tokens + final.css + the needed parts of common.css/member.css into gp.css
  (Georgia; navy #1d3557 ink/buttons; gold accent; deep gold weekdays; paper #fcfcfa; 4px corners;
  hairline rules; 1px navy rule under section headings; band 300px, 380px ≥900px). Default band =
  `pastures.svg` from the drafts folder inlined as a `data:image/svg+xml` URI (it is a drawn stand-in,
  no real photo). Add a print stylesheet (no band, no tabs, black ink).
- [ ] Tests first in theme.test.mjs: theme_background_url → `--gp-band: url("…")` (and no longer the
  old gradient panel vars); accent/font tests keep their contrast rule; bad values still ignored and
  reported. Update the existing assertions for the new variable names.
- [ ] `themeHead_`: emit `--gp-band` for the picture; keep the accent/link/button contrast rule and
  font link as now.
- [ ] Build, run theme tests, commit.

### Task 2: Shared helpers in gp.js

**Files:** Modify `google-portal/pages/gp.js`; Test new `google-portal/test/gp-helpers.test.mjs`
(load gp.js in `vm` the way `leader-page.test.mjs` loads page scripts).

**Interfaces — Produces:**
- `GP.icon(name) → SVG element` — the icon set from common.js that the pages use (check, clock,
  mail, x, shield/leader, calendar, people, more(•••), print, qr, plus, chevrons).
- `GP.chip(kind, word?) → element` — kind ∈ `approved|leader|needs|email|declined|revoked|confirmed`;
  unknown kind → neutral chip showing `word` (Review Focus 3).
- `GP.signupKind(signup) → kind` mapping today's answers: sign-up `Waiting-email` → `email`,
  `Waiting-approval` → `needs`, `Confirmed` → `confirmed`; volunteer `Approved/Declined/Revoked` →
  `approved/declined/revoked`; leader flag → `leader` (use whatever field the answers already carry).
- `GP.weekday(iso) → 'Wed'`, `GP.fmtDate` keeps "Wed, Dec 2"; `GP.tile(iso) → {dow:'WED', day:'2', mon:'Dec'}`.
- `GP.sched.weekly(weekdays:number[0-6], from:iso, until:iso, skip:iso[]) → {dates:iso[], error?}`
  (reuse `expandDates`; error strings: "Until is before From.", "That is more than 60 dates; pick a
  shorter range."); `GP.sched.byWeek(dates) → [[iso…]…]` grouped Sun–Sat.
- [ ] Tests first: chip words and icon present for every kind; unknown kind; signupKind table;
  weekday/tile; weekly across Oct 30–Nov 9 2026 with Mon/Wed/Fri = Fri Oct 30, Mon Nov 2, Wed Nov 4,
  Fri Nov 6, Mon Nov 9; skip removes one; until<from error; >60 error; byWeek grouping.
- [ ] Implement; build; commit.

### Task 3: Member pages — hub sections, Serve, Help, Confirm, My sign-ups

**Files:** Modify `google-portal/pages/{hub-sections,serve,help,confirm,me}.html`; Tests in
`google-portal/test/pages.test.mjs`, `serve-everyone.test.mjs`, `me.test.mjs`, `pages-offers.test.mjs`
(update for new markup; keep every behavioural assertion).

- [ ] **Hub sections**: v4 hub cards for Service Opportunities and Service Requests (QR button +
  short link as today's snippet does), in the Hymnal look; keep the `{{SERVE_SHORT_LINK}}` /
  `{{HELP_SHORT_LINK}}` placeholders and the comment that says where the sections go.
- [ ] **Serve**: band, ward name + title centred; filter buttons All · Everyone · Brothers · Sisters ·
  Youth · Children (aria-pressed; filters client-side over the posts already loaded; a filter with
  no posts shows "Nothing open for <group> right now."); each post with a date tile, audiences,
  organization, dates (weekday) and how full it is; the Everyone section (decision 23) and the
  Christmas "Offer to give" card (decision 17) kept. Test: filter Sisters hides Brothers-only posts and
  keeps Everyone posts listed once under Everyone.
- [ ] **Help**: tiles that open the forms, as v4.
- [ ] **Confirm**: one state per email link (existing `?a=`/token handling unchanged): heading says
  what this is ("Confirm your email" / "Cancel your sign-up" / "Withdraw your offer"), a line saying
  where they stand (post title, date, role when the existing answer gives them), ONE button, then the
  result text ("Confirmed.", "Cancelled.", "Withdrawn.") replacing the button. Errors/expired link
  keep today's messages. Test each of the three states renders one button and the result.
- [ ] **My sign-ups**: coming-up list with Confirmed / Needs approval / Email not confirmed chips,
  private details only where today's answer has them, Cancel as today.
- [ ] Build; update tests; commit per page or together.

### Task 4: Sign-up page (post.html)

**Files:** Modify `google-portal/pages/post.html`; Tests `pages.test.mjs` /
`approve-on-post.test.mjs` as they touch post.html.

- [ ] Band, ward name and title centred, organization · audience line, the note. Then "Sign up ·
  Pick a date and role": one full-width row per (date, role): radio, weekday in gold, "Dec 2, 5:30 pm
  · Bring dinner", "N open" or "Filled" on the right. Filled rows greyed, radio `disabled`, not
  focusable/selectable. Every post uses this list (no day strip here). Youth/Children "Me / My child"
  as today. All rows filled → "All filled" and no submit button. The sign-up answer stays
  `TEXT.signupThanks` (server text).
- [ ] Tests: filled row's input disabled; open row selectable and submits the same `signup` fields as
  today (slotId etc.); all-filled shows no submit.
- [ ] Build; commit.

### Task 5: Leader page — Meadow layout and the scheduler

**Files:** Modify `google-portal/pages/leader.html` (restructure); Test
`google-portal/test/leader-page.test.mjs` (+ new cases).

**Interfaces — Consumes:** Task 2 helpers. **Keeps:** every existing `call('<action>', …)` with the
same fields: whoami, requestLeaderLink, signOutEverywhere, waiting, needsHelp, volunteers, listPosts
(+past), getPost, savePost (draft/publish/close), cancelDate, cancelPost, removeSignup, decide, and
any other action the current file calls (inventory them first; a test asserts the full list is still
present in the built page).

- [ ] **Layout**: app bar (ward name, title, ••• for Sign out everywhere and any other page-level
  item today's page has); tabs along the bottom: Opportunities, Waiting (count badge from `waiting`),
  New, Short soon (`needsHelp`), Volunteers. Banner on Opportunities when people need approval
  (count > 0) that opens Waiting. Past posts stay reachable (toggle in Opportunities).
- [ ] **Post view**: a post with more than one date shows the day strip (one date at a time, weekday
  on each); Edit, Copy the link, Copy this post, Close, Cancel this opportunity behind •••. One line
  per person: name, status chip (Task 2), then buttons in this order: Approve, Decline, Remove,
  Cancel this date (Cancel this date only on a date's last line, only for posts with > 1 date);
  buttons wrap under the name below 560px. Approve/Decline only where the answer says the leader may
  (today `canDecide`), same confirmations as now.
- [ ] **Full-screen form** (New and Edit): What, When, Roles, Notes; Save draft + Publish fixed at
  the bottom. When = segmented Once · Pick days · Every week:
  - Once: one date + times.
  - Pick days: month calendar; dots on days that already have an opportunity (from the listPosts
    answer already loaded — no new call); tapping toggles; chosen dates listed with ×.
  - Every week: "Every [Sun]…[Sat] from [date] until [date]" — 7 weekday buttons in ONE row; the
    dates appear below at once, grouped by week (`GP.sched`), each with a skip switch.
  - Every date shows its weekday; roles are set once for every date; each date has **Change** to give
    that date its own roles (the form model's per-date roles, which `flatten` already supports).
  - Edit of an existing post opens in Pick days with its dates (not reverse-engineered into Every
    week) and preserves each slot's id (Review Focus 1).
  - Stale-link relink box (decision 22) still appears above the form and keeps typed values.
- [ ] Tests first: action inventory; person-line order and wrap class; Cancel this date only on the
  last line of a multi-date post; Every week Mon/Wed/Fri preview then save → slots for those dates
  with the shared roles; skip one → that date absent; Change on one date → only that date's slots
  differ; edit round-trip keeps slotIds; relink keeps form; calendar dot on a day with a post.
- [ ] Build; commit.

### Task 6: Hub repo — Print poster, sections, refreshed pages

Repo `m44ward/m44links`, branch **`service-portal-pages` only** (never main, no PR). Clone to the
scratchpad; push as the hub owner's account, with the commit author the coordinator's brief
gives; never main, no PR. The hub holds
the ward's real names/links — that's the ward's repo; never copy any of it into WardForward.

- [ ] index.html QR pop-up: add a **Print** button that opens a one-link poster (the v4 "Print view":
  the link's title, big QR, the short link, ward name; print CSS, A4/Letter portrait) for that one
  link. Reuse the page's existing QR drawing.
- [ ] Replace the two Service Portal sections with Task 3's hub-sections markup (filled with the
  short links already on the branch) and the six pages with copies rendered from this branch:
  `renderPage_(name, settings, false)` with the ward values taken from the current copies on the
  branch (WARD_NAME, WEB_APP_URL, CONTACT_EMAIL, PREVIEW_IMAGE, the theme head). Do this step only
  after the reviewer's PASS (the orchestrator will say so); before then, push only the Print button.
- [ ] Open index.html locally; check the pop-up, Print, and one page at 360px.

### Task 7: Docs, spec decision, test plan Draft 5

- [ ] `google-portal/LEADER-GUIDE.md`, `SETUP-GUIDE.md`: the new leader layout (tabs, ••• menu,
  Every week / Pick days / Change / skip), the Print poster on the hub, and re-run Make hub files.
- [ ] Spec §12 decision 24: "Version 4 design (Sam, 2026-11-27): Hymnal on every page, Meadow layout
  on the leader page, Meadow audience filters on Service Opportunities; roles once per post with
  Change per date; skip a date in Every week; Decline kept on the person line; buttons wrap on phones;
  'Needs approval' is the status word; red Declined/Revoked visible to every leader (who decided only
  for bishopric/approvers); Print in the QR pop-up."
- [ ] Project `CLAUDE.md` Google-only portal section: one sentence for 2.5.
- [ ] Test plan: with the docx skill make
  `drafts/Service-Portal-Test-Plan-DRAFT-5.docx` from DRAFT-4
  (same folder): rewrite every click for the new UI (tabs, full-screen form, scheduler, day strip,
  ••• menu, person line, chips, Serve filters, sign-up rows, Confirm states, Print poster) and add
  rows for 2.4's features (Approvers / default_approvers, Pre-approve box, status marks, Volunteers
  list any-leader vs bishopric/approver view, Approve in both places) from the 2.4 contract. Render
  and check every page; move DRAFT-4 to `drafts/archive/`. Invented names only.

### Task 8: 2.4 UI (against the contract)

Contract: `2-4-api-contract.md` in the coordinator's side-session notes.
If it isn't there yet, do Tasks 1–7 first and report this task as Not done; the orchestrator resumes
you when it arrives.

- [ ] Pre-approve box (leader page; where the contract says, who may see it as the contract's
  answer says), status marks from the contract's fields through `GP.signupKind`, the Volunteers tab:
  every leader sees name + chip, how many coming up, first sign-up, search, status filter, sort by
  name / most recent, children under their parent, red Declined/Revoked for all; emails, who decided
  and Approve/Decline/Revoke/Undo only when the answer carries them. Approve also on the post (Task 5).
- [ ] Tests with a stubbed `GP.call` returning the contract's example answers: any-leader answer
  shows no emails/actions; bishopric answer shows them; search/filter/sort; children nested.
- [ ] After 2.4 merges to main the orchestrator has you rebase onto main (resolve conflicts in this
  branch's favour only for `pages/*` and the UI parts of `10-web.js`; take main's for everything
  else), rebuild dist, rerun the full verification.

## Done

`npm test && npm run typecheck && npm run gp:build:check` green; every page matches v4 at 360px and
desktop (screenshots checked against the mockups); no real names/emails added to this repo; hub
branch pushed (Print first, pages after PASS); DRAFT-5 written and DRAFT-4 archived. After merge Sam
pastes the new Code.gs, makes a new deployment version, and re-runs Make hub files.
