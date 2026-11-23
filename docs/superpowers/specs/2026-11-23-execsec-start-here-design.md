# Executive Secretary "Start here" track — design

Status: APPROVED to build, 2026-11-23. Sam: "All yes" to the part 2 questions. Part 1 (the steps
and decisions 1, 2, 3, 5, 6) was settled 2026-11-21 (IMPLEMENTATION.md §10 item 3). This file
replaces the review draft `Wardest-ExecSec-Track-Spec-DRAFT.docx` (repo root, untracked).
Coordinator: session `local_a8b6bffb-9340-4139-aeaa-52d78581c2e0`. Roadmap items 3, 4 and 5 of
IMPLEMENTATION.md §10.

## 1. In one paragraph

A newly called Executive Secretary signs in to WardForward and sees a Start here page: 14
numbered steps, from creating the ward's shared Google account to writing the hand-off note.
Each step opens an ordinary catalog solution (how-to, template, deliverable) and shows whether
the ward has done it. The steps are catalog solutions, "done" comes from the implementation
tracker that already exists, and the only new code is one column, one page, one home-page card
and one landing-page line.

## 2. Settled (don't reopen)

1. An ordered Start here page over existing catalog solutions, not a new kind of object. Exec
   Sec first; a Ward Clerk track later.
2. All 14 steps are the Exec Sec's (Sam, 2026-11-21: "Steps 10-13 should be done by the Exec
   Sec, so I guess all of this is the Exec Sec"). A solution's catalog category doesn't change
   that; the track is defined by step numbers.
3. Leaders sign in to WardForward with their own Google accounts; the bishop and Exec Sec are the
   ward's admins. The ward's role account is the zippa.run creator (links outlive the Exec Sec).
4. Interview setup is three steps (calendars, booking pages, router).
5. Step 1 tells the Exec Sec to send the zippa.run access request as soon as the role account
   exists (a note, not a step).
6. The public portal step teaches WardForward's own portal. The demo site
   (`github.com/wardforward`, roadmap item 6) is an example a ward may copy, not a step.
7. **Template owner (decision 4):** the tracker template Sheets are owned by a separate free
   Google account Sam created for WardForward templates (address in the coordinator state file;
   not Sam's personal account, not on the wardforward.com Workspace, which is an alias domain
   and can't have its own users). Sam shares its recovery with the second operator later.
8. **New step 9, service sections** (Sam, 2026-11-23, "All yes").
9. **Step 2 carries the Handbook rules** (General Handbook 38.8.21.2): the bishop approves the
   ward joining; the ward keeps at least two administrators (bishop + Exec Sec); plus the
   existing notes (Ward Clerk in the Bishopric space; an Activities chair or Ward Mission Leader
   outside the Ward Council space sees only their own organization's posts until added).
10. **Landing page line:** wardforward.com tells a new Exec Sec that requesting the ward (and
    waiting for operator approval) is the first move.
11. **Process:** build all four phases straight through; each phase merges after its review
    passes. The how-to text for phases B and D goes to Sam as one review .docx; build continues
    meanwhile, and his edits come back as a follow-up. Nothing is deployed.
12. Out of scope: running meetings in WardForward (BLUEPRINT §12); Church systems and confidential
    member data (the track never stores interview details; Handbook 38.8.32); automatic checks
    (WardForward can't see Google or zippa.run, so the Exec Sec marks each step); creating
    zippa.run links from WardForward (no API by design).

## 3. The steps

"Done when" is what the how-to tells the Exec Sec to check before marking the step Done.

| # | Step | Done when | Content source |
|---|---|---|---|
| 1 | Create the ward's role account | A shared Google account for the calling (not a person), 2-step verification on, recovery details the next Exec Sec can take over. zippa.run access request sent. | New. |
| 2 | Set up WardForward: callings and spaces | Bishop and Exec Sec are ward admins (at least two). Bishopric and ward council invited with callings. Each org's president and secretary own their org's space. Ward Clerk in the Bishopric space. Handbook notes (§2 item 9). | New, short. |
| 3 | Put the role account on the right Google plan | A plan that allows several booking pages and checks more than one calendar. | Playbook §1. |
| 4 | Create one calendar per leader | One per leader incl. the bishop, each shared with its leader; the account's own calendar left empty. | Playbook §2; how-tos draft Solution 1. |
| 5 | Create the booking pages | Every appointment type has a page titled with its leader's name tag, checking that leader's calendar. | Playbook §3; Solution 1. |
| 6 | Install the interview router | Runs every minute; the calendar-ID check shows every leader OK; a test booking moves and stays cancelable. | Playbook §3 + `InterviewRouter.gs` with M44's IDs and names replaced by placeholders. |
| 7 | Get zippa.run access and make your links | The role account is a zippa.run creator on the ward's prefix, one short link per destination. | Playbook §4 + zippa.run decision 0019. |
| 8 | Publish the ward's public portal | Each link is a deliverable published to Public with its short link pasted; the portal's share link is set. | How-tos draft Solution 2, rewritten for zippa.run. |
| 9 | Turn on service opportunities and requests | The portal's two service sections are on, each with its zippa.run short link pasted in ward settings (like `m44Serve`, `m44Help`); each default category's owner checked. Optional: coordinators (delegates) and a Discord channel webhook per category. | New; from the service spec (`2026-11-22-service-opportunities-requests-design.md`). |
| 10 | Print the foyer flyer | A poster printed from the portal's print view and posted. | Playbook §8, adapted. |
| 11 | Set up virtual interviews (Zoom) | Zoom on the role account, open-join meetings, recording / transcripts / AI off. | Playbook §11; Solution 3. |
| 12 | Bishopric meeting assignment rotation | Tracker copied from the template, deployed as a web app, link is a deliverable in the Bishopric space. | Tracker guide (7 steps), hardened code. |
| 13 | Ward Council assignment rotation | Same, link in the Ward Council space. | Same. |
| 14 | Write the hand-off note | A note in the role account's Drive lists every account and tool, where each lives, and what to change when a leader is released. | Playbook §9–10. |

Sources: the Ward Links Playbook and `InterviewRouter.gs.txt` staged beside
`F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio\HANDOFF-TO-WARDEST.md` (read only; never edit that
project); `Wardest-Catalog-Howtos-DRAFT.docx` (repo root, Solutions 1–3); the rotation trackers in
`S:\Data\App Data\Assignments - Bishopric Mtg\` and `...\Assignments - Ward Council\` (read-only
originals; the Ward Council HTML copy holds M44's real names — never copy names; use the Apps
Script version only).

## 4. The Start here page

- **Where:** `/w/:wardId/start`. A card at the top of the ward home page links to it ("Start
  here: 5 of 14 done · Next: Install the interview router"); so does the catalog page.
- **Who sees it:** every member of the ward. It only shows progress; status is changed on each
  solution's page, as today.
- **Each row:** number, title, one-line summary, status (Not started / In progress / Done), owner
  if any, link to the solution. The first step not Done is highlighted as Next.
- **Order is advice, not a lock.** Nothing is blocked.
- **Privacy:** if a step's tracker entry is restricted and the viewer can't see it, the row shows
  the step without its status (existing visibility rules decide).
- When all are Done the home card shrinks to a small "Start here ✓" link; it never disappears.
- Design canvas as everywhere else; page shell renders `siteFooter()`.

## 5. How it's built

- One new column `solutions.setup_step` (integer, NULL when not in the track). The page lists
  published solutions with a step number, in order. An upgrade SQL file for existing local DBs,
  like `db/upgrade-2026-11-22-service.sql`.
- The operator's solution form gets a "Setup step" field so the order can change without a
  deploy. The seed sets the starting numbers.
- Status comes from each solution's implementation record (one per ward), read through the
  existing visibility check. No new tables, permissions or object kinds.
- If a Ward Clerk track later shares steps, the column becomes a small table then.

## 6. Templates

- **Interview router:** a code file the Exec Sec pastes into Apps Script, with M44's calendar IDs
  and the counselors' names replaced by placeholders.
- **Rotation trackers:** a template Google Sheet with the script inside, offered as a "Make a
  copy" link (copying a Sheet carries its bound script; confirm it in phase C before writing the
  guide). The ward deploys its copy as a web app once. The template stays blank so the first run
  creates the tabs and a fresh random PIN in the ward's copy (never a shared PIN like today's
  1830).
- Hardening before publishing: random PIN on first run, throttle wrong-PIN guesses, generic
  calling list only, guide matches the code.
- Creating the template Sheets in the templates account is an **owner step** for Sam (or done in
  his browser with him): the build prepares the files and exact steps; it never signs in to that
  account itself.

## 7. Phases

- **A — the page.** `setup_step` column + upgrade SQL, operator field, Start here page, home card,
  catalog link, landing-page line (§2 item 10), seeded with the solutions that exist now.
- **B — content for steps 1–10.** Write and revise the how-tos, seed them in place of the
  placeholder examples `sol_ex_interviews` / `sol_ex_bulletin`, ship the generalized router.
- **C — the trackers (steps 12–13).** Harden the Apps Script code, prepare the template, update
  the 7-step guide, seed the two solutions.
- **D — Zoom and the hand-off note (steps 11, 14).** Content only.
- The how-to text from B and D goes to Sam as one review .docx in `drafts/`. When it's reviewed,
  the old `Wardest-Catalog-Howtos-DRAFT.docx` and `Wardest-ExecSec-Track-Spec-DRAFT.docx` move to
  `drafts/archive/` (never deleted).

## 8. Gaps noted, not in this build

- Hiding, renaming and adding spaces (no screen yet). Step 2 tells the Exec Sec to ignore spaces
  the ward doesn't use.
- Grouping on the public portal (M44's two columns + sub-pages). A separate portal feature.

## 9. Owner steps

- Create the tracker template Sheets in the templates account from the build's prepared files
  (phase C).
- Review the how-to .docx.
