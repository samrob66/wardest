# Google-only portal 2.3 — the ward's look on pages and forms, and a test plan

> Run by the orchestrator skill: one implementer, then one reviewer. Small branch off main (4c44b09).

Sam's words (relayed verbatim, 2026-11-24): "Any chance you could use the same background as the
existing pages, so the entire site looks branded? Also, this is the brand for our Google Forms:
<a public Google Form> Could you match it? Finally, please provide a testing document for my wife
and I go run through (for complete testing), doing things in logical order so it all makes sense."

## 1. Page theme (all portal pages: serve, post, help, confirm, me, leader)

- New Settings rows (appended by ensureSettingsRows_; blank = today's look):
  `theme_background_url` (an absolute https image URL; blank = plain background),
  `theme_accent` (a #rrggbb colour; blank = today's accent),
  `theme_font` (a Google Fonts family name, e.g. `Lora`; blank = today's system font),
  `theme_heading_font` (optional, same rules).
- Validate on use: URL must be https and http(s)-only (reuse the urls rules if any; reject
  `javascript:` etc.); colour must match `^#[0-9a-fA-F]{6}$`; font names letters, digits and spaces
  only (≤ 40). Invalid values are ignored and reported by Check health as PROBLEM lines.
- renderPage_ injects them as CSS variables in a `<style>` block (escaped) plus, when a font is
  set, one Google Fonts `<link>` (fonts.googleapis.com only). gp.css uses the variables:
  background image fixed/cover on `body`, content on panels/cards with a semi-opaque light
  background (e.g. rgba(255,255,255,.92)) so text contrast stays ≥ 4.5:1 over any image; accent for
  buttons, links, fill bars, headings rule. Phones: background `scroll` on narrow screens (iOS
  ignores fixed), no horizontal scroll at 360 px.
- Look: read the hub (READ ONLY) to match its feel — the clone at
  `C:\Users\samro\AppData\Local\Temp\claude\6598f51b484bb169\373c2b7e-3bf7-4b51-98a8-78b594dcda23\scratchpad\hub-pr1\repo\index.html`
  (and `F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio\m44links\`): its background treatment, card
  style, colours, fonts, spacing. Reproduce the STYLE generically in gp.css; copy no M44 text,
  names, links or images into the repo; no M44 values in the repo (the `m44`/`Mapleton` grep stays
  clean). The guide's example values use the invented Riverbend ward
  (`https://example.github.io/rb1links/background.png`, `#2f5d50`, `Lora`) and say: "for a hub on
  GitHub Pages, use the full address of the hub's own background image".
- The independence footer stays readable on the image (on a panel).

## 2. Google Forms branding

FormApp cannot set a form's theme (header image, colour, font). Design:
- New Settings row `form_template_url`: the address (edit or view link) of a branded form owned or
  copyable by the shared account. When set, buildRequestForms_ makes each NEW request form by
  copying it (`DriveApp.getFileById(id).makeCopy(name, portalFolder)` keeps the theme), opening the
  copy with FormApp, deleting all its items, then setting title, description, confirmation, settings
  and questions exactly as today. Blank = today's FormApp.create. A bad/unreadable template →
  fall back to FormApp.create and report a Problem line in Set up (never stop Set up).
  Extract the id from either link form (`/forms/d/<id>/edit`); a published `/forms/d/e/<…>/viewform`
  link is NOT the file id — detect it and report "paste the form's edit link (from the form editor's
  address bar), not its viewform link".
- Existing forms are NOT re-created: re-creating changes each form's address, which breaks short
  links already made (e.g. the giving short link), the Help/Serve links until Set up runs, and needs
  new submit triggers. Instead SETUP-GUIDE gets manual click steps to theme each existing form
  in the Forms editor (palette icon → Header: upload/choose image; Colour; Font style for header,
  question and text), taking the values from the branded form's own palette panel. Form links stay
  the same.
- Tests: with a template set, a new form is a copy (fake Drive records makeCopy of the template),
  has no leftover template items, and has exactly the portal's questions; a viewform link is
  refused with the message; an unreadable template falls back and reports; existing forms untouched.

## 3. Test plan document (Word)

`F:\!SLRFam\AI\Claude-Apps\Wardest.com\drafts\Service-Portal-Test-Plan-DRAFT-1.docx`, written LAST,
from the final code and guides (use the anthropic-skills:docx skill; render it to PDF/images and
check the layout). If writing to that folder is refused, write it to
`C:\Users\samro\AppData\Local\Temp\claude\6598f51b484bb169\373c2b7e-3bf7-4b51-98a8-78b594dcda23\scratchpad\Service-Portal-Test-Plan-DRAFT-1.docx`
and say so. The .docx is NOT committed to the repo.

- Audience: Sam (Executive Secretary; leader/admin, signed in to the shared account where needed)
  and his wife (member, volunteer, requester; second leader where useful). Invented names in the
  doc: "Brother Example" (Sam's role) and "Sister Example" (his wife's role); they use their own
  real accounts in Google, never written in the doc.
- Recommended route before going live: run the whole test with Settings `hub_url` blank so every
  email, leader link and page uses the script's own pages (nothing public, nothing on the hub);
  then clean up, restore `hub_url`, merge the hub branch, and do a short smoke test on the hub
  pages. Say why (the hub pages only go live by merging; testing first keeps test sign-ups off the
  public site).
- Logical order, sections with a table per section: # | Who | Device | Do this | You should see | ☐.
  Cover at least: 0 prep (Check health all OK, test settings, reminder_hour trick, theme check);
  leader links; Sync sharing access check (who can open which folder/sheet — use the second
  account); create opportunity with Add dates and roles, draft vs publish, copy; serve page and
  Offer-to-give card; first-timer sign-up → confirm email → waiting → approval on leader page →
  confirmation with private details; approved sign-up; full role/over-limit + withdraw; child
  sign-up; My sign-ups (names, cancel, resend confirm); cancel before/after cutoff and leader
  notices; remove a volunteer; close vs cancel opportunity, cancel a date; reminders and 48 h nudge
  and lapses (trigger by running gpHourly from the editor with reminder_hour set to the current
  hour / dates within 48 h); fill warnings and Needs help soon; each request kind (Moving, Lend a
  hand, Christmas, Other, Christmas giving) incl. who gets the notice and who can open the sheet;
  Make opportunity → draft within the hour (or run gpHourly) → edit → publish; Notify narrowing;
  form theme check; Check health and the daily health email; cleanup (cancel test posts, delete test
  rows the shared account owns, delete test requests, re-set reminder_hour, restore hub_url).
- Base wording on SETUP-GUIDE §9 and LEADER-GUIDE; every step says exactly what to click.

## Done
Build check, `npm test && npm run typecheck` green; commits end with the Co-Authored-By line; the
docx rendered and checked; Sam's steps after the merge listed (paste, New version, Set up, fill the
theme rows and form_template_url, theme existing forms by hand, Make hub files → hub branch commit).
