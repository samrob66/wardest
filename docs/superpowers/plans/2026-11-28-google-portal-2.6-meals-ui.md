# Google-only portal 2.6-ui — meals pages (UI half) Implementation Plan

> Run by the orchestrator skill: one implementer, one reviewer, up to 3 fix rounds. Branch
> `claude/google-portal-2-6-ui` off origin/main a01581b. The server half (branch
> `claude/google-portal-2.6`, another session) merges first; this branch then rebases onto main.
> Target: Sam tests tonight, Sat Nov 28, 7 pm Denver. Keep it lean.

**Goal:** The v4 Hymnal pages show and edit meal posts: Help's two meal tiles, the category picture,
the public meal block (allergies first), the leader page's Show-on-Serve switch, progress checklist,
family emails and meal fields, and the zero-slot draft flow.

**Architecture:** UI only, against the written contract
(`2-6-api-contract.md` in the coordinator's side-session notes; read it in full). Pages render the new answer
fields when present and behave exactly as today when they're absent (Sam's live script may be older
than the pages for a while). Shared bits (picture, meal block) go in `gp.js` so post, serve and
leader draw them the same way.

**Spec:** `docs/superpowers/specs/2026-11-28-google-portal-meals-design.md` (decision 28), on top of
`2026-11-24-google-only-alternative-design.md` (decisions 1–27). Design language: the v4 Hymnal
system already in `google-portal/pages/gp.css` (2.5). There is no meals mockup: reuse existing
gp-* patterns (rules, chips, switch `.gp-sw`, buttons, tiles).

## Global Constraints

- You own `google-portal/pages/*` and only the HTML-rendering parts of `apps-script/10-web.js`
  (`themeHead_`, `renderPage_`, `renderHubSections_`). Do NOT edit any other apps-script file; if a
  page needs a field the contract doesn't give, stop and report it under Blocked.
- Pages run in Apps Script HtmlService and as static GitHub Pages files: no framework, no page build
  step, no relative assets, links via `GP.pageUrl`, `gp.js` never contains `</script`.
- No real names, emails, links, or anything from Sam's meals sheet, video or transcript. Fixtures use
  invented names ("the Example family", "Anna and Ben") and `https://img.example.test/…` pictures.
- Pictures: render only `https:` URLs (anything else → no picture), `alt=""` (decorative),
  `loading="lazy"`, fixed aspect box so the page doesn't jump; a picture that fails to load hides
  its box (`onerror`).
- Allergies come FIRST in the meal block and are highlighted (warning colour + icon + the word
  "Allergies"), never colour alone. Address and phones never appear in the public block (they stay
  in private details, server-side).
- Dates always with the weekday. Buttons ≥ 44px. 360px wide, no horizontal scroll.
- `npm run gp:build` after every change; dist generated and committed, never hand-edited.
  Verification: `npm run gp:build && npm test && npm run typecheck && npm run gp:build:check`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Older answers:** a post/serve/help/listPosts answer with no `picture`, `meal`, `progress`,
   `showOnServe`, `isMeal` or `familyEmails` renders exactly as on main. Test per page.
2. **Zero-slot draft:** a Draft with `slots: []` opens in the leader list, the post view (no day
   strip, no person lines, an "Add dates" prompt) and the form without errors; Publish on it shows
   "Add at least one date before publishing." and sends nothing; Save draft still works. Test in Task 3.
3. **Editors only:** the switch, checklist ticks and family emails field appear only when the post
   answer has `canEdit: true` (familyEmails is absent otherwise); a canEdit:false post (approver
   view) shows the checklist read-only or not at all, never the family emails. Test in Task 3.
4. **Unsafe values:** a `picture` of `javascript:…` or `http:` renders no image; meal strings with
   `<script>` render as text (use `GP.el` text nodes, never innerHTML). Test in Task 1.
5. **Switch / tick failures:** a refused or relink answer from setShowOnServe / setProgress puts the
   control back as it was and shows the message (relink box as decision 22). Test in Task 3.

---

### Task 1: Shared picture and meal block (gp.js, gp.css)

**Files:** Modify `google-portal/pages/gp.js`, `gp.css`; Test `google-portal/test/gp-helpers.test.mjs`.

**Produces:**
- `GP.picture(url, cls?) → element|null` — null unless `url` is `https:`; wraps an `<img>` in a
  `.gp-pic` box (`cls` `gp-pic-top` for the band-width picture above a title, `gp-pic-thumb` for
  Serve cards).
- `GP.mealBlock(meal) → element|null` — null when `meal` is missing or every field blank. Order:
  Allergies (highlighted, `.gp-allergy`), Favourite foods, Serves ("Feeds 2 adults, 3 kids" — show the
  server's `serves` string as given), Drop-off window, Drop-off ("Regular drop-off — knock or ring" /
  "Quiet drop-off — text on arrival"; any other value shown as given), Coordinate with. Blank fields
  are left out.
- [ ] Tests first: picture null for '', `http:`, `javascript:`; element for https; mealBlock null for
  undefined/all-blank; allergies is the first row and carries the highlight class + word; `<script>`
  text stays text; Quiet/Regular wording.
- [ ] Implement; build; commit.

### Task 2: Member pages (help, post, serve)

**Files:** Modify `google-portal/pages/{help,post,serve}.html`; Tests `pages.test.mjs`.

- [ ] **Help:** the two `meal-request-*` items render as ordinary tiles from the answer (names and
  urls from the server; no hard-coded names). Test: an answer with both meal items gives two tiles
  linking to their urls.
- [ ] **Post:** `GP.picture(post.picture,'gp-pic-top')` above the title; `GP.mealBlock(post.meal)`
  right after the organization · audience line and before the note and the sign-up rows. Test:
  picture + block present and ordered; absent fields → page as on main.
- [ ] **Serve:** each card shows `GP.picture(p.picture,'gp-pic-thumb')` beside its date tile (thumb
  ≤ 72px, card layout unchanged without one). Test: thumbnail only when `picture` is https.
- [ ] Build; commit.

### Task 3: Leader page

**Files:** Modify `google-portal/pages/leader.html`; Tests `leader-page.test.mjs`.

**Consumes:** contract items 4–7; Task 1 helpers.

- [ ] **Post view:** picture at the top; the meal block under the title; when `canEdit`:
  - "Show on Service Opportunities page" switch (`.gp-sw`, aria-checked) → `setShowOnServe
    {postId, show}`; on success take `showOnServe` and `progress` from the answer; on failure revert
    and show the message.
  - Progress checklist (`progress` array, in the server's order): a checkbox per item with its label
    and, when done, "by <by>, <weekday date time>" from `by`/`at`; ticking → `setProgress {postId,
    key, done}`, redraw from the answer's `progress`; `shown_on_portal` is read-only (follows the
    switch). Shown open by default on `isMeal` posts; on other posts behind a "Progress" disclosure
    (closed). canEdit:false → checklist read-only (no inputs) or hidden; never family emails.
  - Zero slots: no day strip and no person lines; a line "No dates yet. Add dates before publishing."
    with an **Add dates** button opening the form at When.
- [ ] **Form:** "Meal details" section when the chosen category is `meals-new-moms` or
  `meals-hardship`, or the post has `isMeal`/`meal`: Allergies (textarea, first), Favourite foods,
  Serves, Drop-off window, Drop-off (Regular / Quiet radio), Coordinate with. "Family emails" field
  (comma-separated; shown when editing a post whose answer has `familyEmails`, or a new post) with the
  hint "Each gets an email for every sign-up and cancellation (date, role, volunteer's first name)."
  A "Show on Service Opportunities page" checkbox (new posts: checked; edit: from `showOnServe`).
  `savePost` sends `meal`, `familyEmails` (string) and `showOnServe` in `post` alongside today's
  fields; fields left untouched are still sent with their loaded values.
  - Save draft with zero dates is allowed; **Publish** with zero dates shows "Add at least one date
    before publishing." and doesn't call savePost.
  - A meal-request draft may arrive with a scheduling hint in its note: show the note above When.
- [ ] Tests first: switch success/failure/relink revert; tick sends key/done and shows by/when;
  shown_on_portal not clickable; isMeal → checklist open, non-meal → closed; canEdit:false → no
  switch, no inputs, no family emails; zero-slot draft renders, Publish blocked, Save draft calls
  savePost with `slots: []`; savePost payload carries meal/familyEmails/showOnServe; a 2.5-shaped
  answer (no new fields) renders as on main.
- [ ] Build; commit.

### Task 4: Docs and test rows

- [ ] `google-portal/LEADER-GUIDE.md`: the switch, the checklist, family emails, meal fields, add
  dates before publishing. (SETUP-GUIDE belongs to the server build; don't edit it.)
- [ ] Write the UI test-plan rows (click by click, invented names, which leader, what they should
  see) to `2-6-ui-test-rows.md` in the coordinator's side-session notes folder (the folder the
  brief names); the
  orchestrator relays them to the server build's DRAFT-6.
- [ ] After the server half merges, rebase onto main when told (keep this branch's side only for
  `pages/*` and the UI parts of 10-web.js), add one test driving the leader page and post page
  against the real script's answers, rebuild dist, rerun verification.

## Done
Verification green; pages render the meals fields and the old answers unchanged; LEADER-GUIDE updated;
UI test rows written. After merge Sam pastes Code.gs, makes a new version, and re-runs Make hub files.
