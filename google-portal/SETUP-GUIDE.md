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
  first signed up for (or the bishopric) sees them under **Waiting for approval** (or on the
  post itself, on the person's line), checks the ward directory, and clicks **Approve** or
  **Decline**. The leader's name and the time are recorded.
- **Approved volunteers and leaders** count at once. Their confirmation email carries the
  private details (an address, a gate code), a cancel button and a link to **My sign-ups**.
- **The page never says which of these happened.** Every sign-up answers *Thanks. Check your
  email to finish or see your sign-up.* so nobody can learn anything about an address by typing
  it. The email tells the real owner.

> **If you already set up before 2.4** (before you could choose who approves first-time
> volunteers, or pre-approve members), do this once, signed in to the shared account in a
> private window:
> 1. Paste the new `Code.gs` over the old one (section 2, steps 12–14) and Save.
> 2. **Deploy > Manage deployments**, select the deployment, click the **pencil**, set
>    **Version** to **New version**, click **Deploy** (skip if you haven't deployed yet).
> 3. Run **Service Portal > Set up**. It adds an **Approvers** column (last) to the Categories
>    tab, a **default_approvers** row to Settings, and a **Preapproved** tab to the private
>    System Sheet. All start blank, so approval emails keep going where they go today.
> 4. Choose who approves (section 3, step 6, *Approvers*): type emails in **Approvers** on the
>    Opportunity rows you want, and/or in **default_approvers** in Settings. Give each of those
>    people a **Leaders** row (no role box needed) and send them their leader link (section 7).
> 5. Run **Service Portal > Check health**: no line should say *Approver … is not on the
>    Leaders tab*.
> 6. Optional: pre-approve members you already know (section 3, *The Pre-approve list*). This
>    needs the new leader page (the hub owner's next `leader.html`); until then, skip it.
>
> If your ward is also before 2.3, do that box too (below).

> **If you already set up before 2.3** (before the pages and forms could take the ward's look),
> do this once, signed in to the shared account in a private window:
> 1. Paste the new `Code.gs` over the old one (section 2, steps 12–14) and Save.
> 2. **Deploy > Manage deployments**, select the deployment, click the **pencil**, set
>    **Version** to **New version**, click **Deploy** (skip if you haven't deployed yet).
> 3. Run **Service Portal > Set up**. It adds five Settings rows, all blank: **theme_background_url**,
>    **theme_accent**, **theme_font**, **theme_heading_font** and **form_template_url**. Blank
>    keeps today's look.
> 4. Fill them in as in section 6, step 8 (*The ward's look*), and theme the request forms you
>    already have by hand (section 6, step 9).
> 5. Run **Service Portal > Check health**: no line about theme_ or form_template_url should say
>    PROBLEM.
> 6. Only if you already gave the hub owner the hub files: run **Make hub files** and give them
>    all the new page files (section 6, steps 1–3). The hub's pages carry the look only once they
>    are replaced.
>
> If your ward is also before 2.2, do that box too (below).

> **If you already set up before 2.2** (before a request could be turned into an opportunity),
> do this once, signed in to the shared account in a private window:
> 1. Paste the new `Code.gs` over the old one (section 2, steps 12–14) and Save.
> 2. **Deploy > Manage deployments**, select the deployment, click the **pencil**, set
>    **Version** to **New version**, click **Deploy** (skip if you haven't deployed yet).
> 3. Run **Service Portal > Set up**. It adds the **Opportunity category** column to the
>    Categories tab (the **moving** row gets `moving-help` if it was blank) and the **Make
>    opportunity**, **Copy contact to private details** and **Posted as** columns to every
>    request sheet.
> 4. In **Categories**, fill in **Opportunity category** for each request kind that may be
>    turned into an opportunity (section 3, step 6), e.g. a **lend-a-hand** request row →
>    `lend-a-hand-service`. If that Opportunity row isn't there yet, add it first: Id
>    `lend-a-hand-service`, Name `Lend a hand`, Kind `Opportunity`, Owning organizations
>    `Relief Society`, Default audiences `Sisters`. Leave Christmas, Other and Christmas giving
>    offers blank.
> 5. Only if you already gave the hub owner the hub files: run **Make hub files** and give them
>    the new `leader.html` (section 6, steps 1–3). It shows the *From a request* label.
> 6. Send the leaders the new LEADER-GUIDE (*Turning a request into an opportunity*).
>
> If your ward is also before 2.1, do that box too (below).

> **If you already set up before 2.1** (before the bishopric could open every request folder,
> Moving included), do this once, signed in to the shared account in a private window:
> 1. Paste the new `Code.gs` over the old one (section 2, steps 12–14) and Save.
> 2. **Deploy > Manage deployments**, select the deployment, click the **pencil**, set
>    **Version** to **New version**, click **Deploy** (skip if you haven't deployed yet).
> 3. Run **Service Portal > Set up**. It sets the **moving** row's **Notify** to
>    `Owners, Coordinators` (only if that cell was blank), so Moving emails keep going to the
>    Elders Quorum and Relief Society leaders and the coordinators, not the whole bishopric. It
>    also updates the request forms' wording (*Only the bishopric, the Elders Quorum and Relief
>    Society leaders and the people they name see this request.*).
> 4. Run **Service Portal > Sync sharing**. The whole bishopric now gets the Moving folder.
>
> If your ward is also before 1.1 or still on phase 1, do the box below or section 11 first;
> their Set up and Sync sharing steps cover these.

> **If you set up before 1.1** (before the whole bishopric could edit the Service Sheet and
> read the Christmas and Other requests), do this once, signed in to the shared account in a
> private window. **Going to phase 2 at the same time?** Follow section 11 instead: it pastes
> the script and runs Set up in the safe order and tells you which of these steps to add.
> 1. Copy the new `Code.gs` and paste it over the old one: section 2, steps 12–14 (open it
>    from the Service Sheet with **Extensions > Apps Script**). Save.
> 2. Only if you already deployed the web app: **Deploy > Manage deployments**, select the
>    deployment, click the **pencil**, set **Version** to **New version**, click **Deploy**.
>    (If you haven't deployed yet, skip this; section 4 does it.)
> 3. Reload the Service Sheet, then in the **Leaders** tab tick **Bishopric** for the bishop,
>    both counselors, the Executive Secretary and the Ward Clerk (add a row for anyone missing),
>    and for nobody else.
> 4. Run **Service Portal > Set up**. It keeps everything you typed and makes whatever is still
>    missing (this is also section 3, step 7). It adds three Categories columns: **Notify** (the
>    **other** row gets `Bishop`), **On Help page** (ticked for every row you had) and **On
>    Serve page** (unticked). It adds a new row, **Christmas giving offers**, and makes its
>    form, folder and sheet. It also updates the wording of request forms it made before
>    (*Updated the wording of: …*), and ends by listing the giving form's link.
> 5. In the **Categories** tab, type the Christmas gift coordinators' emails in
>    **Coordinators** on both the **christmas** and **christmas-giving** rows, and decide whether
>    to tick **On Serve page** on the christmas-giving row (section 3, step 6).
> 6. Only if you had already run Install triggers: run **Service Portal > Install triggers**
>    again (section 5, step 1), so the new giving form gets its trigger. Otherwise skip this.
> 7. Only if you had already run Sync sharing: run **Service Portal > Sync sharing** (section
>    5, step 2), and make the giving short link (section 6, step 7). If you hadn't reached those
>    sections yet, skip this; they come up in order.
> 8. Only if you already gave the hub owner the hub files: run **Make hub files** and give them
>    the new `serve.html` (section 6, steps 1–3). The giving card needs it.
> 9. Carry on from where you stopped.

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
   | web_app_url | Leave blank for now (step 4). Later: the **Web app URL** from the Deploy box, ending in `/exec` — not a form link (docs.google.com/forms/…) | |
   | preview_image_url | Optional picture for link previews | (blank) |
   | serve_short_link | Leave blank for now (step 6) | |
   | help_short_link | Leave blank for now (step 6) | |
   | reminder_hour | Hour reminders go out the day before (0–23) | `18` |
   | default_cancel_cutoff_hours | Hours before a role when a cancel makes you "short" | `24` |
   | email_reserve | Emails kept back each day for reminders and leader notices | `30` |
   | signup_limit_per_day | Most sign-up attempts accepted in one day, all posts together (refused and repeated ones count too) | `80` |
   | confirm_limit_per_day | Most *Please confirm your email* messages in one day (first-timers) | `20` |
   | organizations | Organizations, separated by commas | (keep the list given) |
   | discord | Leave `off` | `off` |
   | theme_background_url | Optional background picture for every portal page (section 6, step 8) | `https://example.github.io/rb1links/background.png` |
   | theme_accent | Optional accent colour, as `#` and six letters or digits | `#2f5d50` |
   | theme_font | Optional Google Fonts family name for the pages | `Lora` |
   | theme_heading_font | Optional Google Fonts name for headings (blank: the same as theme_font) | (blank) |
   | form_template_url | Optional edit link of the ward's branded Google Form (section 6, step 8) | (blank for now) |
   | default_approvers | Optional emails, separated by commas: who gets the *Waiting for approval* emails for every opportunity category whose **Approvers** cell is blank (step 6). Blank keeps the usual rule | `brother.counselor@example.test` |
   | test_mail_only | **Test mode**: leave empty, except while testing (section 9, *Test mode*) | (blank) |

5. Open the **Leaders** tab. One row per leader:

   | Column | What to type |
   |---|---|
   | Name | e.g. `Sister Example` |
   | Email | The address their leader link goes to |
   | Calling | e.g. `Relief Society President`. The bishop must be exactly `Bishop`; the Executive Secretary exactly `Executive Secretary` (they get the alert emails) |
   | Organization | Pick from the list |
   | Bishopric | Tick for the bishop, both counselors, the Executive Secretary and the Ward Clerk, and nobody else. They edit the Service Sheet, read the Christmas and Other requests, and on the leader page see and edit every opportunity, approve any volunteer, and can undo a decline or revoke an approval (see section 1, step 5) |
   | Ward council | Tick for ward council members: they see every opportunity and its names, edit their own organization's, approve volunteers whose first sign-up was in their organization, and see **Needs help soon** |
   | Org editor | Tick for leaders who make opportunities for their organization (they see only their own organization's names) and approve its first-timers |
   | Coordinator | Tick for someone who runs a kind of opportunity (a meal coordinator, a building specialist). The tick is a reminder only: what they may do comes from the **Coordinators** column of an opportunity row in the Categories tab (step 6); an opportunity coordinator needs this Leaders row for their leader link. Coordinators don't approve volunteers |
   | Send leader link | Leave for now (step 7) |
   | Link sent | The script fills this |

   **Your own row:** add yourself, with Calling `Executive Secretary`, Organization `Bishopric`,
   and **Bishopric** and **Ward council** ticked. Without a role box ticked, the leader page answers *Your leader
   role can't create opportunities yet* and you can't do the test in section 9.

6. Open the **Categories** tab and check the owners. Request kinds (`moving`, `christmas`,
   `other`, `christmas-giving`) decide who reads each request folder. The whole bishopric
   (every Leaders row with **Bishopric** ticked) can open **every** request folder; the rows
   decide who else can:
   - **Moving help**: the Elders Quorum and Relief Society leaders (Owning organizations) and
     anyone in its **Coordinators**. The same goes for any request kind you add later.
   - **Christmas help** and **Other help** are **Confidential**: only the bishopric (every
     Leaders row with **Bishopric** ticked) and anyone listed in **Coordinators** (emails,
     separated by commas). No other ward council member sees them unless you list them there.
   - **Christmas giving offers** (`christmas-giving`) is the form where families offer gifts.
     It is Confidential: only the bishopric and its Coordinators see the answers. It is never on
     the Request Help page. You choose how people find it with its **On Serve page** box (the
     last column; if it isn't there, run Set up, which adds it):
     - **Ticked**: the Service Opportunities page shows a small *🎁 Offer to give at Christmas*
       card at the top, linking to the form. Once the hub has the current `serve.html` (from
       **Make hub files**, section 6), it appears (or goes) within a minute; no Set up needed.
     - **Unticked** (the default): it is on no public page; share its link privately (section
       6, step 7).
     On Serve page means nothing on any other row.
   - **Christmas gift coordinators.** If a couple outside the bishopric is called to match
     Christmas requests with givers, type both their emails in **Coordinators** on **both** the
     **christmas** and the **christmas-giving** rows, for example
     `brother.example.gifts@example.test, sister.example.gifts@example.test` (Riverbend's
     invented Brother and Sister Example). They need no Leaders row. They get those two folders
     and their emails, and nothing else: not the Service Sheet, not Moving or Other.
   - **Notify** says who gets the short *New … request* email. Blank means everyone who can
     open that kind's folder, which now includes the whole bishopric. Otherwise type names
     separated by commas: `Bishop` (the Leaders row whose Calling is `Bishop`), `Owners` (the
     owning organizations' leaders with **Org editor** or **Ward council** ticked),
     `Coordinators` (the people in that row's Coordinators), or email addresses. The rows start
     like this:
     - **other**: `Bishop`. Other requests email only the bishop, while the whole bishopric can
       still open the Other folder. To widen it later, clear the cell (the whole bishopric is
       emailed) or add addresses, e.g. `Bishop, brother.counselor@example.test`.
     - **christmas-giving**: `Coordinators`. Offers email the Christmas gift coordinators. Until
       you type their emails, the bishopric gets them.
     - **moving**: `Owners, Coordinators`. Moving requests email the Elders Quorum and
       Relief Society leaders and the coordinators, not the whole bishopric (who can still open
       the folder).
     - **christmas**: blank (everyone who can open the folder: the bishopric and the Christmas
       gift coordinators).
     A request kind you add later starts blank, so its emails go to the whole bishopric too;
     type `Owners, Coordinators` if you don't want that.
     Only people who can open the folder are ever emailed; Sync sharing lists anyone in Notify
     who can't.
   - **On Help page**: ticked request kinds show on the public Request Help page. If you add a
     new request kind later, tick it (unticked kinds are left off). After changing On Help
     page, run Set up (the Help page can otherwise take up to 6 hours to change).
   - **Opportunity category** (request rows): the **Id** of the opportunity category a request
     of this kind can be turned into, as a **Draft** a leader finishes and publishes (see the
     LEADER-GUIDE, *Turning a request into an opportunity*). The **moving** row starts as
     `moving-help`. A ward with a **Lend a hand** request kind (Id `lend-a-hand`, owned by the
     Relief Society) adds an opportunity row for it, e.g. Id `lend-a-hand-service`, Name
     `Lend a hand`, Kind `Opportunity`, Owning organizations `Relief Society`, Default audiences
     `Sisters`, and types `lend-a-hand-service` here. Leave it blank where a request must never
     become an opportunity: **christmas**, **other** and **christmas-giving** start blank.
   The **Opportunity** rows (Meals, Moving, Service project, …) are the categories leaders pick
   when they make an opportunity, and each shows its **Icon** on the Service Opportunities page.
   For each one you may fill in:

   | Column | What it does | Example (Meals) |
   |---|---|---|
   | Owning organizations | The organizations its opportunities belong to. Without coordinators, those organizations' leaders (Org editor or Ward council ticked) make its opportunities; leave it blank and any leader who can make opportunities may | `Relief Society` |
   | Default audiences | Ticked for a new opportunity in it | `Sisters` |
   | Coordinators | Emails, separated by commas. Each person must also have a row in **Leaders** (that is where their leader link comes from). Once a category has coordinators it is theirs: only they, the bishopric, and the ward council when the next column is ticked make and edit its opportunities (anyone still edits what they made themselves). Coordinators see and edit every opportunity in it, whatever its organization (any organization when it has no owner), and get its *Fully filled*, *Still short* and cancellation emails | `sister.coordinator@example.test` |
   | Any ward council may create | Tick to let every ward council member make opportunities in it | (blank) |
   | Warn hours | How many hours before a date to warn if a role is still short. Blank means 48; `0` turns warnings off | `72` |
   | Also warn | More emails for that warning, separated by commas | `brother.clerk@example.test` |
   | Approvers | Emails, separated by commas: who gets the *Waiting for approval* email and the 48-hour reminder when someone's first sign-up is in this category, and who may approve them. Blank uses **default_approvers** (Settings); if that is blank too, the usual rule: the leaders of the opportunity's organization and the bishopric. Each person needs a row in **Leaders** (no role box needed); anyone who isn't there is skipped, and Check health names them. The bishopric can always approve, but isn't emailed when a list is set | `sister.example@example.test` |

   **Approvers see the opportunities they approve for.** A listed approver who doesn't otherwise
   lead that category sees its opportunities on the leader page, with the names and an
   **Approve** / **Decline** line for each first-timer, but can't edit or cancel them and sees no
   email addresses there.

   **The Pre-approve list.** The bishopric and every approver can paste members' email
   addresses on the leader page (*Pre-approve*), e.g. from the ward's own email list, with the
   bishop's permission. When one of those addresses signs up, it counts at once: no *Please
   confirm your email*, no waiting for approval, and the Volunteers tab records *Decided by:
   Pre-approve list*. Someone who was declined or revoked is never approved this way. The
   addresses are **never stored**: the private System Sheet's **Preapproved** tab keeps only a
   scrambled fingerprint of each (a salted hash), who added it and when, so nobody can read the
   list back. To take someone off, clear the whole list and paste it again without them.

   Do not change the **Id** column.
7. Click **Service Portal > Set up** again. It makes the **Service Portal** folder in Drive,
   moves the Service Sheet into it, makes the private **System Sheet**, and makes one request
   form, folder and month sheet for each request kind. It ends with *Set up is done.* and the
   link to the private **Christmas giving offers** form (keep it for section 6, step 7). If it
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
8. Copy the **Web app URL** from the Deploy box, ending in `/exec` — not a form link (docs.google.com/forms/…). Click **Done**.
9. In the Service Sheet, paste it into Settings **web_app_url**.
10. Check it: open a new browser tab and go to that same address (the **Web app URL** from the Deploy box, ending in `/exec` — not a form link (docs.google.com/forms/…)) with `?api=ping` added at the end, for example
    `https://script.google.com/macros/s/…/exec?api=ping`. You should see
    `{"ok":true,"at":"…","build":"…"}`.

**Updating later without changing the address** (when you paste a new `Code.gs`): **Deploy >
Manage deployments**, select the deployment, click the **pencil** (Edit), set **Version** to
**New version**, click **Deploy**. Never use *New deployment* again: that makes a new address
and the old links stop working.

---

## 5. Install triggers, then Sync sharing

1. Click **Service Portal > Install triggers**. It says *Triggers installed: every 10 minutes,
   hourly, daily at 2 am, and 4 request form trigger(s).*
2. Click **Service Portal > Sync sharing**. It shares, with Google's share emails turned off:
   - the **Service Sheet**: the bishopric (Bishopric ticked) can edit; every other ward
     council member can view (editors can also change the script inside it, which can open
     every request sheet, so Bishopric stays ticked for the five bishopric callings only);
   - each **request folder**: the whole bishopric, plus the leaders who read that kind of
     request (they can edit the request sheet: Status, Assigned to, Leader note). Moving (and any
     kind you add): also its owning organizations' leaders and its Coordinators. Christmas,
     Other and Christmas giving offers: only the bishopric and that kind's Coordinators;
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
7. **The Christmas giving form.** Either tick **On Serve page** on the **christmas-giving** row
   (section 3, step 6) so the Service Opportunities page shows an *Offer to give at Christmas*
   card, or leave it unticked and share the link privately. The card links straight to the
   form itself; it does not use any short link.
   - **The giving short link is only for sharing by hand.** Find the form's link in Set up's
     message (it lists *Christmas giving offers (not on any public page; share privately): …*
     or *(on the Service Opportunities page; you can also share the link): …*), or in Drive >
     **Service Portal** > the **Christmas giving offers** form > **Send** > the **link** icon >
     **Copy**. On **app.zippa.run** make `<prefix>Give` pointing at it (Riverbend:
     `zippa.run/rb1Give`).
   - **Nothing goes into Settings for it.** There is no Settings row for the giving link; don't
     paste it into serve_short_link or help_short_link.
   - Share `<prefix>Give` only in a ward email with addresses in **Bcc**, or in the bulletin.
     Don't put it on the hub.

8. **The ward's look.** The portal's pages can wear the same background, colour and font as the
   hub, and new request forms can copy the look of the ward's branded Google Form. Each of these
   Settings rows is optional; blank keeps the standard look.
   - **theme_background_url**: the full `https://` address of the background picture. For a
     hub on GitHub Pages, use the full address of the hub's own background image: open the hub,
     right-click its background (or ask the hub owner for the file name) and put the file name
     after the hub address, e.g. `https://example.github.io/rb1links/background.png`. Text sits
     on a light panel so it stays readable on any picture; on phones the picture scrolls.
   - **theme_accent**: the hub's main colour as `#` and six letters or digits, e.g. `#2f5d50`.
     It colours the heading lines and fill bars; a dark enough colour also colours links and
     buttons (a light one would be hard to read, so it is left off them).
   - **theme_font** and **theme_heading_font**: a family name from fonts.google.com, e.g.
     `Lora` (letters, digits and spaces only).
   - **form_template_url**: open the ward's branded Google Form in the Forms editor (signed in to
     the shared account, or make a copy of it into the shared account's Drive first: in the
     form, **⋮ > Make a copy**), and paste the address from the browser's address bar. It looks
     like `https://docs.google.com/forms/d/…/edit`. **Not** the link you send people (that
     one has `/forms/d/e/…/viewform` and is refused). From then on Set up makes each **new**
     request form as a copy of it, so it keeps the header picture, colours and fonts, and then
     puts in the portal's own questions and wording.
   - Run **Check health**: a value it can't use shows as a **PROBLEM** line naming the row, and
     the pages simply leave that part as standard.
   - Run **Make hub files** and give the hub owner the new page files; the script's own pages
     (`…/exec?page=…`) show the look at once.
9. **Theme the request forms you already have, by hand.** Set up never re-makes a form that
   exists (a new form would get a new address, breaking short links such as `<prefix>Give` and
   needing new triggers). For each form in Drive > **Service Portal** (Moving help, Christmas
   help, Other help, Christmas giving offers, and any you added):
   1. In another tab, open the **branded** form in the editor and click the **palette** icon
      (*Customize theme*) at the top. Note its **Header** picture, **Colour** and the **Font
      style** of the header, questions and text.
   2. Open the portal's form, click the **palette** icon, and set the same: **Header > Choose
      image** (upload the same picture, or pick it from your Drive or Photos), **Colour**, and
      **Font style** for Header, Question and Text. Close the panel; it saves by itself.
   The form's link stays the same.

**If there is no hub, or the hub test in Check health fails:** skip this step, leave
**hub_url** blank, and point the two short links at the web app's own pages instead:
`<web_app_url>?page=serve` and `<web_app_url>?page=help` (web_app_url being the **Web app URL** from the Deploy box, ending in `/exec` — not a form link (docs.google.com/forms/…)). These pages work the same but show
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
| Web app does not answer | Step 4: Execute as **Me**, access **Anyone**; web_app_url must be the **Web app URL** from the Deploy box, ending in `/exec` — not a form link (docs.google.com/forms/…). |
| The web app is an older version | The script was saved but the web app still runs an earlier version: **Deploy > Manage deployments**, select it, click the **pencil**, **Version: New version**, **Deploy**. (The nightly health email says this too.) |
| Hub serve.html not reachable | The hub owner hasn't uploaded the pages yet, or hub_url is wrong (it must be the folder that holds `index.html`). Or use the no-hub way in step 6. |
| Triggers | Run **Install triggers** (signed in as the shared account). |
| Triggers belong to … (this account) | Always OK: it names the account whose triggers are listed and each one's kind (CLOCK for the timed jobs, FORMS for the request forms). Google only lists the triggers of the account running Check health, so a trigger someone made while signed in as themselves never shows here and looks missing: run **Install triggers** in a window signed in only to the shared account. |
| gpTenMinute / gpHourly / gpDaily last ran … more than … minutes ago, or has not run | That job has stopped (every 10 minutes, every hour, once a night). Open **Extensions > Apps Script > Executions** and look at its recent runs and errors. Then run **Install triggers** again in a window signed in only to the shared account. Right after installing, *has not run yet* is normal. |
| Any menu item: *works only for the account that owns this Service Sheet* | See the box at the start of section 2: use a private window signed in only to the shared account. |
| System Sheet missing / Request forms | Run **Set up**. |
| … Notify says Bishop, but no Leaders row has Calling Bishop | Type `Bishop` in the bishop's **Calling** in Leaders, or change that row's **Notify** in Categories. |
| Email left today | Today's 100 emails are nearly used. Wait a day; queued mail goes out by itself. |
| Outbox failed | Open the System Sheet's Outbox tab and read the Error column (often a mistyped address). |
| Time zone | Do what the line says (Project Settings, or File > Settings in the Sheet). |
| theme_background_url / theme_accent / theme_font / theme_heading_font … ignored | Fix the value in Settings as the line says (section 6, step 8), or empty the cell. |
| form_template_url … | Paste the branded form's **edit** link from the form editor's address bar (section 6, step 8), or empty the cell. |
| Test mode: … / test_mail_only … | Test mode is on (section 9). Fine while testing; empty **test_mail_only** before going live. A line about an entry that isn't an address: fix or remove that entry. |

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
box as it passes. To run a timed job now instead of waiting, signed in to the **shared
account** (in a private window, on a computer), open **Extensions > Apps Script**, pick the job
(**gpHourly**, **gpTenMinute** or **gpDaily**) in the function list at the top and click
**Run**. Never run it from your own account: a job run by anyone but the Service Sheet's owner
does nothing.

**Turn test mode on first** (see *Test mode* below) so the test emails reach only you, not the
bishopric, coordinators or leaders. Turn it off again when you finish.

### Test mode (send all email only to yourself)

While you test, the portal would email real people: the bishopric (*Waiting for approval*,
request notices), coordinators, leaders and the administrators. Test mode stops that.

**Turn it on.** Signed in to the shared account, open the Service Sheet > **Settings** tab, find
the row **test_mail_only**, and type into its **Value** cell the addresses that may still get
email, separated by commas, **yours first**. For example:
`brother.example@example.test, sister.example@example.test, test.b@example.test, test.b+c@example.test, test.b+d@example.test`.

- Each address must be written out in full. Gmail's `+` variants (`name+c@…`) count as
  different addresses, so list each one you use; there is no wildcard.
- Capital letters and spaces don't matter.

**What it does.** Every email the portal sends (sign-ups, approvals, reminders, request notices,
leader links, alerts, the daily health email, and anything waiting in the Outbox):

- to an address on the list: goes to that address as normal;
- to anyone else: goes to the **first** address on the list instead, with
  `[TEST for <their address>]` in front of the subject, so you can see who it would have gone to.
  It is still one email per person, as it would be for real;
- if an entry on the list isn't an email address, **every** email goes to the first valid
  address with that prefix (even those to listed addresses), until you fix it;
- if no entry is a valid address, **nothing** is sent at all (each email is written in the
  System Sheet's Log as *test mode: not sent*); email already waiting in the Outbox from before
  stays there, unsent, until you fix the list.

An email that has to wait in the Outbox (when the day's email allowance runs low) is stored
already addressed to you with the *[TEST for …]* subject, so it can't reach the real person even
if you turn test mode off before it goes. The Log shows the real recipient and *redirected to
test address*. Nothing else changes: who can open which folder, who would be told, approvals and
limits all work as for real.

**Don't forward a *[TEST for …]* email.** It still holds the real recipient's working links
(a leader link, a cancel link): whoever gets it can use them.

**Check it.** Run **Service Portal > Check health**: it shows *PROBLEM Test mode: email to anyone
not in test_mail_only goes to <your address>*. That line (also in the daily health email) is
there all the time test mode is on, so you can't forget it.

**Turn it off.**
1. Run **Service Portal > Check health** and find the *Outbox* line. It should say **0
   waiting**. If not, run **gpTenMinute** (signed in to the shared account: Extensions > Apps
   Script, pick **gpTenMinute**, **Run**) and check again.
2. Settings > **test_mail_only**: delete everything in its Value cell, so it is empty.
3. Run **Check health**: the Test mode line is gone, and email goes to everyone as normal.

Do this before the ward starts using the portal.

**A. Make a test opportunity**

- [ ] Open your leader link. The page says *Signed in as …* and shows the tabs **My
      opportunities**, **Waiting for approval**, **Needs help soon** (ward council and
      bishopric) and **New opportunity** (and **Volunteers** for bishopric members).
- [ ] **New opportunity**: Category **Service project** (Category comes first; it has no
      owning organization, so any leader who makes opportunities may use it), tick **Sisters**,
      a title, two dates (**tomorrow** and **in three days**), each with role `Bring a meal`,
      how many `1`, and private details `Test address`. **Save as draft**. It shows under My
      opportunities as **Draft** and is not on the serve page.
- [ ] **Edit** it and **Publish**. Copy the public link.
- [ ] Open the serve page (short link) **on a phone**: the card shows the Service project icon 🛠️ above
      its title and a fill bar. A post for **one** audience shows under that audience (on a
      computer **Brothers** and **Sisters** sit side by side; on the phone they are stacked). A
      post for **more than one** audience shows once, at the top under **Everyone**, with a line
      such as *Brothers · Sisters* under its title.

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
      *first signed up for* your test post. Click **Approve** (or click it on the person's line
      on the post under My opportunities: the same thing). It says *Approved. 1 sign-up
      now counts.* In the Service Sheet's **Volunteers** tab, A's row says **Approved**, with
      your name in **Decided by** and the time in **Decided at**.
- [ ] Address A gets *You're approved to serve* and *Thank you: … already has the people it
      needs* (A counted after the role filled), with the private details, a **Withdraw my
      offer** button and a **See all your sign-ups** link. The public page shows
      **Filled ✓ · 2 of 1**; the leader page shows **2 of 1** and the tag *Over the number*.
- [ ] Click **Withdraw my offer**, then the button on the page: *Your offer is withdrawn.*
      Nobody gets an email (the role is still full). (Once the role has started, the withdraw
      link says it has expired.)
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
      sign up, but don't click the confirm email yet.
- [ ] Open `me.html` with nothing after it and ask for B's link (**Email me my link**). B's My
      sign-ups shows the sign-up as *Waiting: please click the link in your confirm email* and a
      **Send the confirm email again** button: click it, a new confirm email arrives, and the
      first one no longer works. (Signing up again for the same role does the same.) Now click
      **Confirm my address** in the newest email.
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
      page shows *Ana (signed up by …)*, and every email goes to you. Sign up two more
      children for the same role: a parent may sign up any number of children for one role.
- [ ] Categories tab: put your email in **Meals**' **Coordinators**, **Warn hours** `48`,
      and test address A in **Also warn**. Reload the leader page: **New opportunity** now
      offers **Meals** (for Relief Society). Make a Meals opportunity for tomorrow, publish it
      and leave it short. Run **gpHourly**: you and A each get *Still short: …* listing the
      short roles. Run it again: no second one. (Meals is now the coordinators': the Relief
      Society's leaders can't make or edit Meals opportunities they didn't make.)
- [ ] Fill every role of a new Meals opportunity: its creator, its organization's editors and
      you (as coordinator) get *Fully filled: …* once (one email each). Cancel one of those
      sign-ups: you get the *Cancellation:* email too.
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
- [ ] Open the **Christmas giving offers** form through its private link (section 6, step 7)
      and submit a test offer. It lands in the **Requests – Christmas giving offers** sheet with
      **Offer** filled; only the Christmas gift coordinators get the email (or the bishopric, if
      no coordinators are typed yet); and it is **not** on the Request Help page.
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
run **Set up** straight away (it adds any new columns, and the timed jobs use the new script as
soon as it is saved), then **Deploy > Manage deployments > pencil > Version: New version >
Deploy**. If the pages changed too, run **Make hub files** and give the hub owner the new files;
until they are uploaded, empty **hub_url** in Settings so emails use the script's own pages
(section 11 shows how, for the phase 2 upgrade).

---

## 11. Upgrading from phase 1

Do this once, in one sitting, in a browser window signed in only to the shared account. Nothing
you or the leaders made is lost: posts, sign-ups, requests and leader links all carry on. Keep
to this order: the timed jobs start using the new script the moment you save it, and the
public pages keep using the old one until step 4.

1. **Point emails at the script's own pages for now.** In Settings, copy the **hub_url** value
   somewhere safe (a note), then **empty** that cell. Until the hub owner has uploaded the new
   pages (step 7), emails then link to the script's own pages (`…/exec?page=confirm`,
   `?page=me`, …), which are always the current version. The old hub pages would show a
   *Confirm my address* link as *already cancelled* and have no My sign-ups page.
2. **Paste the new script.** Copy the new **`Code.gs`** (and **`appsscript.json`**) from
   `google-portal/dist/` and paste each over the old one, as in section 2 steps 10–14. Save.
3. **Run Set up right away** (Service Portal > Set up). It adds what phase 2 needs by itself:
   **Email confirmed at** in Volunteers, the **Needs help soon** columns, the System Sheet's
   **Counters** tab, and **confirm_limit_per_day** in Settings. It marks everyone who already
   has a **Confirmed** sign-up from phase 1 as **Approved** (Decided by *Phase 1 sign-up*), so
   people you already accepted don't wait for approval and their reminders keep the private
   details. If it asks to authorize again, do it as in section 3 step 2. (If a timed job runs
   before you get here, it makes the same changes itself first, so nothing goes out wrong.)
   **If your ward set up before 1.1**, this Set up also makes the 1.1 changes (the **Notify**
   and **On Help page** columns, the **Christmas giving offers** row and its private form) and
   lists the giving form's link; a ward already on 1.1 just sees *Request forms: already made*.
   It also adds the 1.1.1 **On Serve page** column (left unticked). A ward that already ticked
   it on the christmas-giving row keeps its tick.
4. **New version of the web app.** **Deploy > Manage deployments**, select the deployment,
   click the **pencil**, set **Version** to **New version**, click **Deploy**. (Not *New
   deployment*: that changes the address and breaks every link.)
5. **Install triggers again** (Service Portal > Install triggers), then **run Set up once
   more**: it approves anyone who signed up through the old page in the minutes between steps 2
   and 4.
6. **Categories and coordinators.** Fill in **Coordinators**, **Warn hours** and **Also warn**
   for the opportunity categories as in section 3 step 6, add a **Leaders** row for each
   coordinator, tick **Send leader link** for them, then run **Sync sharing**. (Coordinators
   of the request kinds, such as the Christmas gift coordinators, need no Leaders row and
   aren't changed by phase 2; **Notify** still applies only to request kinds.) **If your ward
   set up before 1.1**, first do steps 3 and 5 of the *If you set up before 1.1* box at the top
   (tick **Bishopric** for the whole bishopric; the Christmas gift coordinators), and after Sync
   sharing make the giving short link (section 6, step 7). Remember that a
   category with coordinators is theirs: from then on only they, the bishopric (and the ward
   council, if *Any ward council may create* is ticked) make and edit its opportunities.
7. **New hub pages.** Run **Make hub files** and give the hub owner all six page files,
   **including the new `me.html`** (the My sign-ups page); the other five changed too, so they
   replace the old ones. The new `serve.html` draws the Brothers and Sisters side by side, the
   category icons and, when **On Serve page** is ticked on the christmas-giving row (section 3,
   step 6), the *🎁 Offer to give at Christmas* card at the top. To show that card, tick the box
   now (or later; the page picks it up within a minute). **Once the hub owner says they are uploaded**, put the **hub_url** you
   saved in step 1 back into Settings and run **Check health** (the *Hub serve.html* line must
   be OK). Until then, members simply see the script's own pages, which work the same.
8. **Tell the leaders.** Send them the new LEADER-GUIDE: first-timers now wait under **Waiting
   for approval**, and there is no more *Send details* button (approved volunteers get the
   details in their confirmation).
9. **If signup_limit_per_day still says 40, change it to 80** (Settings tab): phase 2 counts every attempt.
10. **Check health**, then go through the test checklist in section 9.
