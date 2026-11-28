# Google-only portal: meals for new parents and members in hardship (design)

Status: APPROVED to build, 2026-11-28. Sam answered every question in chat the same day.
Coordinator: session `local_a8b6bffb-9340-4139-aeaa-52d78581c2e0`. Builds on
`2026-11-24-google-only-alternative-design.md` (decisions 1–27). This is decision 28.

## 1. Why

Meals for new mothers are the main reason the ward built the portal. Today the Relief Society's
service committee (three meal coordinators) runs them by hand:
- a text message to the parents weeks before the due date;
- a spreadsheet row per family;
- a Meal Train page made after the birth;
- the link sent first to the parents, then to the mother's ministering sisters, then to the ward
  list (Gmail Bcc), Discord and the portal.

Mail Train tells the coordinators and the parents about every sign-up and cancellation. Meals
after surgery or illness follow the same steps and need the same details.

## 2. The request form (one form, two doors)

- **One Request category, Meals,** with one Google Form, made from `form_template_url` like
  every new request form. Two tiles on the Help page open the same form with the first question
  already answered:
  - **Meals for New Moms & Dads**
  - **Meals for Members in Hardship**
- **First question,** "What are the meals for?": A new baby / A member in hardship. The baby
  questions sit in a form section shown only on the new-baby path (Google Forms section
  branching).
- **The form's opening:** the service committee's own warm wording, adapted from their text
  message. Congratulations, or a kind word for hardship. Meals usually start at least 3 days
  after baby arrives, and best guesses are fine.
- **The questions:**
  1. Mom's name, phone, email; Dad's name, phone, email (hardship path: "Your name, phone,
     email" plus an optional second adult)
  2. Address
  3. Baby path only: due date; induction date (optional); boy, girl or surprise (optional)
  4. When should meals start? (short text, e.g. "3 days after baby comes")
  5. How often: Daily / Every other day / Specific dates (with a short text for the dates)
  6. Best drop-off time window (short text, e.g. "5:30–6:30 pm")
  7. Drop-off: **Regular drop-off** (knock or doorbell) / **Quiet drop-off** (text on arrival)
  8. Who the sisters should coordinate with: checkboxes **Mom**, **Dad**, **Other** (Other
     asks for a name and phone)
  9. How many adults and how many kids should the meals feed (including any extra help)
  10. Allergies, restrictions or dislikes
  11. Favourite foods or cuisines
  12. Note (optional)
- **The closing line,** from their P.S.: "After baby comes, we'll check back with you: if you're
  comfortable, we'd love to share a photo, name, gender and birth date with the Relief Society
  presidency."

## 3. The request sheet: one row per baby (or family)

- Every form answer gets its own column. Extra columns are filled in by hand after the birth,
  with no second form (the coordinators prefer to ask by text):
  - Baby's name, Gender, Birth date, Photo link (all optional)
  - **Shared with RS** (checkbox). Header note: "Tick this when baby is here, this row is
    complete, and the Relief Society presidency has been told they can open and review it."
- The existing columns stay as they are: Status, Make opportunity, Copy contact to private
  details, Posted as, and the 30-day purge after closing.
- Notices: **only the coordinators** (Notify = Coordinators). The bishopric can open everything;
  the RS presidency can open the folder but isn't emailed.

## 4. Make opportunity → a meal post

Ticking **Make opportunity** makes a **Draft** in the opportunity category **Meals for New
Moms** (new baby) or **Meals for Members in Hardship** (hardship). Both are Sisters by default,
owned by the Relief Society, with the three coordinators as Coordinators. The family's
permission to share is the request itself (Sam: "Go ahead and include their names").

- **Public** (on the post page and the Serve page once shown):
  - title "Meals for the ___ family", using the parents' names from the form;
  - **allergies first, highlighted**;
  - favourite foods;
  - how many adults and kids;
  - the drop-off window;
  - Regular or Quiet drop-off;
  - who to coordinate with (Mom, Dad or both, by first name).
- **Private** (only confirmed, approved sign-ups and leaders): the address; the phone of each
  person to coordinate with; the "Other" contact.
- **Dates:** none at first. The coordinator sets them in the scheduler once baby is here
  (cadence and start as a hint at the top of the form). The role is "Bring a meal".
- **Picture at the top:** the category's picture (§7) shows above the title.
- This changes decision 19 ("nothing from the request on any public field") **for the meals
  categories only**, by Sam's choice. Other request kinds keep decision 19.

## 5. Ministering sisters first: hidden until shown

- **Show on Service Opportunities page:** a new switch on every post, **off for new meal posts**
  and on by default for others. While it's off:
  - the post isn't listed on the Serve page, in Other ways to serve, or in Needs help soon;
  - its own link works for anyone who has it (parents, ministering sisters).
- **Progress checklist on each post:**
  ☐ Parents reviewed ☐ Sent to ministering sisters ☐ Shown on portal (ticks itself when the
  switch is turned on) ☐ Ward email sent ☐ Posted on Discord. Each tick records who and when.
  It's shown on the post in the leader page, and the Meals posts show it by default.
- Ministering sisters' emails stay in the Church's Tools app. Coordinators copy them into Gmail
  by hand; the portal never stores ministering assignments (Handbook 38.8.32).

## 6. Who hears about sign-ups (like Mail Train)

- **Family emails** on the post: filled from the request's "coordinate with" choices (Mom, Dad
  or both, from the form's emails) and editable. The family gets an email for each sign-up and
  each cancellation, with the date, the role and the volunteer's first name, never the
  volunteer's email address.
- **Sign-up notices to:** a new Categories column (emails; a Google Group address is allowed)
  that gets the same every-sign-up and every-cancellation email. For meals it's the coordinators'
  Google Group. It doesn't need a Leaders row: it's a notice address only.
- The existing Fully filled, Still short and cancellation emails to coordinators stay as they
  are.
- These count against the 100-a-day email quota. Check health's email line covers it.

## 7. A picture for each category

- A new Categories column, **Picture** (an https image address), shown at the top of that
  category's posts: post page, Serve card thumbnail, and the leader page's post view. Blank means
  no picture.
- The meals pictures: a generic "Welcome, sweet baby!" in grey, black and white ink and
  watercolour wash (booties, bottle, pacifier), for both boys and girls; and a gentle one for
  hardship meals. Designs are chosen by Sam. Files go on the hub branch, like `band-flock.jpg`.

## 8. The ward list (204 emails)

Not sent through the portal: its 100 a day are for confirmations and reminders. The coordinators
send the post's link by Gmail (Bcc) or through a Google Group (being researched for Sam), and the
same 204 addresses go into the Pre-approve list once.

## 9. Out of scope

A second form for baby details; storing ministering assignments; donations or gift cards; Mail
Train integration.
