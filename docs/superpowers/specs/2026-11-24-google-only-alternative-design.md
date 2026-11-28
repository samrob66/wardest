# Google-only alternative to the WardForward app — design

Status: APPROVED to build, 2026-11-24 (Draft 2). Sam: "let's set up the Google-only volunteer
portal now. Take me through the entire process and let's get that going so the ward's immediate
needs are filled." When this spec was written, nothing had been built or created in Google, and
no Google account had been signed in to.
Coordinator: session `local_a8b6bffb-9340-4139-aeaa-52d78581c2e0`.
Plain-language summary for Sam: `drafts/Google-Only-Alternative-Summary-DRAFT-2.docx`
(Draft 1 is in `drafts/archive/`).

All examples use an invented ward, "Riverbend 1st Ward (example)", and invented people.

**What changed from Draft 1** (after Sam's review, 2026-11-24; §12 records each decision):
- The public pages are now **sub-pages of the ward's hub**, like the Interviews pages. They read
  live counts from the script and send sign-ups to it. No Google banner on them (§5.3).
- Leaders create and edit opportunities on a **leader page with fixed fields** and "Add date" /
  "Add role" buttons, reached by a personal leader link. Nobody types or shapes sheet rows (§5.6).
- **Who approved whom is recorded automatically**, and approval is limited to the post's own
  organization's leaders plus the bishopric (§4.1, §5.6).
- Because leaders work on their own page, the Service Sheet goes only to the bishopric and ward
  council, so **other leaders see only their own organization's names** (§5.4).
- **Monthly file rotation is only for request sheets.** Opportunities and sign-ups are never
  rotated or deleted by it (§8.2).
- **No clean-up of old volunteer emails is offered** (Sam: "I wouldn't auto-clear them").
- Counts: 48 Full, 3 Partial, 1 changed by choice, 4 Not possible (was 41 / 8 / 1 / 6). Effort
  grows to about 2,700–3,700 lines.

## 1. The question, and how this reads it

Sam (2026-11-24): "Could we consider what it would look like if we never went to the fourth
level? What if we tried to use Google Forms and scripts and docs/sheets, etc. to do the best job
that we could building the volunteer portal with sign-ups and requests of different kinds?"

In the leader report (`drafts/WardForward-Leader-Report-DRAFT-2.docx`; Draft 1 in `drafts/archive/`) the ladder is:
1. Plain Google files. 2. Google plus small scripts. 3. Public pages and short links.
4. Outside services (MealTrain, WardBulletin.app, Discord). 5. The WardForward app.

**Interpretation used here:** stay inside Levels 1–3. Everything runs on the bishopric's shared
Google account (the one already on Google AI Plus) using Forms, Sheets, Docs, Calendar, Gmail,
Apps Script (web apps, triggers, MailApp) and Drive sharing; the public way in is the ward's
existing hub page (Level 3: for M44, the Links hub on GitHub Pages) and zippa.run short links. No
Cloudflare, no WardForward, no new outside company, no third-party Forms add-ons (those are
outside services). Discord is already approved, so posting to a Discord channel through a plain
channel webhook from Apps Script is allowed **only as an optional extra**, flagged where it
appears. Staying at Level 3 also means the Google build has to **replace MealTrain** for meals;
it does (§4.6).

## 2. Bottom line (read this if nothing else)

- **It gets nearly all the way:** of 56 WardForward features, 48 work fully, 3 work in part, 1 is
  done differently by choice, and 4 can't be done (§4.7). Sign-ups with slots, fill bars, the
  public "Service Opportunities" and "Request Help" pages, first-time approval with a record of
  who approved, reminders, cancellations, warnings, children, categories and coordinators,
  per-organization privacy, confidential requests and the 30-day purge all work.
- **Members see the ward's own pages.** Serve, post, help, confirm and My sign-ups are sub-pages
  of the ward's hub, with the hub's look and no Google banner. Live counts take a second or two
  to appear.
- **Leaders get real screens, not a spreadsheet,** for making opportunities, approving
  volunteers and seeing who signed up. They reach them by a personal emailed leader link instead
  of a Google sign-in, which is weaker (a forwarded link works for whoever has it; §6.2).
  Requests stay in private Google Sheets, where Google's own sign-in guards them.
- **The one big loss is bulk invitations.** A personal Google account's scripts may email only
  **100 recipients a day**. Emailing 204 sisters five times a month (about 1,000 emails) cannot be
  done by the script. Leaders keep doing that the way they do today: one Gmail message with the
  addresses in Bcc, now pointing at the ward's sign-up page instead of MealTrain (Sam agreed).
- **What the ward gains:** no new hosting, no new company, no app run on Sam's own account, and the
  data sits where the ward's other records already sit, so the approval story is the same one the
  leaders are already deciding for Levels 1–2. It is still **not a Church-provided system**
  (Handbook 38.8.32), exactly as the report says of the Ward Workbook.
- **Effort:** roughly 2,700–3,700 lines of Apps Script and page code plus a template spreadsheet,
  three template forms, hub page templates and a setup guide. Phase 1 is about 40% of that.

## 3. What has to be matched

The features come from `2026-11-21-volunteer-signups-design.md` (sign-ups) and
`2026-11-22-service-opportunities-requests-design.md` (categories, requests, invitations, portal
sections), plus the invariants in `CLAUDE.md` and `BLUEPRINT.md` §6 (portals, spaces). Settled
rules from those specs are kept wherever Google allows; where it doesn't, §4 says what changes.

## 4. Feature by feature

**Full** = same result. **Partial** = works, with the loss named. **Not possible** = cannot be
done with Levels 1–3 tools (or only by a workaround outside the system).

### 4.1 Sign-ups (volunteer posts)

| Feature (WardForward) | Google-only | How / what's lost |
|---|---|---|
| Post with dates, roles, number needed, times, notes, "what are you bringing" | Full | Leader page form with fixed fields and "Add date" / "Add role" buttons (§5.6). The script checks it and writes the rows. |
| "Copy this date", "copy this post" | Full | Buttons on the leader page. |
| One unguessable public link per post | Full | Hub page `post.html#p=<random id>`; a zippa.run short link can point at it. |
| Public page shows counts, never names or private details | Full | The script's public data feed returns counts only (§5.3). |
| Discord/email preview card ("7 of 10 filled") | Partial | Hub pages carry the ward's own title and image, so a shared link previews as "Riverbend 1st Ward (example) · Service Opportunities". Live counts can't be in it: link previews don't run the page's code. |
| `noindex` | Full | A robots meta tag in each hub page. |
| Sign up with any email, no Google account | Full | Name + email typed on the hub page. |
| Confirm-your-address link for first-timers | Full | Emailed link opens a hub page with a button that confirms (mail scanners can't confirm by prefetching). |
| First-time approval by the organization's leaders, ward-wide | Full | Approve / Decline on the leader page. Only leaders of the organization whose post the person signed up for, and the bishopric, may approve. The script records the approver's name and the time. |
| Leaders' own emails skip approval | Full | Emails in the Leaders tab are approved automatically. |
| Declines remembered; bishopric can undo or revoke | Full | Volunteer status Approved / Declined / Revoked; undo and revoke on the bishopric's leader page, also recorded. |
| Waiting sign-ups don't count; "7 of 10 · 3 waiting" for leaders | Full | Counts computed by the script; the waiting count shows only on leader pages and in the Sheet. |
| Over-filling allowed; late person told and offered "withdraw" | Full | Same email, same one-click withdraw page. |
| Race for the last spot | Full | Script lock (`LockService`) around each sign-up; both may get in, per the settled rule. |
| Role shows "Filled ✓" and closes | Full | |
| Cancel up to the organizer's cutoff; after it, "you're now short" | Full | Cutoff hours field on the post. |
| Leaders remove a volunteer | Full | Remove button on the leader page; the script emails the volunteer. |
| My sign-ups (upcoming, past, cancel; names of others on the same post; private details) | Full | Hub page reached by a personal link in every confirmation email. |
| Other ways to serve (only fill levels) | Full | Listed on My sign-ups. |
| Private details only to confirmed, approved volunteers, only by email or My sign-ups | Full | Same rule. |
| Private-details access ends when the post is over | Full | |
| Day-before reminders | Full | Hourly trigger, ward time zone (script project setting). |
| 48-hour "still waiting for approval" nudge | Full | Hourly trigger. |
| Waiting sign-ups lapse when the post is over | Full | Hourly trigger. |
| Leader emails: new person waiting, fully filled, cancellations | Full | Counted in the email budget (§7). |
| Ward council sees every post and sign-up | Full | Ward council has the Service Sheet and an all-organizations view on the leader page. |
| Org leaders see only their own org's names and details | Full | Leaders not on the ward council don't get the Service Sheet; their leader page shows only their own organization's posts and names (§5.4). |
| Edit rights: creator, the org's volunteer editors, bishopric | Full | The script checks the leader link against the Leaders tab before every save. |
| Ward council page highlighting short posts within 14 days | Full | "Needs help soon" on the ward council's leader page and as a Sheet tab. |
| Past posts kept for the ward council | Full | |
| Discord direct-message reminders (bot) | Not possible | A bot is a Discord application with a server login; out of scope. Email only. |
| Turnstile bot check on public forms | Not possible | No Google-only equivalent without registering a reCAPTCHA key. Replaced by per-address and per-day limits that protect the email budget (§7.3). |

### 4.2 Service opportunities page and categories

| Feature | Google-only | How / what's lost |
|---|---|---|
| `/serve` page grouped Brothers / Sisters / Youth / Children, fill bars, "Filled" at the bottom | Full | Hub page `serve.html`. |
| Its own QR code and short link | Full | zippa.run link (e.g. `zippa.run/rb1Serve`); QR made the way the hub's QR codes are made today. |
| Categories with icons, owners, default audiences, archived | Full | Categories tab (bishopric edits). Icons are emoji or small images in the hub. |
| "Create Service Opportunity" button for leaders | Full | Opens the leader page's new-opportunity form, for anyone holding a leader link. |
| Delegates (coordinators) per category who get its messages | Full | Coordinators column in Categories. |
| Delegates see only their own category | Full | Their leader page shows only their categories' posts ("My service opportunities"). |
| Fill warnings at the chosen lead time, extra people warned | Full | Hourly trigger; Warn columns in Categories. |
| Children/youth signed up by a parent (first name only) | Full | "Who is serving? Me / My child" on the sign-up page. |
| Discord channel announcement of a new post | Full (optional extra) | `UrlFetchApp` POST to a pasted channel webhook. Flagged: only if leaders keep Discord. |

### 4.3 Service requests

| Feature | Google-only | How / what's lost |
|---|---|---|
| "Request Help or Service" page with picture tiles | Full | Hub page `help.html` with tiles linking to each request's Google Form (§5.5). |
| Minimal forms (name, contact, optional 200-char note; moving in/out + date; Christmas: my family / another family) | Full | One Google Form per request kind. |
| Requester's email verified by link | Changed (by choice) | Not done. Forms can only verify an email by making the person sign in to Google (Sam's rule: "not everyone has Gmail"). Instead the form asks for name and a phone or email, sends **nothing** to the requester, and the leader confirms in person. Fewer emails, nothing revealed if someone types another person's address. A fake request costs one conversation. |
| Each form says who will see it | Full | Form description. |
| Christmas giving offers (§12 decisions 16, 17) | Full | A request kind that is never on the Help page: families offer gifts on its form, shared by short link or, when the ward ticks On Serve page, from an "Offer to give at Christmas" card on the Service Opportunities page. Offers land in their own folder read by the bishopric and the Christmas gift coordinators, who match offers to Christmas requests themselves. |
| Only the responsible leaders see requests; Christmas and Other only the bishopric and those they name | Full (with one caveat) | Each request kind writes to its own spreadsheet in a Drive folder shared only with its leaders (§5.4). The whole bishopric opens every request folder (§12 decision 18); Moving and other non-confidential kinds also go to their owning organizations' leaders and Coordinators. Christmas and Other go to the whole bishopric (Bishopric ticked: bishop, both counselors, Executive Secretary, Ward Clerk) plus that kind's Coordinators (§12 decision 14). Caveat: the shared bishopric account owns every file, so anyone who signs in to that account can open them, and so can anyone who edits the Service Sheet, through its bound script; both are the bishopric. Same as WardForward's superadmins. |
| Inbox with status, assignee, one short private note | Full | Columns in each request sheet. |
| Leader notice by email with no details | Full | "A new Moving request came in. Open your Requests folder." |
| "Turn into a service opportunity" | Full (§12 decision 19) | A reader of the request ticks **Make opportunity** on its row in the request sheet (and **Copy contact to private details** only if wanted). Within the hour the script makes a **Draft** in the request kind's **Opportunity category** (Categories): the category's name as title, its owner and audiences, an empty public note, one "Help" role on the Moving date or a week out, private details empty unless Copy contact is ticked (name and contact only, never the note). It writes **Posted as** and unticks the box, and emails the kind's Notify people who can edit the draft, with nothing from the request. The leader finishes and publishes it on the leader page, where it is marked *From a request*. Request text never reaches the leader page or a public page; kinds with a blank Opportunity category (Christmas, Other, giving) can't be turned. |
| Message to the requester when done/declined | Partial | The leader contacts them directly (no stored, verified email). |
| Deleted 30 days after it closes | Full, with care | §8.2: rows leave the sheet at 30 days; the monthly rotation of **request files only** removes them from version history too. |

### 4.4 Bulk invitations

| Feature | Google-only | How / what's lost |
|---|---|---|
| Paste up to 2,000 addresses; each gets their own email | Not possible | 100 script email recipients a day (§7). |
| Practical substitute | Partial (not counted) | Leader sends one Gmail message (their own or the shared account's) with the addresses in **Bcc**, linking to the serve page or post. This is today's practice, and Sam accepted it (2026-11-24). A personal Gmail account may send to about 500 recipients a day; 204 sisters fits in one message. |
| One-click unsubscribe, suppression list | Not possible | Replies asking to stop are honored by hand. Gmail's own one-click unsubscribe header can't be set from Apps Script's `MailApp`. |
| Progress, daily ceiling, batch records | Not applicable (not counted) | |

### 4.5 Portal sections

| Feature | Google-only | How / what's lost |
|---|---|---|
| "Service Opportunities" and "Service Requests" sections at the top of the ward's link page, with golden lines and QR codes | Full | Two new sections on the ward's hub, plus the sub-pages (§5.3). For M44 the hub is ward property: the ward adds the files, never this project. |
| The ward's own sections (Ward Links, Interviews) | Full | Already on the hub. |
| Printable poster | Full | As today. |

### 4.6 Meals (replacing MealTrain)

A meal post is one role ("Bring a meal", 1 per date) on many dates, with "what are you
bringing?". On the leader page, "Add dates" takes a start date, an end date and which weekdays,
so a 20-date meal train is one step. The family's address and any food notes go in the post's
**private details**, which only confirmed, approved volunteers see, by email and on My sign-ups.
Compared with MealTrain: no ads, no advertising partners, and the family's details don't sit with
an outside company. Lost: MealTrain's polish (calendar view, gift cards, its app). Keep food notes
short and non-medical ("no nuts", not the reason).

### 4.7 Count

Of the 56 features in §4.1–4.5 (not counting the two rows marked "not counted"): **48 Full,
3 Partial, 1 changed by choice (request email verification), 4 Not possible.**
- Partial: preview cards (no live counts), "turn a request into an opportunity", messaging the
  requester.
- Not possible: bulk invitations, one-click unsubscribe, Discord direct messages, the Turnstile
  bot check.
- Moved up from Draft 1 because of the hub pages and the leader page: copy date/post, `noindex`,
  first-time approval, edit rights, the "Create" button and delegates' own view (Partial → Full);
  per-organization privacy (Not possible → Full); preview cards (Not possible → Partial).

## 5. Architecture

### 5.1 Pieces

| Piece | Where | Shared with |
|---|---|---|
| **Service Sheet** | Google Sheet with the Apps Script project bound to it, in the "Service Portal" Drive folder | Bishopric, i.e. every Leaders row with Bishopric ticked (edit Settings, Leaders, Categories), and ward council (read) |
| **Service script** | The same script, deployed as a web app: Execute as **me** (the shared account), access **Anyone**. It is a data service for the hub pages, and also serves the same pages itself as a fallback | Public, through the pages |
| **Hub sub-pages** | Static HTML + JavaScript files in the ward's hub (GitHub Pages for M44): `serve.html`, `post.html`, `help.html`, `confirm.html`, `me.html`, `leader.html` | Public. The files hold no data; data comes from the script |
| **Request forms** (Moving, Christmas, Other; more later) | Google Forms, not linked to a response sheet | Anyone with the link can answer; only the shared account edits |
| **Request folders and sheets** (one folder per request kind, e.g. "Requests – Moving help", "Requests – Christmas help"), each holding that month's request sheet | Drive | The folder is shared with the whole bishopric and that kind's leaders only (Moving and other non-confidential kinds: also its owning organizations' leaders and Coordinators; Christmas/Other: only the bishopric and that kind's Coordinators, e.g. the Christmas gift coordinators) |
| **System Sheet** | Google Sheet: hashed tokens, leader links, rate counters, email outbox, log, Discord webhook URL | Nobody but the shared account |

Why one script: one place to update, one owner, one set of triggers. Why the System Sheet is
separate: Drive shares whole files, and tokens must never be readable by leaders who have the
Service Sheet.

### 5.2 Service Sheet tabs

Columns are found by header name, never by position, so an inserted column doesn't break the
script. Only Settings, Leaders and Categories are typed by people (the bishopric and Executive
Secretary). Every other tab is **written by the script and protected** so only the shared account
can change it; the ward council reads them.

- **Read me** – what each tab is for, the independence notice, the Gemini rule (§8.1), who to
  contact.
- **Settings** – ward name, short ward prefix, time zone, contact email, hub address, serve/help
  short links, reminder hour, default cancel cutoff (24 h), daily email reserve (§7.2), Discord
  on/off.
- **Leaders** – name, email, calling, organization, roles (Bishopric / Ward council / Org editor /
  Coordinator), "send leader link" checkbox. Drives leader links (§6.2) and file sharing
  (**Sync sharing**, §9.1).
- **Categories** – id, name, icon, kind (Opportunity / Request), owning organization(s), default
  audiences, coordinators (emails), "any ward council member may create", confidential, warn
  hours, also warn (emails), Discord on/off.
- **Posts** – one row per opportunity: post id, organization, category, title, audiences, public
  note, private details, cancel cutoff, status (Draft / Open / Filled / Past), created by, last
  changed by and when.
- **Slots** – one row per date-and-role: post id, date, start, end, role, number needed, role
  note, bringing prompt, filled, waiting.
- **Sign-ups** – sign-up id, post id, slot, volunteer email, name, child first name, bringing,
  status (Waiting-email / Waiting-approval / Confirmed / Cancelled / Withdrawn / Removed /
  Lapsed), signed up at, counted-over-limit flag, removed by.
- **Volunteers** – email, name, status (Pending / Approved / Declined / Revoked), **decided by**
  (the leader's name, from their leader link), **decided at**, first post (whose organization's
  leaders may approve).
- **Needs help soon** – open posts within 14 days that are short.
- **Past** – finished posts moved here (kept for the ward council, per the sign-ups spec).

(Draft 1 had leaders type posts into one tab per organization, with slot rows under each post.
Retired: Sam asked whether leaders would have to shape sub-rows correctly, and the honest answer
was yes. With the leader page writing the rows, one Posts tab and one Slots tab are simpler and
can't be mis-shaped.)

### 5.3 Public pages: sub-pages of the hub

Sam asked (2026-11-24) whether the public page is "another page in the Links in Bio pages,
basically a sub-page like the Interviews pages are". It is.

| Page | Hub URL | Shows |
|---|---|---|
| Serve | `serve.html` | Open posts by Brothers / Sisters / Youth / Children, fill bars |
| Post | `post.html#p=<postId>` | One post: roles, counts, notes, sign-up form |
| Help | `help.html` | Request tiles; each opens its Google Form |
| Confirm / withdraw / cancel | `confirm.html#t=<token>` | One button |
| My sign-ups | `me.html#t=<token>` | The volunteer's sign-ups, cancel buttons, others' names on the same post, other ways to serve |
| Leader | `leader.html#k=<leader link>` | §5.6 |

How they work:
- The files are plain HTML and JavaScript with the hub's look. They hold **no ward data**; the
  ward copies them from the template into its hub once, and changes them only when the template
  changes.
- On load, a page asks the script for its data: `GET <web app>/exec?api=serve` (or `post`, `me`,
  …). The script answers with JSON (`ContentService`). The public answers hold only titles, notes,
  dates, roles and counts, never names, emails or private details.
- Actions (sign up, confirm, cancel, approve, save a post) are `POST`s to the same address with a
  `text/plain` body holding JSON. A plain-text POST is a "simple" request, so the browser sends no
  pre-check (preflight) that Apps Script couldn't answer.
- Tokens and leader links ride in the address **after `#`**, which browsers never send to GitHub's
  servers or put in the Referer header. The page reads them and sends them in the request body.
- Every page has a robots `noindex` tag and the ward's own preview title and image.
- The serve list is cached by the script for one minute (`CacheService`), so a busy Sunday costs
  little. Counts appear one to two seconds after the page; the page itself opens at once.
- Every page footer carries the independence notice from `src/views/footer.ts` (General Handbook
  38.8.21.2): "This page is an independent tool made by Church members. It is not an official
  product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints." plus the ward's
  contact email. Every email carries the same text.

**Fallback for a ward without a hub:** the same pages are served by the script itself
(`<web app>/exec?page=serve`, …) through `HtmlService`. They work the same but carry Google's
notice at the top ("This application was created by a Google Apps Script user"), open inside
Google's frame, take 2–4 seconds, and their link previews show Google's generic title. The page
code is shared: one small function sends requests by `fetch` on the hub and by
`google.script.run` in the fallback. A Google Site can link to these pages.

The cross-site `GET` and `POST` behaviour (Apps Script answers through a redirect to
`script.googleusercontent.com`, which allows any origin) is widely used but not documented as a
promise by Google; it is the first item in the §11 test.

### 5.4 Who sees what

| Person | Service Sheet | Leader page | Request folders | Public pages |
|---|---|---|---|---|
| Bishopric (Bishopric ticked: bishop, both counselors, Executive Secretary, Ward Clerk) | Edit Settings, Leaders, Categories; read the rest | All organizations; approve, undo, revoke anywhere | **Every** request folder (§12 decision 18) | Yes |
| Ward council | Read all | All organizations (read); edit and approve for their own organization | A non-confidential request kind's folder if their organization owns it | Yes |
| Org volunteer editors, category coordinators (not on ward council) | **No** | Only their organization's or categories' posts and names | A request kind's folder if named in its Coordinators (e.g. the Christmas gift coordinators: the Christmas help and Christmas giving offers folders and their notices, and nothing else) | Yes |
| Volunteer | No | No | No | Public pages + their own My sign-ups |
| Requester | No | No | No | Help page and form |
| Anyone signed in to the shared account | Everything | – | Everything | – |

Rules:
- "The bishopric" is every Leaders row with **Bishopric** ticked, which the guide says to tick
  for the bishop, both counselors, the Executive Secretary and the Ward Clerk. The Calling text
  decides no access (it only names the two administrators who get alert emails: `Bishop` and
  `Executive Secretary`). §12 decision 14.
- Every request folder is read by the whole bishopric and that kind's Coordinators (§12
  decision 18). Non-confidential kinds (Moving, and any kind a ward adds) are also read by the
  leaders of their owning organizations.
- Confidential request kinds (Confidential ticked: Christmas, Other) are read by the bishopric
  plus that kind's Coordinators only. No other ward council or organization leader gets them unless
  named a Coordinator. Coordinators need no Leaders row: the Christmas gift coordinators (a
  couple outside the bishopric) are listed there by email, on both Christmas rows, and get the
  Christmas help and Christmas giving offers folders and their notices, and nothing else (§12
  decisions 15 and 16).
- Each request kind's **Notify** (Categories) narrows who gets its "new request" email. Blank:
  every reader, which includes the whole bishopric. Otherwise `Bishop` (Calling Bishop),
  `Owners` (the owning organizations' leaders with Org editor or Ward council ticked),
  `Coordinators` and email addresses, always limited to that kind's readers. Moving is seeded
  `Owners, Coordinators`, so its emails don't reach the whole bishopric; anyone else is dropped and logged. Other is seeded `Bishop`: its email goes to
  the bishop while the whole bishopric can open its folder. `Coordinators` means that kind's
  Coordinators; the Christmas giving offers kind is seeded with it.
- A request kind with **On Help page** unticked has a form but no tile on the Help page; its
  link is shared privately. The Christmas giving offers form is never on the Help page; its
  **On Serve page** box (that row only) puts an "Offer to give at Christmas" card on the
  Service Opportunities page instead (§12 decisions 16, 17). Its readers and notices are the
  same either way.
- Caveat: an editor of the Service Sheet can also edit the script bound to it, which runs as the
  shared account and can open every request sheet. Only the bishopric edits it, and the bishopric
  reads the confidential requests anyway, so this gives no one more than they have.
- The leader page is what makes per-organization privacy possible: the script decides what each
  leader link may see, so the Service Sheet (which shows everything) only goes to people who may
  see everything anyway.
- Confidential requests stay in Google Sheets in their own folders, guarded by Google's own
  sign-in, not by leader links. The script running as the shared account writes to them, but the
  notice emails never contain details, so nothing confidential reaches anyone's inbox.
- Leaders need a Google account only for the Service Sheet (ward council) and request folders.
  An organization's volunteer editor without a Google account can still use a leader link.
- The script never asks leaders to authorize it: everything runs from the shared account's
  triggers and web app. (Leaders running a script themselves would see Google's "unverified app"
  warning; avoided by design.)

### 5.5 Request forms

Why Forms (not the hub pages) for requests: requests are a one-way, minimal message, which is
exactly what a Form is, and a Form keeps the request text out of the public script entirely.
A form-submit trigger copies each answer into the right request sheet, deletes it from the form
and sends the detail-free notice.

Why not Forms for sign-ups: Forms can't show live counts, can't show "Filled ✓" per role, can't
show a volunteer their own sign-ups, and can't cancel. A Form can hide filled choices only if a
script rewrites the choices after each answer (what third-party "choice eliminator" add-ons do),
and two people can still pick the same last choice between rewrites.

### 5.6 The leader page

Sam asked (2026-11-24) whether leaders would have to "structure the sub-rows appropriately" to
register an opportunity. They won't: they fill in a form.

**What it has:**
- **New / edit opportunity:** organization (only those the leader may use), category, title,
  audiences, public note, private details, cancel cutoff; then a list of dates, each with roles
  (name, number needed, times, note, "what are you bringing?"). Buttons: Add date, Add dates
  (start, end, weekdays; for meal trains), Add role, Copy this date, Remove. Save as draft,
  Publish, Close. Copy this post makes a new draft.
- The script checks everything before writing (a date is a date, numbers are 1–200, at least one
  role, no past dates on publish) and writes the Posts and Slots rows itself. Errors show next to
  the field.
- **Waiting for approval:** people whose first sign-up is on a post the leader may approve.
  Approve / Decline. The script records the leader's name and the time in Volunteers.
- **My opportunities:** each post with fill counts, who signed up (names, what they're bringing,
  child names), Remove, and "Needs help soon" for the ward council.
- **Who am I:** "Signed in as Sister Example, Relief Society" and a "Sign out everywhere" button
  (makes a new link and emails it).

**Alternatives considered:**
- **Typing rows in the Sheet** (Draft 1). Rejected: leaders would have to shape post and slot
  rows correctly, Google can't tell the script who made an edit on personal accounts, and it
  forced whole-file sharing of every organization's names.
- **A sidebar inside the Sheet.** Rejected: it runs as the leader, so every leader must authorize
  the script and sees Google's "unverified app" warning; and every leader would still need the
  whole Sheet.
- **A Google Form for the opportunity plus a script page for its dates.** Rejected: two places for
  one task, Forms can't repeat a group of fields, editing a submitted post is awkward, and the
  dates page is needed anyway.
- **The leader page (chosen).** One place, fixed fields, checked input, works on a phone, and the
  script knows who is acting, which gives approval records, edit rights and per-organization
  privacy.

### 5.7 Triggers (all installed while signed in as the shared account)

| Trigger | Runs | Does |
|---|---|---|
| Form submit (one per request form) | Per request | Copies the answer into the right request sheet, deletes it from the form, sends the detail-free notice |
| Every 10 minutes | 144 a day | Sends queued emails, refreshes counts and "Needs help soon" |
| Hourly | 24 a day | Reminders, 48 h nudges, fill warnings, lapses, moving past posts, picks up "turn into opportunity" ticks (reads each request sheet; locks only one with a ticked row) |
| Daily (night) | 1 a day | Removes closed requests after 30 days, rotates request files on the 1st (§8.2), clears expired tokens and links, checks quota, triggers and the hub connection, emails the admins if something is wrong |

## 6. How people are known without accounts

### 6.1 Volunteers

- **Choice:** email + emailed link, as in WardForward. A Google sign-in requirement was rejected
  for three reasons: Sam's rule ("not everyone has Gmail"); a web app running as the ward's
  account can't learn a personal-account visitor's address anyway (Google returns it only inside
  one Workspace domain); and running "as the visitor" would show every member Google's
  "unverified app" warning.
- First time: the sign-up waits; an email with a confirm link goes out; after the click, the
  post's organization's leaders see the person under "Waiting for approval" and approve (checking
  the Church directory themselves).
- After approval: sign-ups count at once and a confirmation email goes to the address. The
  confirmation email is the guard against someone typing an approved member's address (the real
  owner sees it and can cancel), the same accepted trade-off as WardForward.
- Tokens: random, stored hashed in the System Sheet; confirm links expire in 48 hours; My sign-ups
  links last until the person's last post is over plus 30 days, and a new confirmation email
  gives a new one.

### 6.2 Leaders

- **Choice:** a personal **leader link**, emailed to the address in the Leaders tab, the same way
  volunteers are known. The web app can't tell who is signed in to Google (§6.1), so Google
  sign-in isn't available for these pages.
- The bishopric ticks "send leader link" in the Leaders tab (or a leader types their email on
  `leader.html` and asks for one); the script emails the link only to an address on the Leaders
  tab.
- Links are random, stored hashed, last **90 days** and are renewed by asking again. Removing a
  leader from the Leaders tab ends their link at once. "Sign out everywhere" replaces it.
- **Weaker than WardForward's Google sign-in:** whoever holds a leader link acts as that leader.
  Guards: it is sent only to the leader's own address, it expires, it never appears in server
  logs (after `#`), every save and approval is recorded with the leader's name, and requests are
  not reachable by it at all.

## 7. Quotas on a personal (consumer) Google account

Source: Google, "Quotas for Google Services", https://developers.google.com/apps-script/guides/services/quotas
(read 2026-11-24); MailApp reference https://developers.google.com/apps-script/reference/mail/mail-app;
Gmail sending limits https://support.google.com/mail/answer/22839; web apps
https://developers.google.com/apps-script/guides/web; ContentService
https://developers.google.com/apps-script/guides/content.

### 7.1 The numbers

| Limit | Consumer account (the ward's) | Workspace (for comparison) |
|---|---|---|
| Email recipients per day (MailApp) | **100** | 1,500 |
| Recipients per message (script) | 50 | 50 |
| Triggers' total runtime | **90 min / day** | 6 h / day |
| One execution's runtime | 6 min | 6 min |
| Simultaneous executions | 30 per user, 1,000 per script | same |
| Triggers | 20 per user per script | same |
| Calendar events created | 5,000 / day | 10,000 / day |
| URL fetch calls (Discord webhook) | 20,000 / day | 100,000 / day |
| Properties read/write | 50,000 / day | 500,000 / day |
| Gmail itself (sent by a person, not a script) | about 500 recipients a day; more than 500 in one message is refused | – |
| Google Forms | 500,000 responses and 1 GB per form (from Sept 2026) | – |

- Quotas are per account and "reset 24 hours after the first request" (rolling, not midnight).
- Google AI Plus is a consumer plan. Google's quota page says nothing about Google One or AI
  plans raising quotas; this design assumes they don't. Confirm with `MailApp.getRemainingDailyQuota()`
  in the first spike.
- Google says quotas may change "at any time, without notice".
- Page views and data requests from the hub are web-app runs, not triggers, so they don't use the
  90-minute budget. Their limit is 30 at the same moment; the one-minute serve cache keeps a
  Sunday rush well under it.

### 7.2 What a 600-member ward needs

Assumptions for a busy month: 8 posts, 80 sign-ups, 10 new volunteers, 8 requests, a few new or
renewed leader links.

| Email | A month | Notes |
|---|---|---|
| Confirm-your-address | 10 | first-timers only |
| Approved / declined | 10 | |
| Sign-up confirmations | 80 | |
| Day-before reminders | 80 | |
| Over-limit, cancel, removed notices to volunteers | 10 | |
| Leader notices (waiting, filled, cancels, 48 h nudges, warnings, new requests) | 60 | each recipient counts |
| Leader links (new leaders, 90-day renewals) | 5–10 | |
| **Total** | **≈ 260** | ≈ 9 a day; a heavy day (big activity: 30 reminders + confirmations + notices) ≈ 50–70 |

That fits under 100 with room, **because bulk invitations stay in Gmail** (§4.4). One invitation
round to 204 sisters would be two days of the whole quota; five a month would be ten.

Safeguards: every email goes through one outbox. The script keeps a **reserve** (default 30) for
reminders and leader alerts; confirmations and verifications stop when the remaining quota falls
to the reserve and wait for the next run. When anything is held, the admins get one email. The
outbox shows what is waiting.

### 7.3 Abuse of the quota

Without a bot check, someone could submit the sign-up form with many invented addresses and use
up the 100 emails. Limits: at most 3 confirm emails to one address a day, at most 20 confirm
emails a day in total (setting), at most 10 sign-ups a minute per post, and at most 3 leader-link
requests per address a day (script cache). Past those, new sign-ups are refused politely
("please try again later or contact …"). This protects reminders but means a flood blocks real
first-timers for the day. Accepted for a ward-sized, unadvertised page.

### 7.4 Trigger runtime is shared with the interview router

Quotas are per account. The interview router already runs **every minute** on the same account
(1,440 runs a day). The 90-minute budget allows about 3.7 seconds per router run if it used it
all. The portal adds roughly: hourly 24 × 18 s = 7 min (including about 3 s to read the request
sheets for "turn into opportunity" ticks); every 10 minutes 144 × 3 s = 7 min; form triggers
about 1 min. Total about 15 minutes a day. (Draft 1 also had an on-edit trigger;
leaders no longer edit the Sheet, so it is gone.)

**Settled with Sam (2026-11-24):** before building, the Exec Sec reads the router's real daily
total in the Apps Script **Executions** page. If router + 15 minutes is close to 90, the portal
runs on a **second bishopric-owned Google account**, which also doubles the email quota. The
router is not slowed.

### 7.5 Forms limits that matter

- A plain Form can be answered without a Google account. "Limit to 1 response", "Verified" email
  collection and file-upload questions make people sign in to Google; none are used here.
- Forms have no slot caps, counters or "filled" states, and can't repeat a group of questions.
  The only ways to get those are scripting (this design) or third-party add-ons, which are outside
  services (Level 4) and are not used.

## 8. Privacy (Handbook 38.8.32 and friends)

### 8.1 Plainly

Data stays on the ward's own Google account, next to the Ward Workbook and the New Member Form.
**It is still not a Church-provided system.** 38.8.32 says confidential Church information should
not be stored or shared "outside of Church-provided applications, systems, or internet services",
and temporal needs (requests for help, meal reasons) are named as confidential. Moving this from
WardForward to Google changes **who runs the computers**, not the Handbook question. It does
remove two parties: Sam's own Cloudflare account and MealTrain. The hub (GitHub Pages) holds only
page code, never ward data.

Other sections:
- **38.8.21.2** (internet in callings): bishop's approval first; independence notice and contact
  on every page and email (§5.3); at least **two administrators** (§8.3); retire it when no longer
  needed.
- **38.8.14** (directories): sign-ups store only the name and email a volunteer types. Leaders
  still copy addresses from the directory for Bcc invitations, as today.
- **38.8.5** (businesses): Google already holds the ward's files; nothing new is given to any
  other company. MealTrain drops out.
- **38.8.48.3** (AI): Google AI Plus includes Gemini in Gmail, Docs and Sheets. **Leaders must
  not ask Gemini to read, summarize or draft from the Service Sheet, request sheets or request
  notices.** Put this in the Read me tab and the setup guide.

### 8.2 Purge and retention, by script

- **Requests**: deleted 30 days after Done or Declined. The daily trigger removes those rows. But
  Google Sheets keep **version history**, so a removed row can still be restored from an older
  version. So **request sheets, and only request sheets,** are **rotated**: on the 1st of each
  month the script makes a new request sheet in the same folder and **carries forward every
  request that is still open or closed less than 30 days ago**, then **permanently deletes** the
  old file (Drive advanced service, not just Trash, which keeps files 30 days). Because the new
  sheet sits in the group's shared folder, it is shared the same way automatically, and leaders
  keep using the folder link. A closed request leaves the sheet on day 30 and leaves version
  history at the next rotation, so at most about two months after it closed. (A weekly rotation
  setting would bring that to about five weeks; monthly is the default.) Request answers are also
  deleted from the Form itself right after they are copied (`FormResponse` deletion), so the Form
  holds nothing.
- **Opportunities and sign-ups are never rotated or deleted by this.** They live in the Service
  Sheet, which is never rotated. An opportunity that started a few days before the end of the
  month is untouched. (Sam read Draft 1 as deleting current opportunities; it didn't, and this
  says so plainly.)
- **Notices**: detail-free, so the shared account's Sent folder and leaders' inboxes hold nothing
  confidential.
- **Sign-ups and volunteers**: kept for the ward council, as in WardForward (settled rule). **No
  automatic clean-up of volunteer emails is offered** (Sam, 2026-11-24: "I wouldn't auto-clear
  them"). Draft 1's optional yearly clean-up is removed.
- **Tokens and leader links**: deleted when expired.
- **System Sheet log**: 90 days.
- **Discord** (optional): only title, organization, dates and the public link ever go to the
  channel.

### 8.3 Roles and administrators

- **Administrators (at least two):** the bishop and the Executive Secretary. Both know how to
  reach the shared account (2-step verification with recovery the next Exec Sec can take over,
  start-here step 1) and both are editors of the script project.
- **Owner:** the shared account owns every file, form, script and trigger. No person's own
  account owns anything. The hub's files belong to the ward's hub owner, as today.
- **Leaders:** given the leader page by leader link and Google files by Drive sharing, both from
  the Leaders tab.
- **Who did what:** posts record who created and last changed them; volunteers record who
  approved, declined or revoked them; sign-ups record who removed them. If the bishopric ever
  changes a protected cell by hand, Sheets' **Show edit history** on that cell shows who.

## 9. Running it

### 9.1 Setup for a new ward (copy-a-template)

Templates are owned by the WardForward templates account (as for the rotation trackers). Done
signed in as the ward's shared account; about 2½ hours.

1. Open the **Service Portal template** "Make a copy" link. The copy brings the bound script.
2. Fill **Settings** (ward name, prefix, time zone, contact email, hub address) and **Leaders**.
3. Menu **Service Portal → Set up**: authorize once (the account's own consent screen); the script
   creates the System Sheet, the three request forms and the request folders and sheets, and
   checks the time zone.
4. Menu **Service Portal → Sync sharing**: shares the Service Sheet with the bishopric and ward
   council (read) and each request folder with its group, with Google's share emails turned off,
   so nothing touches the 100-a-day budget. It also sets the protections.
5. Deploy the web app: Deploy → New deployment → Web app, Execute as me, Who has access Anyone.
   Paste the URL into Settings.
6. Copy the six hub page files from the template into the ward's hub and put the web app address
   in their one settings line. (For M44 the ward's hub owner does this.) No hub: skip this step;
   the fallback pages are already live.
7. Menu **Service Portal → Install triggers** (§5.7) and **Check health** (one OK line per piece,
   like the router's `checkCalendarIds`, including a test call from the hub).
8. Tick "send leader link" for each leader; make two zippa.run links (serve, help) and add the
   two sections to the hub.
9. Review the categories and their owners and coordinators.
10. Test: create an opportunity on the leader page, sign up with your own email, approve, cancel,
    submit a test request, watch the notice arrive. Add the portal to the hand-off note
    (start-here step 14).

### 9.2 Maintenance

- Weekly: nothing, if leaders use it. The daily health email says when something needs a person.
- When a calling changes: edit the Leaders tab, run **Sync sharing**. Leader links follow the
  Leaders tab automatically.
- When Google changes something: whoever maintains the template updates it; wards paste the new
  script and, if the pages changed, copy the new hub files. There is no central update; each
  ward's copy is its own. This is the biggest long-term cost compared with an app.

### 9.3 Handing off to the next Executive Secretary

Everything lives on the shared account, so nothing moves. The outgoing Exec Sec: hands over the
account (password + 2-step recovery), updates Leaders and runs Sync sharing, confirms the
triggers' owner shows the shared account, and walks the new Exec Sec through Check health.

### 9.4 Failure modes

| What goes wrong | What happens | Guard |
|---|---|---|
| Triggers installed by a person's own account (editing the script while signed in as themselves) | They run as that person, and stop when the person loses access or is released | Install only as the shared account; Check health lists each trigger's owner and warns |
| Shared account password or 2-step lost | Nobody can fix the script | Two administrators; recovery details in the hand-off note |
| Email quota hit | Low-priority emails wait; reminders use the reserve | Outbox + reserve + one alert (§7.2) |
| Trigger runtime hit ("too much computer time for one day") | Triggers stop until the 24-hour reset; the router also stops | Measure first (§7.4); health check warns at 70 min |
| Google stops allowing cross-site calls to the web app | Hub pages can't load counts or sign up | Pages show "use this link instead" pointing at the fallback pages; health check tests it daily |
| A leader link is forwarded | The holder can act as that leader on the leader page (not on requests) | 90-day expiry, Sign out everywhere, every action recorded by name |
| Someone edits a protected tab by hand (bishopric only) | Script might misread | Columns found by header; a bad row is marked Problem, not acted on; version history and cell edit history |
| Two people take the last spot | Both in (settled rule), late one told | Script lock |
| Google changes quotas, the banner, or retires something | Unknown | Health check; template maintainer |
| A web app deployment is replaced | Old URL breaks | Always "Manage deployments → edit" the same deployment so the URL stays |
| Request-group leader without a Google account | Can't be given the request folder | Create a free Google account, or a counselor handles it |

## 10. Effort

Rough size (Apps Script + page code):

| Part | Lines (rough) |
|---|---|
| Sheet helpers (header lookup, protections, sharing sync, health check, setup) | 300–400 |
| Public pages (serve, post, sign-up, confirm, My sign-ups, cancel/withdraw) and their data feed | 800–1,000 |
| Leader page (opportunity form, approvals, sign-up lists, needs help soon) and leader links | 700–950 |
| Approvals, counts, over-limit, cancellations | 300–400 |
| Outbox, email templates, quota reserve | 200–300 |
| Triggers: reminders, nudges, warnings, lapses, past posts | 200–300 |
| Requests: form handlers, routing, notices, monthly rotation and purge | 200–300 |
| Optional Discord announcement | 30–50 |
| **Total** | **≈ 2,700–3,700** |

Plus the template spreadsheet, three template forms, the six hub page templates, a setup guide
and a leader guide. WardForward's version of the same features is several times that, because it
also builds sign-in, an app, a database and tests. Draft 1 was 2,000–2,800; the leader page and
the hub pages add the difference.

**Phase 1 (about 40%):** requests (three forms, routing, request folders, detail-free notices,
monthly rotation and 30-day purge); the leader page's opportunity form and publish; the serve and
post hub pages, sign-up with confirmation email, cancel link, day-before reminder, leader cancel
notices; the hub sections. First-time approval is done by a leader glancing at the sign-up list
and removing anyone they don't recognize.

**Phase 2:** confirm-your-address and first-time approval with records, over-limit notices, 48 h
nudges, lapses, My sign-ups, children, categories with coordinators and fill warnings, "Needs
help soon", quota reserve and health email.

**Later / optional:** Discord channel announcements; "turn a request into an opportunity".

## 11. Before anyone builds

1. A half-day spike on a **test** Google account (not the ward's):
   - from a static page on another site (a GitHub Pages test page), `fetch` a `GET` and a
     `text/plain` `POST` to a web app deployed as "Anyone", and read the JSON answers;
   - the fallback pages' banner and mobile view;
   - `MailApp.getRemainingDailyQuota()` on a consumer account;
   - that a plain Form opens without Google sign-in;
   - form-response deletion, sharing with notifications off, a new file inheriting its folder's
     sharing, and permanent file deletion.
2. Read the interview router's daily runtime on the ward's account (§7.4).
3. Leaders' approval, as for anything else in the report.

## 12. Decisions recorded here (with reasons)

1. **Sign-ups on script-backed pages, requests on Google Forms** (§5.5): live counts and cancel
   need a script; requests are one-way and minimal, which Forms do well.
2. **No email verification for requests** (§4.3): it would need Google sign-in or extra emails;
   the leader confirms in person anyway.
3. **Public pages are sub-pages of the ward's hub**, reading data from the script, with the
   script's own pages as the fallback (§5.3; coordinator recommendation, Sam's question
   2026-11-24): the ward's own look, no Google banner, a real `noindex`, branded link previews,
   faster pages. Cost: the ward copies six files into its hub, and the cross-site calls must pass
   the §11 test.
4. **Leaders work on a leader page with fixed fields, reached by a leader link** (§5.6, §6.2;
   Sam's question 2026-11-24): nobody shapes sheet rows, input is checked, and the script knows
   who acted. Chosen over typing rows, a Sheet sidebar, and a Form plus a dates page (§5.6).
   Cost: a leader link is weaker than Google sign-in.
5. **Approver recorded automatically; approval limited to the post's organization's leaders and
   the bishopric** (§4.1; Sam's question 2026-11-24): matches WardForward's rule exactly.
6. **The Service Sheet goes only to the bishopric and ward council** (§5.4): with the leader page,
   no one else needs it, which gives per-organization privacy.
7. **One Posts tab and one Slots tab, written only by the script** (§5.2): replaces Draft 1's
   per-organization tabs, which existed only to make hand-editing safe.
8. **Request sheets per request kind, in shared folders, rotated monthly; nothing else is
   rotated** (§8.2): the only way to make the 30-day purge real, given version history; folders
   keep sharing and links stable.
9. **Bulk invitations stay manual (Bcc from Gmail)** (§4.4): settled with Sam, 2026-11-24.
10. **No clean-up of old volunteer emails** (§8.2): settled with Sam, 2026-11-24.
11. **If the router and portal crowd the 90 minutes, the portal moves to a second
    bishopric-owned account** (§7.4): settled with Sam, 2026-11-24, after measuring.
12. **Everything runs as the shared account; leaders never authorize the script** (§5.4): avoids
    Google's unverified-app warning and keeps triggers from dying with a release.
13. **Discord announcements are optional** and off by default.
14. **The whole bishopric edits the Service Sheet and reads the confidential requests** (§4.3,
    §5.4; Sam, 2026-11-24, in 1.1). Every Leaders row with Bishopric ticked (the bishop, both
    counselors, the Executive Secretary and the Ward Clerk) gets edit access to the Service Sheet
    and the Christmas and Other request folders and notices, with each kind's Coordinators. This
    replaces the phase 1 review decision (D2) that only the bishop and Executive Secretary edit
    the Sheet, and the earlier rule that only the bishop (and the coordinators he names) reads
    Christmas and Other. Sam's words:
    - "Service Sheet editing should be possible by the entire bishopric, including the Exec Sec
      and Ward Clerk."
    - "No, the thing is, sometimes the Bishop is out. That's why he has counselors (if he is sick
      and in the hospital, they can act as him). Don't try to hide things from the counselors,
      and the Ward Clerk either--he is even more trusted than I am."
15. **Christmas gift coordinators read Christmas only; Other notices go to the bishop** (§5.4;
    Sam, 2026-11-24, in 1.1). The Christmas kind is read by the bishopric and the couple called
    as Christmas gift coordinators, listed in its Coordinators (no Leaders row, no Service
    Sheet). With decision 16 they are on both Christmas rows, so they get the Christmas help and
    Christmas giving offers folders and their notices, and nothing else. A new Categories column, Notify, lets a kind's email go to fewer people
    than can read it; Other is seeded `Bishop`. Sam's words: "We do have a special case
    scenario. The Christmas gift volunteer function should be a separate thing, because a couple
    (not in the Bishopric) have been asked to serve in that calling, and it will see sensitive
    requests from needy families (or about needy families). So nobody should see that sheet
    except the Bishopric and this couple. Whereas all of the other help requests under "Other"
    should go to the Bishop (and can be ready by the Bishopric)."
16. **Christmas giving offers are a private form** (§4.3, §5.4; Sam, 2026-11-24, in 1.1: "Yes,
    private form"). Families who want to give offer on a request-style Google Form that is not on
    the Help page (Categories column On Help page) and is shared by a `<prefix>Give` short link in
    a Bcc email or the bulletin, never on the hub. Offers go to their own folder ("Requests –
    Christmas giving offers") read by the bishopric and the Christmas gift coordinators, with
    notices to the coordinators (Notify `Coordinators`), the usual 30-day purge and monthly
    rotation, and a new Offer column. The coordinators match offers to Christmas requests
    themselves; the script never copies request data anywhere else.
17. **Christmas giving can be offered on the Service Opportunities page** (§4.3; Sam,
    2026-11-24, in 1.1.1). A Categories checkbox, On Serve page, used only on the
    christmas-giving row: ticked, the Service Opportunities page shows a small "🎁 Offer to give
    at Christmas" card linking to the giving form; unticked (the default), the form is on no
    public page and its link is shared privately. It is never on the Request Help page. Readers,
    folders and notices don't change: only the bishopric and the Christmas gift coordinators see
    the answers. Sam's words:
    - "what if we want to show Christmas Giving on the public help page? Can't people offer what
      they want to gift people for Christmas even though they can't see the specific needs? Just
      having people volunteer (they might say "I want to give to another family this Christmas")
      allows the Coordinators to contact them privately later with opportunities to give."
    - "Sorry, I didn't mean to include "Want to give?" on the requesting help page... I mean to
      include it on the Service Opportunities page."
18. **The whole bishopric opens every request folder** (§4.3, §5.4; Sam, 2026-11-24, in 2.1).
    Asked whether the whole bishopric should be able to open every request folder, Moving
    included, Sam said: "Yes, bishopric should see all of them". Every request kind's readers
    are the bishopric, its Coordinators and (unless confidential) its owning organizations'
    leaders; confidential kinds are unchanged. So that Moving notices don't newly reach all five
    bishopric members, a Notify token `Owners` (the owning organizations' Org editor or Ward
    council leaders) was added and Moving is seeded `Owners, Coordinators` (once, only when
    blank). A blank Notify still means every reader.
19. **A request can be turned into a draft opportunity from its request sheet** (§4.3; Sam,
    2026-11-24, in 2.2). Sam's words: "To be clear, each "Lend a hand" request should go to the
    Relief Society president (and assigns) for approval before appearing on the Opportunity
    board." … "Yes, add the Turn into an opportunity button". The "button" is a checkbox in the
    request sheet, picked up by the hourly job, because request sheets are guarded by
    Google's own sign-in while the leader page uses forwardable leader links: listing requests on
    the leader page would put request details behind a weaker link. The script makes only a
    Draft (never Open), with no request text in any public field; the president (or whoever may
    edit it) finishes and publishes it.
20. **The pages and request forms can wear the ward's look** (§5.3; Sam, 2026-11-24, in 2.3).
    Sam's words: "Any chance you could use the same background as the existing pages, so the
    entire site looks branded? Also, this is the brand for our Google Forms: <a public Google
    Form> Could you match it? Finally, please provide a testing document for my wife and I go run
    through (for complete testing), doing things in logical order so it all makes sense."
    Pages: optional Settings rows theme_background_url (https only), theme_accent (#rrggbb),
    theme_font and theme_heading_font (Google Fonts names) become CSS variables on every page;
    with a picture, text sits on a light panel (the hub's own white wash over its picture), and
    the picture scrolls on phones. A bad value is ignored and reported by Check health. Forms:
    FormApp can't set a form's theme, so new request forms are made as Drive copies of the
    branded form named in form_template_url (its items removed, the portal's questions added);
    existing forms are themed by hand in the Forms editor, because re-making them would change
    their addresses. The test plan is a Word document outside the repository.
21. **Test mode sends every email only to the people testing** (§7.2; Sam, 2026-11-25, in 2.3.1).
    Sam's words: "Let's do #2 but give me detailed instructions how I can restrict testing emails
    to go only go to myself while testing (and how to turn it all back on afterwards)". A
    Settings row, test_mail_only: a comma list of addresses that still get email; every other
    email goes to the first of them with "[TEST for <address>] " in front of the subject, still one
    per original recipient. The switch is in sendMailNow_, the only code that sends mail, so no
    email can go around it. Fail closed: an entry that isn't an address sends everything to the
    first valid one; with no valid address nothing is sent (logged and dropped, never queued,
    and mail queued before test mode stays queued). Routing is also decided when an email is
    queued, so an Outbox row made in test mode is already addressed to the tester and can't
    reach the real person after test mode is turned off. Check health and the daily health email
    show a PROBLEM line while it is on.
22. **Approve and Decline on the post; a stale link warns early** (§5.6; Sam, 2026-11-27, in
    2.3.2). Sam's words, while testing: "I'm at 4.7 and viewing the opportunity, wanting to
    approve - but I only see "remove" and "cancel"" then "Can't the approval button be moved to
    the "My opportunities" tab instead of having to switch context?" and "The "Approve" button
    should be first. Then Remove, and then Cancel this date. The interface needs some help -
    let's put all three buttons on the same line". A waiting person's line on a post shows
    Approve and Decline to leaders the existing rule (canApprove) lets decide; the decision names
    the sign-up, so no address reaches a leader who couldn't see it before. Each person is one
    line: name, email (editors only), then Approve, Decline, Remove and, on the date's last line,
    Cancel this date. The Waiting for approval tab stays. The leader page checks its link when a
    form opens and when the page comes back into view (at most once a minute); a dead link
    shows the "Email me a leader link" box above the page and keeps what was typed.
23. **A post for more than one audience shows once, under "Everyone"** (§5.3; Sam, 2026-11-27,
    in 2.3.3). Sam's words: "Looks like, when opportunities are for both Brothers and Sisters,
    that the same 4 slots are shown twice, making it look like there are 8 volunteer
    opportunities ... Maybe we should have another category on the Service Opportunities page
    for just "Members" and if it applies to anyone, it shows up under that category. If it's
    only for Sisters, we would write "Sisters" under "default audiences" in the Categories
    sheet, but never Sisters and Brothers. Thoughts?" and, to the recommendation below, "Yes".
    The Service Opportunities page shows each post once: a post with more than one audience in
    a full-width section at the top named by TEXT.everyone ("Everyone"), with its audiences
    under the title in the fixed order Brothers · Sisters · Youth · Children; a single-audience
    post in its own section. Order: the Christmas giving card, Everyone, Brothers | Sisters,
    Youth, Children; empty sections hidden. No change to Default audiences or any column;
    existing posts regroup by themselves. Other lists (Other ways to serve, Needs help soon,
    leader page) already showed each post once.
24. **Approvers per category, a Pre-approve list, and volunteer status data** (§4.1, §5.6; Sam,
    2026-11-27, in 2.4). Sam's words: "what if we had a new column that specifies which email
    member approvals should go to for that opportunity type? That would be the most flexible
    way to do it." then "1. Yes"; on pre-approving, "Good idea, and we already have the
    Bishop's permission."; and "We should have a page that shows the names of all volunteers
    with their indicators, even if we don't show their emails".
    - **Approvers.** A Categories column `Approvers` (emails) and a Settings row
      `default_approvers`. The *Waiting for approval* notice and the 48 h nudge for a
      volunteer go to the first post's category Approvers, else default_approvers, else the
      old rule (the first post's organization leaders and the bishopric); `approverEmailsFor`
      decides. Addresses not on the Leaders tab are dropped (Check health names them); if none
      is left, the old rule applies, so a typo never silences approval emails. A listed
      approver may approve that category's first-timers and sees its posts (names, canEdit
      false, no addresses). Nobody loses approval rights: the bishopric and the organization's
      leaders can still approve.
    - **Pre-approve list.** The bishopric and approvers paste addresses; the System Sheet's
      `Preapproved` tab keeps only a salted SHA-256 hash (salt: Script Property
      `PREAPPROVE_SALT`), who added it and when. A sign-up from a listed address that isn't
      Declined or Revoked is approved at once (Volunteers: Decided by "Pre-approve list",
      Email confirmed at now), its earlier waiting sign-ups confirm as approval does, and it
      gets the normal confirmation; the public answer is the same sentence. No per-address
      remove: clear all and re-paste.
    - **Status data for the leader page** (the 2.5 UI draws it): `listVolunteers` (any leader;
      addresses, who decided and actions only for the bishopric and approvers, absent
      otherwise), `decideVolunteer` by an opaque `vid`, `preapproveCount` / `preapproveAdd` /
      `preapproveClear`, a `volunteerStatus` word on each listPosts sign-up beside its
      unchanged sign-up `status` (`leader`,
      `approved`, `needs_approval`, `email_not_confirmed`, `declined`, `revoked`), and
      `isApprover` / `canManagePreapprove` in whoami.

## 13. Settled with Sam, and open questions

Settled (2026-11-24, from Draft 1's questions and review):
- The public page is a hub sub-page, like the Interviews pages (his question 1; §5.3).
- Leaders use a structured form, not sheet rows (his question 2; §5.6).
- Who approved whom is tracked (his question 3; §4.1).
- Monthly rotation never touches opportunities (his question 4; §8.2).
- Router first, second account if tight (answer 1). Gmail Bcc for invitations (answer 2). No
  auto-clear of volunteer emails (answer 3).

Open: none that block the design. The §11 test decides whether the hub pages can call the script
directly; if they can't, every public page uses the fallback (Google banner and all), and the
counts in §4.7 lose two (preview cards back to Not possible, `noindex` back to Partial, as in
Draft 1). The leader page, approvals and per-organization privacy work either way.
