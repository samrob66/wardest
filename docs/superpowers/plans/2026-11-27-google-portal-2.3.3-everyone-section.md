# Google-only portal 2.3.3 — "Everyone" section for multi-audience posts

> Run by the orchestrator skill: one implementer, then one reviewer. Small branch off main (19123f8).
> Sam is testing live: no column, tab, Settings or data changes.

Sam's words (relayed verbatim, 2026-11-27): "Looks like, when opportunities are for both Brothers
and Sisters, that the same 4 slots are shown twice, making it look like there are 8 volunteer
opportunities ... Maybe we should have another category on the Service Opportunities page for just
"Members" and if it applies to anyone, it shows up under that category. If it's only for Sisters,
we would write "Sisters" under "default audiences" in the Categories sheet, but never Sisters and
Brothers. Thoughts?" — then, to the coordinator's recommendation (below): "Yes".

## Rule
- Serve page (one renderer for hub and /exec): a post with MORE THAN ONE audience shows ONCE, in a
  new full-width section titled `TEXT.everyone` ("Everyone"; in config so a ward can rename it), at
  the top. Under the post's title, a small line lists its audiences in the fixed order Brothers ·
  Sisters · Youth · Children (only those it has). A single-audience post stays in its own section.
- Section order: Christmas giving card → Everyone → Brothers | Sisters (side by side) → Youth
  (with the parent line if it applies) → Children → filled posts last within each section, as now.
  Empty sections stay hidden.
- No rule change for Default audiences, no column changes; existing posts regroup automatically.
  Fill bars/counts unchanged.
- Replace/extend the pure `GP.groupByAudience` (gp.js) — e.g. returns
  `{Everyone, Brothers, Sisters, Youth, Children}` with each post in exactly one group — and update
  its tests.
- Audit every other place that lists posts and could show one twice because of audiences: "Other
  ways to serve" (emails, My sign-ups), hub-sections, the "Needs help soon" tab and page, leader
  page lists. Make each show a post once; report what you found (likely only serve duplicates).

## Tests
- A Brothers+Sisters post appears once, under Everyone, with "Brothers · Sisters"; a Sisters-only
  post only under Sisters; a Youth+Children post once under Everyone with "Youth · Children"; the
  section order; empty sections hidden; the fill bar shows the post's real counts once.
- Audit findings each pinned by a test where code changed.

## Docs
- SETUP-GUIDE / LEADER-GUIDE: how audiences show on the Service Opportunities page.
- Spec §12 decision 23 with Sam's quotes.
- Test plan: `F:\!SLRFam\AI\Claude-Apps\Wardest.com\drafts\Service-Portal-Test-Plan-DRAFT-4.docx`
  from DRAFT-3 (docx skill; render and check changed pages), then move DRAFT-3 to
  `drafts\archive\`. Row 3.1 expects the meal post ONCE under Everyone tagged "Brothers · Sisters";
  add a row: a Sisters-only post appears under Sisters only.

## Done
Build check, `npm test && npm run typecheck` green; commits end with the Co-Authored-By line;
DRAFT-4 rendered and checked; DRAFT-3 archived. Sam after merge: paste Code.gs + New version (no
Set up); later Make hub files with ALL page files.
