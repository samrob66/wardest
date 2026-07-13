# Project Handoff: Self-Hosted URL Shortener for Mapleton 44th Ward

## Goal
Build a self-hosted URL shortener on my own domain to replace TinyURL/tiny.cc.
Reason: TinyURL requires a paid account to *edit* an existing short link, and
tiny.cc won't create shorteners for some targets (e.g. Discord). I want to own
every slug and be able to edit any link, for free, on my own domain.

## Decisions already made
- **Stack:** Cloudflare Worker (redirect logic + admin page) + Workers KV
  (stores slug -> URL mappings) + Cloudflare Access (per-admin login by email,
  free Zero Trust plan up to 50 users). All free tier.
- **Editing UX:** a password-protected web admin page -- add/edit/delete/list
  links from phone or browser, changes live instantly (no git push, no redeploy).
- **DNS:** I'm happy to move my domain's DNS to Cloudflare (point registrar
  nameservers at Cloudflare -- free).
- **Short-link format:** BARE DOMAIN -- links look like `mydomain.com/discord`
  (this domain is dedicated to the shortener).
- **Multi-admin:** handled by Cloudflare Access (add admins by email address
  from a dashboard), NOT a custom-built username/password system.

## What I want built
- A Cloudflare Worker with:
  - Redirect logic: `mydomain.com/<slug>` -> the stored destination URL (301).
  - An admin page to add / edit / delete / list links (behind Cloudflare Access).
- Workers KV namespace for storage.
- `wrangler.toml` config.
- Seed/import of my 6 existing links (below) so they're live from day one.
- Step-by-step guidance for: creating the Cloudflare account, adding the domain,
  moving nameservers, deploying with wrangler, and enabling Cloudflare Access.

## The 6 existing links to migrate (label -> current short URL)
| Label | Current short URL | Slug I want |
|-------|-------------------|-------------|
| Show the Ward Bulletin      | tinyurl.com/m44bulletin       | (bulletin?)  |
| Fill out New Member Form    | tiny.cc/m44welcome            | (welcome?)   |
| Join Discord (Chat Rooms)   | tiny.cc/m44discord            | (discord?)   |
| Schedule an Interview       | tiny.cc/bishopappt            | (interview?) |
| Schedule a Setting Apart    | tiny.cc/setmeapart            | (setapart?)  |
| Visit the Stake Website     | tiny.cc/maplecanyonstake      | (stake?)     |

> NOTE: I still need to supply (a) the actual DESTINATION URLs these currently
> point to, and (b) my domain name, and (c) the exact slugs I want.

## Related existing project (separate, do not break)
There's an existing "link-in-bio" landing page project at
`F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio` (index.html + print.html +
build_pdf.py, repo: github.com/samrob66/m44links). It currently hardcodes the
tinyurl/tiny.cc links above. AFTER the shortener is live, those files should be
updated to use the new `mydomain.com/...` short links. This handoff is for the
NEW shortener project, which should live in its own new directory.

## Immediate next steps for the new chat
1. Confirm my domain name and the exact slug for each of the 6 links.
2. Confirm the destination URL each slug should point to.
3. Build the Worker + admin page + wrangler.toml + KV config + seed script.
4. Walk me through Cloudflare account / domain / nameserver setup, deploy, and
   turning on Cloudflare Access with admin emails.

## Sequencing preference
Fine to build the code first (it doesn't need DNS ready), then wire up
Cloudflare/DNS and deploy with guidance.

## Heads-up to resolve early
Moving nameservers to Cloudflare affects the WHOLE domain, including any email
or website already on it. Since the domain is dedicated to the shortener this is
likely a non-issue -- but confirm the domain isn't already handling email or a
live site before switching nameservers.
