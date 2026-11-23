# Executive Secretary "Start here" track — Implementation Plan

> Run by the orchestrator skill (one implementer, one reviewer per phase). Ignore any
> per-task subagent instruction. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Start here page that lists 14 ordered catalog solutions with each one's status for
the ward, plus the how-to content and template files for those 14 steps.

**Architecture:** One new column `solutions.setup_step`; a loader in `src/lib/startHere.ts` reads
published step solutions and the ward's ward-level implementations through the existing
`canViewImplementation`; a view renders the page and the home card. Step content is authored as
Markdown files in `content/start-here/`, compiled by a Node script into an idempotent seed SQL.
Template files (interview router, rotation trackers) live in `templates/`.

**Tech Stack:** Hono on Cloudflare Workers, D1, Vitest (`@cloudflare/vitest-plugin`), Node for
the seed generator and the Apps Script tests, Google Apps Script for the templates.

**Spec:** `docs/superpowers/specs/2026-11-23-execsec-start-here-design.md` (read it first; its
§3 table is the source of every step's title and "Done when").

## Run order and merges

Phases run **A → B+D → C**, each on the same branch, each reviewed, each ff-merged into `main`
by the coordinator before the next starts. B and D are grouped because they are both content and
Sam reviews their text as ONE .docx. Before each later phase: `git merge --ff-only main` (or
rebase onto `main` if it moved) so the phase starts from merged main.

## Global Constraints

- No deploy, never push, never commit to `main`. Never commit or print `.dev.vars`.
- `npm test && npm run typecheck` green before every report; never more than 2 `npm test` at once.
- New page shells render `siteFooter()`. No Church name, wordmark or symbol as branding.
- Never copy real member data (names, emails, calendar IDs, phone numbers) into the repo, tests,
  seeds or chat. Tests use invented people (`@example.test`).
- Read-only originals, never edited: `F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio\`,
  `S:\Data\App Data\Assignments - Bishopric Mtg\`, `S:\Data\App Data\Assignments - Ward Council\`,
  the zippa.run project. Extract zips to the scratchpad, never beside the original. The trackers'
  standalone HTML copies and `*-backup-*.json` files hold real names: do not open them; use only
  the `AppScript Version\*.zip`, and strip any names you find there too.
- Committed files call the template owner "the WardForward templates account" (never its address).
- Copy: "Not started" / "In progress" / "Done" for `not_started` / `in_progress` / `implemented`.
- Never sign in to any Google account.

## Review Focus

1. A restricted implementation the viewer can't see: row shows the step with no status and no
   owner, and it is neither counted as Done nor chosen as Next (test in Task A2).
2. A solution with `setup_step` set but `status` draft/submitted/rejected never appears (A2).
3. Two published solutions with the same `setup_step`: both shown, ordered by step, then
   `position`, then `title` (A2).
4. Operator types `0`, `-3`, `2.5`, `abc` or `1000` in Setup step: form re-renders with an error,
   nothing saved; blank saves NULL (A1).
5. Template files carry no M44 data: no `@group.calendar.google.com` ID that isn't a placeholder,
   no "Mapleton", no "M44", no PIN `1830` (test in B2 / C1).

---

## Phase A — the page

### Task A1: `setup_step` column, upgrade SQL, operator field

**Files:**
- Modify: `db/schema.sql` (solutions: `setup_step INTEGER` after `position`), `SCHEMA.md`
- Create: `db/upgrade-2026-11-23-start-here.sql` (`ALTER TABLE solutions ADD COLUMN setup_step INTEGER;`)
- Modify: `src/lib/solutions.ts` (`Solution.setup_step: number | null`; `SolutionInput.setupStep: number | null`; create/update write it)
- Modify: `src/views/catalog.ts` `renderSolutionForm` (input `name="setup_step"`, label "Setup step (Start here order; blank = not in the track)") and `renderOperatorSolutions` (show the step number when set)
- Modify: `src/app.ts` operator solution POST handlers (parse + validate)
- Test: `test/startHere.test.ts` (new)

**Interfaces:**
- Produces: `parseSetupStep(raw: unknown): { ok: true; value: number | null } | { ok: false; error: string }` in `src/lib/solutions.ts`. Blank/whitespace → `null`; an integer 1–99 → that number; anything else → `{ ok:false, error:'Setup step must be a whole number from 1 to 99, or blank.' }`.

- [ ] Write failing tests: `parseSetupStep` cases (`''`→null, `'7'`→7, `'0'`,`'-3'`,`'2.5'`,`'abc'`,`'100'`→error); operator POST `/operator/solutions/:id` with `setup_step=3` stores 3, with `setup_step=abc` returns 200 with the error text and leaves the column unchanged; a test that `db/upgrade-2026-11-23-start-here.sql` applied to a schema without the column yields the same `solutions` columns as `db/schema.sql` (follow the existing upgrade-file test pattern in `test/schema.test.ts` if one exists).
- [ ] Run `npx vitest run test/startHere.test.ts` — FAIL.
- [ ] Implement.
- [ ] Run — PASS. Commit "Start here: setup_step column and operator field".

### Task A2: loader, page, home card, catalog link

**Files:**
- Create: `src/lib/startHere.ts`, `src/views/startHere.ts`
- Modify: `src/app.ts` (route `GET /w/:wardId/start`, ward home passes the summary), `src/views/pages.ts` `renderWardPage` (card at the top), `src/views/catalog.ts` `renderCatalog` (link "Start here: the Executive Secretary's setup steps" above the list)
- Test: `test/startHere.test.ts`

**Interfaces:**
- Produces, in `src/lib/startHere.ts`:
  ```ts
  export type StepStatus = 'not_started' | 'in_progress' | 'implemented';
  export interface StartHereRow {
    step: number; solutionId: string; title: string; summary: string | null;
    status: StepStatus | null;      // null = hidden from this viewer
    ownerName: string | null;       // null when hidden or no owner
    isNext: boolean;
  }
  export interface StartHere { rows: StartHereRow[]; done: number; total: number; next: StartHereRow | null }
  export async function loadStartHere(env: Env, wardId: string, userId: string): Promise<StartHere>
  ```
  Rows: published solutions with `setup_step IS NOT NULL`, `ORDER BY setup_step, position, title`. Status from `wardImplementationMap`; no implementation → `'not_started'`; implementation the viewer can't see (`canViewImplementation` false) → `null`. `done` counts visible `implemented`; `total` = rows.length; `next` = first row whose status is non-null and not `implemented` (it gets `isNext`). Owner names in one query (`users` by id IN …), not one per row.
- Produces, in `src/views/startHere.ts`: `renderStartHere(user, ward, sh: StartHere): string` (uses `layout()`, so `siteFooter()` comes with it) and `startHereCard(wardId: string, sh: StartHere): string`.

Page copy: `<h1>Start here</h1>`, intro "The Executive Secretary's setup steps, in a good order. Order is advice, not a lock: open any step. Mark a step's status on its own page." Each row: "Step N", linked title (`/w/:wardId/s/:solutionId`), summary, status label (hidden → "Private", muted), owner ("Owner: Name") when present; the Next row has class `next` and a "Next" badge. Home card: `Start here: {done} of {total} done · Next: {title}` linked to `/w/:wardId/start`; when `total > 0 && done === total` it is the small link "Start here ✓"; when `total === 0` no card. Route: 404 page for unknown ward, 403 for non-members (same pattern as `/w/:wardId/catalog`).

- [ ] Write failing tests (invented ward and users; seed three step solutions in the test plus one draft with a step and one published without a step): order by step/position/title incl. a duplicate step; draft and stepless excluded; statuses map to the three labels; Next = first not-done visible row; restricted implementation owned by someone else, viewed by a plain member → row "Private", not counted, not Next; same viewed by the superadmin → status shown; home card text `Start here: 1 of 3 done · Next: <title>`; all done → `Start here ✓`; no step solutions → no card; catalog page contains the link; `/w/:wardId/start` 403 for a non-member, footer text present.
- [ ] Run — FAIL. Implement. Run — PASS.
- [ ] Check `test/accessQueryCount.test.ts`: if the ward home page is counted there, update its expected count deliberately and say so in the report (the card adds a bounded number of statements).
- [ ] Commit "Start here: page, home card, catalog link".

### Task A3: landing line, content pipeline, starting seed, docs

**Files:**
- Modify: `src/views/landing.ts` — under the tagline add `<p class="tag">New Executive Secretary? Your first move is to sign in and request your ward. An operator approves each ward, and then your setup steps are waiting under Start here.</p>`
- Create: `content/start-here/NN-<slug>.md` × 14, `scripts/build-start-here-seed.mjs`, `db/seed-start-here.sql` (generated, committed)
- Modify: `package.json` (`"seed:start-here": "node scripts/build-start-here-seed.mjs"`, `"seed:start-here:check": "node scripts/build-start-here-seed.mjs --check"`, `"db:seed:start-here:local": "wrangler d1 execute wardforward-db --local --file=./db/seed-start-here.sql"`), `CLAUDE.md` (local steps + Status line), `IMPLEMENTATION.md` §10 items 3–5 (status)
- Test: `test/startHere.test.ts`, `test/copy.test.ts` or `test/footer.test.ts` for the landing line

**Content file format** (frontmatter, then the Markdown body that `mdLite` renders: `##`/`###` headings, `- ` lists, paragraphs, inline links; no tables or code blocks):
```
---
id: sol_es_role_account
step: 1
title: Create the ward's role account
summary: <one line>
category: exec_secretary
template_type:
template_value:
---
<body>
```
The 14 ids/steps/titles (titles verbatim from spec §3): 1 `sol_es_role_account`, 2 `sol_es_wardforward_setup`, 3 `sol_es_google_plan`, 4 `sol_es_leader_calendars`, 5 `sol_es_booking_pages`, 6 `sol_es_interview_router`, 7 `sol_es_zippa_links`, 8 `sol_es_public_portal`, 9 `sol_es_service_sections`, 10 `sol_es_foyer_flyer`, 11 `sol_es_zoom`, 12 `sol_es_bishopric_rotation`, 13 `sol_es_council_rotation`, 14 `sol_es_handoff_note`. All `exec_secretary`, `ward_singleton`, `published`. Phase A bodies: a "Done when" section with the spec's §3 text as a list, then "Full how-to coming soon."

Generator: reads every `content/start-here/*.md`, validates (unique id and step, step 1–99, required title/summary, slug = the filename's `<slug>` part), writes `db/seed-start-here.sql` as one `INSERT INTO solutions (...) VALUES (...) ON CONFLICT(id) DO UPDATE SET <every content column>, updated_at = datetime('now');` per file, SQL-escaping `'`. Re-running the seed refreshes text and `setup_step`. `--check` exits 1 with "db/seed-start-here.sql is out of date; run npm run seed:start-here" when the file differs.

- [ ] Write failing tests: landing HTML contains "request your ward"; applying `db/seed-start-here.sql` (via `?raw`, like `db/schema.sql`) twice to the test D1 gives 14 published `ward_singleton` rows with `setup_step` 1–14 and the spec titles in order; `loadStartHere` over it returns 14 rows.
- [ ] Run — FAIL. Implement. Run — PASS; `npm run seed:start-here:check` exits 0.
- [ ] Commit "Start here: landing line, content pipeline, seed".

**Phase A done:** `npm test && npm run typecheck && npm run seed:start-here:check` green; `wrangler dev` walk-through with a dev-login superadmin: home card, Start here page, operator Setup step field, landing line.

---

## Phase B+D — content for steps 1–11 and 14 (one review .docx)

### Task B1: how-to bodies

**Files:** `content/start-here/01…11, 14-*.md`; regenerate `db/seed-start-here.sql`; `db/seed-solutions.sql` (remove `sol_ex_interviews` and `sol_ex_bulletin`, add `DELETE FROM solutions WHERE id IN ('sol_ex_interviews','sol_ex_bulletin');` so re-seeding removes them from existing local DBs).

Sources (read-only): spec §2 and §3; `F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio\HANDOFF-TO-WARDEST.md`, `WardLinksPlaybook.html`, `InterviewRouter.gs.txt` (the production router per the handoff; `M44-InterviewRouter-Updated.txt` only to see what changed); `F:\!SLRFam\AI\Claude-Apps\Wardest.com\Wardest-Catalog-Howtos-DRAFT.docx` (Solutions 1–3); `docs/superpowers/specs/2026-11-22-service-opportunities-requests-design.md` and the real ward-settings UI for step 9; zippa.run decision 0019 (`F:\!SLRFam\AI\Claude-Apps\zipa.run\`, read only) for step 7.

Each body: "What this gives the ward" (2–3 lines), numbered-in-text steps as a `- ` list, a "Done when" list (spec §3, expanded), and notes. Fixed content:
- Step 1 ends with a note: send the zippa.run access request from the role account as soon as it exists (approval takes time).
- Step 2 carries spec §2 item 9: the bishop approves the ward joining; keep at least two administrators (bishop + Exec Sec); Ward Clerk goes in the Bishopric space; an Activities chair or Ward Mission Leader outside the Ward Council space sees only their own organization's posts until added; ignore spaces the ward doesn't use. Cite "General Handbook 38.8.21.2" by number only.
- Step 7 teaches the role account as the zippa.run creator bound to the ward's prefix; extra slugs are requests the operator approves; WardForward can't create the links.
- Step 8 is WardForward's own portal (deliverables published to Public with the short link pasted; the portal's share link set), not GitHub Pages; mention the demo site may be copied, as an example only.
- Step 9: both service sections on, each with its zippa.run link pasted in ward settings (examples `zippa.run/m44Serve`, `zippa.run/m44Help` are fine as format examples), each default category's owner checked; optional delegates and a Discord channel webhook per category.
- Step 11 (Zoom, from Playbook §11 + Solution 3): Zoom on the role account, open-join meetings, recording / transcripts / AI companion off; never store interview details (Handbook 38.8.32).
- Step 14 (Playbook §9–10): the hand-off note lives in the role account's Drive and lists every account and tool, where it lives, and what to change when a leader is released.
- No M44 names, calendar IDs, emails or phone numbers anywhere; "Mapleton 44th" never appears.

- [ ] Write a failing test: every `content/start-here/*.md` body for steps 1–11 and 14 is longer than 600 characters and contains "Done when"; no content file matches `/@group\.calendar\.google\.com|Mapleton|1830/`; step 2 contains "38.8.21.2"; step 1 mentions "zippa.run"; seed no longer contains `sol_ex_interviews` / `sol_ex_bulletin` except in the DELETE. (Content files reach the Workers test runtime via `?raw` imports or via the generated seed SQL; pick one and say which.)
- [ ] Run — FAIL. Write content. Regenerate seed. Run — PASS. Commit "Start here: how-tos for steps 1–11 and 14".

### Task B2: generalized interview router

**Files:** Create `templates/interview-router.gs` (from the production `InterviewRouter.gs.txt`: every calendar ID → `PASTE_<LEADER>_CALENDAR_ID_HERE`, every name → a calling name tag like `[Bishop]`, `[1st Counselor]`, `[2nd Counselor]`, `[Exec Sec]`; a header comment saying what to replace and that the role account runs it every minute). Serve it at `GET /templates/interview-router.gs` as `text/plain; charset=utf-8` (no auth; it holds no data). Step 6's `template_type: file`, `template_value: /templates/interview-router.gs`.

Import choice is the implementer's: a Text module rule in `wrangler.toml` if both `wrangler dev` and the Vitest pool accept it, otherwise a TS module exporting the code with `String.raw`. Keep `templates/interview-router.gs` the one editable copy (if TS, generate it from the .gs with the seed script and check it with `--check`).

- [ ] Failing tests: GET `/templates/interview-router.gs` → 200, `text/plain`, body equals the file, contains `PASTE_` placeholders; body matches none of `/[a-z0-9]{16,}@group\.calendar\.google\.com/`, `Mapleton`, `M44`.
- [ ] Run — FAIL. Implement. Run — PASS. Verify `safeHref` lets the relative `template_value` through on the solution page (test it). Commit "Start here: generalized interview router template".

### Task B3: review .docx for Sam

Generate ONE Word file `F:\!SLRFam\AI\Claude-Apps\Wardest.com\drafts\WardForward-ExecSec-Howtos-DRAFT-1.docx` (outside the worktree; not committed) from the content files for steps 1–11 and 14, plus the router header comment as an appendix: title page "WardForward — Executive Secretary Start here how-tos (draft 1, for Sam's review)", one heading per step in step order, readable fonts. Use the docx skill or a script in the scratchpad. Report the path.

**Phase B+D done:** `npm test && npm run typecheck && npm run seed:start-here:check` green; docx exists and opens (check with a docx-to-text read).

---

## Phase C — rotation trackers (steps 12–13)

### Task C1: hardened Apps Script tracker

**Files:** Create `templates/rotation-tracker/Code.gs`, `templates/rotation-tracker/Index.html`, `test-gs/tracker.test.mjs`; `package.json` `"test:gs": "node --test test-gs/"`.

Start from `Bishopric meeting assignment tracker.zip` and `Ward council assignment tracker.zip` (extract to the scratchpad). If the two codes differ only in defaults, keep one `Code.gs` with `const TRACKER_KIND = 'bishopric'; // or 'ward_council'` at the top choosing the default calling list; otherwise keep two folders. Hardening:
- First run (no Config PIN): create tabs Members / History / Config / Editors, set a random 6-digit PIN from `Utilities.getUuid()`-derived digits (never a constant), write it to Config and show it once (alert or the Config tab note). No shared or default PIN anywhere; `1830` must not appear.
- Throttle wrong PINs: after 5 wrong guesses within 15 minutes (counted in `CacheService.getScriptCache()`), refuse all PIN checks for 15 minutes with "Too many wrong PINs. Try again in 15 minutes."; a right PIN resets the count.
- Generic calling list only. Bishopric: Bishop, 1st Counselor, 2nd Counselor, Executive Secretary, Ward Clerk. Ward Council: Bishop, 1st Counselor, 2nd Counselor, Elders Quorum President, Relief Society President, Young Women President, Primary President, Sunday School President, Ward Mission Leader, Executive Secretary, Ward Clerk.
- Recommendation rule unchanged (least of that item, then fewest overall, then longest since last turn, then calling order).

Tests (`node --test`, loading `Code.gs` in `node:vm` with stubbed `SpreadsheetApp`, `CacheService`, `Utilities`, `PropertiesService`): two first runs give different 6-digit PINs; 5 wrong then right → refused; wait past window (stub clock) → right accepted and count reset; default list for each kind equals the lists above; recommender picks per the rule on an invented 4-person history; files contain no `1830`, `Mapleton`, `M44`, or `@`-addresses.

- [ ] Write tests — FAIL. Implement. `npm run test:gs` — PASS. Commit "Trackers: hardened Apps Script template".

### Task C2: guide, solutions, owner-step packet

**Files:** `content/start-here/12-bishopric-rotation.md`, `13-council-rotation.md` (the 7-step setup guide from the zip's PDF, rewritten to match the hardened code: Make a copy → open Extensions › Apps Script → run setup once and note the PIN → Deploy as web app (Execute as: me; Who has access: anyone with the link) → add editors → paste the web app link as a deliverable in the Bishopric / Ward Council space → mark Done); `template_type: google_copy`, `template_value:` blank until Sam's Sheets exist (the body says the "Make a copy" button appears once the template is published); regenerate seed. `docs/owner-steps/2026-11-23-tracker-templates.md`: exact clicks for Sam to create each template Sheet in "the WardForward templates account" (new Sheet, name, Extensions › Apps Script, paste `Code.gs` and `Index.html`, set `TRACKER_KIND`, do NOT run setup so the template stays blank, share "Anyone with the link: Viewer", copy the `/copy` URL, test that a copy made from another account carries the script, then the operator pastes the `/copy` URL into the solution's Template value). Confirm from Google's documentation that copying a Sheet copies its bound script and cite the page in the owner-step file.

- [ ] Failing test: step 12 and 13 bodies contain "Make a copy", "Deploy", "PIN" and no `1830`. Implement. PASS. Commit "Trackers: guide, solutions, owner steps".

**Phase C done:** `npm test && npm run typecheck && npm run seed:start-here:check && npm run test:gs` green.
