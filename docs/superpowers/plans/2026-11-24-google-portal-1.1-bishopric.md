# Google-only portal 1.1 — the whole bishopric edits the Sheet and reads confidential requests

> Run by the orchestrator skill: one implementer, then one reviewer. Small fix branch off main.

**Goal:** Apply Sam's rule change. The whole bishopric (bishop, both counselors, Executive
Secretary, Ward Clerk) edits the Service Sheet and reads the confidential request kinds
(Christmas, Other). The bound script stays; no standalone project.

Sam's words (relayed verbatim by the coordinator, 2026-11-24):
- "Service Sheet editing should be possible by the entire bishopric, including the Exec Sec and
  Ward Clerk."
- "No, the thing is, sometimes the Bishop is out. That's why he has counselors (if he is sick
  and in the hospital, they can act as him). Don't try to hide things from the counselors, and
  the Ward Clerk either--he is even more trusted than I am."

**Base:** `main` @ 8c85d9e. Branch `claude/google-portal-1.1`.

## Rules (they replace phase 1's)

- **Who is "the bishopric":** every Leaders row with the **Bishopric** box ticked. The guide and
  the Leaders help text say to tick it for the bishop, both counselors, the Executive Secretary
  and the Ward Clerk. Calling text no longer decides access. One helper,
  `bishopricEmails(leaders)` (pure, `05-requests-rules.js`), used everywhere below.
- **Service Sheet sharing (Sync sharing):** Bishopric-ticked → **writer**. Ward council members
  without Bishopric → reader. This replaces phase 1 review decision D2 (administrators only).
- **Confidential request kinds** (Confidential ticked in Categories: Christmas, Other):
  `requestReaders` = `bishopricEmails` ∪ that category's Coordinators. Notices go to the same
  set. Ward council and org leaders never get these, unless they are listed as Coordinators.
  Non-confidential kinds (Moving) are unchanged.
- **Administrators for alert emails** stay Calling `Bishop` / `Executive Secretary` (unchanged).
- **Texts that say "the bishop" alone change to "the bishopric":**
  - the request form description: `Only the bishopric and the people they name see this request.`;
  - the Categories tab help and Read me text;
  - SETUP-GUIDE §1, §3 (Leaders table: Bishopric row; Categories step 6), §5;
  - LEADER-GUIDE.
- **Set up refreshes existing request forms' descriptions** (and title, if it changed) every run,
  so a ward that ran Set up on the old code gets the new wording just by running Set up again.
- **Spec:** in `docs/superpowers/specs/2026-11-24-google-only-alternative-design.md`, update the
  §5.4 table and rules (Bishopric row: Service Sheet edit; request folders: confidential ones go
  to the whole bishopric plus named coordinators; the caveat line), §4.3's row "Only the
  responsible leaders see requests; Christmas and Other only the bishop and those he names", and
  add §12 decision 14 with both quotes above and the date. Remove the D2 wording from the phase 1
  plan's notes only if it appears in docs Sam reads; don't rewrite history in plans.

## Tests

- `bishopricEmails` returns ticked rows only (normalized, de-duplicated). A counselor's Calling
  text doesn't matter.
- `requestReaders` for Christmas returns the bishop, both counselors, the Executive Secretary,
  the Ward Clerk (all ticked) and the coordinators. It excludes an Elders Quorum president on the
  ward council.
- Sync sharing: Service Sheet writers = Bishopric-ticked; ward council → reader. The Christmas
  folder = bishopric + coordinators.
- A request notice for Christmas reaches each bishopric member once.
- Set up run twice on a ward whose forms carry the old description: the descriptions end up
  with the new wording, and no form is duplicated.
- Existing tests that assumed "Bishop only" or "administrators edit" are updated, not deleted.

## Done

`node google-portal/build.mjs --check` and `npm test && npm run typecheck` green. Commits end
with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The guide gets a short "If you
set up before 1.1" note: paste the new Code.gs, Save, Deploy > Manage deployments > edit > New
version (only if already deployed), run Set up, run Sync sharing.
