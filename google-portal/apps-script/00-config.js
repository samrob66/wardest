/**
 * Service Portal (Google-only volunteer portal), phase 2.
 * Every tab name, header, status, text and default lives in this file.
 *
 * Source: google-portal/apps-script/ in the WardForward repository. Code.gs is generated from
 * these files; change them there, not in the Apps Script editor.
 */

/** Bumped when a sheet needs bringing up to date (ensureUpgraded_ runs gpEnsureTabs_ again). */
var GP_VERSION = 'phase-2.6';

/** Independence notices (General Handbook 38.8.21.2). Verbatim; do not reword. */
var PAGE_FOOTER =
  'This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.';
var EMAIL_FOOTER =
  'This email comes from an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.';
var FORM_FOOTER =
  'This form is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.';

/** Handbook 38.8.48.3: verbatim in the Read me tab and the setup guide. */
var GEMINI_RULE =
  'Do not ask Gemini to read, summarize or draft from the Service Sheet, the request sheets or request notices.';

var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];

/** Messages people see. */
var TEXT = {
  busy: 'Busy, please try again.',
  notFound: 'Not found.',
  badRequest: 'Bad request.',
  genericError: 'Something went wrong. Please try again later or contact ',
  rateLimited: 'Too many sign-ups right now. Please try again later or contact ',
  postNotFound: 'This opportunity was not found.',
  notOpen: 'This opportunity is not open.',
  roleNotFound: 'That role was not found.',
  datePassed: 'That date has passed.',
  roleFull: 'This role is full.',
  alreadySignedUp: "You're already signed up for this role.",
  signedUp: "You're signed up. We sent a confirmation to your email.",
  // Every public sign-up answer (sign-ups spec 6.3 item 6): never says whether the address was known.
  signupThanks: 'Thanks. Check your email to finish or see your sign-up.',
  // The Service Opportunities section for posts with more than one audience (decision 23).
  everyone: 'Everyone',
  pickCategory: 'Pick a category',
  noChildren: 'Children and youth can be signed up only for opportunities for youth or children.',
  linkExpired: 'This link has expired.',
  alreadyConfirmed: 'Your address is already confirmed.',
  addressConfirmed: 'Thank you. Your address is confirmed. A ward leader will look at your sign-up soon, and we will email you when it counts.',
  confirmedPassed: 'Your address is confirmed. The date you signed up for has passed, so that sign-up has ended.',
  withdrawn: 'Your offer is withdrawn. Thank you for being willing to help.',
  notActive: 'This sign-up is no longer active.',
  categoryNotAllowed: "You can't make opportunities in this category.",
  alreadyHappened: 'This has already happened.',
  notWaitingEmail: 'This sign-up is not waiting for its confirm email.',
  resendLimit: 'Too many confirm emails today. Please try again tomorrow.',
  resent: 'We sent the confirm email again. Please check your inbox (and the spam folder).',
  meLinkMessage: 'If that address has signed up for something, a link to your sign-ups is on its way.',
  alreadyCancelled: 'This sign-up is already cancelled.',
  cancelled: 'Your sign-up is cancelled. Thank you for letting us know.',
  linkInvalid: 'This link has expired or is no longer valid.',
  leaderLinkMessage: "If that address is on the ward's leader list, a link is on its way.",
  leaderRelink: 'This leader link has expired or is no longer valid. Ask for a new one.',
  notAllowed: "You can't change this opportunity.",
  removeSignupsFirst: 'Remove the people signed up for this date first.',
  postCancelled: "This opportunity was cancelled and can't be reopened.",
  onlyDate: 'This is the only date. Cancel the whole opportunity instead.',
  cannotApprove: "You can't approve or decline this person.",
  approversOnly: 'Only the bishopric and approvers can do this.',
  tooManyPasted: 'Paste at most 2,000 addresses at a time.',
  bishopricOnly: 'Only the bishopric can do this.',
  councilOnly: 'Needs help soon is for the ward council and the bishopric.',
  signOutDone: 'We emailed you a new leader link. The old one no longer works.',
};

/** Limits (spec section 7.3). The total of confirm emails a day is Settings confirm_limit_per_day. */
var LIMITS = {
  signupEmailsPerAddressPerDay: 3,
  signupsPerPostPerMinute: 10,
  leaderLinksPerAddressPerDay: 3,
  confirmEmailsPerAddressPerDay: 3,
  meLinksPerAddressPerDay: 3,
};

/** Hours before a role starts that a sign-up still waiting for approval nudges the approvers. */
var NUDGE_HOURS = 48;
/** A category's Warn hours when the cell is blank (0 turns its warnings off). */
var DEFAULT_WARN_HOURS = 48;
/** "Needs help soon" looks this many days ahead (today included). */
var NEEDS_HELP_DAYS = 14;

/** Service Sheet tabs (people type only Settings, Leaders and Categories). */
var TAB = {
  readMe: 'Read me',
  settings: 'Settings',
  leaders: 'Leaders',
  categories: 'Categories',
  posts: 'Posts',
  slots: 'Slots',
  signups: 'Sign-ups',
  volunteers: 'Volunteers',
  needsHelp: 'Needs help soon',
};

/** System Sheet tabs (nobody but the shared account). */
var SYS_TAB = {
  tokens: 'Tokens',
  outbox: 'Outbox',
  log: 'Log',
  requestFiles: 'Request files',
  counters: 'Counters',
  preapproved: 'Preapproved',
};

/** Exact headers, in order. A header added later is appended by Set up (gpEnsureTabs_), never reordered. */
var SERVICE_HEADERS = {
  'Read me': [],
  Settings: ['Key', 'Value', 'Help'],
  Leaders: ['Name', 'Email', 'Calling', 'Organization', 'Bishopric', 'Ward council', 'Org editor', 'Coordinator', 'Send leader link', 'Link sent'],
  Categories: ['Id', 'Name', 'Icon', 'Kind', 'Owning organizations', 'Default audiences', 'Coordinators', 'Any ward council may create', 'Confidential', 'Warn hours', 'Also warn', 'Discord', 'Archived', 'Notify', 'On Help page', 'On Serve page', 'Opportunity category', 'Approvers', 'Picture', 'Sign-up notices to'],
  Posts: ['Post id', 'Public id', 'Organization', 'Category', 'Title', 'Audiences', 'Public note', 'Private details', 'Cancel cutoff hours', 'Status', 'Created by', 'Created at', 'Last changed by', 'Last changed at'],
  Slots: ['Slot id', 'Post id', 'Date', 'Start', 'End', 'Role', 'Needed', 'Role note', 'Bringing prompt', 'Filled', 'Waiting'],
  'Sign-ups': ['Sign-up id', 'Post id', 'Slot id', 'Email', 'Name', 'Child first name', 'Bringing', 'Status', 'Signed up at', 'Reminded at', 'Details sent at', 'Over limit', 'Removed by', 'Cancelled at'],
  Volunteers: ['Email', 'Name', 'Status', 'Decided by', 'Decided at', 'First post', 'Email confirmed at'],
  'Needs help soon': ['Date', 'Start', 'Title', 'Organization', 'Role', 'Filled', 'Needed', 'Link'],
};

var SYSTEM_HEADERS = {
  Tokens: ['Hash', 'Kind', 'Subject', 'Expires', 'Created'],
  Outbox: ['Id', 'Queued at', 'To', 'Subject', 'Html', 'Text', 'Priority', 'Status', 'Error'],
  Log: ['At', 'What', 'Detail'],
  'Request files': ['Category id', 'Folder id', 'Form id', 'Sheet id', 'Month'],
  Counters: ['Key', 'Day', 'Count'],
  Preapproved: ['Hash', 'Added at', 'Added by'],
};

/** Each request sheet's one tab. */
var REQUEST_TAB = 'Requests';
var REQUEST_HEADERS = ['Request id', 'Received', 'Kind', 'Name', 'Phone or email', 'Moving', 'Moving date', 'For', 'Note', 'Offer', 'Status', 'Assigned to', 'Leader note', 'Closed on', 'Make opportunity', 'Copy contact to private details', 'Posted as'];
var REQUEST_STATUS = ['New', 'In progress', 'Done', 'Declined'];

/** Tabs only the script writes; Sync sharing protects them (owner only). */
var PROTECTED_TABS = ['Posts', 'Slots', 'Sign-ups', 'Volunteers', 'Needs help soon'];

var POST_STATUS = { draft: 'Draft', open: 'Open', closed: 'Closed', past: 'Past', cancelled: 'Cancelled' };
var SIGNUP_STATUS = {
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  removed: 'Removed',
  waitingEmail: 'Waiting-email',
  waitingApproval: 'Waiting-approval',
  withdrawn: 'Withdrawn',
  lapsed: 'Lapsed',
};
/** Sign-ups that hold (Confirmed) or wait for (Waiting-*) a place. */
var ACTIVE_SIGNUP_STATUSES = ['Waiting-email', 'Waiting-approval', 'Confirmed'];
var VOLUNTEER_STATUS = { pending: 'Pending', approved: 'Approved', declined: 'Declined', revoked: 'Revoked' };
var CATEGORY_KIND = { opportunity: 'Opportunity', request: 'Request' };

/** Column types, by header name (any tab). Read back as text; written with format '@'. */
var DATE_COLS = ['Date', 'Moving date', 'Closed on', 'Day'];
var TIME_COLS = ['Start', 'End'];
var LOCAL_DT_COLS = ['Created at', 'Last changed at', 'Signed up at', 'Reminded at', 'Details sent at', 'Cancelled at', 'Decided at', 'Email confirmed at', 'Link sent', 'Expires', 'Created', 'Queued at', 'At', 'Received', 'Added at'];
var MONTH_COLS = ['Month'];
/** Free text kept as typed (no date or number guessing by Sheets). */
var TEXT_COLS = ['Picture', 'Sign-up notices to', 'Name', 'Email', 'Title', 'Public note', 'Private details', 'Role', 'Role note', 'Bringing prompt', 'Bringing', 'Child first name', 'Phone or email', 'Note', 'Leader note', 'Assigned to', 'To', 'Subject', 'Html', 'Text', 'Detail', 'Created by', 'Last changed by', 'Removed by', 'Decided by', 'Hash', 'Public id', 'Notify', 'Offer', 'Link', 'First post', 'Key', 'Posted as', 'Opportunity category', 'Approvers', 'Added by'];
var CHECKBOX_COLS = ['Bishopric', 'Ward council', 'Org editor', 'Coordinator', 'Send leader link', 'Any ward council may create', 'Confidential', 'Discord', 'Archived', 'On Help page', 'On Serve page', 'Make opportunity', 'Copy contact to private details'];

/** Settings rows: [key, default, help]. */
var SETTINGS_ROWS = [
  ['ward_name', '', 'The ward name as members know it, e.g. Riverbend 1st Ward.'],
  ['ward_prefix', '', 'Short ward prefix used for short links, e.g. rb1.'],
  ['time_zone', '', 'The ward time zone, e.g. America/Denver. Must match the script project time zone.'],
  ['contact_email', '', 'The address members may write to. Shown on every page and email.'],
  ['hub_url', '', "The ward hub address (folder holding serve.html), e.g. https://example.github.io/rb1links/. Leave blank if there is no hub."],
  ['web_app_url', '', 'The web app address from Deploy (ends in /exec).'],
  ['preview_image_url', '', 'Optional picture shown when a page link is shared.'],
  ['serve_short_link', '', 'zippa.run short link to the Service Opportunities page.'],
  ['help_short_link', '', 'zippa.run short link to the Request Help page.'],
  ['reminder_hour', 18, 'Hour of the day (0-23) reminders go out for the next day.'],
  ['default_cancel_cutoff_hours', 24, 'Hours before a role starts after which a cancellation tells leaders they are short.'],
  ['email_reserve', 30, 'Emails kept back each day for reminders and leader notices.'],
  ['signup_limit_per_day', 80, 'Most sign-up attempts accepted in one day, all posts together (refused and repeated ones count too).'],
  ['confirm_limit_per_day', 20, 'Most confirm-your-address emails sent in one day, all addresses together.'],
  ['organizations', 'Bishopric, Elders Quorum, Relief Society, Young Men, Young Women, Primary, Sunday School, Ward Mission, Temple and Family History, Activities', 'Organizations, separated by commas.'],
  ['discord', 'off', 'Discord announcements (phase 2). Leave off.'],
  ['theme_background_url', '', 'Optional background picture for every portal page: a full https address, e.g. the hub\'s own background image. Blank: plain background.'],
  ['theme_accent', '', 'Optional accent colour as #rrggbb, e.g. #2f5d50. Blank: the standard colours.'],
  ['theme_font', '', 'Optional Google Fonts family name for the pages, e.g. Lora. Blank: the standard font.'],
  ['theme_heading_font', '', 'Optional Google Fonts family name for headings. Blank: the same as theme_font.'],
  ['default_approvers', '', 'Who gets the "waiting for approval" emails, and may approve, for opportunity categories with no Approvers of their own: emails separated by commas, each on the Leaders tab. Blank: the first post\'s organization leaders and the bishopric.'],
  ['admin_alerts_to', '', 'Who gets the "needs attention" emails (the daily health email, job failures, request and form problems): emails separated by commas. Blank, or any entry that is not an email address: the Executive Secretary (Calling Executive Secretary on the Leaders tab), or the bishop if there is none.'],
  ['test_mail_only', '', 'TEST MODE. Blank: email goes to everyone as normal. Addresses here, separated by commas: only they get email, and every other email goes to the first address with [TEST for <address>] in front of its subject. Empty it before going live.'],
  ['form_template_url', '', 'Optional: the edit link of a branded Google Form (from the form editor\'s address bar). New request forms are made as copies of it, so they keep its look.'],
];
var NUMBER_SETTINGS = ['reminder_hour', 'default_cancel_cutoff_hours', 'email_reserve', 'signup_limit_per_day', 'confirm_limit_per_day'];

/**
 * Cell notes (2.5.3, decision 27; Sam: "Insert Note on every key in column A in the Settings
 * sheet ... a note on every header in row 1"). Set up and the GP_VERSION upgrade rewrite these on
 * the Settings keys (column A) and the row-1 headers of every tab; nothing else is touched. Each
 * note: what it is, the format or allowed values, what blank means, an invented example. Lines
 * are joined with new lines when written. Keep them in step with the SETUP-GUIDE tables.
 */
var FIELD_NOTES = {
  settings: {
    ward_name: ['The ward name as members know it, on every page and email.', 'Required (Check health asks for it).', 'Example: Riverbend 1st Ward (example)'],
    ward_prefix: ['Short ward prefix for the ward\'s zippa.run short links: letters and digits.', 'Blank: no prefix.', 'Example: rb1'],
    time_zone: ['The ward time zone, as a name. Must match the script project time zone.', 'Required.', 'Example: America/Denver'],
    contact_email: ['The address members may write to. Shown on every page and email.', 'Required. Blank hides the Contact line.', 'Example: help@riverbend.example.test'],
    hub_url: ['The hub folder address (where index.html and serve.html live), https.', 'Blank: no hub; links open the web app pages.', 'Example: https://rb1.example.test/links/'],
    web_app_url: ['The Web app URL from Deploy, ending in /exec (not a form link).', 'Required once deployed (setup section 4).', 'Example: https://script.google.com/macros/s/EXAMPLE/exec'],
    preview_image_url: ['Optional picture shown when a page link is shared (https).', 'Blank: no preview picture.', 'Example: https://rb1.example.test/preview.png'],
    serve_short_link: ['The zippa.run short link to the Service Opportunities page.', 'Blank until you make it (setup section 6).', 'Example: https://zippa.run/rb1Serve'],
    help_short_link: ['The zippa.run short link to the Request Help page.', 'Blank until you make it (setup section 6).', 'Example: https://zippa.run/rb1Help'],
    reminder_hour: ['Hour of the day (0-23) the reminders for the next day go out.', 'Default 18.', 'Example: 18'],
    default_cancel_cutoff_hours: ['Hours before a role starts after which a cancel tells leaders they are short.', 'Default 24. A post can set its own.', 'Example: 24'],
    email_reserve: ['Emails kept back each day for reminders and leader notices.', 'Default 30.', 'Example: 30'],
    signup_limit_per_day: ['Most sign-up attempts accepted in one day, all posts together (refused and repeated ones count).', 'Default 80.', 'Example: 80'],
    confirm_limit_per_day: ['Most "Please confirm your email" messages in one day (first-timers).', 'Default 20.', 'Example: 20'],
    organizations: ['The ward\'s organizations, separated by commas. Feeds the Leaders and Categories dropdowns.', 'Starts with the usual list.', 'Example: Bishopric, Elders Quorum, Relief Society, Primary'],
    discord: ['Discord announcements. Not used yet.', 'Leave off.', 'Example: off'],
    theme_background_url: ['Optional picture for the band across the top of every page (https).', 'Blank: plain band.', 'Example: https://rb1.example.test/background.png'],
    theme_accent: ['Optional accent colour, # and six letters or digits.', 'Blank: the standard colours.', 'Example: #2f5d50'],
    theme_font: ['Optional Google Fonts family name for the pages.', 'Blank: the standard font.', 'Example: Lora'],
    theme_heading_font: ['Optional Google Fonts family name for headings.', 'Blank: the same as theme_font.', 'Example: Lora'],
    default_approvers: ['Who gets the "Waiting for approval" emails, and may approve, for opportunity categories with a blank Approvers cell. Emails, commas; each needs a Leaders row.', 'Blank: the organization\'s leaders and the bishopric.', 'Example: brother.counselor@example.test'],
    admin_alerts_to: ['Who gets the "needs attention" emails (daily health email, job failures, request and form problems). Emails, commas.', 'Blank, or any entry that isn\'t an address: the Executive Secretary (the bishop if there is none).', 'Example: exec.home@example.test'],
    test_mail_only: ['TEST MODE. Addresses, commas: only they get email; every other email goes to the first one with [TEST for ...] in its subject.', 'Blank: email goes to everyone as normal. Empty it before going live.', 'Example: exec.home@example.test'],
    form_template_url: ['Optional edit link of the ward\'s branded Google Form; new request forms are copies of it.', 'Blank: plain new forms.', 'Example: https://docs.google.com/forms/d/EXAMPLE/edit'],
  },
  tabs: {
    Settings: {
      Key: ['The setting\'s name. Do not change it.', 'Hover a key to see what it means.', 'Example: ward_name'],
      Value: ['What you type for that setting.', 'Blank: the setting\'s default (see the key\'s note).', 'Example: Riverbend 1st Ward (example)'],
      Help: ['A short reminder of what the setting does. Set up writes it.', 'Leave it alone.', 'Example: The ward name as members know it.'],
    },
    Leaders: {
      Name: ['The leader\'s name, as shown to other leaders and on "Decided by".', 'Required.', 'Example: Sister Example'],
      Email: ['The address their leader link goes to.', 'Required: one address.', 'Example: sister.example@example.test'],
      Calling: ['Their calling. The bishop must be exactly Bishop, the Executive Secretary exactly Executive Secretary.', 'Blank: no calling-based emails.', 'Example: Relief Society President'],
      Organization: ['Their organization, from the Settings organizations list.', 'Pick from the dropdown.', 'Example: Relief Society'],
      Bishopric: ['Tick for the bishop, both counselors, the Executive Secretary and the Ward Clerk only.', 'They edit the Service Sheet, read Christmas and Other requests, see and edit every opportunity and approve anyone.', 'Unticked: not bishopric.', 'Example: ticked'],
      'Ward council': ['Tick for ward council members: they see every opportunity and its names, edit their organization\'s, approve its first-timers and see Needs help soon.', 'Unticked: not ward council.', 'Example: ticked'],
      'Org editor': ['Tick for leaders who make opportunities for their organization (they see only its names) and approve its first-timers.', 'Unticked: no organization editing.', 'Example: ticked'],
      Coordinator: ['A reminder only: what a coordinator may do comes from the Categories Coordinators column.', 'Unticked is fine for coordinators too.', 'Example: ticked'],
      'Send leader link': ['Tick, then run Service Portal > Send leader links, to email this leader their link.', 'The script unticks it after sending.', 'Example: ticked'],
      'Link sent': ['When the last leader link was sent. The script fills it.', 'Blank: never sent.', 'Example: 2026-12-01 10:00'],
    },
    Categories: {
      Id: ['The category\'s fixed id. Do not change it once in use.', 'Lower case letters, digits and hyphens.', 'Example: meals'],
      Name: ['The name people see.', 'Required.', 'Example: Meals'],
      Icon: ['An emoji shown with the category on the public pages.', 'Blank: no icon.', 'Example: 🍲'],
      Kind: ['Opportunity (volunteers sign up) or Request (a form for asking help).', 'Pick from the dropdown.', 'Example: Opportunity'],
      'Owning organizations': ['The organizations it belongs to, commas. Their leaders make its opportunities (or read its requests).', 'Blank: any leader who can make opportunities.', 'Example: Relief Society'],
      'Default audiences': ['Audiences ticked for a new opportunity: Brothers, Sisters, Youth, Children (commas).', 'Blank: none ticked.', 'Example: Sisters'],
      Coordinators: ['Emails, commas. Opportunity rows: they own its posts (need a Leaders row). Request rows: they also read that kind\'s requests.', 'Blank: no coordinators.', 'Example: sister.coordinator@example.test'],
      'Any ward council may create': ['Tick to let every ward council member make opportunities in it.', 'Unticked: only its owners, coordinators and the bishopric.', 'Example: ticked'],
      Confidential: ['Request rows: only the bishopric and that kind\'s Coordinators read it (Christmas, Other).', 'Unticked: owning organizations\' leaders read it too.', 'Example: ticked'],
      'Warn hours': ['Hours before a date to warn when a role is still short.', 'Blank: 48. 0 turns warnings off.', 'Example: 72'],
      'Also warn': ['More emails for the "Still short" warning, commas.', 'Blank: only the coordinators (or owners).', 'Example: brother.clerk@example.test'],
      Discord: ['Discord announcements for this category. Not used yet.', 'Leave unticked.', 'Example: ticked'],
      Archived: ['Tick to retire a category: it disappears from pickers, pages and forms; its history stays.', 'Unticked: in use.', 'Example: ticked'],
      Notify: ['Request rows: who gets the short "New ... request" email. Bishop, Owners, Coordinators or emails, commas.', 'Blank: everyone who can open the folder.', 'Example: Bishop, brother.counselor@example.test'],
      'On Help page': ['Request rows: ticked kinds show on the public Request Help page.', 'Unticked: a private form (share its link yourself). Run Set up after changing it.', 'Example: ticked'],
      'On Serve page': ['Christmas giving offers row only: ticked shows the "Offer to give at Christmas" card on Service Opportunities.', 'Unticked: on no public page.', 'Example: ticked'],
      'Opportunity category': ['Request rows: the Id of the opportunity category a request can be turned into (Make opportunity).', 'Blank: never turned into an opportunity.', 'Example: moving-help'],
      Approvers: ['Opportunity rows: who gets the "Waiting for approval" emails and may approve. Emails, commas; each needs a Leaders row.', 'Blank: Settings default_approvers, else the organization\'s leaders and the bishopric.', 'Example: sister.example@example.test'],
      Picture: ['Opportunity rows: a picture shown at the top of this category\'s posts (post page, Serve card, leader page). A full https address of an image.', 'Blank: no picture.', 'Example: https://rb1.example.test/links/meals-baby.jpg'],
      'Sign-up notices to': ['Opportunity rows: who gets an email for every sign-up and every cancellation (first name, date and role only). Emails or a Google Group, commas; no Leaders row needed.', 'Blank: nobody beyond the usual notices.', 'Example: rb1-meals@example.test'],
    },
    Posts: {
      'Post id': ['The opportunity\'s internal id. The script writes this tab: edit opportunities on the leader page.', 'Example: p1a2b3'],
      'Public id': ['The random id in the opportunity\'s public link.', 'Written by the script.', 'Example: pubmeals01'],
      Organization: ['The organization the opportunity belongs to.', 'Example: Relief Society'],
      Category: ['The Id of its Categories row.', 'Example: meals'],
      Title: ['The title people see.', 'Example: Meals for the Sample family'],
      Audiences: ['Who it is for: Brothers, Sisters, Youth, Children (commas).', 'Example: Sisters, Children'],
      'Public note': ['The note anyone can read. Never a family\'s name, address or situation.', 'Blank: no note.', 'Example: Bring a dish by 5 pm.'],
      'Private details': ['Only for approved volunteers signed up and the leaders who can edit it (an address, a gate code).', 'Blank: none.', 'Example: 123 Example Lane, gate 4321'],
      'Cancel cutoff hours': ['Hours before a role after which a cancel tells leaders they are short.', 'Blank: Settings default_cancel_cutoff_hours.', 'Example: 24'],
      Status: ['Draft, Open, Closed, Past or Cancelled.', 'Example: Open'],
      'Created by': ['The address of the leader who made it (or request <id> for a draft made from a request).', 'Example: sister.example@example.test'],
      'Created at': ['When it was made (ward time).', 'Example: 2026-11-30 09:15'],
      'Last changed by': ['The leader who last changed it.', 'Example: Sister Example'],
      'Last changed at': ['When it was last changed (ward time).', 'Example: 2026-12-01 18:40'],
    },
    Slots: {
      'Slot id': ['One date and role of an opportunity. The script writes this tab.', 'Example: s1a2b3'],
      'Post id': ['The opportunity it belongs to (Posts tab).', 'Example: p1a2b3'],
      Date: ['The date, YYYY-MM-DD.', 'Example: 2026-12-03'],
      Start: ['Start time, HH:MM (24 hours).', 'Blank: no time.', 'Example: 17:00'],
      End: ['End time, HH:MM (24 hours).', 'Blank: no end time.', 'Example: 18:30'],
      Role: ['What the volunteers do.', 'Example: Bring a meal'],
      Needed: ['How many people the role needs.', 'Example: 2'],
      'Role note': ['A short public note for this role.', 'Blank: none.', 'Example: Enough for 5 people'],
      'Bringing prompt': ['The question asked at sign-up, e.g. what they will bring.', 'Blank: no question.', 'Example: What will you bring?'],
      Filled: ['How many count now (Confirmed). The script keeps it up to date.', 'Example: 1'],
      Waiting: ['How many are still waiting (email click or approval).', 'Example: 1'],
    },
    'Sign-ups': {
      'Sign-up id': ['One person (or child) signed up for one role. The script writes this tab.', 'Example: u1a2b3'],
      'Post id': ['The opportunity (Posts tab).', 'Example: p1a2b3'],
      'Slot id': ['The date and role (Slots tab).', 'Example: s1a2b3'],
      Email: ['The volunteer\'s address (the parent\'s, for a child).', 'Example: brother.volunteer@example.test'],
      Name: ['The volunteer\'s name as typed.', 'Example: Brother Volunteer'],
      'Child first name': ['A child signed up by this parent.', 'Blank: the volunteer themselves.', 'Example: Ana'],
      Bringing: ['Their answer to the role\'s Bringing prompt.', 'Blank: none.', 'Example: Soup'],
      Status: ['Waiting-email, Waiting-approval, Confirmed, Cancelled, Removed, Withdrawn or Lapsed.', 'Example: Confirmed'],
      'Signed up at': ['When they signed up (ward time).', 'Example: 2026-12-01 10:00'],
      'Reminded at': ['When the day-before reminder went.', 'Blank: not yet.', 'Example: 2026-12-02 18:00'],
      'Details sent at': ['When the private details last went to them.', 'Blank: never.', 'Example: 2026-12-02 18:00'],
      'Over limit': ['Yes when they counted after the role already had its number.', 'Blank: within the number.', 'Example: Yes'],
      'Removed by': ['The leader who removed them.', 'Blank: not removed.', 'Example: Sister Example'],
      'Cancelled at': ['When they cancelled.', 'Blank: not cancelled.', 'Example: 2026-12-02 08:30'],
    },
    Volunteers: {
      Email: ['A volunteer\'s address. The script writes this tab: approve on the leader page.', 'Example: brother.volunteer@example.test'],
      Name: ['Their name as last typed.', 'Example: Brother Volunteer'],
      Status: ['Pending, Approved, Declined or Revoked.', 'Example: Approved'],
      'Decided by': ['The leader who approved or declined them, or Pre-approve list.', 'Blank: not decided yet.', 'Example: Sister Example'],
      'Decided at': ['When that was decided (ward time).', 'Example: 2026-12-01 11:00'],
      'First post': ['The opportunity of their first sign-up: its leaders may approve them.', 'Example: p1a2b3'],
      'Email confirmed at': ['When they clicked Confirm my address.', 'Blank: not confirmed yet.', 'Example: 2026-12-01 10:05'],
    },
    'Needs help soon': {
      Date: ['Open roles still short in the next 14 days, soonest first. The script rewrites this tab.', 'Example: 2026-12-03'],
      Start: ['Start time, HH:MM.', 'Example: 17:00'],
      Title: ['The opportunity.', 'Example: Meals for the Sample family'],
      Organization: ['Its organization.', 'Example: Relief Society'],
      Role: ['The role still short.', 'Example: Bring a meal'],
      Filled: ['How many count now.', 'Example: 1'],
      Needed: ['How many it needs.', 'Example: 2'],
      Link: ['The opportunity\'s public link, to share.', 'Example: https://rb1.example.test/links/post.html#p=pubmeals01'],
    },
  },
  system: {
    Tokens: {
      Hash: ['A fingerprint of an emailed link (never the link itself). Script only.', 'Example: 3f9a… (64 letters and digits)'],
      Kind: ['What the link does: confirm, cancel, withdraw, me (My sign-ups) or leader.', 'Example: cancel'],
      Subject: ['What it acts on: a sign-up id or an address.', 'Example: u1a2b3'],
      Expires: ['When the link stops working (ward time).', 'Example: 2026-12-04 23:59'],
      Created: ['When it was made.', 'Example: 2026-12-01 10:00'],
    },
    Outbox: {
      Id: ['An email waiting for quota, or one that failed. Script only.', 'Example: m1a2b3'],
      'Queued at': ['When it was queued.', 'Example: 2026-12-01 10:00'],
      To: ['Its one recipient.', 'Example: brother.volunteer@example.test'],
      Subject: ['Its subject.', 'Example: Reminder: Meals tomorrow'],
      Html: ['Its HTML body.', 'Written by the script.'],
      Text: ['Its plain-text body.', 'Written by the script.'],
      Priority: ['high (reminders, notices, alerts) or normal.', 'Example: high'],
      Status: ['Queued or Failed.', 'Example: Queued'],
      Error: ['Why it failed.', 'Blank: not failed.', 'Example: Service invoked too many times'],
    },
    Log: {
      At: ['When it happened (ward time). Kept 90 days. Script only.', 'Example: 2026-12-01 10:00'],
      What: ['What happened.', 'Example: mail sent'],
      Detail: ['More about it (never request text).', 'Example: brother.volunteer@example.test | Reminder: Meals tomorrow'],
    },
    'Request files': {
      'Category id': ['The request kind (Categories Id). Script only.', 'Example: moving'],
      'Folder id': ['Its private Drive folder.', 'Written by Set up.'],
      'Form id': ['Its Google Form.', 'Written by Set up.'],
      'Sheet id': ['This month\'s request sheet.', 'Written by Set up and the monthly move.'],
      Month: ['The month of that sheet, YYYY-MM.', 'Example: 2026-12'],
    },
    Counters: {
      Key: ['A daily limit being counted (per address or in total). Script only.', 'Example: T (every sign-up attempt today)'],
      Day: ['The day, YYYY-MM-DD.', 'Example: 2026-12-01'],
      Count: ['How many so far that day.', 'Example: 2'],
    },
    Preapproved: {
      Hash: ['A salted fingerprint of a pre-approved address; the address itself is never kept. Script only.', 'Example: 9c1d… (64 letters and digits)'],
      'Added at': ['When it was added.', 'Example: 2026-12-01 10:00'],
      'Added by': ['The leader who pasted it.', 'Example: Bishop Example'],
    },
  },
  requestSheet: {
    'Request id': ['The request\'s id. Written by the script.', 'Example: r1a2b3'],
    Received: ['When it came in (ward time).', 'Example: 2026-12-01 10:00'],
    Kind: ['The kind of request (Categories Name).', 'Example: Moving help'],
    Name: ['The requester\'s name.', 'Example: Sister Sample'],
    'Phone or email': ['How to reach them. Contact them directly; never copy it into an email.', 'Example: sister.sample@example.test'],
    Moving: ['Moving requests: Moving in or Moving out.', 'Blank: other kinds.', 'Example: Moving in'],
    'Moving date': ['Moving requests: the date, YYYY-MM-DD.', 'Blank: not given.', 'Example: 2026-12-12'],
    For: ['Christmas requests: My family or Another family.', 'Blank: other kinds.', 'Example: My family'],
    Note: ['The requester\'s note.', 'Blank: none.', 'Example: Two bedrooms, second floor.'],
    Offer: ['Christmas giving offers: what they would like to give.', 'Blank: other kinds.', 'Example: Gifts for two children'],
    Status: ['New, In progress, Done or Declined. You set it.', 'Rows are removed 30 days after Done or Declined.', 'Example: In progress'],
    'Assigned to': ['Who is handling it. You fill it.', 'Blank: nobody yet.', 'Example: Brother Sample'],
    'Leader note': ['A short note for the other leaders. You fill it.', 'Blank: none.', 'Example: Called Tuesday; truck booked.'],
    'Closed on': ['The day it was set to Done or Declined. The daily job fills it.', 'Example: 2026-12-15'],
    'Make opportunity': ['Tick to make a Draft opportunity from this request within the hour (only for kinds with an Opportunity category).', 'The box unticks itself.', 'Example: ticked'],
    'Copy contact to private details': ['Tick with Make opportunity to put the name and phone or email in the draft\'s private details.', 'Unticked: not copied.', 'Example: ticked'],
    'Posted as': ['What Make opportunity did. Written by the script: Draft made <date> — finish and publish it on the leader page (<title>, <post id>), or Not made: <why>.', 'Example: Draft made 2026-12-01 — finish and publish it on the leader page (Moving help, p1a2b3)'],
  },
};

/**
 * The private Christmas giving offer form (decision 16): a request kind that is not on the Help
 * page, read by the bishopric and its Coordinators (the Christmas gift coordinators), whose
 * notices go to the Coordinators. Added once to sheets seeded before it existed.
 */
var GIVING_ID = 'christmas-giving';
var GIVING_CATEGORY = {
  Id: GIVING_ID,
  Name: 'Christmas giving offers',
  Icon: '🎁',
  Kind: 'Request',
  'Owning organizations': 'Bishopric',
  Coordinators: '',
  Confidential: true,
  Notify: 'Coordinators',
  'On Help page': false,
};

/** Categories seeded once, when the tab is empty. */
var DEFAULT_CATEGORIES = [
  { Id: 'moving', Name: 'Moving help', Icon: '🚚', Kind: 'Request', 'Owning organizations': 'Elders Quorum, Relief Society', Notify: 'Owners, Coordinators', 'On Help page': true, 'Opportunity category': 'moving-help' },
  { Id: 'christmas', Name: 'Christmas help', Icon: '🎄', Kind: 'Request', 'Owning organizations': 'Bishopric', Confidential: true, 'On Help page': true },
  { Id: 'other', Name: 'Other help', Icon: '💬', Kind: 'Request', 'Owning organizations': 'Bishopric', Confidential: true, Notify: 'Bishop', 'On Help page': true },
  GIVING_CATEGORY,
  { Id: 'meals', Name: 'Meals', Icon: '🍲', Kind: 'Opportunity', 'Owning organizations': 'Relief Society' },
  { Id: 'moving-help', Name: 'Moving', Icon: '📦', Kind: 'Opportunity', 'Owning organizations': 'Elders Quorum' },
  { Id: 'service-project', Name: 'Service project', Icon: '🛠️', Kind: 'Opportunity' },
  { Id: 'activity', Name: 'Activity help', Icon: '🎉', Kind: 'Opportunity' },
  { Id: 'temple', Name: 'Temple and family history', Icon: '🌳', Kind: 'Opportunity' },
  { Id: 'youth', Name: 'Youth activity help', Icon: '🧭', Kind: 'Opportunity' },
  { Id: 'children', Name: 'Primary help', Icon: '🧸', Kind: 'Opportunity' },
  { Id: 'other-service', Name: 'Other service', Icon: '🤝', Kind: 'Opportunity' },
];

/**
 * Meals (2.6, decision 28): one request kind with one form (two Help tiles open it prefilled)
 * whose drafts go into one of two opportunity categories, by the form's first answer. Seeded
 * once by Id (seedMeals_); rows Sam typed are never overwritten. The old `meals` row stays.
 */
var MEAL_REQUEST_ID = 'meal-request';
var MEAL_BABY_ID = 'meals-new-moms';
var MEAL_HARDSHIP_ID = 'meals-hardship';
var MEAL_CATEGORY_IDS = [MEAL_BABY_ID, MEAL_HARDSHIP_ID];
var MEAL_CATEGORIES = [
  { Id: MEAL_REQUEST_ID, Name: 'Meals', Icon: '🍲', Kind: 'Request', 'Owning organizations': 'Relief Society', Notify: 'Coordinators', 'On Help page': true, 'Opportunity category': MEAL_BABY_ID + ', ' + MEAL_HARDSHIP_ID },
  { Id: MEAL_BABY_ID, Name: 'Meals for New Moms', Icon: '🍼', Kind: 'Opportunity', 'Owning organizations': 'Relief Society', 'Default audiences': 'Sisters' },
  { Id: MEAL_HARDSHIP_ID, Name: 'Meals for Members in Hardship', Icon: '🍲', Kind: 'Opportunity', 'Owning organizations': 'Relief Society', 'Default audiences': 'Sisters' },
];

/**
 * Who sees a confidential request kind, as its form says ("Only <who> see this request.").
 * By category id; any other confidential kind uses the default.
 */
var CONFIDENTIAL_WHO = { christmas: 'the bishopric and the Christmas gift coordinators' };
var CONFIDENTIAL_WHO_DEFAULT = 'the bishopric and the people they name';

var LOCK_WAIT_MS = 10000;
var SERVE_CACHE_SECONDS = 60;
var HELP_CACHE_SECONDS = 21600;
var LEADER_LINK_DAYS = 90;
var CONFIRM_LINK_HOURS = 48;
var LOG_KEEP_DAYS = 90;
var FAILED_MAIL_KEEP_DAYS = 7;
var REQUEST_KEEP_DAYS = 30;
