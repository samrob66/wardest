# WardForward rename + Cloudflare Email Service — Implementation Plan

> **For agentic workers:** Built by one `implementer` under the orchestrator skill (not
> subagent-driven-development). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename Wardest to WardForward everywhere outside historical docs, and replace the two
Resend call sites with one shared mail module on the Cloudflare Email Service Workers binding,
shaped for the coming bulk-invitation feature.

**Architecture:** A new `src/lib/mail.ts` is the only code that sends email. It owns the sending
streams (`From` per stream), header allow-listing, one-recipient-per-message, retry on transient
errors, and the local "print to console" mode. `invites.ts` and `volMessages.ts` call it. Tests
swap the `EMAIL` binding for a recording fake, the way `sentFetches()` records fetches today.

**Tech Stack:** Hono on Cloudflare Workers, D1, R2, `send_email` binding (`env.EMAIL.send({...})`),
Vitest in the Workers runtime (`@cloudflare/vitest-plugin`), wrangler 4.157.

**Spec:** `docs/superpowers/specs/2026-11-22-wardforward-rename-design.md` (read it first).

## Global Constraints

- The name is written **WardForward** (two capitals) wherever people read it; lowercase only in
  addresses and identifiers (`wardforward`, `wardforward_vol`, `wardforward-db`).
- Hosts: `wardforward.com` (landing), `app.wardforward.com` (app). No reference to wardest.com
  remains outside historical docs; no redirect.
- Historical docs stay as written: `HANDOFF.md`, dated decision records, everything already under
  `docs/superpowers/specs/` and `docs/superpowers/plans/` (except this plan and the new spec, which
  already say WardForward).
- Identifiers: npm package `wardforward`, Worker `wardforward`, D1 `wardforward-db`, R2
  `wardforward-files`, cookies `wardest_*` → `wardforward_*`, repo `github.com/samrob66/wardforward`.
- Email streams: `notify` → `WardForward <no-reply@send.wardforward.com>`; `invitations` →
  `WardForward invitations <invite@send.wardforward.com>`.
- Every message has exactly one recipient. Never a visible To/CC list, never BCC fan-out.
- `RESEND_API_KEY` disappears from code, tests, config and live docs.
- Design canvas (Spruce #1F5141, Marigold #E9A93B, Bricolage Grotesque + Atkinson Hyperlegible)
  unchanged apart from the name; the nest mark keeps its shape, its wordmark reads "WardForward".
- Don't touch zippa.run, the M44 GitHub Pages site, or the M44 seed links. No feature behaviour
  change apart from the email provider. The local folder name `Wardest.com` stays.
- Never commit `.dev.vars`. `npm test && npm run typecheck` green before every commit. No deploys.

## Review Focus

1. A `to` holding several addresses (`"a@x.com, b@y.com"`, or `;`-separated) → refused for that
   message (result `ok:false`), never sent as a shared list. Test in Task 2.
2. CR/LF in a subject or header value (header injection) → that message refused, nothing sent.
   Test in Task 2.
3. One recipient's send throws mid-batch (rate limit, suppressed address) → every other recipient
   still gets theirs, `sendMailBatch` returns a per-recipient result and never throws. Test in Task 2.
4. Local run with no `EMAIL_DELIVERY` set and no working binding → messages print, the request
   never 500s. Test in Task 2 (binding absent → log), checked by hand in Task 4.
5. A link in any email must use `APP_URL`, never a hard-coded host, so a dev run prints
   `http://localhost:8787/...` links. Covered by the existing volunteer tests once they read the
   captured message; Task 3 asserts one invite link.

---

### Task 1: Check Cloudflare Email Service can do this

No code. Read current docs (`https://developers.cloudflare.com/email-service/`, its limits/pricing
and headers reference pages; `node_modules/@cloudflare/workers-types` for the `SendEmail` type)
and confirm, in the report's Decisions section, with the doc URLs:
- a Worker binding can send to **arbitrary** recipients (not only verified addresses) once the
  domain is onboarded, and on which plan (Workers Paid?);
- `List-Unsubscribe` and `List-Unsubscribe-Post` are allowed headers;
- what the local `send_email` binding does under `wrangler dev` without `remote: true`
  (simulated? writes a file? throws?);
- the exact `send()` signature and error shape in the installed workers-types.

**If arbitrary recipients are not possible from a Worker, stop and report `## Blocked`** (the spec
forbids falling back to Resend without the coordinator). If a detail below conflicts with the
docs, follow the docs and record it.

### Task 2: Shared mail module

**Files:**
- Create: `src/lib/mail.ts`
- Create: `test/mail.test.ts`
- Modify: `src/types.ts` (add `EMAIL?: SendEmail` — use the type name workers-types actually
  exports — and `EMAIL_DELIVERY?: string`; remove `RESEND_API_KEY`)
- Modify: `wrangler.toml` (add the binding, restricted to the two stream addresses):
  ```toml
  [[send_email]]
  name = "EMAIL"
  allowed_sender_addresses = ["no-reply@send.wardforward.com", "invite@send.wardforward.com"]
  ```
- Modify: `test/helpers.ts`, `test/setup.ts`, `vitest.config.ts` (fake binding; drop
  `RESEND_API_KEY`)

**Interfaces:**
- Produces (in `src/lib/mail.ts`):
  ```ts
  export type MailStream = 'notify' | 'invitations';
  export const STREAM_FROM: Record<MailStream, { email: string; name: string }>;
  export interface MailMessage {
    stream: MailStream;
    to: string;                        // exactly one address
    subject: string;
    html: string;
    text?: string;                     // derived from html when absent
    headers?: Record<string, string>;  // allow-listed only
    replyTo?: string;
    tag?: string;                      // for logs, e.g. "ward=… ref=… kind=…"
  }
  export interface MailResult { to: string; ok: boolean; messageId?: string; error?: string; logged?: boolean }
  export function sendMail(env: Env, m: MailMessage): Promise<MailResult>;          // never throws
  export function sendMailBatch(env: Env, ms: MailMessage[], opts?: { concurrency?: number }): Promise<MailResult[]>; // never throws; results in input order
  export function htmlToText(html: string): string;
  ```
- Produces (in `test/helpers.ts`): `sentEmails(): SentEmail[]` (each the exact object passed to
  `EMAIL.send`), `mockEmail(fn: (e: SentEmail) => void | Promise<void>)` (throw from `fn` to
  simulate an error, e.g. `Object.assign(new Error('x'), { code: 'E_RATE_LIMIT_EXCEEDED' })`),
  reset in `resetFetches()` (or a sibling reset called from `setup.ts`'s `beforeEach`).

Behaviour the tests pin:
- **Log mode** when `env.EMAIL_DELIVERY === 'log'` or `env.EMAIL` is absent: print the message in
  today's `devLog` format (`[dev email] stream=… to: … subject: … link: …` then the text), return
  `{ ok: true, logged: true }`, call no binding. Move `devLog`'s html-to-text into `htmlToText`.
- **Send mode** otherwise: one `env.EMAIL.send({ to, from: STREAM_FROM[stream], subject, html,
  text, headers?, replyTo? })` per message.
- `to` is trimmed and lowercased; refused (`ok:false`, `error: 'invalid_recipient'`) if it
  contains `,` `;` whitespace or is not a single `x@y.z`-shaped address.
- `subject` or any header name/value containing `\r` or `\n` → refused (`error: 'invalid_header'`).
- Headers: allowed names are `List-Unsubscribe`, `List-Unsubscribe-Post`, and any `X-*`;
  anything else (`From`, `To`, `Bcc`, `Subject`, `Reply-To`…) → refused (`error: 'header_not_allowed'`).
- Retry: an error whose `code` is `E_RATE_LIMIT_EXCEEDED` or `E_INTERNAL_SERVER_ERROR` is retried
  up to 2 more times with short exponential backoff (keep total under ~2 s; make the delay
  injectable or tiny under test). Any other error → `ok:false, error: <code or message>`, logged
  with `[mail]` and the tag, no retry.
- `sendMailBatch`: each message sent on its own; bounded concurrency (default 5); a failure never
  stops the others. No per-ward cap here (Sam: don't cap the ward's emails except at a very high
  number — that limit belongs to the next spec).

- [ ] **Step 1: Write failing tests in `test/mail.test.ts`**
  - `log mode prints and never calls the binding` (EMAIL_DELIVERY='log'; spy console.log; assert a
    line containing `to: a@x.com` and a `link: http://localhost:8787/…`; `sentEmails()` empty)
  - `binding absent → log mode` (`{ ...env, EMAIL: undefined }`)
  - `notify stream sends one message from no-reply` (from equals `{ email: 'no-reply@send.wardforward.com', name: 'WardForward' }`, `to` a single string, `text` non-empty)
  - `invitations stream uses invite@ with List-Unsubscribe headers passed through`
  - `refuses a multi-address to` (`'a@x.com, b@y.com'` and `'a@x.com;b@y.com'` → ok:false, nothing sent)
  - `refuses CRLF in subject or header value`
  - `refuses a non-allow-listed header` (`Bcc`)
  - `retries a rate-limited send then succeeds` (first call throws `E_RATE_LIMIT_EXCEEDED`, second ok → ok:true, 2 sends)
  - `does not retry a suppressed recipient` (`E_RECIPIENT_SUPPRESSED` → ok:false, 1 send)
  - `batch: one failure, the rest still go` (5 messages, #3 throws → 4 ok, results in input order, no throw)
- [ ] **Step 2: Run `npx vitest run test/mail.test.ts`** — expect failures (module missing).
- [ ] **Step 3: Implement `src/lib/mail.ts`, the types, the binding, and the test fake.** The fake
  must replace the binding the app sees in route tests too (check how tests build `env`; if the
  test `env.EMAIL` can't be reassigned, wrap it in setup the way `installFetchInterceptor` wraps
  fetch). Test env sets no `EMAIL_DELIVERY`, so tests exercise send mode.
- [ ] **Step 4: Run `npx vitest run test/mail.test.ts`** — all pass.
- [ ] **Step 5: Commit** (`npm test && npm run typecheck` first; other suites may still use the
  Resend interceptor until Task 3 — keep them green by doing Task 3's call-site switch in the
  same commit if needed).

### Task 3: Switch both call sites to the mail module

**Files:**
- Modify: `src/lib/volMessages.ts` (`deliver()` → `sendMail(env, { stream: 'notify', to, subject, html, tag: tag(m) })`; drop `FROM`, `devLog`, `sendEmail`, the `RESEND_API_KEY` branch; keep dedupe, Discord, never-throw)
- Modify: `src/lib/invites.ts` (`sendInviteEmail` → `sendMail` on `notify`; still returns `boolean` = `result.ok`; escape `wardName` in the HTML if it isn't already)
- Modify: every test that filters `sentFetches()` for `api.resend.com` (`volMessages`, `volCron`,
  `volFollowups`, `volMine`, `volPublicRoutes`, `discordConnect`, `schema`) to read `sentEmails()`
  instead (`e.to` is a string now, not `to[0]`); drop the `api.resend.com` default responder.
- Modify: `test/volMessages.test.ts` — the "dev" test becomes `EMAIL_DELIVERY: 'log'`; the
  "Resend 500" test becomes "a binding error does not throw".

- [ ] **Step 1: Add the failing test** `invite email goes through the binding with an APP_URL link`
  (in a new `test/invites.test.ts` or an existing suite): call `sendInviteEmail(env, { to, wardName: 'M44 <b>', acceptUrl: env.APP_URL + '/invite/abc' })`
  → one `sentEmails()` entry, from `no-reply@send.wardforward.com`, subject
  `You've been added to M44 <b> on WardForward`, html contains `http://localhost:8787/invite/abc`
  and no raw `<b>`; returns `true`. With `mockEmail` throwing → returns `false`.
- [ ] **Step 2: Run it** — fails.
- [ ] **Step 3: Switch both call sites and migrate the tests listed above.**
- [ ] **Step 4: `npm test && npm run typecheck`** — all green; `git grep -i resend -- src test vitest.config.ts` empty.
- [ ] **Step 5: Commit.**

### Task 4: Rename everything (code, config, data, docs) and verify locally

**Files:** every file `git grep -il wardest -- . ':!docs/superpowers' ':!HANDOFF.md'` lists
(about 40: `wrangler.toml`, `package.json` + `package-lock.json` name, `src/**` incl.
`views/landing.ts`, `views/layout.ts`, `lib/volSession.ts` cookie, `db/*.sql` comments/seed text,
`test/**`, `.dev.vars.example`, and the live docs `CLAUDE.md`, `BLUEPRINT.md`, `SCHEMA.md`,
`IMPLEMENTATION.md`). Leave dated decision records inside docs as written (a dated "2026-10 …
decided" passage stays; the doc's current-state text changes).

- [ ] **Step 1:** Rename identifiers: Worker `name = "wardforward"`, `APP_URL =
  "https://app.wardforward.com"`, D1 `wardforward-db` (also in the npm `db:*` scripts), R2
  `wardforward-files`, commented routes for `wardforward.com/*` and `app.wardforward.com/*` with
  `zone_name = "wardforward.com"`, cookies `wardforward_*`, log prefixes, test names, `package.json`
  name (regenerate the lockfile's name field with `npm install --package-lock-only`, no version drift).
- [ ] **Step 2:** User-facing strings: page titles, landing page, layout header/footer, Open Graph
  tags, print layouts, email subjects/bodies, the nest mark's wordmark → "WardForward" (keep the
  mark's shape; if it reads as a "W-nest" that no longer fits, keep it and say so in Decisions).
- [ ] **Step 3:** `.dev.vars.example`: remove `RESEND_API_KEY`; add `EMAIL_DELIVERY=log   # local
  only: print every email (with its links) to the console instead of sending`; Discord redirect
  note names WardForward. Add `EMAIL_DELIVERY=log` to your own untracked `.dev.vars` copy.
- [ ] **Step 4:** Live docs: `CLAUDE.md` gets, directly under the title, `Renamed from Wardest to
  WardForward on 2026-11-22.`; surfaces, architecture (Email: Cloudflare Email Service via the
  `EMAIL` binding, streams, `EMAIL_DELIVERY=log` locally, `src/lib/mail.ts` is the only sender),
  deploy commands (`wardforward-db`, no `RESEND_API_KEY` secret), heads-up DNS section for
  wardforward.com. `IMPLEMENTATION.md` owner steps O2–O6, §5b, §10 rewritten for WardForward with:
  Workers Paid plan; put wardforward.com on Cloudflare DNS; `wrangler email sending enable
  send.wardforward.com` (or the dashboard) and its DNS records; Google OAuth client with redirect
  `https://app.wardforward.com/auth/google/callback` (use the real callback path from
  `src/auth-routes.ts`); Discord redirect `https://app.wardforward.com/vol/discord/callback`;
  `wrangler d1 create wardforward-db`; `wrangler r2 bucket create wardforward-files`; Sam renames
  the GitHub repo to `samrob66/wardforward`. `BLUEPRINT.md`, `SCHEMA.md`: name and hosts.
- [ ] **Step 5: Verify the grep.** `git grep -i wardest -- src db test wrangler.toml package.json
  package-lock.json vitest.config.ts .dev.vars.example CLAUDE.md BLUEPRINT.md SCHEMA.md
  IMPLEMENTATION.md` → only lines that are dated history (list each survivor in the report with why;
  expected: the CLAUDE.md rename note, and dated decision records). Code, db, test, config: zero.
- [ ] **Step 6: `npm test && npm run typecheck`** — green.
- [ ] **Step 7: Local run from fresh state.** Copy the main checkout's `.dev.vars`
  (`F:\!SLRFam\AI\Claude-Apps\Wardest.com\.dev.vars`) into the worktree if absent (never print or
  commit it; add `EMAIL_DELIVERY=log`). Use `--persist-to <scratch dir>` on `d1 execute` and
  `dev` (or delete the worktree's `.wrangler/state`). Run the three `db:*:local` steps, start
  `npm run dev` in the background, and check: `/p/m44` renders with "WardForward" and no
  "Wardest"; `/auth/dev-login?email=…` signs in; a volunteer sign-up on a public post prints a
  `[dev email]` block whose links start `http://localhost:8787/`. Also start once **without**
  `EMAIL_DELIVERY` and confirm a sign-up neither 500s nor sends (record what the local binding did).
  Stop the dev server.
- [ ] **Step 8: Commit.**

### Task 5: Independence disclaimer and contact line (General Handbook 38.8.21.2)

Added by the coordinator on 2026-11-22, after Task 4. Why: the Church's General Handbook
38.8.21.2 says an online resource made to help with callings must include a disclaimer that it
is not an official, Church-sponsored product, should include contact information, and may not
use the Church's official name, wordmark or symbol.

**Files:**
- Create: `src/views/footer.ts` (`DISCLAIMER`, `contactEmail()`, `siteFooter({ print? })`),
  `test/footer.test.ts`
- Modify: `src/views/landing.ts`, `layout.ts`, `portal.ts`, `portalprint.ts`, `notfound.ts`
  (render `siteFooter()`), `src/lib/mail.ts` (append it to html + text of every message),
  `src/types.ts` (`CONTACT_EMAIL?: string`), `wrangler.toml` (`[vars] CONTACT_EMAIL = ""`),
  `.dev.vars.example`, `vitest.config.ts`, `test/mail.test.ts`, `CLAUDE.md`, `IMPLEMENTATION.md`

- [ ] **Step 1:** Footer on every page (landing, app layout, public portal and its print layouts,
  `/v/` public post pages, `/vol/*` volunteer pages, error/not-found pages) and in every email
  (in `src/lib/mail.ts`, html and text), exact text: "WardForward is an independent tool made by
  Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ
  of Latter-day Saints." Plus `Contact: <a href="mailto:X">X</a>` from `CONTACT_EMAIL`
  (default `""` hides the line; HTML-escaped). One shared footer helper, not copies.
- [ ] **Step 2: Tests.** A page test per surface family (landing, app layout page, `/p/<prefix>`
  portal and print, a `/v/` page, a `/vol/` page, not-found) asserts the disclaimer; one asserts
  the contact line is absent with `CONTACT_EMAIL=""` and present (escaped mailto) when set;
  `test/mail.test.ts` asserts the disclaimer in the html and text of a sent message.
- [ ] **Step 3: Audit** UI, landing copy, seeds and assets for the Church's name ("The Church of
  Jesus Christ of Latter-day Saints", "LDS", "Mormon"), wordmark or symbol. Change nothing beyond
  the footer; list every hit (file:line, text) in the report for the coordinator to decide.
- [ ] **Step 4:** `CLAUDE.md` architecture mentions the footer + `CONTACT_EMAIL`;
  `IMPLEMENTATION.md` gets the `CONTACT_EMAIL` owner step.
- [ ] **Step 5:** `npm test && npm run typecheck`; commit.

---

Done when: Tasks 1–5 committed on `claude/wardforward-rename-573103`, tests + typecheck green, the
grep clean, the local run checked, and the report lists the owner steps from spec §5.
