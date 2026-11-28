# Google-only portal 2.6 — Meals (server half)

> Orchestrator flow. Branch `claude/google-portal-2.6` off main a01581b. Server/API/forms/sheets/
> emails/FIELD_NOTES/docs/test plan. pages/* and the HTML-rendering parts of 10-web.js belong to
> the parallel UI build (leader-ui) — don't touch them except to keep existing tests passing.
> Spec: docs/superpowers/specs/2026-11-28-google-portal-meals-design.md (decision 28).
> API contract (binding, shared with the UI build):
> C:\Users\samro\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\side-session-notes\local_a8b6bffb-9340-4139-aeaa-52d78581c2e0\2-6-api-contract.md
> Order: §2–§6 first, §7 (Picture) last. Additive only; bump GP_VERSION; every new header/setting
> gets a FIELD_NOTES entry.

## Tasks
1. Categories & seeds: `Picture`, `Sign-up notices to` columns; seed `meal-request` (Request),
   `meals-new-moms`, `meals-hardship` (Opportunity) once by id. Opportunity category for
   meal-request holds two ids [baby, hardship]; draftCategoryFor_ picks by the form's first answer.
2. The meals form (buildRequestForms_ for `meal-request`, from form_template_url like others):
   opening text and closing line per spec §2; first question "What are the meals for?" (A new baby
   / A member in hardship) with section branching (FormApp PageBreakItem + choice navigation):
   baby section (Mom name/phone/email, Dad name/phone/email, due date, induction date optional,
   boy/girl/surprise optional) vs hardship section (Your name/phone/email, optional second adult);
   then a shared section: address, meals start (short text), how often (Daily / Every other day /
   Specific dates + short text), drop-off window, Regular/Quiet drop-off, coordinate-with
   checkboxes Mom/Dad/Other (+ Other name and phone), adults & kids count, allergies, favourites,
   note. Prefilled URLs for the two Help tiles (createResponse().withItemResponse(...)
   .toPrefilledUrl()). Refresh-wording rules as for other forms. Fakes must model page breaks,
   navigation and prefill; list what only real Google can confirm.
3. Request sheet for meal-request: a column per answer (kind-specific headers appended after the
   standard ones, with FIELD_NOTES), plus hand columns Baby's name, Gender, Birth date, Photo link,
   Shared with RS (checkbox; note text from spec §3). gpOnRequestSubmit maps answers by question
   title. Notify = Coordinators; readers unchanged (bishopric + RS owners + coordinators).
4. Make opportunity for meals: Draft in meals-new-moms or meals-hardship; title "Meals for the
   <family> family" (shared last name of the named parents/adults; if different or missing, first
   names joined with "and"); Posts meal fields filled (Allergies, Food likes, Serves, Drop-off
   window, Drop-off, Coordinate with = first names of the ticked people); Private details = address
   + phone of each ticked person + Other name/phone (meals categories only — decision 19 changes
   only here); Family emails = emails of ticked Mom/Dad (hardship: the adult's email); zero slots;
   Show on Serve = No; role "Bring a meal" offered when dates are added. Never store ministering
   data.
5. Show on Serve: hide from serve, otherWays_, needsHelpSoon (tab and page), any serve counts;
   direct post link works. setShowOnServe / savePost; shown_on_portal progress follows it.
6. Progress checklist: Posts `Progress` JSON; setProgress; listPosts/getPost return it as the
   contract says.
7. Family + Sign-up notices emails: on each Confirmed sign-up and each cancellation (incl. via My
   sign-ups, leader Remove, cancel date/post), one email per family address and per category
   `Sign-up notices to` address: title, date, role, volunteer first name; never the volunteer's
   email. Through sendOrQueue_ (test mode applies). New template(s) in 06-mail.js.
8. Zero-slot drafts: validatePost allows 0 slots for Draft; publish requires ≥1.
9. §7 last: Categories `Picture` (https only, same strict check as theme_background_url) returned
   as `picture` on serve, post, listPosts, getPost.
10. Docs: SETUP-GUIDE (meals setup: coordinators on both opportunity rows and the request row,
    Sign-up notices to = the coordinators' Google Group, Picture, the two Help tiles, Show on Serve
    flow), LEADER-GUIDE (the meals workflow: request → Make opportunity → draft → add dates →
    send link to parents and ministering sisters → tick progress → Show on Serve → ward email /
    Discord), spec decision 28 cross-check, README/CLAUDE.md lines.
11. Test plan DRAFT-6 from DRAFT-5 (`F:\!SLRFam\AI\Claude-Apps\Wardest.com\drafts\`): a meals
    section following the workflow above, and the pending row 19.2 text ("A … Service Portal: needs
    attention email listing only the Test mode line, to Brother Example only (since 2.5.2 the
    bishop no longer gets it). (Nothing else is wrong.)"); then move DRAFT-5 to drafts\archive\.
    If DRAFT-5 is locked by Word (~$ file), build DRAFT-6 from a read-only copy and say so; never
    write the locked file. Write the UI steps from the contract's labels; mark any step that
    depends on the UI build's exact wording as such.

## Tests
Per task, in Node fakes: seeds once; form structure (sections, branching, prefill URLs); answer
mapping; meals draft fields (public vs private, title rules, family emails, hidden, zero slots);
decision 19 unchanged for other kinds; hidden posts absent from serve/otherWays/needsHelpSoon but
post link works; progress set/recorded, shown_on_portal follows the switch; family and
sign-up-notice emails on sign-up and every cancel path with first name only; picture validation;
FIELD_NOTES complete; web-exposure allow-list green; GP_VERSION upgrade adds everything.
