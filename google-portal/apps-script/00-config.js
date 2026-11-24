/**
 * Service Portal (Google-only volunteer portal), phase 2.
 * Every tab name, header, status, text and default lives in this file.
 *
 * Source: google-portal/apps-script/ in the WardForward repository. Code.gs is generated from
 * these files; change them there, not in the Apps Script editor.
 */

/** Bumped when a sheet needs bringing up to date (ensureUpgraded_ runs gpEnsureTabs_ again). */
var GP_VERSION = 'phase-2.2';

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
};

/** Exact headers, in order. A header added later is appended by Set up (gpEnsureTabs_), never reordered. */
var SERVICE_HEADERS = {
  'Read me': [],
  Settings: ['Key', 'Value', 'Help'],
  Leaders: ['Name', 'Email', 'Calling', 'Organization', 'Bishopric', 'Ward council', 'Org editor', 'Coordinator', 'Send leader link', 'Link sent'],
  Categories: ['Id', 'Name', 'Icon', 'Kind', 'Owning organizations', 'Default audiences', 'Coordinators', 'Any ward council may create', 'Confidential', 'Warn hours', 'Also warn', 'Discord', 'Archived', 'Notify', 'On Help page', 'On Serve page', 'Opportunity category'],
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
var LOCAL_DT_COLS = ['Created at', 'Last changed at', 'Signed up at', 'Reminded at', 'Details sent at', 'Cancelled at', 'Decided at', 'Email confirmed at', 'Link sent', 'Expires', 'Created', 'Queued at', 'At', 'Received'];
var MONTH_COLS = ['Month'];
/** Free text kept as typed (no date or number guessing by Sheets). */
var TEXT_COLS = ['Name', 'Email', 'Title', 'Public note', 'Private details', 'Role', 'Role note', 'Bringing prompt', 'Bringing', 'Child first name', 'Phone or email', 'Note', 'Leader note', 'Assigned to', 'To', 'Subject', 'Html', 'Text', 'Detail', 'Created by', 'Last changed by', 'Removed by', 'Decided by', 'Hash', 'Public id', 'Notify', 'Offer', 'Link', 'First post', 'Key', 'Posted as', 'Opportunity category'];
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
];
var NUMBER_SETTINGS = ['reminder_hour', 'default_cancel_cutoff_hours', 'email_reserve', 'signup_limit_per_day', 'confirm_limit_per_day'];

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
