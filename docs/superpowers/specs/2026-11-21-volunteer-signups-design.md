# Volunteer sign-ups — design

Status: DRAFT 3 for Sam's review, 2026-11-21 (Sam's first-review notes applied; see §3,
items 17–25). Brainstormed with Sam in chat the same day.
Feature name for now: "Volunteer sign-ups". The product name (Wardest) may change; nothing
here depends on it.

## 1. Intent and the why

Ward council presidents constantly need a handful of volunteers: the Elders Quorum president
needs ~10 people to move a family in or out, the Relief Society arranges meals for new mothers
and other compassionate service, the Activities Committee needs people to set up, bring food,
hand out flyers and tear down, the Ward Mission Leader wants 4 people on specific evenings to go
out with the missionaries.

Today the EQ president posts a link in the ward's Discord channel and hopes. People rarely
reply because the whole ward sees the reply, so the president never knows whether the job is
covered and "sweats it out, hoping that someone will show up" (Sam). M44 already uses MealTrain
for new-mother meals, so the pattern is proven; this brings it into the ward council, with the
ward's own callings deciding who can do what.

Success: a president posts a need, sends one link, and watches a progress bar fill. Members can
sign up without exposing themselves to the whole ward, and once something is filled they can
"relax ... and they don't have to feel guilty about everything they haven't signed up for"
(Sam). The ward council can see every post at once, so one president can nudge people toward
another organization's need.

## 2. Goals, non-goals, anti-goals

Goals
- Any organization president can create a volunteer post with helper roles they make up on the
  spot, and get one link to share by email or Discord.
- Members sign up from that link with any email address; no Google account, no password.
- Fill status is visible at a glance; the whole ward council sees all posts.
- Volunteers can see everything they've signed up for and get reminded, by email and, if they
  connect it, by Discord direct message.

Non-goals (first version)
- Members asking for help (babysitting, meals) and having it routed to the right president.
  Agreed as a second version, after sign-ups work.
- Live-updating Discord message via webhook. Deferred; see §9.
- Waitlists, SMS, calendar attachments, recurring rules beyond "copy this date".

Anti-goals (would make it a failure even if it works)
- Putting volunteers' names where anyone with the link can see them. That is the Discord
  problem this exists to fix.
- Exposing a family's private details (address, door code, allergies, a birth, an illness) to
  anyone with the link.
- Looking official. It must never present itself as a Church product, use Church names or
  marks, or touch Church systems or records.
- Becoming a ward directory. Wardest stores only the name and email a volunteer types in.

## 3. Settled with Sam (don't reopen)

1. Built as a new section of Wardest (approach A, §4), same Worker, D1 and sign-in.
2. Who posts: organization presidents, including Activities and the Ward Mission Leader. Helper
   roles are made up on the fly.
3. Who sees: "the entire ward council can see each other's volunteer signups and the status".
4. Who edits: "The person who created the opportunity has edit access and everyone else should
   have read-only access except the Bishopric--all Bishopric members (the bishop, 2 counselors,
   the Exec Sec, and the Ward Clerk) should have edit access to everything (and can completely
   remove opportunities if they wish)."
   Refined the same day: a post made *for* an organization by someone else (say the Exec Sec
   makes one for the Elders Quorum) is shared with that organization's leaders, not left with
   the creator alone (Sam: "Yes, share them"). And "we should really let the org presidents
   decide who can edit their organization's opportunities. Maybe the EQ president, for example,
   will want to grant this to their counselors." See §5.
5. Volunteers sign up from a public link with any email ("not everyone has Gmail"). No Google
   sign-in for volunteers.
6. First-time approval: the first time someone signs up, the president of the organization that
   made the post approves them, checking the email against the Church's directory. Proposals
   Sam accepted:
   - The volunteer first proves the address is theirs (clicks a link we email), *then* the
     president approves. This stops someone typing another member's email.
   - One approval covers the whole ward, not just that organization.
   - While approval is pending, the sign-up shows as "waiting for approval". (Refined in
     items 17–18: it doesn't count or hold a spot until approved.)
7. Email is the volunteer's key: "My sign-ups" opens from a link emailed to them. Reminders go to
   the same address the day before.
8. Name visibility, option B: anyone with the link sees counts ("6 of 10 filled") and what's
   being brought, but not names. Names are seen by the ward council and the other volunteers on
   the same post.
9. Private details (address, allergies, door code) show only to volunteers on that post and to
   the ward council, never on the public page.
10. Self-cancel up to a cutoff (item 20) before; after that cancelling still works but the president gets
    a "you're now short" email.
11. When a role fills it closes and shows "Filled ✓"; no waitlist. The president can raise the
    number. Late approvals and races can still take it over the number (items 18–19).
12. President notifications: new person waiting for approval, post fully filled, cancellations
    (urgent after the cutoff). Ordinary sign-ups send nothing.
13. A ward council page lists every open post, how full it is, and which are short and soon.
14. Past posts move to a "past" list (not deleted) and can be copied as a new post.
15. Notes: a note on the post that everyone with the link sees, and a note on any role.
16. Discord: the pasted link shows a preview card. The live webhook message is not in this
    version (Sam: posting on every sign-up "would drive everyone crazy"; it would edit one
    message in place, but it's deferred anyway).

Sam's notes on draft 1 (2026-11-21), quoted where they set a rule:

17. Waiting sign-ups never lapse early: "Only lapse once the opportunity is over."
18. Waiting sign-ups don't count until approved, and over-filling is fine: "it's always better to
    have more than you need than less. But maybe we should let any volunteer coming in over the
    limit to withdraw their offer (as the need is already filled)."
19. Two people racing for the last spot: "let them both sign up. Just let the last one know
    that they're coming in over the limit and let them withdraw if they want."
20. The cancel cutoff is the organizer's: "Why not let the volunteer opportunity organizer
    decide the cutoff when people can still cancel?"
21. Added editors get every email: "That's what they're being assigned to do when they become
    editors, and they will need visibility (and the president may be out of town or
    something)."
22. "Soon" is within 14 days, fixed, so far-off events don't crowd the list. The ward council
    page "is more like a portal"; volunteer posts are one thing on it.
23. Private details are not cleared for the ward council. "The only thing a volunteer can see
    on other posts is how full they are (they should be able to click on the public view of
    related posts to see how else they can serve)."
24. Discord direct messages for reminders and confirmations were asked about instead of SMS
    ("all the overhead in getting texting approved and then paying for the service"). See §6.9.
25. Discord direct messages are in the first version (Sam: "In the first version").

## 4. Approaches considered

- **A. New section of Wardest (chosen).** Reuses callings, spaces (Ward Council, Bishopric,
  per-organization), leaders' Google sign-in, Resend, row-level tenancy. Adds posts and a new
  kind of person, the email-only volunteer. Trade-off: a second way into the app, which needs
  its own security care.
- B. Separate app on its own domain. Own name and look, but rebuilds leader sign-in, callings,
  spaces and ward approval, and gives the Exec Sec two callings lists to maintain.
- C. Catalog how-to for an existing free tool (SignUpGenius, MealTrain, SupportNow). Nothing to
  build, but no ward council view, no first-time approval, ads, and names usually public.

Sam picked A: the things that make this better than MealTrain all come from the callings and
spaces Wardest already has.

## 5. How it maps onto Wardest today

Wardest (Hono Worker + D1, `db/schema.sql`) already has:
- `ward_memberships` (leaders, Google sign-in, `calling_title`, `role` superadmin/member).
- `spaces` with `kind` in public / bishopric / ward_council / org. New wards get Bishopric, Ward
  Council, and org spaces including Elders Quorum, Relief Society, Activities Committee and Ward
  Mission (`src/lib/wards.ts` DEFAULT_SPACES).
- `space_memberships` with role owner/member. Presidents own their org's space.
- Visibility helpers in `src/lib/visibility.ts` (fail closed; ward superadmin is break-glass).
- Resend email via `src/lib/invites.ts`. Stateless signed-cookie sessions (`src/lib/session.ts`).
- No scheduled (cron) handler and no ward time zone yet.

Permission mapping (my call, from settled items 2–4; Sam to confirm in review):

| Who | How Wardest knows | Can |
|---|---|---|
| Post creator | `created_by_user_id` | Edit their post, approve first-time volunteers on it |
| Organization's volunteer editors | owners of the `org` space, plus anyone they add (below) | Create, edit and delete that organization's posts; approve first-time volunteers on them |
| Organization's other leaders | member (not owner) of the `org` space | See that organization's posts, with names and private details, read-only |
| Ward council | member of the `ward_council` space | See every post and every sign-up, read-only |
| Bishopric (bishop, counselors, Exec Sec, Ward Clerk) | member of the `bishopric` space | Create for any organization, edit, delete and approve anything |
| Ward superadmin | `ward_memberships.role='superadmin'` | Same as Bishopric (existing break-glass) |
| Volunteer | email, verified by link | Sign up, see and cancel their own sign-ups |
| Anyone with the link | nothing | See the public page |

**Volunteer editors (settled with Sam, 2026-11-21; the mechanism is my call).** Each
organization's space page gets a "Who can manage volunteer posts" list. The space's owners
(by default the president and secretary) are always on it and manage it; they can add any
Wardest member of the ward, typically their counselors. It is its own list rather than
making counselors space owners, because owning a space also controls its portal and sharing.
Bishopric members and superadmins can manage every organization's list.

So the Ward Clerk must be put in the Bishopric space, and an Activities chair or Ward Mission
Leader who isn't in the Ward Council space only sees their own organization's posts until they
are added. Step 2 of the Exec Sec track (callings and spaces) should say so.

## 6. The design

### 6.1 A post

- Belongs to one ward and one organization (an `org` space).
- Title, a public note, and a private-details box.
- One or more **dates**. Each date has one or more **roles**.
- A role has a name, a number needed, an optional time range, an optional note, and an optional
  "what are you bringing?" prompt.
- The president builds it by adding dates and roles; "copy this date" repeats a date's roles on
  another date (how meals for three weeks get made). "Copy this post" makes a new post from a
  past one.
- Covers all four shapes Sam described: a move (one date, one role, 10 people), an activity
  (one date, several roles), missionary evenings (several dates, one role, 4 each), meals (many
  dates, one role, 1 each, with "what are you bringing").

Rough public view:

```
Elders Quorum · Help the Jensens move in
Wear closed-toe shoes; donuts provided.
Saturday, Dec 6 · 9:00 AM · address emailed once you're confirmed
▓▓▓▓▓▓▓░░░  7 of 10 filled
  Movers (truck unload)   5 of 6    [ Sign up ]   Bring a dolly if you have one
  Bring lunch             2 of 2    Filled ✓
  Watch the kids          0 of 2    [ Sign up ]
```

### 6.2 The public link

- Unguessable (random id, not a sequential number or a readable slug), so posts can't be
  enumerated. `noindex`.
- Shows organization, title, public note, dates, roles, counts, role notes, and "bringing"
  items without names. Never names, never private details.
- Open Graph tags give Discord/email a preview card: title, organization, "7 of 10 filled".
  That count is as of when Discord fetched it; it won't update.

### 6.3 Signing up

1. Volunteer picks a role, types name and email (and what they're bringing, if asked).
2. **Known, approved email:** the sign-up counts at once and a confirmation email goes to that
   address with a cancel link and a "My sign-ups" link. Builder's call on whether a remembered
   browser skips anything further; the confirmation email is the guard against someone using
   another approved member's address (it tells the real owner, who can cancel).
3. **New email:** the sign-up is marked "waiting" and we email a confirm-your-address link.
   - When they click it: the email is verified and goes to the president for approval. The slot
     shows "waiting for approval".
   - If they never click it, the sign-up stays waiting until the opportunity is over, then
     lapses (Sam, item 17).
4. **Approval:** the post creator, that organization's volunteer editors, or any Bishopric
   member, sees name and email and approves or
   declines after checking the Church directory themselves (Wardest never connects to it).
   - Approve: the person is approved for the whole ward; all their waiting sign-ups count.
   - Decline: their waiting sign-ups are dropped and they get a polite email.
5. **Waiting sign-ups** (address not yet confirmed, or not yet approved) don't count and don't
   hold a spot (Sam, item 18). The bar shows them apart ("7 of 10 filled · 3 waiting"), so the
   organizer can see help may be coming. The "fully filled" email fires when the confirmed
   count reaches the number needed. If anything is still waiting for approval 48 hours before
   the date, the post's approvers get an urgent nudge to approve or decline. (My call.)
6. **Over the number is fine** (Sam, items 18–19). A role can end up over its number in two
   ways: a waiting sign-up is approved after the role filled, or two people take the last spot
   at once (both get in). Whoever's sign-up counts after the role was already full is told
   by email that the need is already met, and is offered a one-click "withdraw my offer".
   (Email only, 2026-11-21: an on-screen notice would reveal that the address is approved;
   every email-dependent result now shows the same page.) Staying is fine too. Withdrawing
   this way sends the organizer nothing, since the role is still full. The bar shows
   over-filling plainly ("12 of 10").
7. **Declines are remembered** for that ward: a declined email can't sign up again (it's told to
   contact the ward's leaders), so a stranger can't keep sending approval requests. Bishopric
   members can undo a decline, and can revoke an approval later (someone moved out). (My call.)
8. **Leaders skip approval:** an email that already belongs to a Wardest member of the ward is
   approved automatically. (My call.)
9. Once a role's confirmed count reaches its number, its sign-up button closes and it shows
   "Filled ✓". Over-filling only happens through step 6.

### 6.4 Volunteers' own view

- "My sign-ups": enter your email, get a link, see your upcoming and past sign-ups in that ward
  with a cancel button on each. The link signs them into a volunteer-only session that can see
  nothing but their own sign-ups and the posts they're on (including private details of those
  posts).
- Volunteers on a post see the other volunteers' names on that post.
- **Other ways to serve:** My sign-ups (and the confirmation email) list the ward's other open
  posts with only how full each is, each linking to its public page. That is all a volunteer
  ever sees of posts they aren't on (Sam, item 23). Shown only to approved volunteers.
- **Who gets private details and names, and when (my call, from §2's anti-goals):** only an
  email that is both confirmed and approved, and only through what goes to that email: the
  confirmation and reminder emails, and the My sign-ups link. Never on the screen right after
  the sign-up form, since anyone can type any address there, including an approved member's.
  A first-timer gets the address once a president approves them.

### 6.5 Cancelling

- Volunteers cancel from the confirmation email or My sign-ups.
- **The organizer sets the cutoff** for each post, in hours before the role's start (or the
  date's start if the role has no time). Default 24 hours (Sam, item 20).
- Before the cutoff: the slot reopens and the post's approvers get an email.
- After the cutoff: still allowed (people who can't come should still say so); the approvers
  get a more urgent "you're now short" email. If the role is still full after the cancel
  (it was over-filled), the email says so instead of "short". (Keeping cancel open after the
  cutoff is the earlier settled rule, item 10; the organizer's choice is where the line is.)
- Presidents/Bishopric can also remove a volunteer from a role.

### 6.6 Emails

| To | When |
|---|---|
| Volunteer | Confirm your address (first time only) |
| Volunteer | Sign-up confirmed (with cancel and My sign-ups links) |
| Volunteer | Approved / declined |
| Volunteer | Reminder, the day before, with private details |
| Volunteer | The date or time of their role changed, or their role/post was removed |
| Volunteer | Their sign-up counted after the role was full: the need is met, withdraw if you like |
| Post creator + the organization's volunteer editors | Someone new is waiting for approval |
| Post creator + the organization's volunteer editors | Someone is still waiting for approval 48 hours before the date |
| Post creator + the organization's volunteer editors | The post is fully filled |
| Post creator + the organization's volunteer editors | Someone cancelled (urgent wording after the post's cutoff) |

Every volunteer editor gets these, including counselors added to the list (Sam, item 21). A
person who is both creator and editor gets one email, not two.

Ordinary sign-ups don't email the president.

### 6.7 Ward council view

- The Ward Council's space page "is more like a portal" (Sam): volunteer posts are one section
  on it, beside its blocks and tasks, not a separate app page. Each organization's space page
  gets the same section showing that organization's posts.
- The section lists every open post in the ward, grouped or filterable by organization, with
  fill bars.
- It highlights posts that are short and within the next **14 days** (fixed; Sam, item 22).
- A "past" list. Copy a past post as a new one.

### 6.8 Privacy and retention

- Private details are kept; the ward council can see them on past posts (Sam, item 23).
  Volunteer names on past posts stay for the ward council too.
- A volunteer's access to a post's private details ends when the post is over; afterwards
  My sign-ups shows that past sign-up without them. (My call.)
- A volunteer sees nothing of other posts except how full they are (§6.4).

### 6.9 Discord direct messages (in the first version; Sam, item 25)

Free, and needs no texting approval. How it would work:
- Wardest registers one Discord application for all wards (an owner step for Sam). The ward's
  Discord admin adds the Wardest bot to the ward's Discord server once.
- A volunteer clicks "Connect Discord" in My sign-ups and approves it in Discord. That gives
  Wardest their exact Discord account. Typing a username isn't used, because a typo would
  send a family's address to a stranger.
- Confirmations and reminders then also go to them as a Discord direct message. Email always
  still goes; it's the volunteer's key and the fallback.
- Limits: Discord only lets a bot message someone who shares a server with it, and a member
  can turn off messages from server members; then Wardest falls back to email. The builder
  should prove sending from a Worker in a short spike first.
- Private details by Discord message: only to connected, approved volunteers, the same rule as
  email.

## 7. Constraints

- Row-level tenancy: every new table carries `ward_id`; every read is ward-scoped.
- Fail-closed visibility through one helper, like `visibility.ts`.
- Pasted links are http(s) only (`src/lib/urls.ts`).
- Email from `no-reply@send.wardest.com` via Resend; never touch the apex MX.
- Wards need a time zone for "the day before" and each post's cancel cutoff. Add one to `wards`
  (default America/Denver for existing wards; my call).
- Reminders need a Workers Cron Trigger; Wardest has none yet.
- The public sign-up form and the "email me my link" form send email to any address typed in,
  so they must be protected against abuse (bot check such as Cloudflare Turnstile, plus rate
  limits per address and per post). Without it the form could be used to spam strangers from
  Wardest's domain.
- Resend's plan has a daily send limit; reminders and confirmations count against it. Check it
  before a second ward goes live.
- Nothing is deployed yet; this is built and verified locally like Phases 1–3, and deploys with
  the rest.

- Discord needs an owner step before it can be tested end to end: Sam registers the Wardest
  Discord application (bot token and OAuth client go in as Worker secrets), and M44's Discord
  admin adds the bot to the ward's server. Build and test locally against a test server first.

## 8. Left to the builder

- Table and route design, as long as §5–§7 hold.
- How the volunteer session is carried (separate cookie, scope) and token lifetimes, within
  "single use, short-lived for confirm links".
- Exact email wording and page layout, following the existing views.
- Whether a remembered browser lets a known volunteer skip anything (§6.3 step 2).
- How the build is split into parts.

## 9. Later (not this version)

- Members asking for help, routed to the right president (version 2).
- Live Discord status message via a channel webhook, edited in place (one message per post).
- Waitlist, SMS, calendar attachments.
