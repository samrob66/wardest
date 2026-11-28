# Google-only portal 2.4 — Approvers, Pre-approve list, volunteer status data

> Run by the orchestrator skill: one implementer, then one reviewer. Branch off main (1503ed2).
> DEADLINE: live before Sat 2026-11-28 7 pm Denver — keep it lean.
> Scope: apps-script rules + API + Settings/Categories/System Sheet + emails + docs.
> pages/leader.html: NO visual work (the parallel 2.5 "leader-ui" build owns all page UI). Only
> touch leader.html if a test needs an existing call to keep working.
> Sam is testing live: only ADD columns/rows/tabs (gpEnsureTabs_ appends); never rename/reorder;
> bump GP_VERSION so a pasted Code.gs adds them.

Sam's words (relayed verbatim, 2026-11-27):
- "what if we had a new column that specifies which email member approvals should go to for that
  opportunity type? That would be the most flexible way to do it." then "1. Yes".
- Pre-approve: "Good idea, and we already have the Bishop's permission."
- Status page: "We should have a page that shows the names of all volunteers with their
  indicators, even if we don't show their emails".

## 1. Approvers

- Categories column `Approvers` (emails, comma-separated; meaningful on Opportunity rows).
  Settings row `default_approvers` (same format).
- `approverEmailsFor(firstPost, categoriesById, settings, leaders)` (pure, 04-rules.js):
  the first post's category Approvers → else `default_approvers` → else today's `approversFor`.
  Normalized, de-duplicated; entries that aren't on the Leaders tab are DROPPED for emailing
  (they can't use a leader link) and reported by Check health ("Approver x is not on the Leaders
  tab").
- Emails: the "Waiting for approval" notice and the 48 h nudge go ONLY to `approverEmailsFor`
  (when a configured list exists, the bishopric is no longer emailed unless listed).
- `canApprove` gains: a leader whose email is in the configured list for the volunteer's first
  post's category (or default_approvers) may approve/decline. The existing rule (bishopric; the
  first post's organization leaders) still applies — no one loses approval rights.
- `isApproverAnywhere(leaderEmail)`: listed in any category's Approvers or default_approvers.
- Visibility: a listed approver may SEE (read, names, `canEdit:false`, no emails unless they could
  already edit) the posts of the categories they approve for, so they can approve on the post.

## 2. Pre-approve list

- System Sheet tab `Preapproved`: `Hash | Added at | Added by` (Added by = leader NAME). Salt:
  Script Property `PREAPPROVE_SALT` (random 64 hex, created once). Hash = sha256Hex_(salt + ":" +
  normEmail(address)).
- Who may add/clear/count: bishopric (Bishopric tick) or `isApproverAnywhere`.
- At public sign-up (apiSignup_), after the existing state lookup: if the address is NOT a leader,
  NOT Declined/Revoked, and its hash is in Preapproved → set/create the Volunteers row Approved,
  Decided by "Pre-approve list", Decided at now, Email confirmed at now; the sign-up is Confirmed;
  send the normal "You're signed up" confirmation (Cancel link + private details), no confirm
  email, no approval email. If the volunteer had earlier Waiting-* sign-ups, they become Confirmed
  the same way approval does today (reuse the approve path, actor "Pre-approve list"). Public
  answer unchanged (TEXT.signupThanks). Rate limits unchanged.
- Declined/Revoked are never overridden by the list.
- Pasted addresses never reach Log, Outbox, Counters, cache or any answer. Invalid entries are
  counted, not echoed.

## 3. Volunteer status data

Status enum (string), computed by one pure function `volunteerStatusOf(email, volunteerRow,
leaderEmails)`:
`leader` (on Leaders tab) · `approved` · `needs_approval` (Pending, email confirmed) ·
`email_not_confirmed` (Pending, not confirmed) · `declined` · `revoked`.
A sign-up address with no Volunteers row and not a leader → `approved` (phase-1 legacy; migration
already approves these).

Volunteer id: opaque `vid` = first 16 hex of sha256Hex_(PREAPPROVE_SALT + ":v:" + normEmail) —
stable, not reversible by leaders. Server resolves vid → email by scanning Volunteers + Sign-ups.

## 4. API contract (new/changed actions; all POST `{action, k, ...}` with a leader link `k`;
## relink answers unchanged)

1. `listVolunteers` → `{ok, canSeeEmails, canAct, volunteers: [ {
     vid, name, status, upcomingCount, firstSignup: {title, date} | null,
     children: [firstName…],
     // only when canSeeEmails:
     email, decidedBy, decidedAt,
     // only when canAct:
     actions: ['approve','decline','revoke','undo'] subset allowed for THIS leader & volunteer
   } ] }`
   - Any leader may call it. `canSeeEmails` and `canAct` = bishopric or isApproverAnywhere.
   - Sorted: needs_approval first, then email_not_confirmed, then by name.
   - Includes every Volunteers row plus any leader/legacy address that has sign-ups.
   - `actions`: approve/decline when status is needs_approval and canApprove; revoke when approved
     and bishopric; undo when declined/revoked and bishopric.
2. `decideVolunteer {vid, decision: 'approve'|'decline'|'revoke'|'undo'}` → `{ok, message}` —
   same checks and effects as the existing decide / bishopric actions; unknown vid →
   `Not found.`; not allowed → the existing refusal text.
3. `preapproveCount` → `{ok, total, canManage}` (any leader may call; canManage = bishopric or
   approver; total shown only when canManage, else 0).
4. `preapproveAdd {emails: "<pasted text>"}` → `{ok, added, already, invalid, total}` (canManage
   only; split on commas/semicolons/whitespace/newlines; max 2,000 per call).
5. `preapproveClear` → `{ok, removed}` (canManage only).
6. `listPosts` (existing): every sign-up item gains `status` (the same enum, for the volunteer)
   alongside the existing `canDecide`; posts visible to approvers via §1 carry `canEdit:false`.
7. `whoami` (existing) gains `access.isApprover` (bishopric or isApproverAnywhere) and
   `access.canManagePreapprove`.
Existing actions (waiting, decide, bishopric, volunteers) keep working unchanged.

## Tests (Node fakes)
- approverEmailsFor fallbacks; non-Leaders entries dropped + Check health line; waiting notice and
  nudge go only to configured approvers; bishopric can still approve; a listed approver who is not
  an org leader can approve and see the category's posts without emails.
- Pre-approve: hash only stored (no address anywhere in System Sheet, Log, Outbox, Counters);
  matched sign-up → Confirmed + Approved by "Pre-approve list" + normal confirmation, no confirm
  or approval email; Declined stays blocked; earlier waiting sign-ups confirmed; count/clear;
  non-managers refused; public answer identical for matched/unmatched.
- listVolunteers: every status computed; non-approver gets no email/decidedBy/actions; actions
  correct per role; children grouped; vid opaque and decideVolunteer works/refuses correctly.
- listPosts sign-ups carry status.
- web-exposure allow-list green (new pure functions added).

## Docs
- SETUP-GUIDE: the Approvers column, default_approvers, Leaders rows for approvers, the
  Pre-approve list (hash only; how to add/clear), an "If you set up before 2.4" box (paste,
  New version, Set up, fill Approvers/default_approvers).
- LEADER-GUIDE: who gets approval emails, pre-approving members, the volunteer status words
  (Approved / Leader / Needs approval / Email not confirmed / Declined / Revoked).
- Spec §12 decision 24 with Sam's quotes. Test plan DRAFT-5 is NOT in 2.4 (2.5 does it).
