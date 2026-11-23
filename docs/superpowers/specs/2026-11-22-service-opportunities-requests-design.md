# Service opportunities, service requests and portal sections — design

Status: APPROVED to build, 2026-11-22 (hold lifted the same day). After the General Handbook
38.8.32 check, Sam decided: requests become minimal (§6, 30-day deletion); the paste box (§7)
stays as designed. Sam: "Nobody but the leader sees what emails are being pasted ... this is how
every leader sends messages today." No opt-in lists. The member roster stays on hold. Sam: "I just want you to move forward (skip my approval)."
Coordinator: session `local_a8b6bffb-9340-4139-aeaa-52d78581c2e0`. Builder-check questions
answered by the coordinator 2026-11-22 (§3 delegates and post spaces, §5 children, §6
requesters, leader alerts, retention). Start from `main` after the rename is merged. Builds on top of the rename
(`2026-11-22-wardforward-rename-design.md`, which must be merged first) and the volunteer
sign-ups feature (`2026-11-21-volunteer-signups-design.md`, merged). Read both.

## 1. Why

Members reach everything through one link and QR code: the ward portal (M44:
`zippa.run/m44Links`). WardForward's volunteer sign-ups only have one link per post, so the portal
has nothing to point at, and members have no way to ask the ward for help. Sam wants both on the
portal, at the very top.

Today Sam's wife (the ward's service coordinator) creates an opportunity in MealTrain, posts the
link in Discord, and because not everyone is on Discord, copies about 204 sisters' emails out of
the ward directory and emails them the link, about five times a month. WardForward replaces that
whole loop.

## 2. Settled with Sam (don't reopen)

1. Two new portal sections at the very top, above "Ward Links" and "Interviews", each with its own
   golden line underneath: **"Service Opportunities"** with one card **"Sign up for Service
   Opportunities"**, and **"Service Requests"** with one card **"Request Help or Service"**.
2. The **Request Help or Service** page has "a friendly interface with small images representing
   the things they might request along with its own QR code (and direct link)". Starting tiles:
   **Get Help Moving**; **Request a Christmas or Presents** ("which can be for their own family or
   another family"); **Other Requests** ("cover everything else for now").
3. The **Sign up for Service Opportunities** page lists open opportunities. Default categories
   leaders mostly want (they can add more): Provide a Meal; Lend a Helping Hand; Help with an
   Activity; Clean the Building; Clean the Temple; Substitute in Primary; Substitute in Sunday
   School; Help Someone Move (in/out). "None of these appear on the page until the ward leader
   (or their assigns) have created the opportunities."
4. A big **"Create Service Opportunity"** button for leaders who have that permission.
5. **Delegation** (Sam: "this is how it actually works"): a president assigns specific people to a
   category; they can create only that category's opportunities, "and then that person receives
   all of the messaging and notifications instead of the RS pres".
6. At delegation, the president chooses whether to be **warned if an opportunity is in danger of
   not being filled**, how many hours in advance, and **others who should be warned** too.
7. The opportunities page is **grouped by who it's for, not by category** ("there will be more to
   come"): brothers, sisters, youth, children. Youth and children don't get logins; "let their
   parents sign up for them".
8. Default owners (Sam's answer 4): Provide a Meal → Relief Society. Lend a Helping Hand → anyone
   on the ward council can create it. Help with an Activity → Activities Committee, "assignee
   names entered by the bishopric". Clean the Building → "delegated to ward building
   specialists". Clean the Temple → "owned by both the RS and EQ" and shows under both brothers
   and sisters. Substitute in Primary → Primary. Substitute in Sunday School → Sunday School.
   Help Someone Move → Elders Quorum.
9. Requests: Get Help Moving → Elders Quorum. Christmas or Presents → the bishop and the people
   he names, never anyone else by default ("The Bishop should be able to assign one or more
   coordinators for Christmas presents (in fact, he already has)"). Other Requests → the bishop.
10. **Bulk invitations**: leaders paste a list of email addresses into a "send to" box and the app
    emails each person the opportunity. **No ward cap** "except at a very high number so as to not
    interrupt their operations". Sam pays and is reimbursed by the bishop.
11. **No "copy the invitation and send it from your own Gmail" button** (Sam was unsure of the
    complications; dropped).
12. **Discord channel announcements: yes.**
13. Email goes through Cloudflare Email Service (the rename build creates the shared mail module
    with an invitations stream, custom headers and many-recipient support).

Out of scope here: a ward member roster (bringing Sam's ward workbook into the app so presidents
can email "all sisters" without pasting). Sam is deciding; the paste box is the way in for now.
Design the recipient input so a roster could feed it later.

## 3. Categories

- A ward has a list of **service categories** of two kinds: **opportunity** and **request**.
  New wards (and existing local/test wards, by migration) get the defaults in §2 items 8–9.
- A category has: name, a small picture/icon, kind, **owning spaces** (one or more `org`,
  `bishopric` or `ward_council` spaces), **default audiences** (opportunities), an "anyone on the
  ward council may create" flag, confidential flag (requests), position, archived.
- **Managers** of a category: owners of any of its owning spaces, plus bishopric members and
  ward superadmins (existing break-glass), except that a **confidential** category's managers are
  only the owners of its owning space (for the bishopric space: the bishop as its owner) and
  superadmins, not every bishopric member. Managers can add categories in their spaces, rename,
  re-icon, archive, set default audiences, and manage delegates and warnings.
- **Delegates** (coordinators): named WardForward users. A delegate may be someone with no other
  WardForward role (a building specialist, a meal coordinator). Category managers can invite one
  by email from the category page (not only superadmins); accepting makes them an ordinary ward
  member (`ward_memberships` role member, no new ward role, no space memberships) plus a delegate
  of that category. They see what any ward member sees; that's acceptable (coordinator's call,
  2026-11-22: they are serving ward members, and a limited role would touch every route).
  **Plus**, Sam (2026-11-22): coordinators "should also be able to see all opportunities they have
  created and their statuses. So they do see more." A delegate gets a "My service opportunities"
  page listing every post in their categories (and any they created), with each date's fill
  status, sign-ups with names, approvals waiting, and warnings, and can manage them.
- Who may create an opportunity in a category: its delegates; or, when it has no delegates, its
  managers and the owning org's existing volunteer editors (`vol_editors`); plus any ward council
  member when the flag is set; plus bishopric and superadmins.
- **Who gets the category's messages** (approval requests, "fully filled", lapses, new requests):
  its delegates; if it has none, its managers as today. A post's creator also keeps getting its
  messages as today.

Owning spaces of the defaults: Meal → Relief Society; Helping Hand → Ward Council space (with
the "anyone on the ward council" flag); Activity → Activities Committee; Clean the Building →
Bishopric space (the bishopric adds the building specialists as delegates); Clean the Temple →
Relief Society and Elders Quorum; Primary and Sunday School substitutes → those orgs; Help
Someone Move → Elders Quorum. Requests: Get Help Moving → Elders Quorum; Christmas → Bishopric,
confidential; Other → Bishopric, confidential.

**Posts may now belong to `ward_council` and `bishopric` spaces, not only `org` spaces.** Update
the access module accordingly: a ward-council post is visible (names, private details) to ward
council members and its category's delegates; a bishopric post to bishopric members and its
category's delegates; editing follows §3's "who may create". Every post's delegates can see and
manage it.

Default audiences: Meal → sisters; Helping Hand, Activity, Clean the Building, Clean the Temple,
Primary substitute, Sunday School substitute → brothers and sisters; Help Someone Move →
brothers. Leaders can change audiences per post.

## 4. Warnings when an opportunity may not fill

- Set per category, by each manager for themselves at delegation time: **warn me** on/off,
  **how many hours before** a date starts (default 48; any whole number 1–336), and **others to
  warn** (other WardForward users in the ward). Delegates always get the warning.
- The hourly cron sends one warning per date (per post date, not per role) when any role on it is
  still short at the chosen lead time: which roles, how many short, and the post link. Never
  twice for the same date and recipient. Uses the ward's time zone like the reminders.

## 5. Opportunities

- Every volunteer post now has a **category** and one or more **audiences** (brothers, sisters,
  youth, children). Its owning org is the category's (for a two-owner category such as Clean the
  Temple, the creator picks which, defaulting to their own).
- Posts with **youth** or **children** audiences: the sign-up form asks "Who is serving? Me / My
  child" and takes the child's first name. The volunteer record stays the parent's email; leaders
  see "Ana (signed up by …)". No youth or child email addresses are collected; every message goes
  to the parent. A parent may sign up themselves and any number of children for the same role;
  each is one head in the count. The sign-up row gets a child name (empty = the parent), and
  "one active sign-up per volunteer per role" becomes "per volunteer, role and child name".
- **Create Service Opportunity**: shown on the serve page (below) to signed-in leaders who may
  create in at least one category, and in the app's volunteer pages. It asks for the category
  first (only those you may create in), then opens the existing post builder prefilled.

### 5.1 The public serve page `/serve/<prefix>`

- Title "Service Opportunities", the ward name, then sections **Brothers** and **Sisters** (side
  by side on wide screens, stacked on phones), then **Youth** and **Children** (with a line:
  "A parent signs up for their child"). A post with several audiences shows in each.
- Each entry: category label and picture, title, next date and time, a fill bar ("7 of 10
  filled"), and a link to the post's existing public page `/v/<publicId>`. Fully filled posts
  move to the bottom of their section marked "Filled". Posts whose dates have all passed don't
  appear. Empty sections are hidden; with nothing open: "No open opportunities right now."
- Same privacy as the public post page: never names, emails or private details. `noindex`.
- Its own QR code and link at the bottom, for posters (the ward's pasted short link if set, §8).

## 6. Requests

### 6.1 The public help page `/help/<prefix>`

- Title "Request Help or Service" and a short friendly line. One tile per active request category,
  each with a small picture (simple illustrations in the design canvas palette; moving boxes, a
  wrapped present, a helping hand). Its own QR code and link at the bottom.
- Requesters are **not** volunteers: their own table, tokens and rate-limit buckets, and no
  approval step. Anyone may ask for help, including someone a leader once declined as a volunteer.
- Choosing a tile opens a **minimal** short form (Handbook 38.8.32 treats temporal needs as
  confidential Church information, so collect as little as possible): name, email (verified by an
  emailed link, built the same way as the volunteer verification, with Turnstile and rate
  limits), optional phone, and an optional one-line note (at most 200 characters) with the hint
  "We'll talk through the details with you in person." Moving adds only "moving in or out" and a
  preferred date. Christmas adds only "for my family" or "for another family" (no family name;
  the leader asks in person). No other detail fields.
- Every form says plainly who will see it (e.g. "Only the bishop and the people he asks to help
  will see this").
- After verifying, the requester sees "Thank you, we've received your request" and gets an
  acknowledgment email.

### 6.2 Leaders' requests inbox `/w/:wardId/requests`

- Shows the requests of every category the leader manages or is a delegate of (confidential
  categories only to their managers and delegates). Status: new, in progress, done, declined.
  Private notes; assign to one of the category's delegates.
- Leaders are told by **email only** (leaders have no Discord connection; not in this version).
  Notification emails about a new request **never contain the request's details**: "A new Christmas request came in. Open it in WardForward." with a link.
- **Turn into a service opportunity**: for non-confidential categories, start a post in a
  matching opportunity category (Get Help Moving → Help Someone Move) with dates prefilled. Never
  copies the requester's name or details into the public note; the leader writes those.
- When marked done or declined, the leader may send the requester a short message.
- Retention: a request is deleted (note, private notes, requester's contact) **30 days** after it
  is marked done or declined; the hourly cron purges them. Open requests are kept. Leaders'
  private notes on a request are one short field too, with the hint "Keep details in person."
- **Per-ward bishop approval (Handbook 38.8.21.2):** the existing "request a ward" form gains a
  required checkbox "Our bishop has approved using WardForward for our ward", recorded with the
  request for the operator to see.

## 7. Bulk invitations

- On a post (leaders who may edit it): **Invite people by email**. A paste box accepts addresses
  separated by commas, semicolons, spaces or new lines, including `Name <email>` forms. Before
  sending it shows: how many valid and unique, which lines aren't valid, and how many will be
  skipped because they unsubscribed. Optional short personal note. A test-send to yourself.
- Each recipient gets their **own** message from the invitations stream (never a shared To/CC):
  post title, organization, dates, the note, a button to the public post page, and an
  unsubscribe link. Headers: `List-Unsubscribe` and one-click `List-Unsubscribe-Post`.
- **Unsubscribe** is one click, per ward ("Stop service invitations from <ward>"), and recorded in
  a suppression list (store a hash of the normalized address so it can be matched without
  keeping the address). Invitations skip suppressed addresses; confirmations and reminders for
  things the person signed up for still go.
- **Volume**: must send 2,000 invitations from one paste reliably (Workers request/subrequest
  limits mean a queue or cron batching; the builder chooses, following current Cloudflare docs).
  The leader sees progress ("180 of 204 sent"). A **safety ceiling per ward per day**, default
  5,000 invitations, adjustable by the operator; past it the rest wait for the next day and the
  leader is told. That is the only cap.
- Keep a record of each batch (who, when, post, counts) for the operator. Delete the pasted
  address list once the batch has finished sending.
- Pasted addresses are only used for that one batch: no saved lists in this version.

## 8. Portal sections

- The public portal `/p/<prefix>` and its print layouts gain **sections**: a heading with a
  golden line underneath (the M44 hub's look: `F:\!SLRFam\AI\Claude-Apps\M44 Link in Bio\index.html`,
  `.column-heading`, `border-bottom: 2px solid #c9b882`; map the colour to the canvas palette's
  Marigold if it reads as the same intent).
- Order: **Service Opportunities** (card "Sign up for Service Opportunities" → `/serve/<prefix>`),
  **Service Requests** (card "Request Help or Service" → `/help/<prefix>`), then the ward's own
  sections. Ward leaders can group published deliverables into named sections (M44 needs "Ward
  Links" and "Interviews", side by side on wide screens like the hub); unsectioned deliverables
  fall under one default section.
- Each service card shows a QR code like the other cards. Ward settings (superadmin) get two
  pasted short links, "Service Opportunities link" and "Service Requests link" (http(s) only,
  `src/lib/urls.ts`); the QR codes use them when set, else the direct app URLs. Either section can
  be turned off in ward settings (default on).
- M44 then moves onto WardForward: `/p/m44` is set up with its sections and links, and Sam
  retargets `zippa.run/m44Links` there (owner step). Keep the old GitHub Pages hub until the new
  page is proven (the bishopric's call).

## 9. Discord channel announcements

- Per category, managers may paste a **Discord channel webhook URL** (must be
  `https://discord.com/api/webhooks/…` or `discordapp.com`). Treat it as a secret: never shown
  in full after saving, never on public pages, never logged.
- Creating or publishing a post in that category offers "Announce in Discord" (on by default when
  a webhook is set): title, organization, dates and the public post link (Discord unfurls it with
  the existing Open Graph tags). Best effort: a Discord failure never blocks the post.

## 10. Constraints

- Every permission decision goes through the volunteer access module (`src/lib/volAccess.ts`) or a
  sibling of it; fail closed; tests for each role in §3, including confidential categories hidden
  from other bishopric members.
- Public pages (`/serve`, `/help`, `/v`) never show names, emails, request details or private
  details, and are `noindex`.
- Tests intercept all outbound fetches; `npm test && npm run typecheck` green.
- Local only; no deploy. Emails print to the console in dev.

## 11. Left to the builder

Table shapes and names; queue versus cron batching for invitations; the illustrations (simple
inline SVG in the canvas palette is fine); exact page layouts within the canvas look; how ward
leaders arrange portal sections (simple ordering is enough).

## 12. Later (not this version)

Ward member roster (Sam's workbook in the app, audiences by organization); saved recipient
lists; text messages; more request categories as wards ask.
