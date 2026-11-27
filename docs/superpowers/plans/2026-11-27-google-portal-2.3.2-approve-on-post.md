# Google-only portal 2.3.2 — Approve on the post, stale-link warning, test plan Draft 3

> Run by the orchestrator skill: one implementer, then one reviewer. Small branch off main (305f2d2).
> Sam is testing live on 2.3.1: no data migrations, no change to any tab's columns or meaning.

Sam's words (relayed verbatim, 2026-11-27, testing row 4.7): "I'm at 4.7 and viewing the
opportunity, wanting to approve - but I only see "remove" and "cancel"" then "Can't the approval
button be moved to the "My opportunities" tab instead of having to switch context?"

## 1. Approve / Decline on the post (leader page, My opportunities)

- Server (09-api-leader.js apiListPosts_): for each sign-up whose status is Waiting-approval
  (email confirmed, volunteer Pending), add `canDecide: true|false` computed with the EXISTING
  `canApprove(access, leaderEmail, volunteer, firstPost)` — no new rule — and the volunteer's
  `volunteerKey` needed by the existing `apiDecide_` (use whatever identifier apiWaiting_/apiDecide_
  already use; if that is the email, it is already returned only to leaders who may edit the post —
  do NOT add emails where they weren't returned before; if a non-editor approver needs it, return an
  opaque id resolved server-side instead). Waiting-email sign-ups: `canDecide: false` and the tag
  "Waiting for their email click".
- leader.html: next to such a sign-up, **Approve** and **Decline** buttons calling the existing
  `decide` action (same confirmation wording as the Waiting tab). After success, reload the list
  (every waiting sign-up of that volunteer now counts). A leader without canDecide sees the tag only.
  Keep the Waiting for approval tab unchanged.
- Tests: an approver sees canDecide on the post's waiting sign-up and approving from there confirms
  all of that volunteer's waiting sign-ups; a coordinator/Org editor who can't approve gets
  canDecide false and `decide` still refused server-side; Waiting-email shows no buttons; no new
  email addresses appear in listPosts answers for leaders who didn't get them before.

## 2. Stale leader link

- leader.html: when New opportunity or Edit opens, and on `visibilitychange`/`focus` when the tab
  becomes visible again, call `whoami`; if the answer has `relink: true`, show the relink message
  with the "Email me a leader link" box ABOVE the form, before anyone types (don't remove the form).
- Any save/action that returns `relink: true` keeps the form's contents in place and shows the same
  relink box; never navigate away or clear `state.form`.
- Throttle the focus check (at most once a minute) so it costs little.
- Tests (fake DOM where possible): relink on open shows the box and keeps the form; a relink answer
  on save keeps the typed values.

## 3. Docs
- SETUP-GUIDE and LEADER-GUIDE: you can Approve/Decline from the post itself or the Waiting for
  approval tab; mention the stale-link warning (open the newest leader link after Sign out
  everywhere).
- Test plan: make `F:\!SLRFam\AI\Claude-Apps\Wardest.com\drafts\Service-Portal-Test-Plan-DRAFT-3.docx`
  from DRAFT-2 (docx skill; render and check every changed page), then move DRAFT-2 to
  `drafts\archive\`. Changes:
  - Top: Brother Example = the Executive Secretary (his own Leaders row; first address in
    test_mail_only); Sister Example = his wife (invented names only; no real names/addresses).
  - Define "the web app address" once: Settings → web_app_url, ending in `/exec`; NOT the hub
    address (e.g. not `<hub>?page=serve`). Every later "open …?page=…" refers back to it.
  - 0.4/0.5: the grey "This application was created by a Google Apps Script user" banner is
    expected on /exec pages only; a first load can take ~8 s (cold start); on a phone, "Sorry,
    unable to open the file at this time" means several Google accounts or the Drive app is
    intercepting — use a private tab.
  - Right after 1.5 (Sign out everywhere): open the newest leader link on every device before
    section 2.
  - 3.1: if the post isn't on ?page=serve, check it is Open (published), not Draft.
  - 4.7: approve either on the post (new buttons) or in the Waiting for approval tab.
  - New rows: approve from the post view (and a non-approver sees no buttons, if a second leader is
    available); the stale-link warning (Sign out everywhere in one tab, return to another open tab
    → the relink box appears before typing; typed text survives).
- Spec: §12 decision 22 with Sam's quotes.
- GP_VERSION: no bump needed unless a Settings row/tab changes (none should).

## Done
Build check, `npm test && npm run typecheck` green; commits end with the Co-Authored-By line;
DRAFT-3 rendered and checked; DRAFT-2 archived. After merge Sam re-runs Make hub files
(leader.html changed).
