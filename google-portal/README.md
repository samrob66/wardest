# google-portal: the Google-only volunteer portal

A ward's Service Opportunities sign-ups and Request Help forms built only from the ward's own
Google account (Sheets, Forms, Drive, Apps Script, Gmail) plus its hub page, with no WardForward
app and no outside service. Spec:
`docs/superpowers/specs/2026-11-24-google-only-alternative-design.md`. Phase 1 plan:
`docs/superpowers/plans/2026-11-24-google-portal-phase-1.md`. 1.1 plan (the whole bishopric
edits the Service Sheet and reads the Christmas and Other requests; spec §12 decisions 14–17, with the Christmas gift coordinators, Notify and the Christmas giving form, which 1.1.1 can show on the Service Opportunities page):
`docs/superpowers/plans/2026-11-24-google-portal-1.1-bishopric.md`.
Phase 2 plan (confirm your address, first-time approval, waiting counts, over-limit and
withdraw, nudges and lapses, My sign-ups, children, coordinators and fill warnings, Needs help
soon, the daily health email): `docs/superpowers/plans/2026-11-24-google-portal-phase-2.md`.
2.2 plan (turn a request into a draft opportunity from its request sheet; spec §12 decision 19):
`docs/superpowers/plans/2026-11-24-google-portal-2.2-turn-into-opportunity.md`.
2.3 plan (the ward's look on pages and request forms; spec §12 decision 20):
`docs/superpowers/plans/2026-11-24-google-portal-2.3-branding-and-test-plan.md`.
2.3.1 plan (test mode: Settings test_mail_only; spec §12 decision 21):
`docs/superpowers/plans/2026-11-25-google-portal-2.3.1-test-mail-only.md`.
2.3.2 plan (Approve on the post, the leader-page button line, stale-link warning; spec §12 decision 22):
`docs/superpowers/plans/2026-11-27-google-portal-2.3.2-approve-on-post.md`.
2.3.3 plan (multi-audience posts once, under Everyone; spec §12 decision 23):
`docs/superpowers/plans/2026-11-27-google-portal-2.3.3-everyone-section.md`.
2.4 plan (Approvers per category, the Pre-approve list, volunteer status data for the leader
page; spec §12 decision 24):
`docs/superpowers/plans/2026-11-27-google-portal-2.4-approvers-preapprove-status.md`.

- **Setting it up:** [SETUP-GUIDE.md](SETUP-GUIDE.md) (for the Executive Secretary, all in a
  browser).
- **Using it as a leader:** [LEADER-GUIDE.md](LEADER-GUIDE.md).

## What is here

| Path | What |
|---|---|
| `apps-script/NN-*.js` | The Apps Script source, one concern per file, loaded in numeric order into one global scope |
| `apps-script/appsscript.json` | The manifest (V8, Drive v3 advanced service, web app as the owner for anyone) |
| `pages/*.html`, `gp.css`, `gp.js` | The serve, post, help, confirm (confirm / withdraw / cancel links), leader and me (My sign-ups) pages and their shared look and code |
| `pages/hub-sections.html` | The two sections the ward pastes into its hub page |
| `build.mjs` | Builds `dist/` from the sources |
| `dist/Code.gs`, `dist/appsscript.json` | **Generated and committed.** What gets pasted into the Apps Script editor. Never edit by hand |
| `test/` | Vitest tests (Node). `fakes.mjs` fakes every Google service in memory; `harness.mjs` loads the generated `Code.gs` into a `vm` context |

## Commands (from the repository root)

- `npm run gp:build`: rebuild `dist/` after changing anything in `apps-script/` or `pages/`.
- `npm run gp:build:check`: fails when `dist/` is out of date (the tests check this too).
- `npm run gp:test`: this folder's tests only. `npm test` runs the Workers suite, then these.

## Rules

- Tests never call Google and never sign in anywhere: every Google service is an in-memory fake.
- No real member data or real account addresses in any file: use the invented Riverbend 1st
  Ward (example), prefix `rb1`, and `@example.test` / `riverbend.example` addresses.
- Every page and email carries the independence notice and the ward's contact. Never use the
  Church's name as branding or any of its symbols.
- A public sign-up always answers the same sentence; whether the address was new, waiting,
  approved, declined, a duplicate or on a full role is told only by email to that address.
  Every attempt counts toward the limits the same way: per address, the different roles tried
  today (System Sheet Counters tab, salted hashes, kept one day); per post, attempts this minute
  (script cache).
- Sheet changes and their links (tokens) are made inside the script lock; emails go out after
  it, and a failed email is logged without changing the answer. Jobs and web calls first bring
  a sheet set up by an older version up to date (`ensureUpgraded_`).
- Private details go only to a Confirmed sign-up of an Approved volunteer (or a Leaders-tab
  address), only in the confirmation, the reminder and My sign-ups, and only until the date is
  over.
- Every top-level function either ends in `_` or is on the reviewed list in
  `test/web-exposure.test.mjs` (a web visitor can call any other one).
- Every sheet write goes through `table_()` in `03-store.js` (columns by header name, formula
  text neutralized, dates kept as text). Every email goes through `sendOrQueue_()` in
  `06-mail.js` (one recipient, footer, daily reserve).
