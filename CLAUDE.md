# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status: greenfield

Almost nothing is built yet. `HANDOFF.md` is the original spec (it describes only the URL
shortener); read it for background, but note the scope has since **expanded** — this file is
the current source of truth where the two disagree.

## What is being built

**Wardest.com** — a suite of self-hosted solutions for LDS ward leaders, organized into two
audience categories: **Ward Clerks** and **Executive Secretaries**. The project has two parts:

1. **Main site — `wardest.com`** — hosts the series of solutions/tools for those two categories.
   (Specific tools TBD; this is the umbrella the project is growing into.)
2. **URL shortener — `my.wardest.com`** — the first solution, on a dedicated subdomain. It
   replaces TinyURL/tiny.cc, which charge to *edit* links and refuse some targets (e.g.
   Discord). The owner wants to own every slug and edit any link for free.

Short links use bare paths on the subdomain: `my.wardest.com/<slug>`.

## Architecture — URL shortener (all Cloudflare free tier)

- **Cloudflare Worker** — the shortener app. Two responsibilities:
  - Redirect: `GET my.wardest.com/<slug>` → 301 to the stored destination URL.
  - Admin page: add / edit / delete / list links from a browser or phone, changes live
    instantly (no git push, no redeploy).
- **Workers KV** — stores `slug -> destination URL` mappings. Source of truth for links at
  runtime, *not* files in this repo.
- **Cloudflare Access** (Zero Trust, free ≤50 users) — gates the admin page by admin email.
  Do **not** build a custom username/password system; multi-admin is managed from the
  Cloudflare dashboard.
- **`wrangler.toml`** — Worker + KV namespace binding config.
- **`seed/links.json`** — the 6 initial Mapleton 44th Ward links, in `wrangler kv bulk put`
  format, so they're live from day one.

Key consequence: link data lives in KV and admin auth lives in Cloudflare Access — neither is
in this repo. The repo holds Worker code, `wrangler.toml`, and the seed file.

### Slug case-sensitivity — decide early

The seed slugs are mixed-case (`M44discord`, `M44bulletin`, `M44welcome`, `M44bishopappt`,
`setmeapart`, `maplecanyonstake`). URL paths are case-sensitive by default, so
`my.wardest.com/m44discord` would 404 against a `M44discord` key. Recommendation: normalize the
slug to lower-case on both write (admin) and read (redirect) so links are case-insensitive.
Store keys lower-cased in KV if you do this.

## Deploy / develop (once the Worker exists)

Uses Cloudflare Wrangler. Commands below are the **current** syntax (Wrangler ≥ 3.60.0, which
uses space-separated `kv ...` subcommands; the old colon form `kv:...` is deprecated). Prefix
with `npx ` if Wrangler isn't installed globally.

- `wrangler dev` — run the Worker locally.
- `wrangler deploy` — deploy to Cloudflare.
- `wrangler kv namespace create <KV_BINDING>` — create the namespace; paste the printed
  `kv_namespaces = [...]` block into `wrangler.toml`.
- `wrangler kv key put --binding=<KV_BINDING> "<slug>" "<url>"` — set one link.
- `wrangler kv bulk put --binding=<KV_BINDING> seed/links.json` — seed all 6 links at once.
  Add `--preview` to target the preview namespace instead of production.

## Still needed from the owner

- Which tools the **main `wardest.com`** site should host, and how the Ward Clerks vs.
  Executive Secretaries categories are presented.
- Cloudflare account setup, adding `wardest.com`, moving nameservers, and enabling Cloudflare
  Access with admin emails — walk the owner through these once code is ready. Building code
  first is fine; it doesn't need DNS ready.

## Related project — do not break

`F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio` (repo `github.com/samrob66/m44links`,
`index.html` + `print.html` + `build_pdf.py`) is a separate link-in-bio landing page that
currently hardcodes the old tinyurl/tiny.cc links. **After** the shortener is live, those files
should be updated to the new `my.wardest.com/...` links. Not part of this repo's build.

## Heads-up

Moving nameservers to Cloudflare affects the **whole `wardest.com` domain**. Confirm the domain
isn't already handling email or a live site before switching nameservers.
