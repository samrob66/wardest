# Service Portal setup guide (phase 1)

For the Executive Secretary. Everything happens in a web browser: no command line, no installs.
It takes about two hours the first time. Do each numbered step in order; each one is a single
action and says what you should see.

The examples use an invented ward, **Riverbend 1st Ward (example)**, with the short prefix
**rb1**. Use your own ward's details where the examples show Riverbend's.

What you are building:

- a **Service Sheet** (a Google Sheet) with the portal's script inside it;
- a public **Service Opportunities** page where members sign up, a **Request Help** page with
  one short Google Form per kind of request, and a **leader page** where leaders create
  opportunities and see who signed up;
- private **request folders**, one per kind of request, that only the right leaders can open.

> **If you set up before 1.1** (before the whole bishopric could edit the Service Sheet and
> read the Christmas and Other requests), do this once, signed in to the shared account in a
> private window:
> 1. Copy the new `Code.gs` and paste it over the old one: section 2, steps 12–14 (open it
>    from the Service Sheet with **Extensions > Apps Script**). Save.
> 2. Only if you already deployed the web app: **Deploy > Manage deployments**, select the
>    deployment, click the **pencil**, set **Version** to **New version**, click **Deploy**.
>    (If you haven't deployed yet, skip this; section 4 does it.)
> 3. Reload the Service Sheet, then in the **Leaders** tab tick **Bishopric** for the bishop,
>    both counselors, the Executive Secretary and the Ward Clerk (add a row for anyone missing),
>    and for nobody else.
> 4. Run **Service Portal > Set up**. It keeps everything you typed, makes whatever is still
>    missing (this is also section 3, step 7), adds the **Notify** column to the Categories tab
>    (the **other** row gets `Bishop`), and updates the wording of any request forms it made
>    before (*Updated the wording of: …*). Then check the Categories tab as in section 3, step
>    6: Christmas coordinators in **Coordinators**, and **Notify**.
> 5. Only if you had already run Sync sharing: run **Service Portal > Sync sharing** (section
>    5, step 2). If you hadn't reached section 5 yet, skip this; section 5 runs it.
> 6. Carry on from where you stopped.

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
   `Bishop` and `Executive Secretary`.
5. **The bishopric edits the Service Sheet and reads the confidential requests.** The whole
   bishopric (the bishop, both counselors, the Executive Secretary and the Ward Clerk) can edit
   the Service Sheet and open the Christmas and Other request folders, so the counselors can act
   when the bishop is away. You give them this by ticking **Bishopric** on their Leaders rows
   (step 3.5); the Calling text doesn't matter for it. Anyone who can edit the Service Sheet can
   also change the script inside it, which can open every request sheet, so tick Bishopric only
   for those five callings. The other ward council members can view the Service Sheet, and ask
   the Executive Secretary to change Settings, Leaders or Categories.
6. **Agree on the Gemini rule** with every leader who will see portal data. It is also written
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
   | organizations | Organizations, separated by commas | (keep the list given) |
   | discord | Leave `off` | `off` |

5. Open the **Leaders** tab. One row per leader:

   | Column | What to type |
   |---|---|
   | Name | e.g. `Sister Example` |
   | Email | The address their leader link goes to |
   | Calling | e.g. `Relief Society President`. The bishop must be exactly `Bishop`; the Executive Secretary exactly `Executive Secretary` (they get the alert emails) |
   | Organization | Pick from the list |
   | Bishopric | Tick for the bishop, both counselors, the Executive Secretary and the Ward Clerk, and nobody else. They edit the Service Sheet, read the Christmas and Other requests, and on the leader page see and edit every opportunity (see section 1, step 5) |
   | Ward council | Tick for ward council members: they see every opportunity and its names, and edit their own organization's |
   | Org editor | Tick for leaders who make opportunities for their organization (they see only their own organization's names) |
   | Coordinator | Phase 2; ticking it alone gives nothing yet |
   | Send leader link | Leave for now (step 7) |
   | Link sent | The script fills this |

   **Your own row:** add yourself, with Calling `Executive Secretary`, Organization `Bishopric`,
   and **Bishopric** and **Ward council** ticked. Without a role box ticked, the leader page answers *Your leader
   role can't create opportunities yet* and you can't do the test in section 9.

6. Open the **Categories** tab and check the owners. Request kinds (`moving`, `christmas`,
   `other`) decide who reads each request folder:
   - **Moving help**: the Elders Quorum and Relief Society leaders (Owning organizations).
   - **Christmas help** and **Other help** are **Confidential**: only the bishopric (every
     Leaders row with **Bishopric** ticked) and anyone listed in **Coordinators** (emails,
     separated by commas). No other ward council member sees them unless you list them there.
   - **Christmas gift coordinators.** If a couple outside the bishopric is called to match
     Christmas requests with givers, type both their emails in the **christmas** row's
     **Coordinators** cell, for example
     `brother.example.gifts@example.test, sister.example.gifts@example.test` (Riverbend's
     invented Brother and Sister Example). They need no Leaders row. They get the Christmas
     folder and its request emails, and nothing else: not the Service Sheet, not Moving or
     Other.
   - **Notify** (the last column) says who gets the short *New … request* email. Blank means
     everyone who can open that kind's folder. Otherwise type names separated by commas:
     `Bishop` (the Leaders row whose Calling is `Bishop`) or email addresses. The **other** row
     starts as `Bishop`: Other requests email only the bishop, while the whole bishopric can
     still open the Other folder. To widen it later, clear the cell (the whole bishopric is
     emailed) or add addresses, e.g. `Bishop, brother.counselor@example.test`. Only people who
     can open the folder are ever emailed; Sync sharing lists anyone in Notify who can't.
     Leave **christmas** and **moving** blank.
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
   - the **Service Sheet**: the bishopric (Bishopric ticked) can edit; every other ward
     council member can view (editors can also change the script inside it, which can open
     every request sheet, so Bishopric stays ticked for the five bishopric callings only);
   - each **request folder**: the leaders who read that kind of request (they can edit the
     request sheet: Status, Assigned to, Leader note). Christmas and Other: the bishopric and
     that kind's Coordinators;
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
2. In that Drive folder, download each of the six files (right-click > **Download**):
   `serve.html`, `post.html`, `help.html`, `confirm.html`, `leader.html`, `hub-sections.html`.
   They already contain the ward name, the web app address and the contact.
3. Give them to the **hub owner**, who, in the hub's GitHub repository:
   1. clicks **Add file > Upload files**, drags in the five page files (not
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
| gpTenMinute / gpHourly / gpDaily last ran … more than … minutes ago, or has not run | That job has stopped (every 10 minutes, every hour, once a night). Open **Extensions > Apps Script > Executions** and look at its recent runs and errors. Then run **Install triggers** again in a window signed in only to the shared account. Right after installing, *has not run yet* is normal. |
| Any menu item: *works only for the account that owns this Service Sheet* | See the box at the start of section 2: use a private window signed in only to the shared account. |
| System Sheet missing / Request forms | Run **Set up**. |
| Email left today | Today's 100 emails are nearly used. Wait a day; queued mail goes out by itself. |
| Outbox failed | Open the System Sheet's Outbox tab and read the Error column (often a mistyped address). |
| Time zone | Do what the line says (Project Settings, or File > Settings in the Sheet). |

---

## 9. Test checklist

Use your own email for the volunteer steps. Tick each box as it passes.

- [ ] Open your leader link. The page says *Signed in as …*.
- [ ] **New opportunity**: organization, title, Sisters, one date tomorrow, role `Bring a meal`,
      how many `1`, private details `Test address`. **Save as draft**. It shows under My
      opportunities as **Draft** and is not on the serve page.
- [ ] **Edit** it and **Publish**. Copy the public link.
- [ ] Open the serve page (short link) **on a phone**. The opportunity shows with a fill bar.
- [ ] Open it, pick the role, type your name and email, **Sign up**. The page says
      *You're signed up* and the role shows **Filled ✓**.
- [ ] The confirmation email arrives with **no** private details and a **Cancel my sign-up**
      button.
- [ ] Click **Cancel my sign-up**, then the button on the page. It says it is cancelled.
- [ ] The leader who created the post gets a **Cancellation:** email.
- [ ] Sign up again for the same role.
- [ ] Get the reminder: in Settings set **reminder_hour** to the current hour, then in the
      Apps Script editor pick **gpHourly** in the function list at the top and click **Run**.
      The reminder email arrives **with the private details**. Set reminder_hour back.
- [ ] On the leader page, **Remove** your sign-up. You get the *Your sign-up was removed* email
      and the role opens again.
- [ ] In a **private (incognito) window**, open the Request Help page and submit each form
      (Moving, Christmas, Other) with test words.
- [ ] The right leaders each get a *New … request* email that names only the kind of request
      and the folder link, nothing from the form.
- [ ] Each request appears in its folder's sheet (Drive > Service Portal > Requests – …). Open
      the form itself (Drive > Service Portal > the form > **Responses** tab): it shows **0**.
      If a form says it is not accepting responses, open it and click **Publish**.
- [ ] Set a test request's **Status** to **Done**. Next day its **Closed on** date is filled.
- [ ] **Close vs Cancel**: Close stops new sign-ups but the event still happens and people
      still get their reminder; Cancel this opportunity means it isn't happening and everyone
      signed up is told. Sign up for the test post once more, then click **Cancel this
      opportunity** on the leader page (add a short note): you get the *Cancelled:* email with
      your note, and the post leaves the serve page (it moves to **Show past opportunities**).
- [ ] **Check health**: every line OK.
- [ ] Set the test requests to **Done** (they leave after 30 days).

---

## 10. Day to day, hand-off and updates

**Day to day.** Nothing weekly. Leaders work on the leader page; request leaders open their
Requests folder. Alert emails go to the bishop and the Executive Secretary when something
needs a person (at most one a day per job).

**When a calling changes.** Edit the Leaders tab (and Categories coordinators), then run
**Sync sharing**. Leader links follow the Leaders tab by themselves.

**Requests and privacy.** Requests are removed 30 days after they are marked Done or
Declined. On the 1st of each month the script starts a new request sheet in each folder,
carries over everything still open or recently closed, and permanently deletes the old file,
so old requests leave version history too. Opportunities and sign-ups are never rotated or
deleted. Remember the Gemini rule above.

**Handing off to the next Executive Secretary.** Everything lives on the shared account, so
nothing moves. Hand over the account (password and 2-step recovery), update Leaders and run
Sync sharing, open **Extensions > Apps Script > Triggers** (the clock icon) and check every
trigger's owner is the shared account, and walk the new Executive Secretary through Check
health. Add the portal to the ward's hand-off note.

**Updating the script.** When a new version is released: copy the new `Code.gs` (and
`appsscript.json` if it changed), paste over the old one as in section 2 (steps 10–14), save,
then **Deploy > Manage deployments > pencil > Version: New version > Deploy**. If the pages
changed too, run **Make hub files** and give the hub owner the new files.

**What phase 2 adds.** Confirm-your-address and first-time approval with a record of who
approved, My sign-ups for volunteers, signing up a child, category coordinators and fill
warnings, Needs help soon, over-limit sign-ups with withdraw, 48-hour approval nudges, and a
daily health email. Until then, leaders glance at each sign-up list and remove anyone they
don't recognize before the reminder (which carries the private details) goes out the day
before.
