# Google-only portal 2.2 — "Turn into an opportunity"

> Run by the orchestrator skill: one implementer, then one reviewer. Small branch off main (after 2.1).

**Goal:** A leader who reads a request (e.g. Lend a hand) can turn it into a DRAFT service
opportunity, without request details ever reaching a public page or the leader page.

Sam's words (relayed verbatim, 2026-11-24): "To be clear, each "Lend a hand" request should go to
the Relief Society president (and assigns) for approval before appearing on the Opportunity
board." … "Yes, add the Turn into an opportunity button".

## Design (chosen: a checkbox in the request sheet, picked up by the script)

Why: request sheets are guarded by Google's own sign-in (only the kind's readers can edit them),
while the leader page uses forwardable leader links. Doing the "turn" inside the sheet means
request text never travels to the leader page, and only people who can already read the request
can trigger it. The leader then finishes and publishes the draft on the leader page as usual.
(Rejected: listing requests on the leader page — it would put request details behind a weaker,
forwardable link.)

1. **Categories column `Opportunity category`** (appended by gpEnsureTabs_): on a Request row,
   the Id of the Opportunity category its drafts go into (e.g. `lend-a-hand` →
   `lend-a-hand-service`). Blank = this kind can't be turned (Christmas, Other and the giving kind
   ship blank; a ward may fill one in deliberately). Seed Moving's cell once with `moving-help`
   when blank (a Script Property flag), and fresh installs get it in DEFAULT_CATEGORIES.
2. **Request sheet columns** (added to the request headers; `requestTable_` appends missing ones on
   older sheets; rotation carries them): `Make opportunity` (checkbox), `Copy contact to private
   details` (checkbox, default unticked), `Posted as` (text, written by the script).
3. **The job** (`gpTenMinute`, a new part in runParts_, under the lock): for each request file,
   every row with `Make opportunity` ticked and `Posted as` blank:
   - kind has no valid Opportunity category (blank, unknown, archived, not Kind Opportunity) →
     write `Posted as` = "Not made: set Opportunity category for <kind> in Categories" and untick;
   - else create a **Draft** post (never Open): Category = that opportunity category;
     Organization = its first owning organization (else the request kind's first owner, else
     Bishopric); Title = the opportunity category's Name; Audiences = its Default audiences (else
     Sisters if owner is Relief Society, Brothers if Elders Quorum, else all four); Public note =
     "" ; one slot: date = the row's Moving date if valid and today or later, else today + 7, role
     "Help", needed 1; Private details = "" unless `Copy contact to private details` is ticked, then
     "Requested by <Name>, <Phone or email>" (never the Note); Created by = "request <Request id>";
     Last changed by = "From a request".
   - write `Posted as` = "Draft made <local date> — finish and publish it on the leader page
     (<post title>, <Post id>)", untick `Make opportunity`.
   - notify (detail-free, normal priority) the request kind's Notify recipients **who can edit the
     draft** (canEditPost on the new post), else the post's noticeRecipients: "A draft opportunity
     was made from a <kind> request. Open your leader page to check the date, write the public
     note and publish it." No request text.
   - Public fields NEVER contain the requester's name, contact or note (test this).
4. **Leader page:** drafts already show to leaders who may edit them. Add a small "From a request"
   label on drafts whose Created by starts with "request ", and a reminder above the editor: "Check
   the date and write the public note. Never put the family's name, address or situation in the
   public note." Editing rights follow canEditPost (the creator check simply never matches
   "request …").
5. **Docs:** LEADER-GUIDE: the president's workflow (read the request in the sheet → tick Make
   opportunity [and Copy contact if wanted] → within ~10 minutes a draft appears on the leader
   page → set date, note, roles → Publish; mark the request In progress/Done as usual).
   SETUP-GUIDE: §3 step 6 the Opportunity category column (Lend a hand example:
   `lend-a-hand` → `lend-a-hand-service`; Moving → `moving-help`); an "If you set up before 2.2"
   box (paste, New version, Set up, then fill Opportunity category). Spec: §4.3 row "Turn into a
   service opportunity" becomes the implemented design; §12 new decision with both quotes.

## Tests
- A ticked Lend a hand row makes exactly one Draft post in lend-a-hand-service, writes Posted as,
  unticks, and a second run makes nothing.
- The draft's Title, Public note, slot role and every public answer (serve/post) contain none of
  the requester's name, contact or note; Private details empty by default, "Requested by …" only
  when Copy contact is ticked; the Note never copied.
- A Christmas row ticked with blank Opportunity category → "Not made: …", no post.
- The draft is not on serve until a leader publishes it; an RS Org editor can edit and publish it;
  an EQ Org editor can't.
- Moving date carried into the slot; a past or blank date gives today + 7.
- The notice has no request text and goes only to people who can edit the draft.
- Older request sheets get the three columns appended; rotation keeps them.
- web-exposure allow-list green (new functions end in `_`).

## Done
Build check, `npm test && npm run typecheck` green; commits end with the Co-Authored-By line.
