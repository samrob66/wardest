# Service Portal setup guide (phase 2)

For the Executive Secretary. Everything happens in a web browser: no command line, no installs.
It takes about two hours the first time. Do each numbered step in order; each one is a single
action and says what you should see.

**Already running phase 1?** Don't start over: follow **section 11, Upgrading from phase 1**,
then the test checklist in section 9.

The examples use an invented ward, **Riverbend 1st Ward (example)**, with the short prefix
**rb1**. Use your own ward's details where the examples show Riverbend's.

What you are building:

- a **Service Sheet** (a Google Sheet) with the portal's script inside it;
- a public **Service Opportunities** page where members sign up, a **Request Help** page with
  one short Google Form per kind of request, and a **leader page** where leaders create
  opportunities, approve first-time volunteers and see who signed up;
- a **My sign-ups** page each volunteer reaches from their emails;
- private **request folders**, one per kind of request, that only the right leaders can open.

How a volunteer is known (no Google account needed):

- **First time**, the sign-up waits. The volunteer gets a *Please confirm your email* message
  and clicks **Confirm my address**. Then a leader of the organization whose opportunity they
  first signed up for (or the bishopric) sees them under **Waiting for approval**, checks the
  ward directory, and clicks **Approve** or **Decline**. The leader's name and the time are
  recorded.
- **Approved volunteers and leaders** count at once. Their confirmation email carries the
  private details (an address, a gate code), a cancel button and a link to **My sign-ups**.
- **The page never says which of these happened.** Every sign-up answers *Thanks. Check your
  email to finish or see your sign-up.* so nobody can learn anything about an address by typing
  it. The email tells the real owner.

---

## 1. Before you start

1. **Get the bishop's approval.** General Handbook 38.8.21.2 asks for the bishop's approval
   before a ward uses an internet tool in a calling. Every page and email the portal sends
   already carries this notice and the ward's contact address:
   > This page is an independent tool made by Church members. It is not an official product
   > of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.
2. **Choose the account.** Do every step signed in to **the bishopric's shared account**. That
   account will own every file, form, script and trigger. Never do these steps signed in as
   yourself: anything you install under your own account stops working when you are released.
3. **Check the interview router's daily runtime.** Scripts on one Google account share 90
   minutes of trigger time a day, and the interview router already runs every minute on the
   shared account. The portal adds about 15 minutes a day.
   1. Signed in to the shared account, open **script.google.com**.
   2. Click the interview router project, then **Executions** (the list icon on the left).
   3. Look at the **Duration** column for a few recent runs. Multiply a typical duration by
      1,440 (runs a day). Example: 2 seconds × 1,440 = 48 minutes.
   4. If that number plus 15 minutes is more than about **70 minutes**, stop here: set the
      portal up on a **second bishopric-owned Google account** instead (it also doubles the
      email allowance). Everything below is the same on that account.
4. **Name two administrators**: the bishop and the Executive Secretary. Both should know how to
   sign in to the shared account (password and 2-step verification recovery), and both will get
   the portal's alert emails. In the Leaders tab (step 3.5) their Calling must say exactly
   `Bishop` and `Executive Secretary`. They are also the **only two who can edit the Service
   Sheet**: anyone who can edit it can also change the script inside it, and that script can
   open every request sheet, including the bishop-only ones. Other bishopric members and the
   ward council can view it, and ask the Executive Secretary to change Settings, Leaders or
   Categories.
5. **Agree on the Gemini rule** with every leader who will see portal data. It is also written
   in the Service Sheet's Read me tab:
   > Do not ask Gemini to read, summarize or draft from the Service Sheet, the request sheets or request notices.

---

## 2. Make the Service Sheet and paste the script

You need two files from this repository folder, `google-portal/dist/`:
**`appsscript.json`** and **`Code.gs`**. (On Sam's computer they are in
`F:\!SLRFam\AI\Claude-Apps\Wardest.com\google-portal\dist\`.) To copy one: open it on GitHub,
click **Raw**, press **Ctrl+A** (Mac: **Cmd+A**) to select everything, then **Ctrl+C**
(**Cmd+C**) to copy. Or open it from the folder in Notepad and do the same.

**Use a browser window signed in only to the shared account.** If your browser is signed in to
several Google accounts, Google can quietly run things as a different one. Open a private window
(Chrome: **Ctrl+Shift+N**), sign in there to the shared account only, and do this whole guide
in that window. The Service Sheet will belong to the shared account, and the **Service Portal**
menu then works only for the account that owns the Service Sheet. If it ever says *The Service
Portal menu works only for the account that owns this Service Sheet*, you are in a window that
is using another account: close it, open a private window, sign in to just the shared account,
and open the Service Sheet again. If a dialog stays blank or authorization keeps looping in the
private window, use a separate Chrome profile signed in only to the shared account instead.

1. In the browser, go to **sheets.new**. A blank spreadsheet opens.
2. Click **Untitled spreadsheet** at the top left, type `Service Sheet`, press **Enter**.
3. Click **File > Settings**. Under **Time zone** pick your ward's time zone (for example
   `(GMT-07:00) Denver`). Click **Save settings**.
4. Click **Extensions > Apps Script**. A new tab opens with the script editor and a file called
   `Code.gs`.
5. Click **Untitled project** at the top, type `Service Portal`, click **Rename**.
6. Click the **gear** (Project Settings) in the left bar.
7. Tick **Show "appsscript.json" manifest file in editor**.
8. Under **Time zone**, pick the same time zone as in step 3. (If there is no Time zone
   setting here, the manifest you paste in step 11 sets it; Check health will tell you if it
   doesn't match.)
9. Click the **< >** (Editor) icon in the left bar. You now see `appsscript.json` and `Code.gs`.
10. Copy **`appsscript.json`** from the repository (see above).
11. Click **appsscript.json** in the editor, press **Ctrl+A**, then **Ctrl+V**. If your ward is
    not in Denver's time zone, change `"America/Denver"` on the second line to yours (for
    example `"America/Phoenix"`), keeping the quotes.
12. Copy **`Code.gs`** from the repository. It is long; that is expected.
13. Click **Code.gs** in the editor, press **Ctrl+A**, then **Ctrl+V**. The first line should
    start with `// GENERATED FILE: do not edit.`
14. Press **Ctrl+S** (or click the disk icon). No red error bar should appear.
15. Go back to the Service Sheet tab and **reload the page** (F5). After a few seconds a new
    menu, **Service Portal**, appears to the right of **Help**.

---

## 3. Run Set up, fill Settings and Leaders

1. Click **Service Portal > Set up**.
2. **Authorize the script (first time only).** A box says *Authorization required*:
   1. Click **Continue** (or **Review permissions**).
   2. Choose the **shared account**.
   3. Google shows *Google hasn't verified this app*. This is normal for a ward's own script.
      Click **Advanced**, then **Go to Service Portal (unsafe)**.
   4. Read the list (Sheets, Drive, Forms, sending email, running when you're away, connecting
      to the web). If Google shows tick boxes, tick **Select all**. Click **Allow** (or
      **Continue**).
   Only the shared account ever does this. Leaders never authorize the script.
3. Click **Service Portal > Set up** again. It makes the tabs (Read me, Settings, Leaders,
   Categories, Posts, Slots, Sign-ups, Volunteers, Needs help soon) and then says:
   *Fill in Settings (ward name, time zone, contact email) and the Leaders tab, then run Set up
   again.* Click **OK**.
4. Open the **Settings** tab and type into the **Value** column (leave Key and Help alone):

   | Key | What to type | Riverbend example |
   |---|---|---|
   | ward_name | The ward name as members know it | `Riverbend 1st Ward (example)` |
   | ward_prefix | Short prefix for short links | `rb1` |
   | time_zone | The same zone as steps 2.3 and 2.8, as a name | `America/Denver` |
   | contact_email | The address members may write to | `help@riverbend.example` |
   | hub_url | The hub folder address (where `index.html` lives); blank if no hub | `https://example.github.io/rb1links/` |
   | web_app_url | Leave blank for now (step 4) | |
   | preview_image_url | Optional picture for link previews | (blank) |
   | serve_short_link | Leave blank for now (step 6) | |
   | help_short_link | Leave blank for now (step 6) | |
   | reminder_hour | Hour reminders go out the day before (0–23) | `18` |
   | default_cancel_cutoff_hours | Hours before a role when a cancel makes you "short" | `24` |
   | email_reserve | Emails kept back each day for reminders and leader notices | `30` |
   | signup_limit_per_day | Most sign-ups accepted in one day | `40` |
   | confirm_limit_per_day | Most *Please confirm your email* messages in one day (first-timers) | `20` |
   | organizations | Organizations, separated by commas | (keep the list given) |
   | discord | Leave `off` | `off` |

5. Open the **Leaders** tab. One row per leader:

   | Column | What to type |
   |---|---|
   | Name | e.g. `Sister Example` |
   | Email | The address their leader link goes to |
   | Calling | e.g. `Relief Society President`. The bishop must be exactly `Bishop`; the Executive Secretary exactly `Executive Secretary` |
   | Organization | Pick from the list |
   | Bishopric | Tick for bishopric members: on the leader page they see and edit every opportunity, approve any volunteer, and can undo a decline or revoke an approval. (Only the bishop and Executive Secretary edit the Service Sheet itself; see section 1.) |
   | Ward council | Tick for ward council members: they see every opportunity and its names, edit their own organization's, approve volunteers whose first sign-up was in their organization, and see **Needs help soon** |
   | Org editor | Tick for leaders who make opportunities for their organization (they see only their own organization's names) and approve its first-timers |
   | Coordinator | Tick for someone who runs a kind of opportunity (a meal coordinator, a building specialist). The tick is a reminder only: what they may do comes from the **Coordinators** column of the Categories tab (step 6). Coordinators don't approve volunteers |
   | Send leader link | Leave for now (step 7) |
   | Link sent | The script fills this |

   **Your own row:** add yourself, with Calling `Executive Secretary`, Organization `Bishopric`
   and **Ward council** ticked. Without a role box ticked, the leader page answers *Your leader
   role can't create opportunities yet* and you can't do the test in section 9.

6. Open the **Categories** tab and check the owners. Request kinds (`moving`, `christmas`,
   `other`) decide who reads each request folder:
   - **Moving help**: the Elders Quorum and Relief Society leaders (Owning organizations).
   - **Christmas help** and **Other help** are **Confidential**: only the bishop (Calling
     `Bishop`) and anyone listed in **Coordinators** (emails, separated by commas).
   The **Opportunity** rows (Meals, Moving, Service project, …) are the categories leaders pick
   when they make an opportunity, and each shows its **Icon** on the Service Opportunities page.
   For each one you may fill in:

   | Column | What it does | Example (Meals) |
   |---|---|---|
   | Owning organizations | The organizations its opportunities belong to | `Relief Society` |
   | Default audiences | Ticked for a new opportunity in it | `Sisters` |
   | Coordinators | Emails, separated by commas. Each person must also have a row in **Leaders** (that is where their leader link comes from). They see and edit every opportunity in this category, whatever its organization, can make new ones in it, and get its *Fully filled* and *still short* emails | `sister.coordinator@example.test` |
   | Any ward council may create | Tick to let every ward council member make opportunities in it | (blank) |
   | Warn hours | How many hours before a date to warn if a role is still short. Blank means 48; `0` turns warnings off | `72` |
   | Also warn | More emails for that warning, separated by commas | `brother.clerk@example.test` |

   Do not change the **Id** column.
7. Click **Service Portal > Set up** again. It makes the **Service Portal** folder in Drive,
   moves the Service Sheet into it, makes the private **System Sheet**, and makes one request
   form, folder and month sheet for each request kind. It ends with *Set up is done.* If it
   also mentions the **time zone**, follow its words (Extensions > Apps Script > Project
   Settings > Time zone) and run Set up again.

You can run Set up any time; it never makes a second copy of anything.

---

## 4. Deploy the web app

1. Click **Extensions > Apps Script**.
2. Click **Deploy > New deployment** (top right).
3. Click the **gear** next to *Select type* and choose **Web app**.
4. Description: `Service Portal`.
5. **Execute as**: **Me** (the shared account).
6. **Who has access**: **Anyone**.
7. Click **Deploy**. If asked, authorize again as in step 3.2.
8. Copy the **Web app URL** (it ends in `/exec`). Click **Done**.
9. In the Service Sheet, paste it into Settings **web_app_url**.
10. Check it: open a new browser tab and go to that address with `?api=ping` added at the end.
    You should see `{"ok":true,"at":"…"}`.

**Updating later without changing the address** (when you paste a new `Code.gs`): **Deploy >
Manage deployments**, select the deployment, click the **pencil** (Edit), set **Version** to
**New version**, click **Deploy**. Never use *New deployment* again: that makes a new address
and the old links stop working.

---

## 5. Install triggers, then Sync sharing

1. Click **Service Portal > Install triggers**. It says *Triggers installed: every 10 minutes,
   hourly, daily at 2 am, and 3 request form trigger(s).*
2. Click **Service Portal > Sync sharing**. It shares, with Google's share emails turned off:
   - the **Service Sheet**: the bishop and the Executive Secretary can edit; every other
     bishopric and ward council member can view (editors can also change the script inside it,
     which can open every request sheet, so edit access stays with those two);
   - each **request folder**: the leaders who read that kind of request (they can edit the
     request sheet: Status, Assigned to, Leader note);
   - the **System Sheet** and the **Service Portal** folder: nobody but the shared account
     (any link sharing is turned off);
   - and it **protects** Posts, Slots, Sign-ups, Volunteers and Needs help soon so only the
     script writes them.
3. Read the summary. If it lists **Problems**: a person whose address has no Google account
   cannot be given a file. Either they make a free Google account with that same address, or
   you change their email in Leaders to one that has a Google account, then run Sync sharing
   again. (Their leader link works either way; only the files need a Google account.)

Run **Sync sharing** again whenever the Leaders or Categories tab changes.

---

## 6. The hub pages, short links and QR codes

The public pages are sub-pages of the ward's hub (the ward's link page), like its Interviews
pages. The hub belongs to the ward; its owner adds the files.

1. Click **Service Portal > Make hub files**. It says the files are ready and gives a folder
   link. Click the link.
2. In that Drive folder, download each of the seven files (right-click > **Download**):
   `serve.html`, `post.html`, `help.html`, `confirm.html`, `leader.html`, `me.html`,
   `hub-sections.html`. They already contain the ward name, the web app address and the
   contact.
3. Give them to the **hub owner**, who, in the hub's GitHub repository:
   1. clicks **Add file > Upload files**, drags in the six page files (not
      `hub-sections.html`), and clicks **Commit changes**; they sit next to `index.html`;
   2. opens `index.html`, clicks the **pencil** (Edit), pastes the part of `hub-sections.html`
      between `BEGIN` and `END` where the comment at its top says (above the ward's own
      sections), and clicks **Commit changes**.
4. Make two short links on **app.zippa.run** (as for the hub's other links):
   `<prefix>Serve` → `<hub_url>serve.html` and `<prefix>Help` → `<hub_url>help.html`
   (Riverbend: `zippa.run/rb1Serve` → `https://example.github.io/rb1links/serve.html`).
5. Paste them into Settings **serve_short_link** and **help_short_link**, run **Make hub files**
   again, and give the hub owner the new `hub-sections.html` part.
6. QR codes: download the QR code zippa.run shows for each short link, name them
   `serve-qr.png` and `help-qr.png`, and have the hub owner upload them next to `index.html`.

**If there is no hub, or the hub test in Check health fails:** skip this step, leave
**hub_url** blank, and point the two short links at the web app's own pages instead:
`<web_app_url>?page=serve` and `<web_app_url>?page=help`. These pages work the same but show
Google's notice *This application was created by a Google Apps Script user* at the top.

---

## 7. Send leader links

1. In the Leaders tab, tick **Send leader link** for each leader.
2. Click **Service Portal > Send leader links now**. It says how many it sent, unticks the boxes
   and fills **Link sent**. (Ticks left alone are also sent within 10 minutes.)

Each leader gets an email with their personal link to the leader page. It lasts 90 days. A
leader can get a new one any time by opening `leader.html` and typing their email. Removing a
leader from the Leaders tab ends their link at once.

---

## 8. Check health

Click **Service Portal > Check health**. Every line should start with **OK**. For a
**PROBLEM**:

| Line | What to do |
|---|---|
| Settings | Fill in the keys it names. |
| Web app does not answer | Step 4: Execute as **Me**, access **Anyone**; web_app_url must end in `/exec`. |
| Hub serve.html not reachable | The hub owner hasn't uploaded the pages yet, or hub_url is wrong (it must be the folder that holds `index.html`). Or use the no-hub way in step 6. |
| Triggers | Run **Install triggers** (signed in as the shared account). |
| Triggers belong to … (this account) | Always OK: it names the account whose triggers are listed and each one's kind (CLOCK for the timed jobs, FORMS for the request forms). Google only lists the triggers of the account running Check health, so a trigger someone made while signed in as themselves never shows here and looks missing: run **Install triggers** in a window signed in only to the shared account. |
| gpTenMinute / gpHourly / gpDaily last ran … more than … minutes ago, or has not run | That job has stopped (every 10 minutes, every hour, once a night). Open **Extensions > Apps Script > Executions** and look at its recent runs and errors. Then run **Install triggers** again in a window signed in only to the shared account. Right after installing, *has not run yet* is normal. |
| Any menu item: *works only for the account that owns this Service Sheet* | See the box at the start of section 2: use a private window signed in only to the shared account. |
| System Sheet missing / Request forms | Run **Set up**. |
| Email left today | Today's 100 emails are nearly used. Wait a day; queued mail goes out by itself. |
| Outbox failed | Open the System Sheet's Outbox tab and read the Error column (often a mistyped address). |
| Time zone | Do what the line says (Project Settings, or File > Settings in the Sheet). |

**The daily health email.** Every night the daily job runs these same checks. If any line is a
**PROBLEM**, the bishop and the Executive Secretary get one email, *Service Portal: needs
attention*, listing only the PROBLEM lines (counts only: never a volunteer's name or a
request). If everything is OK, nobody gets anything. From the nightly job there is one more
line: **Timed jobs run as …, not as the Service Sheet owner** means the triggers were installed
while signed in as someone else: sign in as the shared account, run **Install triggers**, then
remove the other account's triggers (Extensions > Apps Script > Triggers, signed in as that
account).

---

## 9. Test checklist

You need three email addresses you can read:

- **your own** (it is on the Leaders tab, so it skips approval);
- **test address A** and **test address B**: two addresses that are **not** on the Leaders tab
  (a spare address of your own, or a family member's who will forward you the emails).

Do the volunteer steps in a **private (incognito) window** so nothing is remembered. Tick each
box as it passes. To run a timed job now instead of waiting, open **Extensions > Apps Script**,
pick the job (**gpHourly**, **gpTenMinute** or **gpDaily**) in the function list at the top
and click **Run**.

**A. Make a test opportunity**

- [ ] Open your leader link. The page says *Signed in as …* and shows the tabs **My
      opportunities**, **Waiting for approval**, **Needs help soon** (ward council and
      bishopric) and **New opportunity** (and **Volunteers** for bishopric members).
- [ ] **New opportunity**: Category **Meals** (Category comes first; Sisters is ticked for you),
      a title, two dates (**tomorrow** and **in three days**), each with role `Bring a meal`,
      how many `1`, and private details `Test address`. **Save as draft**. It shows under My
      opportunities as **Draft** and is not on the serve page.
- [ ] **Edit** it and **Publish**. Copy the public link.
- [ ] Open the serve page (short link) **on a phone**: the card shows the Meals icon 🍲 above
      its title and a fill bar. On a computer, **Brothers** and **Sisters** sit side by side;
      on the phone they are stacked.

**B. A first-timer (test address A): confirm, approve, over the number, withdraw**

- [ ] With test address A, sign up for **tomorrow's** role. The page says *Thanks. Check your
      email to finish or see your sign-up.* The role still shows **0 of 1** (a waiting sign-up
      doesn't hold a place).
- [ ] On the leader page the role shows **0 of 1 · 1 waiting**, with the name and the tag
      *Waiting for their email click*.
- [ ] Address A gets *Please confirm your email* with **no** private details. Click **Confirm
      my address**, then the button on the page: *Thank you. Your address is confirmed…*.
      Click the email's link again: *Your address is already confirmed.*
- [ ] The organization's leaders and the bishopric each get *Waiting for approval: <name>*
      (no email address in it).
- [ ] Now take the place yourself: with **your own** address, sign up for tomorrow's role. The
      page says the very same sentence, and you get *You're signed up* at once, with **Test
      address** in it (leaders skip approval). The role shows **Filled ✓**.
- [ ] Leader page > **Waiting for approval**: test address A is listed with its email and
      *first signed up for* your test post. Click **Approve**. It says *Approved. 1 sign-up
      now counts.* In the Service Sheet's **Volunteers** tab, A's row says **Approved**, with
      your name in **Decided by** and the time in **Decided at**.
- [ ] Address A gets *You're approved to serve* and *Thank you: … already has the people it
      needs* (A counted after the role filled), with the private details, a **Withdraw my
      offer** button and a **See all your sign-ups** link. The public page shows
      **Filled ✓ · 2 of 1**; the leader page shows **2 of 1** and the tag *Over the number*.
- [ ] Click **Withdraw my offer**, then the button on the page: *Your offer is withdrawn.*
      Nobody gets an email (the role is still full).
- [ ] With address A, sign up for the **in three days** role. A is approved now, so *You're
      signed up* arrives at once, with **Test address**, **Cancel my sign-up**, **See all your
      sign-ups** and **Other ways to serve** (other open opportunities with how full they are,
      no names).

**C. My sign-ups**

- [ ] From A's email, click **See all your sign-ups**. *Coming up* lists only A's sign-ups,
      with the private details, *Also serving:* and first names only, and a **Cancel** button.
      **Other ways to serve** lists other open opportunities with fill bars.
- [ ] Open `me.html` from the hub with nothing after it (or the link from an older email): it
      offers **Email me my link**. Type address A: *If that address has signed up for
      something, a link to your sign-ups is on its way.* The email arrives; the older link now
      says it has expired or is no longer valid. Type an address that never signed up: the
      same sentence, and no email.

**D. Decline, nudge, lapse (test address B)**

- [ ] Make a second test opportunity for **tomorrow**, how many `2`. With test address B,
      sign up and click **Confirm my address**.
- [ ] Run **gpHourly**. Because B's role starts within 48 hours, the organization's leaders
      and the bishopric each get *Urgent: waiting for approval* (no names). Run **gpHourly**
      again: no second one.
- [ ] Leader page > **Waiting for approval** > **Decline** B. B gets *About your sign-up*
      (*Please contact … to sign up*); B's sign-up leaves the leader page.
- [ ] With B, sign up again, twice: the page says the same sentence as always, nothing is
      added, and B gets at most one more *About your sign-up* email that day.
- [ ] Bishopric member: leader page > **Volunteers** > **Undo decline** for B. **Revoke** on an
      approved volunteer says how many of their sign-ups are still to come.
- [ ] Lapse: with B (undone, so waiting again), sign up for tomorrow's role and leave it
      waiting. The day after tomorrow it is gone from the leader page (Sign-ups tab:
      **Lapsed**) and B got no email about it.

**E. Children, coordinators, warnings, Needs help soon**

- [ ] Make an opportunity with audience **Children** (category Primary help). The New
      opportunity form shows the *Who is serving* note. On its public page choose **My
      child**, type a first name (for example `Ana`) and your own name and email: the leader
      page shows *Ana (signed up by …)*, and every email goes to you.
- [ ] Categories tab: put your email in **Meals**' **Coordinators**, **Warn hours** `48`,
      and test address A in **Also warn**. With a Meals opportunity tomorrow still short, run
      **gpHourly**: you and A each get *Still short: …* listing the short roles. Run it again:
      no second one.
- [ ] Fill every role of a new Meals opportunity: its creator, its organization's editors and
      you (as coordinator) get *Fully filled: …* once (one email each).
- [ ] Leader page > **Needs help soon**: short roles in the next 14 days, soonest first. Run
      **gpTenMinute**: the Service Sheet's **Needs help soon** tab shows the same rows.

**F. Cancelling, reminders and the phase 1 checks**

- [ ] Click **Cancel my sign-up** in a confirmation email, then the button on the page. The
      leaders get a **Cancellation:** email. Cancelling a sign-up that is still waiting tells
      nobody.
- [ ] Reminder: in Settings set **reminder_hour** to the current hour and run **gpHourly**.
      Tomorrow's approved volunteers get *Reminder: …* **with the private details**. Set
      reminder_hour back.
- [ ] On the leader page, **Remove** a sign-up. The person gets *Your sign-up was removed* and
      the role opens again.
- [ ] In a private window, open the Request Help page and submit each form (Moving, Christmas,
      Other) with test words. The right leaders each get a *New … request* email that names
      only the kind of request and the folder link, nothing from the form.
- [ ] Each request appears in its folder's sheet (Drive > Service Portal > Requests – …). Open
      the form itself (Drive > Service Portal > the form > **Responses** tab): it shows **0**.
      If a form says it is not accepting responses, open it and click **Publish**.
- [ ] Set a test request's **Status** to **Done**. Next day its **Closed on** date is filled.
- [ ] **Close vs Cancel**: Close stops new sign-ups but the event still happens and people
      still get their reminder; Cancel this opportunity means it isn't happening and everyone
      signed up is told (people still waiting simply drop off). Click **Cancel this
      opportunity** on a test post (add a short note): the people signed up get the
      *Cancelled:* email with your note, and the post leaves the serve page (it moves to
      **Show past opportunities**).
- [ ] **Check health**: every line OK, including *Triggers belong to* the shared account.
- [ ] Health email: the next morning nobody got *needs attention* (all OK). (To see one, empty
      Settings **web_app_url**, run **gpDaily**, and put the address back.)
- [ ] Cancel the test opportunities and set the test requests to **Done** (they leave after
      30 days).

---

## 10. Day to day, hand-off and updates

**Day to day.** Leaders work on the leader page: they approve first-timers under **Waiting for
approval** (and get an urgent email when someone still waits 48 hours before serving), and the
ward council watches **Needs help soon**. Request leaders open their Requests folder. Alert
emails go to the bishop and the Executive Secretary when something needs a person (at most one
a day per job), and the nightly health email arrives only when a check fails.

**When a calling changes.** Edit the Leaders tab (and Categories coordinators), then run
**Sync sharing**. Leader links follow the Leaders tab by themselves.

**Requests and privacy.** Requests are removed 30 days after they are marked Done or
Declined. On the 1st of each month the script starts a new request sheet in each folder,
carries over everything still open or recently closed, and permanently deletes the old file,
so old requests leave version history too. Opportunities, sign-ups and the Volunteers record are
never rotated or deleted. Private details go only to approved volunteers (and leaders), only by
email and My sign-ups, and only until the date is over. Remember the Gemini rule above.

**Handing off to the next Executive Secretary.** Everything lives on the shared account, so
nothing moves. Hand over the account (password and 2-step recovery), update Leaders and run
Sync sharing, open **Extensions > Apps Script > Triggers** (the clock icon) and check every
trigger's owner is the shared account, and walk the new Executive Secretary through Check
health. Add the portal to the ward's hand-off note.

**Updating the script.** When a new version is released: copy the new `Code.gs` (and
`appsscript.json` if it changed), paste over the old one as in section 2 (steps 10–14), save,
then **Deploy > Manage deployments > pencil > Version: New version > Deploy**. If the pages
changed too, run **Make hub files** and give the hub owner the new files.

---

## 11. Upgrading from phase 1

Do this once, in a browser window signed in only to the shared account. Nothing you or the
leaders made is lost: posts, sign-ups, requests and leader links all carry on.

1. **Paste the new script.** Copy the new **`Code.gs`** (and **`appsscript.json`**) from
   `google-portal/dist/` and paste each over the old one, as in section 2 steps 10–14. Save.
2. **New version of the web app.** **Deploy > Manage deployments**, select the deployment,
   click the **pencil**, set **Version** to **New version**, click **Deploy**. (Not *New
   deployment*: that changes the address and breaks every link.)
3. **Run Set up again** (Service Portal > Set up). It adds the new columns and rows by
   itself: **Email confirmed at** in Volunteers, the **Needs help soon** columns, and
   **confirm_limit_per_day** in Settings. It also marks everyone who already had a
   **Confirmed** sign-up in phase 1 as **Approved** (Decided by *Phase 1 sign-up*), once, so
   people you already accepted don't have to wait for approval and their reminders keep the
   private details. If it asks to authorize again, do it as in section 3 step 2.
4. **Install triggers again** (Service Portal > Install triggers), so the jobs pick up the new
   work (nudges, warnings, lapses, Needs help soon, the health email).
5. **Categories and coordinators.** Fill in **Coordinators**, **Warn hours** and **Also warn**
   for the opportunity categories as in section 3 step 6, add a **Leaders** row for each
   coordinator, tick **Send leader link** for them, then run **Sync sharing**.
6. **Make hub files again** and give the hub owner all six page files, **including the new
   `me.html`** (the My sign-ups page). The other five changed too, so they replace the old
   ones.
7. **Tell the leaders.** Send them the new LEADER-GUIDE: first-timers now wait under **Waiting
   for approval**, and there is no more *Send details* button (approved volunteers get the
   details in their confirmation).
8. **Check health**, then go through the test checklist in section 9.
