# Google-only portal 2.5.1 — hub sections snippet: title colour, QR buttons instead of PNGs

> Run by the orchestrator skill: one implementer, one quick review. Branch
> `claude/google-portal-2-5-1-hub-snippet` off origin/main 52fd574. Tiny: only
> `google-portal/pages/hub-sections.html`, its tests, regenerated `dist/`, and one guide line.
> Don't touch the hub repo.

**Goal:** Make Hub files' `hub-sections.html` paste cleanly into the hub at go-live: titles stay navy, and
the QR codes need no `serve-qr.png` / `help-qr.png`.

## 1. Title colour
- `.gp-hub-card span { color: #5b6776 }` also greys the title, because `<strong>` sits inside that span.
  Add `.gp-hub-card strong { color: #1d3557; }` (or scope the grey to the inner short-link span with its own
  class, e.g. `.gp-hub-link`). Test: the built snippet gives the title navy and the short link grey (assert
  on the CSS rules in `GP_HUB_SECTIONS` / `renderHubSections_` output).

## 2. QR buttons in the hub's own pattern
- Reference: the live hub's two Service Portal cards on `m44ward/m44links` branch `service-portal-pages`
  (read only, e.g. `gh api repos/m44ward/m44links/contents/index.html?ref=service-portal-pages`; commit
  d1dcc26 added them, c7976ec restyled them). Match their markup pattern: the hub's link-card structure, a
  "Show QR Code" button calling the page's existing QR function with the short link, the short-link label.
- In the snippet use only placeholders and invented text: `{{SERVE_SHORT_LINK}}`, `{{HELP_SHORT_LINK}}`,
  `{{WARD_NAME}}`; no real names, links or the hub's function bodies beyond the call. Remove the
  `<img src="serve-qr.png">` / `help-qr.png` and the PNG instructions from the top comment; the comment
  says instead that the QR buttons use the hub's existing QR pop-up (the same function its other cards
  call), and that a hub without one can leave the button out.
- When a short link is blank, `renderHubSections_` must not produce a QR button that opens an empty code:
  leave the button out for that card (the link to serve.html / help.html stays). That logic may live in
  `renderHubSections_` (10-web.js, a UI-rendering part this branch may touch) or in the snippet via a
  placeholder; keep the existing placeholder names.
- Tests: no `.png` in the snippet; each card has the QR button with its short link; blank short link → no
  QR button for that card, link kept; no real names/links (only `example` hosts in fixtures).

## 3. Docs
- SETUP-GUIDE: the Make hub files / hub-sections step no longer mentions making QR images.
- `npm run gp:build`; verification `npm run gp:build && npm test && npm run typecheck && npm run gp:build:check`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
