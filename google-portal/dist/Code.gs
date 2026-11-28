// GENERATED FILE: do not edit. Built by google-portal/build.mjs from google-portal/apps-script/
// and google-portal/pages/ in the WardForward repository.
// To update: change those source files, run `npm run gp:build`, then in the Apps Script editor
// select everything in Code.gs, paste this whole file over it, Save, and make a new version of the
// web app deployment (Deploy > Manage deployments > pencil > Version: New version > Deploy).

// ===== 00-config.js =====

/**
 * Service Portal (Google-only volunteer portal), phase 2.
 * Every tab name, header, status, text and default lives in this file.
 *
 * Source: google-portal/apps-script/ in the WardForward repository. Code.gs is generated from
 * these files; change them there, not in the Apps Script editor.
 */

/** Bumped when a sheet needs bringing up to date (ensureUpgraded_ runs gpEnsureTabs_ again). */
var GP_VERSION = 'phase-2.4';

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
  Categories: ['Id', 'Name', 'Icon', 'Kind', 'Owning organizations', 'Default audiences', 'Coordinators', 'Any ward council may create', 'Confidential', 'Warn hours', 'Also warn', 'Discord', 'Archived', 'Notify', 'On Help page', 'On Serve page', 'Opportunity category', 'Approvers'],
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
var TEXT_COLS = ['Name', 'Email', 'Title', 'Public note', 'Private details', 'Role', 'Role note', 'Bringing prompt', 'Bringing', 'Child first name', 'Phone or email', 'Note', 'Leader note', 'Assigned to', 'To', 'Subject', 'Html', 'Text', 'Detail', 'Created by', 'Last changed by', 'Removed by', 'Decided by', 'Hash', 'Public id', 'Notify', 'Offer', 'Link', 'First post', 'Key', 'Posted as', 'Opportunity category', 'Approvers', 'Added by'];
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
  ['test_mail_only', '', 'TEST MODE. Blank: email goes to everyone as normal. Addresses here, separated by commas: only they get email, and every other email goes to the first address with [TEST for <address>] in front of its subject. Empty it before going live.'],
  ['form_template_url', '', 'Optional: the edit link of a branded Google Form (from the form editor\'s address bar). New request forms are made as copies of it, so they keep its look.'],
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

// ===== 01-platform.js =====

/**
 * Platform: the Google calls the tests replace with fakes (clock, tokens, hashing, lock, cache,
 * properties, mail). The tests fake the Google services themselves, not these functions.
 */

/** Per-execution memo (settings, open spreadsheets). Every entry point calls gpBegin_(). */
var GP_MEMO_ = {};
var GP_LOCK_DEPTH_ = 0;

function gpBegin_() {
  GP_MEMO_ = {};
}

/** The ward's time zone: Settings time_zone, else the script's own. */
function wardTz_() {
  var tz = '';
  try {
    tz = typeof settings_ === 'function' ? settings_().time_zone : '';
  } catch (e) {
    tz = '';
  }
  return tz || Session.getScriptTimeZone();
}

/** 'YYYY-MM-DD HH:mm' in the ward's time zone. */
function nowLocal_() {
  return Utilities.formatDate(new Date(), wardTz_(), 'yyyy-MM-dd HH:mm');
}

function todayLocal_() {
  return nowLocal_().slice(0, 10);
}

/** 64 hex characters (256 bits) from two random UUIDs, hashed. */
function newToken_() {
  return sha256Hex_(Utilities.getUuid() + ':' + Utilities.getUuid() + ':' + new Date().getTime());
}

function sha256Hex_(s) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(s),
    Utilities.Charset.UTF_8
  );
  var out = '';
  for (var i = 0; i < bytes.length; i++) {
    var b = (bytes[i] + 256) % 256;
    out += (b < 16 ? '0' : '') + b.toString(16);
  }
  return out;
}

/**
 * Runs fn under the script lock (waits up to 10 s). Nested calls in one execution reuse the
 * lock. On timeout throws an error marked gpBusy, which the web entry points answer with
 * "Busy, please try again."
 */
function withLock_(fn) {
  if (GP_LOCK_DEPTH_ > 0) {
    GP_LOCK_DEPTH_++;
    try {
      return fn();
    } finally {
      GP_LOCK_DEPTH_--;
    }
  }
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(LOCK_WAIT_MS)) {
    var err = new Error(TEXT.busy);
    err.gpBusy = true;
    throw err;
  }
  GP_LOCK_DEPTH_ = 1;
  try {
    return fn();
  } finally {
    GP_LOCK_DEPTH_ = 0;
    lock.releaseLock();
  }
}

/**
 * Any top-level function whose name doesn't end in _ can be called by a visitor of a page the
 * web app serves (google.script.run), running as the shared account. Timed jobs therefore run
 * only for one of this project's own triggers (the event's triggerUid, which a visitor can't
 * know) or for the owner running them in the editor.
 */
function calledByOwner_(e) {
  try {
    if (e && e.triggerUid) {
      var uid = String(e.triggerUid);
      var mine = ScriptApp.getProjectTriggers().some(function (t) {
        return String(t.getUniqueId()) === uid;
      });
      if (mine) return true;
    }
    // From the editor: only the Service Sheet's owner (the shared account). An editor of the
    // Sheet can open its script and press Run too, as themselves; that is refused. When Drive
    // reports no owner, the account the run uses must be the one pressing Run (the earlier rule).
    var active = normEmail(Session.getActiveUser().getEmail());
    if (!active || active !== normEmail(Session.getEffectiveUser().getEmail())) return false;
    var ownerUser = DriveApp.getFileById(serviceSs_().getId()).getOwner();
    var owner = ownerUser ? normEmail(ownerUser.getEmail()) : '';
    return !owner || owner === active;
  } catch (err) {
    return false;
  }
}

/**
 * Start of every Service Portal menu item. getUi() throws outside the Sheet (a web visitor),
 * so nothing happens before it. Then only the Service Sheet's owner (the shared account) may go
 * on, so files and triggers never end up owned by a person's own account. Returns the Ui, or
 * null when refused.
 */
function menuStart_() {
  var ui = SpreadsheetApp.getUi();
  gpBegin_();
  var me = normEmail(Session.getEffectiveUser().getEmail());
  var ownerUser = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getOwner();
  var owner = ownerUser ? normEmail(ownerUser.getEmail()) : '';
  if (owner && owner !== me) {
    ui.alert(
      'The Service Portal menu works only for the account that owns this Service Sheet (' + owner + '). ' +
        'You are using it as ' + me + '. Open the Service Sheet in a browser window signed in only to that ' +
        'account (for example a private window where you sign in to just that account), then try again.'
    );
    return null;
  }
  return ui;
}

function cache_() {
  return CacheService.getScriptCache();
}

function props_() {
  return PropertiesService.getScriptProperties();
}

function mailQuota_() {
  return MailApp.getRemainingDailyQuota();
}

/**
 * Settings test_mail_only, read (2.3.1, decision 21): {on, allow, catchAll, bad}. allow holds the
 * valid addresses (normalized), catchAll the first of them, bad the entries that aren't addresses.
 */
function testMailList_(raw) {
  var entries = splitList(raw);
  var allow = [];
  var bad = [];
  entries.forEach(function (e) {
    if (isEmail(e)) allow.push(normEmail(e));
    else bad.push(e);
  });
  return { on: entries.length > 0, allow: uniq_(allow), catchAll: allow.length ? normEmail(allow[0]) : '', bad: bad };
}

/**
 * Where an email goes under the test-mode switch: {to, subject, how}.
 *   - test_mail_only blank: as asked (how 'sent');
 *   - on: a listed address gets it as asked ('sent'); anyone else's goes to the first listed
 *     address with "[TEST for <address>] " in front of the subject ('redirected');
 *   - on with an entry that isn't an address: every email is redirected, listed or not (one
 *     already for the first address goes to it unchanged);
 *   - on with no valid address at all: nowhere ('dropped').
 * Decided both when an email is sent and when it is queued, so a queued email is already
 * addressed to the tester and turning test mode off can't send it to the real person.
 */
function testMailRoute_(to, subject) {
  var test = testMailList_(settings_().test_mail_only);
  if (!test.on) return { to: to, subject: subject, how: 'sent' };
  var original = normEmail(to);
  if (!test.catchAll) return { to: original, subject: subject, how: 'dropped' };
  if (original === test.catchAll || (!test.bad.length && test.allow.indexOf(original) >= 0)) return { to: to, subject: subject, how: 'sent' };
  return { to: test.catchAll, subject: '[TEST for ' + original + '] ' + subject, how: 'redirected' };
}

/**
 * Sends one email now. msg: {to, subject, html, text, name?, replyTo?}. This is the only code
 * that sends mail, so the test-mode switch here (testMailRoute_) covers every email. Returns
 * 'sent', 'redirected', or 'dropped' (test mode with no valid address: logged, nothing sent).
 */
function sendMailNow_(msg) {
  var route = testMailRoute_(msg.to, msg.subject);
  if (route.how === 'dropped') {
    log_('test mode: not sent (test_mail_only has no valid address)', route.to + ' | ' + msg.subject);
    return 'dropped';
  }
  var to = route.to;
  var subject = route.subject;
  var result = route.how;
  var opts = {
    to: to,
    subject: subject,
    htmlBody: msg.html,
    body: msg.text,
  };
  if (msg.name) opts.name = msg.name;
  if (msg.replyTo) opts.replyTo = msg.replyTo;
  MailApp.sendEmail(opts);
  return result;
}

// ===== 02-util.js =====

/**
 * Pure helpers: dates and times as text, escaping, cell sanitizing, ids.
 *
 * Dates are text 'YYYY-MM-DD', times 'HH:mm' (24 h), local date-times 'YYYY-MM-DD HH:mm', all in
 * the ward's time zone, so they compare as plain strings. A cell Sheets turned into a Date anyway
 * is read back with the Date's own local fields (Apps Script runs in the script's time zone,
 * which the setup guide sets to the ward's), rounded to the minute: Sheets' time-only cells sit
 * on 1899-12-30, where historical zone offsets can add a few seconds.
 */

function isDateObj_(v) {
  return Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime());
}

function pad2_(n) {
  return (n < 10 ? '0' : '') + n;
}

/** {y, mo, d, h, mi} of a Date in the runtime's local time, rounded to the nearest minute. */
function dateParts_(d) {
  var secs = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
  var mins = Math.round(secs / 60);
  var y = d.getFullYear();
  var mo = d.getMonth();
  var day = d.getDate();
  if (mins >= 1440) {
    var next = new Date(y, mo, day + 1);
    y = next.getFullYear();
    mo = next.getMonth();
    day = next.getDate();
    mins -= 1440;
  }
  return { y: y, mo: mo + 1, d: day, h: Math.floor(mins / 60), mi: mins % 60 };
}

function isDateStr(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var y = +s.slice(0, 4);
  var m = +s.slice(5, 7);
  var d = +s.slice(8, 10);
  if (m < 1 || m > 12 || d < 1) return false;
  var dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isTimeStr(s) {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function isLocalDTStr_(s) {
  return typeof s === 'string' && s.length === 16 && isDateStr(s.slice(0, 10)) && s[10] === ' ' && isTimeStr(s.slice(11));
}

/** Text 'YYYY-MM-DD' from text or a Date cell; '' when not a real date. */
function normDate(v) {
  if (isDateObj_(v)) {
    var p = dateParts_(v);
    return p.y + '-' + pad2_(p.mo) + '-' + pad2_(p.d);
  }
  var s = String(v == null ? '' : v).trim();
  return isDateStr(s) ? s : '';
}

/** Text 'HH:mm' from text ('8:05' too) or a Date cell; '' when not a time. */
function normTime(v) {
  if (isDateObj_(v)) {
    var p = dateParts_(v);
    return pad2_(p.h) + ':' + pad2_(p.mi);
  }
  var s = String(v == null ? '' : v).trim();
  if (/^\d:\d\d$/.test(s)) s = '0' + s;
  return isTimeStr(s) ? s : '';
}

/** Text 'YYYY-MM-DD HH:mm' from text or a Date cell; '' otherwise. */
function normLocalDT(v) {
  if (isDateObj_(v)) {
    var p = dateParts_(v);
    return p.y + '-' + pad2_(p.mo) + '-' + pad2_(p.d) + ' ' + pad2_(p.h) + ':' + pad2_(p.mi);
  }
  var s = String(v == null ? '' : v).trim();
  return isLocalDTStr_(s) ? s : '';
}

/** Text 'YYYY-MM' from text or a Date cell; '' otherwise. */
function normMonth(v) {
  if (isDateObj_(v)) {
    var p = dateParts_(v);
    return p.y + '-' + pad2_(p.mo);
  }
  var s = String(v == null ? '' : v).trim();
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(s) ? s : '';
}

function addDays(dateStr, n) {
  var dt = new Date(Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10) + n));
  return dt.getUTCFullYear() + '-' + pad2_(dt.getUTCMonth() + 1) + '-' + pad2_(dt.getUTCDate());
}

/** 0 = Sunday … 6 = Saturday. */
function weekday(dateStr) {
  return new Date(Date.UTC(+dateStr.slice(0, 4), +dateStr.slice(5, 7) - 1, +dateStr.slice(8, 10))).getUTCDay();
}

/** Wall-clock arithmetic on a local date-time (a DST change shifts the real gap by an hour). */
function localMinusHours(localDT, h) {
  var ms = Date.UTC(
    +localDT.slice(0, 4),
    +localDT.slice(5, 7) - 1,
    +localDT.slice(8, 10),
    +localDT.slice(11, 13),
    +localDT.slice(14, 16)
  );
  var dt = new Date(ms - h * 3600000);
  return (
    dt.getUTCFullYear() + '-' + pad2_(dt.getUTCMonth() + 1) + '-' + pad2_(dt.getUTCDate()) + ' ' +
    pad2_(dt.getUTCHours()) + ':' + pad2_(dt.getUTCMinutes())
  );
}

/** Minutes from local date-time a to b (wall clock). */
function minutesBetween_(a, b) {
  var ms = function (s) {
    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), +s.slice(11, 13) || 0, +s.slice(14, 16) || 0);
  };
  return Math.round((ms(b) - ms(a)) / 60000);
}

function cmpLocal(a, b) {
  a = String(a);
  b = String(b);
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A string starting with = + - @ is written with a leading ' so Sheets keeps it as text. */
function sanitizeCell(v) {
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Exactly one plain address. */
function isEmail(s) {
  s = String(s == null ? '' : s).trim();
  return s.length <= 254 && /^[^\s@,;<>"()\[\]]+@[^\s@,;<>"()\[\]]+\.[^\s@,;<>"()\[\]]+$/.test(s);
}

function normEmail(s) {
  return String(s == null ? '' : s).trim().toLowerCase();
}

function clip(s, n) {
  return String(s == null ? '' : s).slice(0, n);
}

/** prefix + 10 random base32 characters (50 bits). */
function newId_(prefix) {
  var alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  var hex = newToken_();
  var out = '';
  for (var i = 0; i < 10; i++) out += alphabet[parseInt(hex.substr(i * 2, 2), 16) % 32];
  return String(prefix || '') + out;
}

/** True for a ticked checkbox or a typed yes. */
function isTicked(v) {
  return v === true || /^(true|yes|y|x|1|✓|on)$/i.test(String(v == null ? '' : v).trim());
}

/** Splits 'a, b; c' into trimmed non-empty parts. */
function splitList(s) {
  return String(s == null ? '' : s)
    .split(/[,;\n]/)
    .map(function (x) {
      return x.trim();
    })
    .filter(function (x) {
      return x;
    });
}

function uniq_(arr) {
  var seen = {};
  var out = [];
  arr.forEach(function (x) {
    if (!seen[x]) {
      seen[x] = true;
      out.push(x);
    }
  });
  return out;
}

// ===== 03-store.js =====

/**
 * Tables: header-mapped access to a sheet. Columns are always found by header name, never by
 * position, so a column someone inserts by hand doesn't break anything. Every write goes through
 * here: strings are passed through sanitizeCell (formula injection) and date, time and free-text
 * cells get the plain-text format '@' first so Sheets never turns them into Dates or numbers.
 */

function colType_(header) {
  if (DATE_COLS.indexOf(header) >= 0) return 'date';
  if (TIME_COLS.indexOf(header) >= 0) return 'time';
  if (LOCAL_DT_COLS.indexOf(header) >= 0) return 'localdt';
  if (MONTH_COLS.indexOf(header) >= 0) return 'month';
  if (TEXT_COLS.indexOf(header) >= 0) return 'text';
  return '';
}

function normCell_(type, v) {
  if (type === 'date') return normDate(v);
  if (type === 'time') return normTime(v);
  if (type === 'localdt') return normLocalDT(v);
  if (type === 'month') return normMonth(v);
  if (type === 'text' && isDateObj_(v)) return normLocalDT(v);
  return v;
}

function isBlankCell_(v) {
  return v === '' || v === false || v === null || v === undefined;
}

/**
 * table_(sheet) → {headers, rows(), find(col, value), append(obj), appendMany(objs),
 * update(rowObj, changes), remove(rowObj), removeMany(rowObjs)}.
 * Row objects are keyed by header text and carry a hidden (non-enumerable) _row.
 */
function table_(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
        return String(h).trim();
      })
    : [];
  var idx = {};
  headers.forEach(function (h, i) {
    if (h && !(h in idx)) idx[h] = i;
  });
  var hasCheckboxes = headers.some(function (h) {
    return CHECKBOX_COLS.indexOf(h) >= 0;
  });

  function colOf(name) {
    if (!(name in idx)) {
      throw new Error('Missing column "' + name + '" in tab ' + sheet.getName() + '. Run Service Portal > Set up.');
    }
    return idx[name] + 1;
  }

  function readValues() {
    var n = sheet.getLastRow();
    if (n < 2 || !lastCol) return [];
    return sheet.getRange(2, 1, n - 1, lastCol).getValues();
  }

  function toObj(values, rowNum) {
    var o = {};
    headers.forEach(function (h, i) {
      if (h && idx[h] === i) o[h] = normCell_(colType_(h), values[i]);
    });
    Object.defineProperty(o, '_row', { value: rowNum, enumerable: false, writable: true });
    return o;
  }

  function rows() {
    var out = [];
    readValues().forEach(function (values, i) {
      if (values.every(isBlankCell_)) return;
      out.push(toObj(values, i + 2));
    });
    return out;
  }

  function lastDataRow() {
    if (!hasCheckboxes) return Math.max(1, sheet.getLastRow());
    var values = readValues();
    for (var i = values.length - 1; i >= 0; i--) {
      if (!values[i].every(isBlankCell_)) return i + 2;
    }
    return 1;
  }

  function rowValues(obj) {
    Object.keys(obj).forEach(colOf);
    return headers.map(function (h, i) {
      var box = CHECKBOX_COLS.indexOf(h) >= 0;
      if (!h || idx[h] !== i || !(h in obj)) return box ? false : '';
      var v = obj[h];
      if (box) return isTicked(v);
      return sanitizeCell(v === null || v === undefined ? '' : v);
    });
  }

  function textFormat(rowNum, count) {
    headers.forEach(function (h, i) {
      if (h && idx[h] === i && colType_(h)) sheet.getRange(rowNum, i + 1, count, 1).setNumberFormat('@');
    });
  }

  function appendMany(objs) {
    if (!objs.length) return [];
    return withLock_(function () {
      var values = objs.map(rowValues);
      var first = lastDataRow() + 1;
      var needed = first + values.length - 1;
      var max = sheet.getMaxRows();
      if (needed > max) sheet.insertRowsAfter(max, needed - max + 50);
      textFormat(first, values.length);
      sheet.getRange(first, 1, values.length, headers.length).setValues(values);
      return objs.map(function (obj, i) {
        var o = {};
        headers.forEach(function (h, j) {
          if (h && idx[h] === j) o[h] = h in obj ? obj[h] : '';
        });
        Object.defineProperty(o, '_row', { value: first + i, enumerable: false, writable: true });
        return o;
      });
    });
  }

  function update(rowObj, changes) {
    Object.keys(changes).forEach(function (k) {
      var c = colOf(k);
      var v = changes[k];
      if (colType_(k)) sheet.getRange(rowObj._row, c).setNumberFormat('@');
      sheet.getRange(rowObj._row, c).setValue(sanitizeCell(v === null || v === undefined ? '' : v));
      rowObj[k] = v;
    });
  }

  /** Deletes rows bottom-up, in contiguous runs. */
  function removeMany(rowObjs) {
    var nums = rowObjs
      .map(function (r) {
        return r._row;
      })
      .sort(function (a, b) {
        return b - a;
      });
    var i = 0;
    while (i < nums.length) {
      var end = nums[i];
      var start = end;
      while (i + 1 < nums.length && nums[i + 1] === start - 1) {
        i++;
        start = nums[i];
      }
      if (start === end) sheet.deleteRow(end);
      else sheet.deleteRows(start, end - start + 1);
      i++;
    }
  }

  return {
    sheet: sheet,
    headers: headers,
    rows: rows,
    find: function (col, value) {
      colOf(col);
      var all = rows();
      for (var i = 0; i < all.length; i++) if (String(all[i][col]) === String(value)) return all[i];
      return null;
    },
    append: function (obj) {
      return appendMany([obj])[0];
    },
    appendMany: appendMany,
    update: update,
    remove: function (rowObj) {
      removeMany([rowObj]);
    },
    removeMany: removeMany,
  };
}

// ---------- the two spreadsheets ----------

function serviceSs_() {
  if (!GP_MEMO_.serviceSs) {
    var ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }
    if (!ss) {
      var id = props_().getProperty('SERVICE_ID');
      if (!id) throw new Error('Service Sheet not found. Open the Service Sheet and run Service Portal > Set up.');
      ss = SpreadsheetApp.openById(id);
    }
    GP_MEMO_.serviceSs = ss;
  }
  return GP_MEMO_.serviceSs;
}

function systemSs_() {
  if (!GP_MEMO_.systemSs) {
    var id = props_().getProperty('SYSTEM_ID');
    if (!id) throw new Error('System Sheet not found. Run Service Portal > Set up.');
    GP_MEMO_.systemSs = SpreadsheetApp.openById(id);
  }
  return GP_MEMO_.systemSs;
}

function tabOf_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Tab "' + name + '" is missing. Run Service Portal > Set up.');
  return table_(sh);
}

function serviceTab_(name) {
  return tabOf_(serviceSs_(), name);
}

function systemTab_(name) {
  return tabOf_(systemSs_(), name);
}

// ---------- layout ----------

/** Creates the tab if missing and appends any missing header at the end (never reorders). */
function ensureTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (!headers.length) return sh;
  var lastCol = sh.getLastColumn();
  var have = lastCol
    ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
        return String(h).trim();
      })
    : [];
  var missing = headers.filter(function (h) {
    return have.indexOf(h) < 0;
  });
  if (missing.length) {
    sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]);
    sh.getRange(1, 1, 1, have.length + missing.length).setFontWeight('bold');
  }
  if (sh.getFrozenRows() !== 1) sh.setFrozenRows(1);
  var all = have.concat(missing);
  var rowsBelow = sh.getMaxRows() - 1;
  if (rowsBelow > 0) {
    all.forEach(function (h, i) {
      if (colType_(h)) sh.getRange(2, i + 1, rowsBelow, 1).setNumberFormat('@');
      if (CHECKBOX_COLS.indexOf(h) >= 0 && missing.indexOf(h) >= 0) {
        sh.getRange(2, i + 1, rowsBelow, 1).insertCheckboxes();
      }
    });
  }
  return sh;
}

/** Service Sheet: every tab, headers, formats, checkboxes, dropdowns, Settings rows, Read me. */
function gpEnsureTabs_(ss) {
  Object.keys(SERVICE_HEADERS).forEach(function (name) {
    ensureTab_(ss, name, SERVICE_HEADERS[name]);
  });
  ensureSettingsRows_(ss);
  GP_MEMO_.settings = null;
  seedCategories_(ss);
  seedGiving_(ss);
  seedNotify_(ss);
  seedMovingNotify_(ss);
  seedMovingOpportunity_(ss);
  seedHelpPage_(ss);
  addDropdowns_(ss);
  writeReadMe_(ss);
}

function gpEnsureSystemTabs_(ss) {
  Object.keys(SYSTEM_HEADERS).forEach(function (name) {
    ensureTab_(ss, name, SYSTEM_HEADERS[name]);
  });
}

function ensureSettingsRows_(ss) {
  var t = table_(ss.getSheetByName(TAB.settings));
  var have = {};
  t.rows().forEach(function (r) {
    have[String(r.Key).trim()] = true;
  });
  var add = SETTINGS_ROWS.filter(function (row) {
    return !have[row[0]];
  }).map(function (row) {
    return { Key: row[0], Value: row[1], Help: row[2] };
  });
  t.appendMany(add);
}

/** Seeds the default categories once: only while the tab has never been seeded. */
function seedCategories_(ss) {
  var p = props_();
  if (p.getProperty('CATEGORIES_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  if (!t.rows().length) t.appendMany(DEFAULT_CATEGORIES);
  p.setProperty('CATEGORIES_SEEDED', 'yes');
}

/**
 * Once per project (1.1, decision 15): on a sheet seeded before the Notify column existed, the
 * `other` row gets Notify = Bishop when its cell is blank. A value someone typed is kept, and a
 * cell cleared later stays clear.
 */
function seedNotify_(ss) {
  var p = props_();
  if (p.getProperty('NOTIFY_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  var other = t.find('Id', 'other');
  if (other && String(other.Notify == null ? '' : other.Notify).trim() === '') t.update(other, { Notify: 'Bishop' });
  p.setProperty('NOTIFY_SEEDED', 'yes');
}

/**
 * Once per project (decision 16): a Categories tab seeded before the giving form existed gets
 * the christmas-giving row, unless a row with that Id is already there. Never re-added after
 * someone deletes it.
 */
function seedGiving_(ss) {
  var p = props_();
  if (p.getProperty('GIVING_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  if (!t.find('Id', GIVING_ID)) t.append(GIVING_CATEGORY);
  p.setProperty('GIVING_SEEDED', 'yes');
}

/**
 * Once per project (2.1, decision 18): the bishopric now opens every request folder, so a blank
 * Notify would email all of them about every Moving request. The `moving` row gets Notify =
 * "Owners, Coordinators" when its cell is blank. A typed value is kept, and a cell cleared later
 * stays clear.
 */
function seedMovingNotify_(ss) {
  var p = props_();
  if (p.getProperty('MOVING_NOTIFY_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  var moving = t.find('Id', 'moving');
  if (moving && String(moving.Notify == null ? '' : moving.Notify).trim() === '') t.update(moving, { Notify: 'Owners, Coordinators' });
  p.setProperty('MOVING_NOTIFY_SEEDED', 'yes');
}

/**
 * Once per project (2.2, decision 19): the `moving` request row's drafts go into the
 * `moving-help` opportunity category when its Opportunity category cell is blank. A typed value
 * is kept, and a cell cleared later stays clear.
 */
function seedMovingOpportunity_(ss) {
  var p = props_();
  if (p.getProperty('MOVING_OPPORTUNITY_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  var moving = t.find('Id', 'moving');
  if (moving && String(moving['Opportunity category'] == null ? '' : moving['Opportunity category']).trim() === '') {
    t.update(moving, { 'Opportunity category': 'moving-help' });
  }
  p.setProperty('MOVING_OPPORTUNITY_SEEDED', 'yes');
}

/**
 * Once per project: when the On Help page column first appears, every row but the giving form's
 * is ticked, so the request kinds already on the Help page stay there. Later unticks are kept.
 */
function seedHelpPage_(ss) {
  var p = props_();
  if (p.getProperty('HELP_PAGE_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  t.rows().forEach(function (c) {
    if (c.Id !== GIVING_ID && !isTicked(c['On Help page'])) t.update(c, { 'On Help page': true });
  });
  p.setProperty('HELP_PAGE_SEEDED', 'yes');
}

function addDropdowns_(ss) {
  var leaders = ss.getSheetByName(TAB.leaders);
  var orgs = settingsFrom_(ss).organizations;
  var lt = table_(leaders);
  var rowsBelow = leaders.getMaxRows() - 1;
  if (orgs.length && rowsBelow > 0) {
    var orgRule = SpreadsheetApp.newDataValidation().requireValueInList(orgs, true).setAllowInvalid(false).build();
    leaders.getRange(2, lt.headers.indexOf('Organization') + 1, rowsBelow, 1).setDataValidation(orgRule);
  }
  var cats = ss.getSheetByName(TAB.categories);
  var ct = table_(cats);
  var catRows = cats.getMaxRows() - 1;
  if (catRows > 0) {
    var kindRule = SpreadsheetApp.newDataValidation()
      .requireValueInList([CATEGORY_KIND.opportunity, CATEGORY_KIND.request], true)
      .setAllowInvalid(false)
      .build();
    cats.getRange(2, ct.headers.indexOf('Kind') + 1, catRows, 1).setDataValidation(kindRule);
  }
}

function readMeLines_(s) {
  return [
    'Service Portal: read me',
    'Ward: ' + (s.ward_name || '(fill in Settings)'),
    '',
    'What each tab is for',
    'Who may edit: the bishopric (every Leaders row with Bishopric ticked) edits this sheet. Other leaders view it and ask the Executive Secretary for changes to Settings, Leaders or Categories. (Editors of this sheet can also change its script, which can open every request sheet, so tick Bishopric only for the bishop, both counselors, the Executive Secretary and the Ward Clerk.)',
    'Settings: ward name, time zone, contact email, web addresses and limits.',
    'Leaders: who gets a leader link and which files. Tick the role boxes (Bishopric: the bishop, both counselors, the Executive Secretary and the Ward Clerk); tick "Send leader link" to email a link. Then run Service Portal > Sync sharing.',
    'Categories: kinds of opportunities and requests, their owners and coordinators. The bishopric can open every request folder. Other request kinds (e.g. Moving) also go to their owning organizations\' leaders and Coordinators. Confidential kinds: Christmas and Other requests go only to the bishopric and that kind\'s Coordinators (people listed there need no Leaders row).',
    'Notify (Categories): who gets the "new request" email. Blank: everyone who can open that kind\'s folder, which includes the whole bishopric. Otherwise names separated by commas: Bishop (the Leaders row whose Calling is Bishop), Owners (the owning organizations\' leaders with Org editor or Ward council ticked), Coordinators (the people in that row\'s Coordinators) or email addresses. Only people who can open the folder are emailed.',
    'On Help page (Categories): ticked request kinds show on the public Request Help page. The Christmas giving offers form is never shown there.',
    'On Serve page (Categories): only for the christmas-giving row (ignored on every other row). Ticked: the Service Opportunities page shows an "Offer to give at Christmas" card linking to its form. Unticked: share its link privately (Set up shows it). Either way only the bishopric and its Coordinators see the answers.',
    'Posts, Slots, Sign-ups: written only by the script from the leader page and the public pages. Do not type in them.',
    'Volunteers: everyone who has signed up, with Pending / Approved / Declined / Revoked, who decided and when. Written only by the script (approve and decline on the leader page).',
    'Needs help soon: open roles still short in the next 14 days, refreshed every 10 minutes.',
    '',
    PAGE_FOOTER,
    '',
    GEMINI_RULE,
    '',
    'Requests are not in this sheet. Each kind of request has its own folder and sheet, shared only with its leaders.',
    'Opportunity category (Categories, request rows): the Id of the opportunity category a request of this kind can be turned into (e.g. moving -> moving-help). Blank: it can\'t be turned. In a request sheet, tick Make opportunity on a row (and Copy contact to private details if the volunteers need the name and phone); within the hour a Draft appears on the leader page and Posted as says so. Nothing from the request goes on a public page.',
    'Contact: ' + (s.contact_email || '(fill in contact_email in Settings)'),
  ];
}

function writeReadMe_(ss) {
  var sh = ss.getSheetByName(TAB.readMe);
  var lines = readMeLines_(settingsFrom_(ss));
  var old = sh.getLastRow();
  if (old > lines.length) sh.getRange(lines.length + 1, 1, old - lines.length, 1).clearContent();
  sh.getRange(1, 1, lines.length, 1).setNumberFormat('@');
  sh.getRange(1, 1, lines.length, 1).setValues(
    lines.map(function (l) {
      return [sanitizeCell(l)];
    })
  );
  sh.getRange(1, 1).setFontWeight('bold');
}

// ---------- Settings ----------

function settingsFrom_(ss) {
  var sh = ss.getSheetByName(TAB.settings);
  var raw = {};
  if (sh) {
    table_(sh)
      .rows()
      .forEach(function (r) {
        raw[String(r.Key).trim()] = r.Value;
      });
  }
  var s = {};
  SETTINGS_ROWS.forEach(function (row) {
    var key = row[0];
    var v = raw[key];
    var blank = v === undefined || v === null || String(v).trim() === '';
    if (NUMBER_SETTINGS.indexOf(key) >= 0) {
      var n = blank ? NaN : Number(v);
      s[key] = isFinite(n) ? n : Number(row[1]);
    } else if (key === 'organizations') {
      s[key] = splitList(blank ? row[1] : v);
    } else if (key === 'discord') {
      s[key] = blank ? false : isTicked(v);
    } else {
      s[key] = blank ? String(row[1]) : String(v).trim();
    }
  });
  return s;
}

/** Settings as typed values with defaults. Memoized per execution (gpBegin_ clears it). */
function settings_() {
  if (!GP_MEMO_.settings) GP_MEMO_.settings = settingsFrom_(serviceSs_());
  return GP_MEMO_.settings;
}

// ===== 04-rules.js =====

/**
 * Volunteer rules. Pure: plain objects in (keyed as in the tabs), plain objects out.
 */

function str_(v) {
  return String(v == null ? '' : v).trim();
}

function audiencesOf_(v) {
  var list = Array.isArray(v) ? v : splitList(v);
  return AUDIENCES.filter(function (a) {
    return list.indexOf(a) >= 0;
  });
}

function isWholeIn_(v, lo, hi) {
  if (v === '' || v === null || v === undefined || typeof v === 'boolean') return false;
  var n = Number(v);
  return isFinite(n) && Math.floor(n) === n && n >= lo && n <= hi;
}

/**
 * Checks a post typed on the leader page.
 * input: {postId?, organization, category, title, audiences[], publicNote, privateDetails,
 *         cutoffHours, slots: [{slotId?, date, start, end, role, needed, roleNote, bringingPrompt}]}
 * ctx:   {allowedOrgs[], categoryIds[], todayLocal, publish, requireCategory?, keepDates?: {slotId: date}}
 *        requireCategory: a new post must have a category (old posts without one stay editable).
 *        keepDates lists existing slots: one whose date is unchanged may be in the past when a
 *        running post (a meal train under way) is saved again.
 */
function validatePost(input, ctx) {
  input = input || {};
  var errors = {};
  var title = str_(input.title);
  if (!title || title.length > 100) errors.title = 'Type a title (up to 100 characters).';
  var organization = str_(input.organization);
  if ((ctx.allowedOrgs || []).indexOf(organization) < 0) errors.organization = 'Pick an organization you lead.';
  var category = str_(input.category);
  if (!category && ctx.requireCategory) errors.category = TEXT.pickCategory;
  else if (category && (ctx.categoryIds || []).indexOf(category) < 0) errors.category = 'Pick a category from the list.';
  var rawAud = Array.isArray(input.audiences) ? input.audiences.map(str_) : splitList(input.audiences);
  var audiences = audiencesOf_(rawAud);
  if (!rawAud.length) errors.audiences = 'Pick at least one audience';
  else if (audiences.length !== rawAud.length) errors.audiences = 'Pick audiences from the list.';
  var publicNote = String(input.publicNote == null ? '' : input.publicNote).trim();
  if (publicNote.length > 2000) errors.publicNote = 'Keep the public note under 2,000 characters.';
  var privateDetails = String(input.privateDetails == null ? '' : input.privateDetails).trim();
  if (privateDetails.length > 1000) errors.privateDetails = 'Keep the private details under 1,000 characters.';
  var cutoff = input.cutoffHours;
  if (cutoff === null || cutoff === undefined || str_(cutoff) === '') cutoff = '';
  else if (!isWholeIn_(cutoff, 0, 168)) errors.cutoffHours = 'Use a whole number of hours from 0 to 168.';
  else cutoff = Number(cutoff);

  var inSlots = Array.isArray(input.slots) ? input.slots : [];
  if (!inSlots.length) errors.slots = 'Add at least one date.';
  if (inSlots.length > 100) errors.slots = 'Use at most 100 dates and roles.';
  var keep = ctx.keepDates || {};
  var slots = inSlots.slice(0, 100).map(function (s, i) {
    s = s || {};
    var k = 'slots[' + i + '].';
    var date = str_(s.date);
    var slotId = str_(s.slotId);
    if (!isDateStr(date)) errors[k + 'date'] = 'Pick a date.';
    else if (ctx.publish && date < ctx.todayLocal && !(slotId && keep[slotId] === date)) {
      errors[k + 'date'] = 'This date has passed.';
    }
    var start = str_(s.start);
    var end = str_(s.end);
    if (start) {
      start = normTime(start);
      if (!start) errors[k + 'start'] = 'Use a time like 18:30.';
    }
    if (end) {
      end = normTime(end);
      if (!end) errors[k + 'end'] = 'Use a time like 18:30.';
    }
    if (start && end && end <= start) errors[k + 'end'] = 'End after the start.';
    var role = str_(s.role);
    if (!role || role.length > 60) errors[k + 'role'] = 'Type the role (up to 60 characters).';
    if (!isWholeIn_(s.needed, 1, 200)) errors[k + 'needed'] = 'Use a whole number from 1 to 200.';
    var roleNote = str_(s.roleNote);
    if (roleNote.length > 300) errors[k + 'roleNote'] = 'Keep the note under 300 characters.';
    var bringingPrompt = str_(s.bringingPrompt);
    if (bringingPrompt.length > 100) errors[k + 'bringingPrompt'] = 'Keep the question under 100 characters.';
    return {
      slotId: slotId,
      date: date,
      start: start,
      end: end,
      role: role,
      needed: Number(s.needed),
      roleNote: roleNote,
      bringingPrompt: bringingPrompt,
    };
  });

  if (Object.keys(errors).length) return { ok: false, errors: errors };
  return {
    ok: true,
    post: {
      postId: str_(input.postId),
      organization: organization,
      category: category,
      title: title,
      audiences: audiences,
      publicNote: publicNote,
      privateDetails: privateDetails,
      cutoffHours: cutoff,
    },
    slots: slots,
  };
}

/** {slotId: {filled, waiting}}: filled = Confirmed; waiting = phase 2 waiting statuses. */
function countsBySlot(signups) {
  var out = {};
  (signups || []).forEach(function (s) {
    var id = s['Slot id'];
    if (!out[id]) out[id] = { filled: 0, waiting: 0 };
    if (s.Status === SIGNUP_STATUS.confirmed) out[id].filled++;
    else if (s.Status === SIGNUP_STATUS.waitingEmail || s.Status === SIGNUP_STATUS.waitingApproval) out[id].waiting++;
  });
  return out;
}

function filledOf_(counts, slotId) {
  return (counts && counts[slotId] && counts[slotId].filled) || 0;
}

/** Local date-time the slot starts ('00:00' when it has no start time). */
function slotStart(slot) {
  return slot.Date + ' ' + (slot.Start || '00:00');
}

function slotOrder_(a, b) {
  return cmpLocal(slotStart(a), slotStart(b));
}

/** Card data for the serve page: counts only for slots today or later. */
function postSummary(post, slots, counts, todayLocal) {
  var upcoming = slots
    .filter(function (s) {
      return s.Date >= todayLocal;
    })
    .sort(slotOrder_);
  var needed = 0;
  var filled = 0;
  var full = upcoming.length > 0;
  upcoming.forEach(function (s) {
    var n = Number(s.Needed) || 0;
    var f = filledOf_(counts, s['Slot id']);
    needed += n;
    filled += Math.min(f, n);
    if (f < n) full = false;
  });
  return {
    publicId: post['Public id'],
    title: post.Title,
    organization: post.Organization,
    category: post.Category,
    audiences: audiencesOf_(post.Audiences),
    publicNote: post['Public note'],
    firstDate: upcoming.length ? upcoming[0].Date : '',
    lastDate: upcoming.length ? upcoming[upcoming.length - 1].Date : '',
    needed: needed,
    filled: filled,
    full: full,
    status: post.Status,
  };
}

/** The public post: titles, notes, dates, roles and counts. Nothing else. */
function publicPost(post, slots, counts, todayLocal) {
  return {
    publicId: post['Public id'],
    title: post.Title,
    organization: post.Organization,
    audiences: audiencesOf_(post.Audiences),
    publicNote: post['Public note'],
    cutoffHours: post['Cancel cutoff hours'] === '' ? '' : Number(post['Cancel cutoff hours']),
    status: post.Status,
    slots: slots
      .slice()
      .sort(slotOrder_)
      .map(function (s) {
        var needed = Number(s.Needed) || 0;
        var filled = filledOf_(counts, s['Slot id']);
        return {
          slotId: s['Slot id'],
          date: s.Date,
          start: s.Start,
          end: s.End,
          role: s.Role,
          needed: needed,
          filled: filled,
          roleNote: s['Role note'] || '',
          bringingPrompt: s['Bringing prompt'] || '',
          full: filled >= needed,
          past: s.Date < todayLocal,
        };
      }),
  };
}

/** A child's first name as compared for duplicates ('' = the parent). */
function childKey_(v) {
  return str_(v).toLowerCase();
}

function isActiveSignup_(status) {
  return ACTIVE_SIGNUP_STATUSES.indexOf(status) >= 0;
}

function isWaitingSignup_(status) {
  return status === SIGNUP_STATUS.waitingEmail || status === SIGNUP_STATUS.waitingApproval;
}

/**
 * Can this person sign up for this slot now?
 * a: {post, slot, counts, existing, email, childName?, state?, todayLocal, nowLocal}.
 * A slot with a start time closes at its start; one without stays open all of its day.
 * Duplicates are per (address, role, child first name) among active sign-ups (Waiting-*,
 * Confirmed). A full role refuses a sign-up that would count at once (state approved or leader;
 * no state = counts at once); one that must wait for an email click or an approval may wait.
 */
function checkSignup(a) {
  var post = a.post;
  var slot = a.slot;
  if (!post || post.Status !== POST_STATUS.open) return { ok: false, error: TEXT.notOpen };
  if (!slot || slot['Post id'] !== post['Post id']) return { ok: false, error: TEXT.roleNotFound };
  var passed = slot.Start ? slotStart(slot) < a.nowLocal : slot.Date < a.nowLocal.slice(0, 10);
  if (passed) return { ok: false, error: TEXT.datePassed };
  var email = normEmail(a.email);
  var child = childKey_(a.childName);
  var dup = (a.existing || []).some(function (s) {
    return (
      s['Slot id'] === slot['Slot id'] &&
      isActiveSignup_(s.Status) &&
      normEmail(s.Email) === email &&
      childKey_(s['Child first name']) === child
    );
  });
  if (dup) return { ok: false, error: TEXT.alreadySignedUp };
  var countsNow = !a.state || a.state === 'approved' || a.state === 'leader';
  if (countsNow && filledOf_(a.counts, slot['Slot id']) >= (Number(slot.Needed) || 0)) return { ok: false, error: TEXT.roleFull };
  return { ok: true };
}

/** True when the role already has its number before this sign-up counts (over-filling). */
function overLimitOnConfirm(slot, counts) {
  return filledOf_(counts, slot['Slot id']) >= (Number(slot.Needed) || 0);
}

// ---------- volunteers: approval states ----------

/** {normalized email: Volunteers row}. */
function volunteersByEmail_(rows) {
  var out = {};
  (rows || []).forEach(function (v) {
    var e = normEmail(v.Email);
    if (e) out[e] = v;
  });
  return out;
}

/**
 * 'leader' (on the Leaders tab: skips approval) | 'approved' | 'pending-confirmed' (clicked the
 * confirm link, waits for a leader) | 'pending-new' (has not clicked it) | 'new' (never seen) |
 * 'blocked' (Declined or Revoked). volunteersByEmail is keyed by normalized email; a status
 * nobody knows counts as Pending.
 */
function volunteerState(email, volunteersByEmail, leaderEmails) {
  var e = normEmail(email);
  var leaders = (leaderEmails || []).map(normEmail);
  if (e && leaders.indexOf(e) >= 0) return 'leader';
  var v = volunteersByEmail ? volunteersByEmail[e] : null;
  if (!v) return 'new';
  var st = str_(v.Status);
  if (st === VOLUNTEER_STATUS.approved) return 'approved';
  if (st === VOLUNTEER_STATUS.declined || st === VOLUNTEER_STATUS.revoked) return 'blocked';
  return str_(v['Email confirmed at']) ? 'pending-confirmed' : 'pending-new';
}

/** The status a new sign-up gets; null = blocked (nothing is stored). */
function signupStatusFor(state) {
  if (state === 'leader' || state === 'approved') return SIGNUP_STATUS.confirmed;
  if (state === 'pending-confirmed') return SIGNUP_STATUS.waitingApproval;
  if (state === 'pending-new' || state === 'new') return SIGNUP_STATUS.waitingEmail;
  return null;
}

/**
 * May this leader approve or decline this volunteer? The bishopric always; otherwise only a
 * leader who edits the organization of the volunteer's first post (coordinators don't approve).
 */
function canApprove(access, leaderEmail, volunteer, firstPost) {
  if (!access || !volunteer) return false;
  if (access.isBishopric) return true;
  if (!firstPost) return false;
  // Decision 24: a configured approver for the first post's category (or default_approvers).
  if (approvesPost_(access, firstPost)) return true;
  return (access.editOrgs || []).indexOf(firstPost.Organization) >= 0;
}

/**
 * The approver list configured for a post's category (decision 24): the category's Approvers,
 * else Settings default_approvers. Valid addresses, normalized, de-duplicated; [] when none.
 */
function configuredApprovers_(post, categoriesById, defaultApprovers) {
  var cat = post ? categoriesById && categoriesById[str_(post.Category)] : null;
  var own = cat ? splitList(cat.Approvers).filter(isEmail).map(normEmail) : [];
  if (own.length) return uniq_(own);
  return uniq_(splitList(defaultApprovers).filter(isEmail).map(normEmail));
}

/**
 * Who gets the "waiting for approval" email and the 48 h nudge for a volunteer whose first post is
 * this one (decision 24): the category's Approvers, else default_approvers, else approversFor
 * (the organization's leaders and the bishopric). Only addresses on the Leaders tab are kept (a
 * leader link needs a Leaders row); if none of a configured list is there, approversFor is used.
 */
function approverEmailsFor(firstPost, categoriesById, settings, leaders) {
  var onTab = {};
  (leaders || []).forEach(function (l) {
    if (isEmail(l.Email)) onTab[normEmail(l.Email)] = true;
  });
  var listed = configuredApprovers_(firstPost, categoriesById, settings ? settings.default_approvers : '').filter(function (e) {
    return onTab[e];
  });
  return listed.length ? listed : approversFor(firstPost, leaders);
}

/**
 * A volunteer's status word (decision 24): 'leader' | 'approved' | 'needs_approval' |
 * 'email_not_confirmed' | 'declined' | 'revoked'. An address with no Volunteers row that isn't a
 * leader is 'approved' (phase 1 sign-ups were approved by the migration).
 */
function volunteerStatusOf(email, volunteerRow, leaderEmails) {
  var e = normEmail(email);
  if (e && (leaderEmails || []).map(normEmail).indexOf(e) >= 0) return 'leader';
  if (!volunteerRow) return 'approved';
  var st = str_(volunteerRow.Status);
  if (st === VOLUNTEER_STATUS.approved) return 'approved';
  if (st === VOLUNTEER_STATUS.declined) return 'declined';
  if (st === VOLUNTEER_STATUS.revoked) return 'revoked';
  return str_(volunteerRow['Email confirmed at']) ? 'needs_approval' : 'email_not_confirmed';
}

/** Is this leader a configured approver for this post (its category's list, or the default)? */
function approvesPost_(access, post) {
  if (!access || !post) return false;
  var cat = str_(post.Category);
  if (cat && access.approverCats && access.approverCats.hasOwnProperty(cat)) return access.approverCats[cat];
  return !!access.inDefaultApprovers;
}

/**
 * Who may approve volunteers whose first post is this one: Leaders with Org editor or Ward
 * council ticked in its organization, plus every Bishopric leader. Normalized, de-duplicated.
 */
function approversFor(post, leaders) {
  var org = post ? str_(post.Organization) : '';
  var out = [];
  (leaders || []).forEach(function (l) {
    if (!isEmail(l.Email)) return;
    var mine = !!org && str_(l.Organization) === org && (isTicked(l['Org editor']) || isTicked(l['Ward council']));
    if (isTicked(l.Bishopric) || mine) out.push(normEmail(l.Email));
  });
  return uniq_(out);
}

/** True once now is at or past (slot start − cutoff hours). */
function cancelIsLate(slot, cutoffHours, nowLocal) {
  var h = Number(cutoffHours) || 0;
  return nowLocal >= localMinusHours(slotStart(slot), h);
}

/**
 * Sign-up ids whose day-before reminder is due now. Every Confirmed sign-up gets one unless its
 * post is Past or Cancelled: Close and Draft only stop new sign-ups.
 */
function remindersDue(signups, slotsById, postsById, nowLocal, reminderHour) {
  var today = nowLocal.slice(0, 10);
  var tomorrow = addDays(today, 1);
  if (Number(nowLocal.slice(11, 13)) < Number(reminderHour)) return [];
  return signups
    .filter(function (s) {
      if (s.Status !== SIGNUP_STATUS.confirmed || s['Reminded at']) return false;
      var slot = slotsById[s['Slot id']];
      var post = postsById[s['Post id']];
      if (!slot || !post) return false;
      if (post.Status === POST_STATUS.past || post.Status === POST_STATUS.cancelled) return false;
      return slot.Date === tomorrow;
    })
    .map(function (s) {
      return s['Sign-up id'];
    });
}

/** Open or Closed posts whose every slot date is before today. */
function postsToMarkPast(posts, slotsByPost, todayLocal) {
  return posts
    .filter(function (p) {
      if (p.Status !== POST_STATUS.open && p.Status !== POST_STATUS.closed) return false;
      var slots = slotsByPost[p['Post id']] || [];
      return (
        slots.length > 0 &&
        slots.every(function (s) {
          return s.Date < todayLocal;
        })
      );
    })
    .map(function (p) {
      return p['Post id'];
    });
}

/**
 * What a leader may do, from the Leaders tab's role boxes and the Categories tab.
 * Base rights (no category): Bishopric: every organization. Ward council: see every post's
 * names; edit and create for their own organization. Org editor: see, edit and create for their
 * own organization only.
 * Creating in an opportunity category (service spec section 3; catOrgs[id] = the organizations a
 * new post in it may belong to):
 *   - the bishopric always (any organization);
 *   - its Coordinators (the category's owning organizations; any organization when it has none);
 *   - a category WITH coordinators: only those, the bishopric, and Ward council leaders when
 *     "Any ward council may create" is ticked;
 *   - a category WITHOUT coordinators: leaders (Org editor / Ward council) of its owning
 *     organizations, anyone with base rights when it has no owning organization, and Ward
 *     council leaders when "Any ward council may create" is ticked.
 * Coordinators also see and edit every post of their categories, of any organization. The
 * Coordinator box alone gives nothing: a category must list them.
 * categories: Categories rows (optional; without them only the base rights apply).
 */
function leaderAccess(leader, organizations, categories, defaultApprovers) {
  var orgs = (organizations || []).slice();
  var bishopric = isTicked(leader.Bishopric);
  var wardCouncil = isTicked(leader['Ward council']);
  var orgEditor = isTicked(leader['Org editor']);
  var own = str_(leader.Organization);
  var ownList = orgs.indexOf(own) >= 0 ? [own] : [];
  var edit = bishopric ? orgs : wardCouncil || orgEditor ? ownList : [];
  var me = normEmail(leader.Email);
  var coordinated = [];
  var catOrgs = {};
  var catIds = [];
  // Decision 24: where this leader is a configured approver (a category's Approvers, or
  // default_approvers for categories without their own).
  var defaults = uniq_(splitList(defaultApprovers).filter(isEmail).map(normEmail));
  var inDefault = !!me && defaults.indexOf(me) >= 0;
  var approverCats = {};
  var listedAnywhere = inDefault;
  (categories || []).forEach(function (c) {
    var id = str_(c.Id);
    if (!id || c.Kind !== CATEGORY_KIND.opportunity || isTicked(c.Archived)) return;
    catIds.push(id);
    var ownApprovers = splitList(c.Approvers).filter(isEmail).map(normEmail);
    var listed = ownApprovers.length ? !!me && ownApprovers.indexOf(me) >= 0 : inDefault;
    approverCats[id] = listed;
    if (!!me && ownApprovers.indexOf(me) >= 0) listedAnywhere = true;
    var coords = splitList(c.Coordinators).filter(isEmail).map(normEmail);
    var owners = splitList(c['Owning organizations']).filter(function (o) {
      return orgs.indexOf(o) >= 0;
    });
    var isCoord = !!me && coords.indexOf(me) >= 0;
    var wcFlag = wardCouncil && isTicked(c['Any ward council may create']);
    if (isCoord) coordinated.push(id);
    var allowed;
    if (bishopric) allowed = orgs.slice();
    else if (isCoord) allowed = owners.length ? owners : orgs.slice();
    else if (coords.length) allowed = wcFlag ? (owners.length ? owners : ownList.slice()) : [];
    else if (owners.length) {
      allowed = owners.filter(function (o) {
        return edit.indexOf(o) >= 0 || wcFlag;
      });
    } else allowed = uniq_(edit.concat(wcFlag ? ownList : []));
    if (allowed.length) catOrgs[id] = allowed;
  });
  var create = edit.slice();
  Object.keys(catOrgs).forEach(function (id) {
    create = create.concat(catOrgs[id]);
  });
  return {
    isBishopric: bishopric,
    seeAllNames: bishopric || wardCouncil,
    editOrgs: edit.slice(),
    createOrgs: uniq_(create),
    baseCreateOrgs: edit.slice(),
    categories: coordinated,
    catOrgs: catOrgs,
    catIds: catIds,
    approverCats: approverCats,
    inDefaultApprovers: inDefault,
    isApprover: bishopric || listedAnywhere,
  };
}

/** Organizations a new post may belong to: the base ones without a category, else the category's rule. */
function allowedOrgsFor_(access, category) {
  var cat = str_(category);
  if (!cat) return (access.baseCreateOrgs || access.createOrgs || []).slice();
  return ((access.catOrgs && access.catOrgs[cat]) || []).slice();
}

function coordinates_(access, post) {
  return !!post.Category && (access.categories || []).indexOf(String(post.Category)) >= 0;
}

function canSeePost(access, post) {
  // A configured approver also sees the posts they approve for (decision 24), without editing.
  return !!(access.seeAllNames || access.editOrgs.indexOf(post.Organization) >= 0 || coordinates_(access, post) || approvesPost_(access, post));
}

/**
 * Who may edit a post: its creator; the bishopric; its category's coordinators (any
 * organization); otherwise whoever may create a post in its category for its organization (the
 * base organization rights when it has no category, or a category the Categories tab no longer
 * lists).
 */
function canEditPost(access, leaderEmail, post) {
  var me = normEmail(leaderEmail);
  if (me && normEmail(post['Created by']) === me) return true;
  if (access.isBishopric || coordinates_(access, post)) return true;
  var cat = str_(post.Category);
  if (cat && (access.catIds || []).indexOf(cat) >= 0) return allowedOrgsFor_(access, cat).indexOf(post.Organization) >= 0;
  return access.editOrgs.indexOf(post.Organization) >= 0;
}

/**
 * Who hears about a cancellation: the post's creator (while still on the Leaders tab) and the
 * Leaders with Org editor ticked in the post's organization. Normalized and de-duplicated.
 */
function noticeRecipients(post, leaders) {
  var onTab = {};
  leaders.forEach(function (l) {
    onTab[normEmail(l.Email)] = true;
  });
  var out = [];
  var creator = normEmail(post['Created by']);
  if (creator && onTab[creator]) out.push(creator);
  leaders.forEach(function (l) {
    if (isTicked(l['Org editor']) && str_(l.Organization) === post.Organization && isEmail(l.Email)) {
      out.push(normEmail(l.Email));
    }
  });
  return uniq_(out);
}

/**
 * The spec section 7.3 limits. counts: {addressToday, totalToday, postMinute, leaderLinksToday}
 * (counts before this attempt); limits: {perAddress, perDay, perPostMinute, leaderLinks}.
 * Returns null, or the name of the first limit reached.
 */
function rateCheck(counts, limits) {
  var c = counts || {};
  if ((c.addressToday || 0) >= limits.perAddress) return 'perAddress';
  if ((c.totalToday || 0) >= limits.perDay) return 'perDay';
  if ((c.postMinute || 0) >= limits.perPostMinute) return 'perPostMinute';
  if ((c.leaderLinksToday || 0) >= limits.leaderLinks) return 'leaderLinks';
  return null;
}

// ---------- timed rules: nudges, lapses, warnings, Needs help soon ----------

function keySent_(sentKeys, key) {
  if (!sentKeys) return false;
  if (Array.isArray(sentKeys)) return sentKeys.indexOf(key) >= 0;
  return !!sentKeys[key];
}

/**
 * [{postId, date, key}]: a post date with a Waiting-approval sign-up whose role starts within the
 * next 48 hours (and hasn't started). One per post and date; key 'postId|date' is skipped once it
 * is in sentKeys.
 */
function nudgesDue(signups, slotsById, postsById, nowLocal, sentKeys) {
  var limit = localMinusHours(nowLocal, -NUDGE_HOURS);
  var seen = {};
  var out = [];
  (signups || []).forEach(function (s) {
    if (s.Status !== SIGNUP_STATUS.waitingApproval) return;
    var slot = slotsById[s['Slot id']];
    var post = postsById[s['Post id']];
    if (!slot || !post) return;
    if (post.Status === POST_STATUS.past || post.Status === POST_STATUS.cancelled) return;
    var start = slotStart(slot);
    if (start < nowLocal || start > limit) return;
    var key = post['Post id'] + '|' + slot.Date;
    if (seen[key] || keySent_(sentKeys, key)) return;
    seen[key] = true;
    out.push({ postId: post['Post id'], date: slot.Date, key: key });
  });
  return out;
}

/** Sign-up ids still waiting (email or approval) whose date has passed, or whose role is gone. */
function lapsesDue(signups, slotsById, todayLocal) {
  return (signups || [])
    .filter(function (s) {
      if (!isWaitingSignup_(s.Status)) return false;
      var slot = slotsById[s['Slot id']];
      return !slot || slot.Date < todayLocal;
    })
    .map(function (s) {
      return s['Sign-up id'];
    });
}

/** A category's warning lead time in hours: blank → 48; 0 or not a number → off (0); at most 336. */
function warnHours_(category) {
  var v = category ? category['Warn hours'] : '';
  if (v === '' || v === null || v === undefined) return DEFAULT_WARN_HOURS;
  var n = Number(v);
  if (!isFinite(n) || n <= 0) return 0;
  return Math.min(336, Math.floor(n));
}

/**
 * [{postId, date, key, short: [{slotId, role, start, filled, needed}]}]: for each Open post date
 * (its earliest start) within its category's Warn hours and not yet started, when any role on it
 * is short. Once per post and date (key 'postId|date' in sentKeys).
 */
function warningsDue(posts, slotsByPost, counts, categoriesById, nowLocal, sentKeys) {
  var out = [];
  (posts || []).forEach(function (p) {
    if (p.Status !== POST_STATUS.open) return;
    var cat = categoriesById[p.Category];
    var hours = warnHours_(cat);
    if (!cat || !hours) return;
    var limit = localMinusHours(nowLocal, -hours);
    var byDate = {};
    (slotsByPost[p['Post id']] || []).forEach(function (sl) {
      (byDate[sl.Date] = byDate[sl.Date] || []).push(sl);
    });
    Object.keys(byDate)
      .sort()
      .forEach(function (date) {
        var slots = byDate[date].slice().sort(slotOrder_);
        var start = slotStart(slots[0]);
        if (start < nowLocal || start > limit) return;
        var key = p['Post id'] + '|' + date;
        if (keySent_(sentKeys, key)) return;
        var short = [];
        slots.forEach(function (sl) {
          var needed = Number(sl.Needed) || 0;
          var filled = filledOf_(counts, sl['Slot id']);
          if (filled < needed) short.push({ slotId: sl['Slot id'], role: sl.Role, start: sl.Start || '', filled: filled, needed: needed });
        });
        if (short.length) out.push({ postId: p['Post id'], date: date, key: key, short: short });
      });
  });
  return out;
}

/**
 * Short roles of Open posts dated today through the next 14 days, by date and time:
 * [{postId, publicId, title, organization, category, date, start, end, role, filled, needed}].
 */
function needsHelpSoon(posts, slotsByPost, counts, todayLocal) {
  var last = addDays(todayLocal, NEEDS_HELP_DAYS);
  var rows = [];
  (posts || []).forEach(function (p) {
    if (p.Status !== POST_STATUS.open) return;
    (slotsByPost[p['Post id']] || []).forEach(function (sl) {
      if (sl.Date < todayLocal || sl.Date > last) return;
      var needed = Number(sl.Needed) || 0;
      var filled = filledOf_(counts, sl['Slot id']);
      if (filled >= needed) return;
      rows.push({
        postId: p['Post id'],
        publicId: p['Public id'],
        title: p.Title,
        organization: p.Organization,
        category: p.Category,
        date: sl.Date,
        start: sl.Start || '',
        end: sl.End || '',
        role: sl.Role,
        filled: filled,
        needed: needed,
      });
    });
  });
  return rows.sort(function (a, b) {
    return cmpLocal(a.date + ' ' + (a.start || '00:00'), b.date + ' ' + (b.start || '00:00')) || cmpLocal(a.title, b.title);
  });
}

// ===== 05-requests-rules.js =====

/**
 * Request and sharing rules. Pure: plain objects in, plain objects out.
 * (REQUEST_HEADERS and REQUEST_STATUS live in 00-config.js with the other headers.)
 */

/**
 * The bishopric: every Leaders row with Bishopric ticked (the bishop, both counselors, the
 * Executive Secretary and the Ward Clerk). The Calling text decides nothing. Normalized and
 * de-duplicated. (Decision 14: they edit the Service Sheet and read the confidential requests.)
 */
function bishopricEmails(leaders) {
  return uniq_(
    leaders
      .filter(function (l) {
        return isTicked(l.Bishopric) && isEmail(l.Email);
      })
      .map(function (l) {
        return normEmail(l.Email);
      })
  );
}

/**
 * Who reads a request category's folder: the whole bishopric and its Coordinators, plus (unless
 * confidential) the Leaders whose Organization owns the category. Decision 18: the bishopric
 * opens every request folder. Normalized and de-duplicated.
 */
function requestReaders(category, leaders) {
  var out = bishopricEmails(leaders).concat(
    splitList(category.Coordinators)
      .filter(isEmail)
      .map(normEmail)
  );
  if (isTicked(category.Confidential)) return uniq_(out);
  var owners = splitList(category['Owning organizations']);
  leaders.forEach(function (l) {
    if (!isEmail(l.Email)) return;
    if (owners.indexOf(String(l.Organization == null ? '' : l.Organization).trim()) >= 0) out.push(normEmail(l.Email));
  });
  return uniq_(out);
}

/** The owning organizations' leaders: Org editor or Ward council ticked, Organization listed. */
function ownerLeaderEmails_(category, leaders) {
  var owners = splitList(category['Owning organizations']);
  return leaders
    .filter(function (l) {
      return (
        isEmail(l.Email) &&
        (isTicked(l['Org editor']) || isTicked(l['Ward council'])) &&
        owners.indexOf(String(l.Organization == null ? '' : l.Organization).trim()) >= 0
      );
    })
    .map(function (l) {
      return normEmail(l.Email);
    });
}

/**
 * Who gets a request kind's "new request" notice: {to, dropped}. Blank Notify: every reader.
 * Otherwise Notify is a comma list where `Bishop` means the Leaders whose Calling is Bishop,
 * `Coordinators` means the category's Coordinators, `Owners` means the owning organizations'
 * leaders (Org editor or Ward council ticked), and anything else must be an email address. Only readers of the category's folder can get the
 * notice; everyone else, and anything that isn't an address, goes into dropped. If nobody is
 * left, every reader gets it (a notice holds no request details, and silence would lose it).
 */
function requestNotifyList(category, leaders) {
  var readers = requestReaders(category, leaders);
  var entries = splitList(category.Notify);
  if (!entries.length) return { to: readers, dropped: [] };
  var wanted = [];
  var junk = [];
  entries.forEach(function (entry) {
    if (String(entry).trim().toLowerCase() === 'bishop') {
      leaders.forEach(function (l) {
        var c = String(l.Calling == null ? '' : l.Calling).trim().toLowerCase();
        if (c === 'bishop' && isEmail(l.Email)) wanted.push(normEmail(l.Email));
      });
    } else if (String(entry).trim().toLowerCase() === 'owners') {
      wanted = wanted.concat(ownerLeaderEmails_(category, leaders));
    } else if (String(entry).trim().toLowerCase() === 'coordinators') {
      splitList(category.Coordinators).forEach(function (e) {
        if (isEmail(e)) wanted.push(normEmail(e));
      });
    } else if (isEmail(entry)) {
      wanted.push(normEmail(entry));
    } else {
      junk.push(String(entry).trim());
    }
  });
  var to = [];
  var notReaders = [];
  uniq_(wanted).forEach(function (e) {
    if (readers.indexOf(e) >= 0) to.push(e);
    else notReaders.push(e);
  });
  return { to: to.length ? to : readers, dropped: uniq_(notReaders.concat(junk)) };
}

/** Administrators for alert emails: Leaders whose Calling is Bishop or Executive Secretary. */
function adminEmails(leaders) {
  return uniq_(
    leaders
      .filter(function (l) {
        var c = String(l.Calling == null ? '' : l.Calling).trim().toLowerCase();
        return isEmail(l.Email) && (c === 'bishop' || c === 'executive secretary');
      })
      .map(function (l) {
        return normEmail(l.Email);
      })
  );
}

function isClosedStatus_(status) {
  return status === 'Done' || status === 'Declined';
}

/** [{row, closedOn}]: Done/Declined rows without a Closed on get today; reopened rows lose it. */
function stampClosed(rows, todayLocal) {
  var out = [];
  rows.forEach(function (r) {
    var closed = isClosedStatus_(r.Status);
    if (closed && !r['Closed on']) out.push({ row: r, closedOn: todayLocal.slice(0, 10) });
    else if (!closed && r['Closed on']) out.push({ row: r, closedOn: '' });
  });
  return out;
}

/** Closed rows whose Closed on is 30 or more days ago. */
function rowsToPurge(rows, todayLocal) {
  var cutoff = addDays(todayLocal.slice(0, 10), -REQUEST_KEEP_DAYS);
  return rows.filter(function (r) {
    return isClosedStatus_(r.Status) && isDateStr(r['Closed on']) && r['Closed on'] <= cutoff;
  });
}

/** Everything the purge keeps. */
function rowsToCarry(rows, todayLocal) {
  var purge = rowsToPurge(rows, todayLocal);
  return rows.filter(function (r) {
    return purge.indexOf(r) < 0;
  });
}

/** True when the request sheet's month is not this month. */
function needsRotation(lastMonth, todayLocal) {
  return !!lastMonth && String(lastMonth) !== String(todayLocal).slice(0, 7);
}

/**
 * What to change so file access matches. current/desired: {email: role}. Never removes or
 * changes the owner.
 */
function sharingDiff(current, desired, ownerEmail) {
  var owner = normEmail(ownerEmail);
  var cur = {};
  Object.keys(current || {}).forEach(function (e) {
    cur[normEmail(e)] = current[e];
  });
  var want = {};
  Object.keys(desired || {}).forEach(function (e) {
    want[normEmail(e)] = desired[e];
  });
  var out = { add: [], change: [], remove: [] };
  Object.keys(want).forEach(function (e) {
    if (e === owner || cur[e] === 'owner') return;
    if (!(e in cur)) out.add.push({ email: e, role: want[e] });
    else if (cur[e] !== want[e]) out.change.push({ email: e, role: want[e] });
  });
  Object.keys(cur).forEach(function (e) {
    if (e === owner || cur[e] === 'owner') return;
    if (!(e in want)) out.remove.push(e);
  });
  return out;
}

// ===== 06-mail.js =====

/**
 * Mail: one recipient per message, the independence footer on every email, an Outbox in the
 * System Sheet and a daily reserve (spec section 7.2). A normal message that would take the
 * remaining quota to the reserve or below waits in the Outbox; high-priority messages
 * (reminders, cancel notices, request notices, admin alerts) may use the reserve.
 */

/** One Log line in the System Sheet. Never throws. */
function log_(what, detail) {
  try {
    systemTab_(SYS_TAB.log).append({ At: nowLocal_(), What: String(what), Detail: clip(detail, 500) });
  } catch (e) {
    try {
      console.error('log failed: ' + what + ' | ' + detail + ' | ' + e);
    } catch (e2) {
      // nothing more to do
    }
  }
}

function emailFooterHtml_(s) {
  var html =
    '<hr style="border:none;border-top:1px solid #dde3ed;margin:24px 0 12px">' +
    '<p style="font-size:12px;color:#6b7a8d;margin:0 0 6px">' + esc(EMAIL_FOOTER) + '</p>';
  if (s.contact_email) {
    html +=
      '<p style="font-size:12px;color:#6b7a8d;margin:0">Contact: <a href="mailto:' + esc(s.contact_email) + '">' +
      esc(s.contact_email) + '</a></p>';
  }
  return html;
}

function emailFooterText_(s) {
  return '\n\n--\n' + EMAIL_FOOTER + (s.contact_email ? '\nContact: ' + s.contact_email : '');
}

function mailFrom_(s) {
  return { name: (s.ward_name || 'Ward') + ' Service', replyTo: s.contact_email || '' };
}

function budgetAllows_(priority, reserve) {
  var q = mailQuota_();
  return priority === 'high' ? q > 0 : q - 1 > reserve;
}

/**
 * msg: {to, subject, html, text, priority: 'high'|'normal'} → 'sent' | 'queued' | 'refused' | 'dropped'
 * ('dropped': test mode with no valid test address; see sendMailNow_).
 */
function sendOrQueue_(msg) {
  var s = settings_();
  var to = String(msg.to == null ? '' : msg.to).trim();
  if (!isEmail(to)) {
    log_('bad recipient', clip(to, 100) + ' | ' + msg.subject);
    return 'refused';
  }
  to = normEmail(to);
  var priority = msg.priority === 'high' ? 'high' : 'normal';
  var html = '<div style="font-family:Georgia,serif;color:#2c3a4a;line-height:1.5">' + msg.html + emailFooterHtml_(s) + '</div>';
  var text = msg.text + emailFooterText_(s);
  var from = mailFrom_(s);
  var error = '';
  if (budgetAllows_(priority, s.email_reserve)) {
    try {
      var how = sendMailNow_({ to: to, subject: msg.subject, html: html, text: text, name: from.name, replyTo: from.replyTo });
      // Test mode may have dropped it (logged there) or sent it to the test address instead.
      if (how === 'dropped') return 'dropped';
      log_('mail sent', to + ' | ' + msg.subject + (how === 'redirected' ? ' | redirected to test address' : ''));
      return 'sent';
    } catch (e) {
      error = clip(e && e.message ? e.message : e, 300);
      log_('mail error', to + ' | ' + msg.subject + ' | ' + error);
    }
  }
  // Test mode decides here too: a queued email is stored already addressed to the tester (or not
  // queued at all with no valid test address), so it can't reach the real person later.
  var route = testMailRoute_(to, msg.subject);
  if (route.how === 'dropped') {
    log_('test mode: not sent (test_mail_only has no valid address)', to + ' | ' + msg.subject);
    return 'dropped';
  }
  if (route.how === 'redirected') log_('mail queued', to + ' | ' + msg.subject + ' | redirected to test address');
  systemTab_(SYS_TAB.outbox).append({
    Id: newId_('m'),
    'Queued at': nowLocal_(),
    To: route.to,
    Subject: route.subject,
    Html: html,
    Text: text,
    Priority: priority,
    Status: 'Queued',
    Error: error,
  });
  return 'queued';
}

/**
 * Sends queued mail: high before normal, oldest first, same budget rule. Sent rows are deleted;
 * a send error marks the row Failed. Only the 10-minute trigger drains, so runs never overlap;
 * the lock is held only to read and to write back, not while sending.
 */
function drainOutbox_() {
  var s = settings_();
  var from = mailFrom_(s);
  // Test mode with no valid address: send nothing and keep every row (some may be real mail
  // queued before test mode was turned on). One Log line per run.
  var test = testMailList_(s.test_mail_only);
  if (test.on && !test.catchAll) {
    var waiting = systemTab_(SYS_TAB.outbox)
      .rows()
      .filter(function (r) {
        return r.Status === 'Queued';
      }).length;
    if (waiting) log_('test mode: Outbox kept (test_mail_only has no valid address)', waiting + ' waiting');
    return { sent: 0, left: waiting };
  }
  var queued = withLock_(function () {
    return systemTab_(SYS_TAB.outbox)
      .rows()
      .filter(function (r) {
        return r.Status === 'Queued';
      });
  });
  queued.sort(function (a, b) {
    var pa = a.Priority === 'high' ? 0 : 1;
    var pb = b.Priority === 'high' ? 0 : 1;
    if (pa !== pb) return pa - pb;
    var t = cmpLocal(a['Queued at'], b['Queued at']);
    return t || a._row - b._row;
  });
  var sentIds = {};
  var redirected = {};
  var dropped = {};
  var failed = {};
  var sent = 0;
  var left = 0;
  queued.forEach(function (m) {
    var priority = m.Priority === 'high' ? 'high' : 'normal';
    if (!budgetAllows_(priority, s.email_reserve)) {
      left++;
      return;
    }
    try {
      var how = sendMailNow_({ to: m.To, subject: m.Subject, html: m.Html, text: m.Text, name: from.name, replyTo: from.replyTo });
      // Dropped (test mode lost its valid address mid-run): the row stays queued.
      if (how === 'dropped') {
        dropped[m.Id] = true;
        left++;
        return;
      }
      sentIds[m.Id] = true;
      if (how === 'redirected') redirected[m.Id] = true;
      sent++;
    } catch (e) {
      failed[m.Id] = clip(e && e.message ? e.message : e, 300);
    }
  });
  withLock_(function () {
    var t = systemTab_(SYS_TAB.outbox);
    var rows = t.rows();
    rows.forEach(function (r) {
      if (failed[r.Id]) t.update(r, { Status: 'Failed', Error: failed[r.Id] });
    });
    t.removeMany(
      rows.filter(function (r) {
        return sentIds[r.Id];
      })
    );
  });
  queued.forEach(function (m) {
    if (sentIds[m.Id]) log_('mail sent', m.To + ' | ' + m.Subject + (redirected[m.Id] ? ' | redirected to test address' : ''));
    if (failed[m.Id]) log_('mail error', m.To + ' | ' + m.Subject + ' | ' + failed[m.Id]);
  });
  return { sent: sent, left: left };
}

// ---------- formatting ----------

var GP_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var GP_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 'Thu, Dec 3' */
function fmtDateShort_(dateStr) {
  if (!isDateStr(dateStr)) return String(dateStr || '');
  return GP_DAYS[weekday(dateStr)].slice(0, 3) + ', ' + GP_MONTHS[+dateStr.slice(5, 7) - 1].slice(0, 3) + ' ' + +dateStr.slice(8, 10);
}

/** 'Thursday, December 3' */
function fmtDateLong_(dateStr) {
  if (!isDateStr(dateStr)) return String(dateStr || '');
  return GP_DAYS[weekday(dateStr)] + ', ' + GP_MONTHS[+dateStr.slice(5, 7) - 1] + ' ' + +dateStr.slice(8, 10);
}

/** '6:30 PM' */
function fmtTime_(t) {
  if (!isTimeStr(t)) return '';
  var h = +t.slice(0, 2);
  return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');
}

/** 'Thursday, December 3, 6:30 PM–7:30 PM' */
function fmtWhen_(slot) {
  var w = fmtDateLong_(slot.Date);
  if (slot.Start) w += ', ' + fmtTime_(slot.Start) + (slot.End ? '–' + fmtTime_(slot.End) : '');
  return w;
}

function paras_(lines) {
  return lines
    .map(function (l) {
      return '<p style="margin:0 0 12px">' + l + '</p>';
    })
    .join('');
}

function button_(url, label) {
  return (
    '<p style="margin:16px 0"><a href="' + esc(url) + '" style="display:inline-block;background:#1d3557;color:#ffffff;' +
    'text-decoration:none;padding:10px 18px;border-radius:8px">' + esc(label) + '</a></p>'
  );
}

function contactLine_(s) {
  return s.contact_email ? ' or write to ' + s.contact_email : '';
}

// ---------- templates (each returns {subject, html, text}) ----------

/** "You're signed up" or "Ana is signed up" (a parent signing up a child). */
function whoServes_(signup) {
  var child = String(signup['Child first name'] || '').trim();
  return child ? { text: child + ' is', html: esc(child) + ' is' } : { text: "You're", html: "You're" };
}

function detailsBlock_(post) {
  var d = post['Private details'];
  if (!d) return { text: '', html: '' };
  return {
    text: 'Details (please keep them private):\n' + d,
    html: paras_(['<strong>Details</strong> (please keep them private):<br>' + esc(d).replace(/\n/g, '<br>')]),
  };
}

/** otherWays: [{title, filled, needed, url}] — other open posts, fill levels only. */
function otherWaysBlock_(otherWays) {
  var list = (otherWays || []).slice(0, 10);
  if (!list.length) return { text: '', html: '' };
  var line = function (o) {
    return o.title + ': ' + o.filled + ' of ' + o.needed + ' filled';
  };
  return {
    text: 'Other ways to serve:\n' + list.map(function (o) {
      return line(o) + ' ' + o.url;
    }).join('\n'),
    html: paras_([
      '<strong>Other ways to serve</strong><br>' + list.map(function (o) {
        return '<a href="' + esc(o.url) + '">' + esc(o.title) + '</a>: ' + esc(o.filled + ' of ' + o.needed + ' filled');
      }).join('<br>'),
    ]),
  };
}

/**
 * The sign-up counts. opts: {cancelUrl, meUrl, details (true only for a confirmed and approved
 * volunteer or a leader), otherWays}.
 */
function tplSignupConfirmed_(s, post, slot, signup, opts) {
  opts = opts || {};
  var when = fmtWhen_(slot);
  var who = whoServes_(signup);
  var details = opts.details ? detailsBlock_(post) : { text: '', html: '' };
  var other = otherWaysBlock_(opts.otherWays);
  var text = [
    'Hi ' + signup.Name + ',',
    who.text + ' signed up for ' + slot.Role + ' on ' + when + ' (' + post.Title + ').',
    signup.Bringing ? 'Bringing: ' + signup.Bringing : '',
    details.text,
    "Can't make it? Cancel here: " + opts.cancelUrl,
    opts.meUrl ? 'All your sign-ups: ' + opts.meUrl : '',
    other.text,
    'Thank you for serving.',
  ].filter(String);
  var html =
    paras_([
      'Hi ' + esc(signup.Name) + ',',
      who.html + ' signed up for <strong>' + esc(slot.Role) + '</strong> on ' + esc(when) + ' (' + esc(post.Title) + ').',
    ]) +
    (signup.Bringing ? paras_(['Bringing: ' + esc(signup.Bringing)]) : '') +
    details.html +
    button_(opts.cancelUrl, 'Cancel my sign-up') +
    (opts.meUrl ? paras_(['<a href="' + esc(opts.meUrl) + '">See all your sign-ups</a>']) : '') +
    other.html +
    paras_(['Thank you for serving.']);
  return { subject: "You're signed up: " + post.Title, html: html, text: text.join('\n\n') };
}

/** The sign-up counted after the role already had its number: stay, or withdraw. */
function tplOverLimit_(s, post, slot, signup, opts) {
  opts = opts || {};
  var when = fmtWhen_(slot);
  var details = opts.details ? detailsBlock_(post) : { text: '', html: '' };
  var line = 'Thank you! ' + slot.Role + ' on ' + when + ' (' + post.Title + ') already has the people it needs: others signed up while yours was waiting.';
  var more = 'You are still signed up and welcome to come. If you would rather step back, withdraw your offer with the button below. Nobody is told; the role stays full.';
  var text = [
    'Hi ' + signup.Name + ',',
    line,
    more,
    'Withdraw my offer: ' + opts.withdrawUrl,
    details.text,
    opts.meUrl ? 'All your sign-ups: ' + opts.meUrl : '',
  ].filter(String);
  var html =
    paras_(['Hi ' + esc(signup.Name) + ',', esc(line), esc(more)]) +
    button_(opts.withdrawUrl, 'Withdraw my offer') +
    details.html +
    (opts.meUrl ? paras_(['<a href="' + esc(opts.meUrl) + '">See all your sign-ups</a>']) : '');
  return { subject: 'Thank you: ' + post.Title + ' already has the people it needs', html: html, text: text.join('\n\n') };
}

/** First time: confirm this address. Nothing private. */
function tplConfirmAddress_(s, post, slot, signup, confirmUrl) {
  var when = fmtWhen_(slot);
  var lines = [
    'Hi ' + signup.Name + ',',
    'Please confirm this is your email address so your sign-up for ' + slot.Role + ' on ' + when + ' (' + post.Title + ') can go ahead. The link works for 48 hours.',
    'After you confirm, one of the ward leaders looks at your sign-up, and we email you when it counts.',
    "If you didn't sign up, ignore this email.",
  ];
  return {
    subject: 'Please confirm your email: ' + post.Title,
    html: paras_(lines.slice(0, 2).map(esc)) + button_(confirmUrl, 'Confirm my address') + paras_(lines.slice(2).map(esc)),
    text: lines.slice(0, 2).join('\n\n') + '\n\nConfirm my address: ' + confirmUrl + '\n\n' + lines.slice(2).join('\n\n'),
  };
}

/** A declined or revoked address tried to sign up. Says nothing else. */
function tplContactToSignUp_(s) {
  var line = 'Thank you for offering to help. Please contact ' + (s.contact_email || "the ward's leaders") + ' to sign up.';
  return { subject: 'About your sign-up', html: paras_([esc(line)]), text: line };
}

/** An approved address asked for a role that was already full. */
function tplRoleFull_(s, post, slot) {
  var line = slot.Role + ' on ' + fmtWhen_(slot) + ' (' + post.Title + ') filled up before your sign-up arrived, so you are not signed up for it.';
  var more = 'Thank you for offering. Other dates and roles may still need help on the same page.';
  return { subject: 'This role is already filled: ' + post.Title, html: paras_([esc(line), esc(more)]), text: [line, more].join('\n\n') };
}

/** To approvers: someone new is waiting. Name only (they see the email on the leader page). */
function tplWaitingNotice_(s, name, items) {
  var list = items.map(function (it) {
    return it.slot.Role + ', ' + fmtWhen_(it.slot) + ' (' + it.post.Title + ')';
  });
  var line = name + ' is waiting for your approval to serve. They signed up for:';
  var more = 'Open your leader page and choose Waiting for approval to approve or decline.';
  return {
    subject: 'Waiting for approval: ' + name,
    html: paras_([esc(line), list.map(esc).join('<br>'), esc(more)]),
    text: [line, list.join('\n'), more].join('\n\n'),
  };
}

/** To approvers, 48 hours ahead: sign-ups on this date still wait for approval. No names. */
function tplNudge_(s, post, date, count) {
  var line =
    count + (count === 1 ? ' sign-up' : ' sign-ups') + ' for ' + post.Title + ' on ' + fmtDateLong_(date) +
    (count === 1 ? ' is' : ' are') + ' still waiting for approval, and the date is less than 48 hours away.';
  var more = 'Open your leader page and choose Waiting for approval to approve or decline.';
  return { subject: 'Urgent: waiting for approval: ' + post.Title, html: paras_([esc(line), esc(more)]), text: [line, more].join('\n\n') };
}

/** To a category's coordinators and Also warn: a post date is still short. short: [{role, start, filled, needed}]. */
function tplWarning_(s, post, date, short, url) {
  var line = post.Title + ' on ' + fmtDateLong_(date) + ' is still short:';
  var list = short.map(function (r) {
    return (r.start ? fmtTime_(r.start) + ' ' : '') + r.role + ': ' + r.filled + ' of ' + r.needed + ' filled';
  });
  var more = 'The public page, to share: ' + url;
  return {
    subject: 'Still short: ' + post.Title + ', ' + fmtDateShort_(date),
    html: paras_([esc(line), list.map(esc).join('<br>'), 'The public page, to share: <a href="' + esc(url) + '">' + esc(url) + '</a>']),
    text: [line, list.join('\n'), more].join('\n\n'),
  };
}

/** "Email me my link" from the My sign-ups page. */
function tplMeLink_(s, url) {
  var lines = [
    'Here is the link to your sign-ups with ' + (s.ward_name || 'the ward') + '. It shows what you signed up for, lets you cancel, and lists other ways to serve.',
    'Keep it to yourself: anyone with this link can see and cancel your sign-ups. A newer link replaces this one.',
  ];
  return { subject: 'Your sign-ups: ' + (s.ward_name || 'ward'), html: paras_(lines.map(esc)) + button_(url, 'See my sign-ups'), text: lines.join('\n\n') + '\n\n' + url };
}

/** A leader approved this address. Each sign-up that now counts gets its own email. */
function tplApproved_(s, volunteer) {
  var ward = s.ward_name || 'the ward';
  var lines = [
    'Hi ' + volunteer.Name + ',',
    'Thank you for offering to serve. A leader has approved your address, so your sign-ups in ' + ward + ' now count and new ones count at once.',
    'Each sign-up gets its own email with the details you need and a link to cancel.',
  ];
  return { subject: "You're approved to serve: " + ward, html: paras_(lines.map(esc)), text: lines.join('\n\n') };
}

/** To the post's leaders and coordinators: every role has its number. */
function tplFullyFilled_(s, post) {
  var line = post.Title + ' is fully filled: every role has the people it needs.';
  return { subject: 'Fully filled: ' + post.Title, html: paras_([esc(line), 'See who is signed up on your leader page.']), text: line + '\n\nSee who is signed up on your leader page.' };
}

/** details: true only for a confirmed sign-up of an approved volunteer or a leader. */
function tplReminder_(s, post, slot, signup, cancelUrl, details) {
  var when = fmtWhen_(slot);
  var who = whoServes_(signup);
  var d = details ? detailsBlock_(post) : { text: '', html: '' };
  var text = [
    'Hi ' + signup.Name + ',',
    'A reminder: ' + who.text.replace("You're", 'you are') + ' signed up for ' + slot.Role + ' tomorrow, ' + when + ' (' + post.Title + ').',
    signup.Bringing ? 'Bringing: ' + signup.Bringing : '',
    d.text,
    "Can't make it after all? Cancel here: " + cancelUrl,
  ].filter(String);
  var html =
    paras_([
      'Hi ' + esc(signup.Name) + ',',
      'A reminder: ' + who.html.replace("You're", 'you are') + ' signed up for <strong>' + esc(slot.Role) + '</strong> tomorrow, ' + esc(when) + ' (' + esc(post.Title) + ').',
    ]) +
    (signup.Bringing ? paras_(['Bringing: ' + esc(signup.Bringing)]) : '') +
    d.html +
    button_(cancelUrl, 'Cancel my sign-up');
  return { subject: 'Reminder: ' + post.Title + ' tomorrow', html: html, text: text.join('\n\n') };
}

function tplCancelNotice_(s, post, slot, signup, late, stillFull) {
  var short = late && !stillFull;
  var when = fmtWhen_(slot);
  var child = String(signup['Child first name'] || '').trim();
  var line = signup.Name + (child ? ' (for ' + child + ')' : '') + ' cancelled ' + slot.Role + ' on ' + when + ' (' + post.Title + ').';
  var more = stillFull
    ? 'The role still has the people it needs (it was over-filled), so nothing else is needed.'
    : short
      ? 'This came in after the cancel cutoff, so the role is now short. You may want to find someone.'
      : 'The role is open again on the public page.';
  return {
    subject: (short ? "You're now short: " : 'Cancellation: ') + post.Title,
    html: paras_([esc(line), esc(more), 'See who is signed up on your leader page.']),
    text: [line, more, 'See who is signed up on your leader page.'].join('\n\n'),
  };
}

function tplRemoved_(s, post, slot) {
  var when = fmtWhen_(slot);
  var line = 'A leader removed your sign-up for ' + slot.Role + ' on ' + when + ' (' + post.Title + ').';
  var more = 'If you think this is a mistake, reply to this email' + contactLine_(s) + '.';
  return { subject: 'Your sign-up was removed: ' + post.Title, html: paras_([esc(line), esc(more)]), text: [line, more].join('\n\n') };
}

function tplLeaderLink_(s, leader, url) {
  var lines = [
    'Hi ' + leader.Name + ',',
    'Here is your leader link for the ' + (s.ward_name || 'ward') + ' Service Portal. It works for ' + LEADER_LINK_DAYS + ' days.',
    'Keep it to yourself: anyone who has this link can act as you on the leader page.',
  ];
  return {
    subject: 'Your leader link: ' + (s.ward_name || 'ward') + ' Service Portal',
    html: paras_(lines.map(esc)) + button_(url, 'Open my leader page'),
    text: lines.join('\n\n') + '\n\n' + url,
  };
}

/**
 * A post (whole = true) or some of its dates were called off. slots: the volunteer's own slots.
 * note: the leader's optional note (escaped like every value).
 */
function tplPostCancelled_(s, post, slots, note, whole) {
  var when = slots
    .filter(function (sl) {
      return sl;
    })
    .map(function (sl) {
      return sl.Role + ', ' + fmtWhen_(sl);
    });
  var line = whole
    ? post.Title + ' has been cancelled, so you no longer need to come.'
    : 'A date of ' + post.Title + ' has been cancelled, so you no longer need to come then.';
  var text = [
    line,
    'You had signed up for:\n' + when.join('\n'),
    note ? 'Note from the leader: ' + note : '',
    'Thank you for being willing to serve.',
  ].filter(String);
  var html =
    paras_([esc(line), 'You had signed up for:<br>' + when.map(esc).join('<br>')]) +
    (note ? paras_(['Note from the leader: ' + esc(note).replace(/\n/g, '<br>')]) : '') +
    paras_(['Thank you for being willing to serve.']);
  return { subject: 'Cancelled: ' + post.Title, html: html, text: text.join('\n\n') };
}

/** Exactly the category and the folder link. Nothing about the request itself. */
function tplRequestNotice_(s, categoryName, folderUrl) {
  var text = 'A new ' + categoryName + ' request came in. Open your Requests folder: ' + folderUrl;
  return {
    subject: 'New ' + categoryName + ' request',
    html: paras_(['A new ' + esc(categoryName) + ' request came in. Open your Requests folder: <a href="' + esc(folderUrl) + '">' + esc(folderUrl) + '</a>']),
    text: text,
  };
}

/** A draft was made from a request (decision 19). The kind only; nothing from the request. */
function tplDraftFromRequest_(s, kindName) {
  var text = 'A draft opportunity was made from a ' + kindName + ' request. Open your leader page to check the date, write the public note and publish it.';
  return {
    subject: 'Draft opportunity from a ' + kindName + ' request',
    html: paras_([esc(text)]),
    text: text,
  };
}

function tplAdminAlert_(s, lines) {
  var intro = 'The ' + (s.ward_name || 'ward') + ' Service Portal needs attention:';
  return {
    subject: (s.ward_name || 'Ward') + ' Service Portal: needs attention',
    html: paras_([esc(intro), lines.map(esc).join('<br>'), 'Open the Service Sheet and run Service Portal > Check health.']),
    text: [intro, lines.join('\n'), 'Open the Service Sheet and run Service Portal > Check health.'].join('\n\n'),
  };
}

// ===== 07-tokens.js =====

/**
 * Tokens and leader links. Random 256-bit values, stored only as SHA-256 hex in the System
 * Sheet's Tokens tab, carried after # in page addresses and sent to the script only in POST
 * bodies. Kinds: cancel, withdraw and confirm (subject = sign-up id), me (subject = normalized
 * email; My sign-ups) and leader (subject = normalized email).
 */

/** Kinds where a new token replaces the subject's older ones. */
var SINGLE_TOKEN_KINDS = ['leader', 'me'];

function isRawToken_(raw) {
  return typeof raw === 'string' && /^[0-9a-f]{64}$/.test(raw);
}

/** Stores the hash and returns the raw token. A new leader or My sign-ups link deletes that subject's older ones. */
function issueToken_(kind, subject, expiresLocal) {
  var raw = newToken_();
  withLock_(function () {
    var t = systemTab_(SYS_TAB.tokens);
    if (SINGLE_TOKEN_KINDS.indexOf(kind) >= 0) {
      t.removeMany(
        t.rows().filter(function (r) {
          return r.Kind === kind && String(r.Subject) === String(subject);
        })
      );
    }
    t.append({ Hash: sha256Hex_(raw), Kind: kind, Subject: subject, Expires: expiresLocal, Created: nowLocal_() });
  });
  return raw;
}

/** {subject, expires}, or null when unknown, of another kind, or expired. */
function readToken_(raw, kind) {
  if (!isRawToken_(raw)) return null;
  var row = systemTab_(SYS_TAB.tokens).find('Hash', sha256Hex_(raw));
  if (!row || row.Kind !== kind) return null;
  if (!row.Expires || row.Expires <= nowLocal_()) return null;
  return { subject: String(row.Subject), expires: row.Expires };
}

/** {kind, subject, expires, expired} for a raw token still in the Tokens tab, else null. */
function tokenRow_(raw) {
  if (!isRawToken_(raw)) return null;
  var row = systemTab_(SYS_TAB.tokens).find('Hash', sha256Hex_(raw));
  if (!row) return null;
  return { kind: String(row.Kind), subject: String(row.Subject), expires: row.Expires, expired: !row.Expires || row.Expires <= nowLocal_() };
}

/** Removes a sign-up's cancel, withdraw and confirm links. */
function revokeSignupTokens_(signupId) {
  withLock_(function () {
    var t = systemTab_(SYS_TAB.tokens);
    t.removeMany(
      t.rows().filter(function (r) {
        return ['cancel', 'withdraw', 'confirm'].indexOf(r.Kind) >= 0 && String(r.Subject) === String(signupId);
      })
    );
  });
}

/**
 * A My sign-ups link for this address: it lasts until 30 days after the last date the address
 * signed up for (never less than 30 days from today) and replaces the address's older link.
 */
function issueMeToken_(email, signups, slotsById) {
  var e = normEmail(email);
  var last = todayLocal_();
  (signups || []).forEach(function (su) {
    var sl = slotsById[su['Slot id']];
    if (normEmail(su.Email) === e && sl && sl.Date > last) last = sl.Date;
  });
  return issueToken_('me', e, addDays(last, 30) + ' 23:59');
}

function revokeTokens_(kind, subject) {
  withLock_(function () {
    var t = systemTab_(SYS_TAB.tokens);
    t.removeMany(
      t.rows().filter(function (r) {
        return r.Kind === kind && String(r.Subject) === String(subject);
      })
    );
  });
}

function leaders_() {
  return serviceTab_(TAB.leaders)
    .rows()
    .filter(function (l) {
      return isEmail(l.Email);
    });
}

function leaderByEmail_(email) {
  var e = normEmail(email);
  var all = leaders_();
  for (var i = 0; i < all.length; i++) if (normEmail(all[i].Email) === e) return all[i];
  return null;
}

/** The Leaders row for a leader link, only while that email is on the Leaders tab now. */
function leaderFromLink_(raw) {
  var t = readToken_(raw, 'leader');
  if (!t) return null;
  return leaderByEmail_(t.subject);
}

/** '<hub_url>/<page>.html#k=…' when the hub is set, else '<web_app_url>?page=<page>#k=…'. */
function pageUrl_(s, page, hash) {
  var h = Object.keys(hash || {})
    .map(function (k) {
      return k + '=' + encodeURIComponent(hash[k]);
    })
    .join('&');
  var base = s.hub_url
    ? String(s.hub_url).replace(/\/+$/, '') + '/' + page + '.html'
    : String(s.web_app_url || '') + '?page=' + page;
  return base + (h ? '#' + h : '');
}

function sendLeaderLink_(leader) {
  var now = nowLocal_();
  var expires = addDays(now.slice(0, 10), LEADER_LINK_DAYS) + now.slice(10);
  var raw = issueToken_('leader', normEmail(leader.Email), expires);
  var s = settings_();
  var t = tplLeaderLink_(s, leader, pageUrl_(s, 'leader', { k: raw }));
  return sendOrQueue_({ to: leader.Email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
}

/** Sends a link for every ticked "Send leader link", unticks it and stamps "Link sent". */
function processLeaderLinkTicks_() {
  var t = serviceTab_(TAB.leaders);
  var n = 0;
  t.rows().forEach(function (l) {
    if (!isTicked(l['Send leader link'])) return;
    if (isEmail(l.Email)) {
      sendLeaderLink_(l);
      n++;
    }
    t.update(l, { 'Send leader link': false, 'Link sent': isEmail(l.Email) ? nowLocal_() : 'Not sent: check the email' });
  });
  return n;
}

/** Always the same answer; sends only to a Leaders-tab address, at most 3 times a day. */
function requestLeaderLink_(email) {
  var answer = { ok: true, message: TEXT.leaderLinkMessage };
  if (!isEmail(email)) return answer;
  var leader = leaderByEmail_(email);
  if (!leader) return answer;
  var e = normEmail(email);
  var today = todayLocal_();
  var count = systemTab_(SYS_TAB.log)
    .rows()
    .filter(function (r) {
      return r.What === 'leader link requested' && String(r.Detail) === e && String(r.At).slice(0, 10) === today;
    }).length;
  if (rateCheck({ leaderLinksToday: count }, { perAddress: Infinity, perDay: Infinity, perPostMinute: Infinity, leaderLinks: LIMITS.leaderLinksPerAddressPerDay })) {
    return answer;
  }
  log_('leader link requested', e);
  sendLeaderLink_(leader);
  return answer;
}

// ===== 08-api-public.js =====

/**
 * Public API: what the serve, post, help and confirm pages call. Each handler returns a plain
 * object {ok: true, ...} or {ok: false, error, fields?}. Public answers never contain a
 * volunteer's name or email, private details, or anything from a request.
 */

function wardInfo_(s) {
  return { name: s.ward_name, contact: s.contact_email, serveLink: s.serve_short_link, helpLink: s.help_short_link };
}

function clearServeCache_() {
  try {
    cache_().remove('serve');
  } catch (e) {
    // a cache miss only costs a sheet read
  }
}

function volunteerData_() {
  return {
    posts: serviceTab_(TAB.posts).rows(),
    slots: serviceTab_(TAB.slots).rows(),
    signups: serviceTab_(TAB.signups).rows(),
  };
}

function groupBy_(rows, key) {
  var out = {};
  rows.forEach(function (r) {
    (out[r[key]] = out[r[key]] || []).push(r);
  });
  return out;
}

function indexBy_(rows, key) {
  var out = {};
  rows.forEach(function (r) {
    out[r[key]] = r;
  });
  return out;
}

function contactSuffix_(s) {
  return (s.contact_email || 'the ward') + '.';
}

/** Writes the slot's Filled and Waiting counts from the sign-ups (call inside the lock). Returns Filled. */
function refreshFilled_(slotsTable, slotRow, signups) {
  var c = countsBySlot(signups)[slotRow['Slot id']] || { filled: 0, waiting: 0 };
  var changes = {};
  if (Number(slotRow.Filled) !== c.filled) changes.Filled = c.filled;
  if (Number(slotRow.Waiting) !== c.waiting) changes.Waiting = c.waiting;
  if (Object.keys(changes).length) slotsTable.update(slotRow, changes);
  return c.filled;
}

/** Open posts with a date today or later, by Brothers/Sisters/Youth/Children on the page. */
function apiServe_() {
  var cached = cache_().get('serve');
  if (cached) return JSON.parse(cached);
  var s = settings_();
  var d = volunteerData_();
  var today = todayLocal_();
  var counts = countsBySlot(d.signups);
  var slotsByPost = groupBy_(d.slots, 'Post id');
  var cats = indexBy_(serviceTab_(TAB.categories).rows(), 'Id');
  var posts = d.posts
    .filter(function (p) {
      return p.Status === POST_STATUS.open;
    })
    .map(function (p) {
      var sum = postSummary(p, slotsByPost[p['Post id']] || [], counts, today);
      // The category label and icon on each card (public: categories are not private).
      var c = cats[p.Category];
      sum.categoryName = c ? String(c.Name || '') : '';
      sum.categoryIcon = c ? String(c.Icon || '') : '';
      return sum;
    })
    .filter(function (sum) {
      return sum.firstDate;
    })
    .sort(function (a, b) {
      return cmpLocal(a.firstDate, b.firstDate) || cmpLocal(a.title, b.title);
    });
  var answer = { ok: true, ward: wardInfo_(s), posts: posts, offers: serveOffers_(), labels: { everyone: TEXT.everyone } };
  var json = JSON.stringify(answer);
  if (json.length < 90000) {
    try {
      cache_().put('serve', json, SERVE_CACHE_SECONDS);
    } catch (e) {
      // too big or cache unavailable: answer anyway
    }
  }
  return answer;
}

/** Script cache key for the giving form's published link (cleared by buildRequestForms_). */
var GIVING_URL_CACHE_KEY = 'giving_url';

/**
 * The Christmas giving card for the Service Opportunities page (decision 17): the
 * christmas-giving row, not archived, with On Serve page ticked and a form. On Serve page means
 * nothing on any other row. A problem here never breaks the page; it just shows no card.
 */
function serveOffers_() {
  try {
    var c = serviceTab_(TAB.categories).find('Id', GIVING_ID);
    if (!c || c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived) || !isTicked(c['On Serve page'])) return [];
    var f = systemTab_(SYS_TAB.requestFiles).find('Category id', GIVING_ID);
    if (!f || !f['Form id']) return [];
    // The form's published link, cached like the Help page (Set up clears it), so a Serve
    // rebuild every minute doesn't open the form each time.
    var url = cache_().get(GIVING_URL_CACHE_KEY);
    if (!url) {
      url = FormApp.openById(f['Form id']).getPublishedUrl();
      try {
        cache_().put(GIVING_URL_CACHE_KEY, url, HELP_CACHE_SECONDS);
      } catch (e2) {
        // answer anyway
      }
    }
    return [{ id: GIVING_ID, label: GIVING_TEXT.offerLabel, icon: c.Icon, url: url }];
  } catch (e) {
    try {
      // At most one Log line an hour (Serve is rebuilt every minute).
      if (!cache_().get('serve_offer_logged')) {
        cache_().put('serve_offer_logged', '1', 3600);
        log_('serve offer missing', clip(e && e.message ? e.message : e, 200));
      }
    } catch (e2) {
      // nothing more to do
    }
    return [];
  }
}

function findPublicPost_(posts, publicId) {
  var id = String(publicId == null ? '' : publicId).trim();
  if (!id || id.length > 40) return null;
  for (var i = 0; i < posts.length; i++) {
    if (String(posts[i]['Public id']) === id && posts[i].Status !== POST_STATUS.draft) return posts[i];
  }
  return null;
}

function apiPost_(publicId) {
  var s = settings_();
  var d = volunteerData_();
  var post = findPublicPost_(d.posts, publicId);
  if (!post) return { ok: false, error: TEXT.postNotFound };
  var slots = d.slots.filter(function (sl) {
    return sl['Post id'] === post['Post id'];
  });
  return { ok: true, ward: wardInfo_(s), post: publicPost(post, slots, countsBySlot(d.signups), todayLocal_()) };
}

/**
 * Request tiles: request categories with a form, not archived, with On Help page ticked. Never
 * the Christmas giving form (decision 17: it can only be offered on the Serve page).
 */
function apiHelp_() {
  var cached = cache_().get('help');
  if (cached) return JSON.parse(cached);
  var s = settings_();
  var files = indexBy_(systemTab_(SYS_TAB.requestFiles).rows(), 'Category id');
  var tiles = [];
  serviceTab_(TAB.categories)
    .rows()
    .forEach(function (c) {
      if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived) || !isTicked(c['On Help page'])) return;
      if (c.Id === GIVING_ID) return;
      var f = files[c.Id];
      if (!f || !f['Form id']) return;
      var url = '';
      try {
        url = FormApp.openById(f['Form id']).getPublishedUrl();
      } catch (e) {
        log_('help form missing', c.Id + ' | ' + e);
        return;
      }
      tiles.push({ id: c.Id, name: c.Name, icon: c.Icon, url: url });
    });
  var answer = { ok: true, ward: wardInfo_(s), tiles: tiles };
  try {
    cache_().put('help', JSON.stringify(answer), HELP_CACHE_SECONDS);
  } catch (e) {
    // answer anyway
  }
  return answer;
}

// ---------- abuse counters ----------
//
// Per post per minute: the script cache (lives 2 minutes), bumped by every attempt alike.
// Per address and per day: the System Sheet's Counters tab, one row per (key, day), so a count
// really lasts the whole day. Every attempt bumps them the same way, whatever the address turns
// out to be, so the answers never depend on who an address belongs to. Addresses are stored only
// as a salted hash.

function postMinuteKey_(postId, nowLocal) {
  return postId ? 'RP_' + nowLocal.slice(0, 10).replace(/-/g, '') + '_' + postId + '_' + nowLocal.slice(11).replace(':', '') : '';
}

function readCount_(key) {
  return key ? Number(cache_().get(key)) || 0 : 0;
}

function bumpCount_(key) {
  if (key) cache_().put(key, String(readCount_(key) + 1), 120);
}

/** An address as the counters and the Log keep it: a salted hash (salt: the System Sheet id). */
function addrTag_(email) {
  return sha256Hex_(String(props_().getProperty('SYSTEM_ID') || '') + '|' + normEmail(email)).slice(0, 32);
}

/** Today's day-long counters. Call inside the lock. */
function dayCounters_() {
  var t = systemTab_(SYS_TAB.counters);
  var today = todayLocal_();
  var map = {};
  t.rows().forEach(function (r) {
    if (r.Day === today) map[String(r.Key)] = r;
  });
  return {
    get: function (k) {
      return map[k] ? Number(map[k].Count) || 0 : 0;
    },
    bump: function (k) {
      if (map[k]) t.update(map[k], { Count: (Number(map[k].Count) || 0) + 1 });
      else map[k] = t.append({ Key: k, Day: today, Count: 1 });
    },
    countPrefix: function (prefix) {
      return Object.keys(map).filter(function (k) {
        return k.indexOf(prefix) === 0;
      }).length;
    },
  };
}

/** Removes counter rows from before today (gpDaily). */
function pruneCounters_() {
  withLock_(function () {
    var t = systemTab_(SYS_TAB.counters);
    var today = todayLocal_();
    t.removeMany(
      t.rows().filter(function (r) {
        return r.Day !== today;
      })
    );
  });
}

/** C0 and C1 control characters (CR and LF among them) and the Unicode line and paragraph separators. */
var CONTROL_CHARS_ = new RegExp(
  '[' + String.fromCharCode(0) + '-' + String.fromCharCode(0x1f) + String.fromCharCode(0x7f) + '-' + String.fromCharCode(0x9f) +
    String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + ']',
  'g'
);

/** Control characters (CR, LF and the rest of C0/C1) become spaces; runs of space collapse. */
function cleanText_(v) {
  return String(v == null ? '' : v)
    .replace(CONTROL_CHARS_, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mailMsg_(to, t, priority) {
  return { to: to, subject: t.subject, html: t.html, text: t.text, priority: priority || 'normal' };
}

/**
 * Sends prepared emails after the sheet changes are committed. A failure is logged and never
 * changes the answer (the change itself already happened).
 */
function sendAll_(what, msgs) {
  (msgs || []).forEach(function (m) {
    try {
      sendOrQueue_(m);
    } catch (e) {
      try {
        log_('email not sent', what + ' | ' + clip(e && e.message ? e.message : e, 200));
      } catch (e2) {
        // nothing more to do
      }
    }
  });
}

/**
 * data: {publicId, slotId, name, email, bringing, childName}. Every accepted, duplicate, full or
 * blocked sign-up answers the same sentence; only the email differs. Limits: per address, the
 * number of different roles tried today (a parent's own and children's sign-ups for one role are
 * one); per post, attempts this minute; for the ward, sign-ups today.
 */
function apiSignup_(data) {
  data = data || {};
  var s = settings_();
  var name = cleanText_(data.name);
  var email = String(data.email == null ? '' : data.email).trim();
  var bringing = cleanText_(data.bringing);
  var childName = cleanText_(data.childName);
  var fields = {};
  if (!name || name.length > 80) fields.name = 'Type your name (up to 80 characters).';
  if (!isEmail(email)) fields.email = 'Type one email address, like name@example.com.';
  if (bringing.length > 200) fields.bringing = 'Keep this under 200 characters.';
  if (childName.length > 40) fields.childName = "Type the child's first name (up to 40 characters).";
  if (Object.keys(fields).length) return { ok: false, error: 'Please check the form.', fields: fields };
  email = normEmail(email);

  var done = withLock_(function () {
    var d = volunteerData_();
    var now = nowLocal_();
    var today = now.slice(0, 10);
    var post = findPublicPost_(d.posts, data.publicId);
    // A made-up post answers at once, the same for every address, and writes no counter.
    if (!post) return { error: TEXT.postNotFound };
    var slot = null;
    d.slots.forEach(function (sl) {
      if (sl['Slot id'] === String(data.slotId) && sl['Post id'] === post['Post id']) slot = sl;
    });
    // The limits come next and count every attempt on a real post alike, before anything about
    // the address: per address the different roles tried today, per post this minute, and the
    // ward's attempts today (key T).
    var dc = dayCounters_();
    var tag = addrTag_(email);
    var roleKey = 'R:' + tag + ':' + (slot ? slot['Slot id'] : '?');
    var minuteKey = postMinuteKey_(post['Post id'], now);
    var newRole = !dc.get(roleKey);
    var limit = rateCheck(
      { addressToday: newRole ? dc.countPrefix('R:' + tag + ':') : 0, totalToday: dc.get('T'), postMinute: readCount_(minuteKey) },
      { perAddress: LIMITS.signupEmailsPerAddressPerDay, perDay: s.signup_limit_per_day, perPostMinute: LIMITS.signupsPerPostPerMinute, leaderLinks: Infinity }
    );
    if (limit) {
      log_('sign-up limit', limit + ' | ' + post['Post id']);
      return { error: TEXT.rateLimited + contactSuffix_(s) };
    }
    dc.bump(roleKey);
    dc.bump('T');
    bumpCount_(minuteKey);
    if (childName && !allowsChildren_(post)) return { error: 'Please check the form.', fields: { childName: TEXT.noChildren } };
    var volsT = serviceTab_(TAB.volunteers);
    var byEmail = volunteersByEmail_(volsT.rows());
    var leaderList = leaders_();
    var state = volunteerState(email, byEmail, leaderEmails_(leaderList));
    var check = checkSignup({
      post: post,
      slot: slot,
      counts: countsBySlot(d.signups),
      existing: d.signups,
      email: email,
      childName: childName,
      state: state === 'blocked' ? 'new' : state,
      todayLocal: today,
      nowLocal: now,
    });
    // These answers don't depend on who the address belongs to.
    if (!check.ok && [TEXT.notOpen, TEXT.roleNotFound, TEXT.datePassed].indexOf(check.error) >= 0) return { error: check.error };
    // The Pre-approve list (decision 24): a waiting or new address on it is approved now, as if
    // a leader had approved it, and its earlier waiting sign-ups count. Declined, Revoked and
    // leaders are never changed by it. The public answer stays the same.
    var preMsgs = [];
    if ((state === 'new' || state === 'pending-new' || state === 'pending-confirmed') && isPreapproved_(email)) {
      var pre = { 'Decided by': 'Pre-approve list', 'Decided at': now };
      var prow = byEmail[email];
      if (!prow) {
        prow = volsT.append({ Email: email, Name: name, Status: VOLUNTEER_STATUS.pending, 'First post': post['Post id'], 'Email confirmed at': now });
        byEmail[email] = prow;
      } else if (!prow['Email confirmed at']) {
        pre['Email confirmed at'] = now;
      }
      var earlier = approveWaitingLocked_(email, prow, volsT, d, pre, today);
      preMsgs = confirmationMsgs_(earlier, d).concat(
        filledMsgsLocked_(
          earlier.map(function (c) {
            return c.post['Post id'];
          }),
          d
        )
      );
      state = 'approved';
      check = checkSignup({
        post: post,
        slot: slot,
        counts: countsBySlot(d.signups),
        existing: d.signups,
        email: email,
        childName: childName,
        state: state,
        todayLocal: today,
        nowLocal: now,
      });
    }
    // From here every outcome answers the same sentence; only the email differs.
    if (state === 'blocked') {
      // One "please contact" email a day per address, however often it tries.
      if (loggedToday_('blocked sign-up', tag)) return { msgs: [] };
      log_('blocked sign-up', tag);
      return { msgs: [mailMsg_(email, tplContactToSignUp_(s))] };
    }
    if (!check.ok && check.error === TEXT.roleFull) {
      var fullKey = 'F:' + tag + ':' + slot['Slot id'];
      if (dc.get(fullKey)) return { msgs: preMsgs };
      dc.bump(fullKey);
      return { msgs: preMsgs.concat([mailMsg_(email, tplRoleFull_(s, post, slot))]) };
    }
    if (!check.ok) {
      // A duplicate. When it is the address's own sign-up still waiting for its email click
      // (say the link expired), send a fresh confirm email within the limits.
      var own = d.signups.filter(function (su) {
        return (
          su['Slot id'] === slot['Slot id'] &&
          su.Status === SIGNUP_STATUS.waitingEmail &&
          normEmail(su.Email) === email &&
          childKey_(su['Child first name']) === childKey_(childName)
        );
      })[0];
      return { msgs: preMsgs.concat(own ? confirmEmailLocked_(own, post, slot, dc, s, now) : []) };
    }
    var status = signupStatusFor(state);
    var signup = {
      'Sign-up id': newId_('s'),
      'Post id': post['Post id'],
      'Slot id': slot['Slot id'],
      Email: email,
      Name: name,
      'Child first name': childName,
      Bringing: slot['Bringing prompt'] ? bringing : '',
      Status: status,
      'Signed up at': now,
    };
    signup = serviceTab_(TAB.signups).append(signup);
    d.signups.push(signup);
    refreshFilled_(serviceTab_(TAB.slots), slot, d.signups);
    var vrow = byEmail[email] || null;
    if (state === 'leader') {
      // Leaders skip approval; a Volunteers row they already have is marked Approved.
      if (vrow && vrow.Status !== VOLUNTEER_STATUS.approved) {
        volsT.update(vrow, { Status: VOLUNTEER_STATUS.approved, 'Decided by': 'Leader list', 'Decided at': now });
      }
    } else if (!vrow) {
      vrow = volsT.append({ Email: email, Name: name, Status: VOLUNTEER_STATUS.pending, 'First post': post['Post id'] });
    }
    if (status === SIGNUP_STATUS.confirmed) {
      return { msgs: preMsgs.concat(confirmationMsgs_([{ signup: signup, post: post, slot: slot, over: false }], d)).concat(filledMsgsLocked_([post['Post id']], d)) };
    }
    if (status === SIGNUP_STATUS.waitingEmail) return { msgs: confirmEmailLocked_(signup, post, slot, dc, s, now) };
    var firstPost = indexBy_(d.posts, 'Post id')[vrow['First post']] || post;
    return { msgs: approverMsgs_(firstPost, vrow.Name || name, [{ post: post, slot: slot }]) };
  });
  if (done.error) {
    var refused = { ok: false, error: done.error };
    if (done.fields) refused.fields = done.fields;
    return refused;
  }
  clearServeCache_();
  sendAll_('sign-up', done.msgs);
  return { ok: true, message: TEXT.signupThanks };
}

function allowsChildren_(post) {
  var a = audiencesOf_(post.Audiences);
  return a.indexOf('Youth') >= 0 || a.indexOf('Children') >= 0;
}

function leaderEmails_(leaders) {
  return (leaders || leaders_()).map(function (l) {
    return normEmail(l.Email);
  });
}

/**
 * A confirm-your-address email for a Waiting-email sign-up, within the day's limits (3 per
 * address, Settings confirm_limit_per_day in all). A new link replaces the sign-up's older ones.
 * Call inside the lock. Returns the messages to send ([] past a limit).
 */
function confirmEmailLocked_(signup, post, slot, dc, s, now) {
  var ca = 'CA:' + addrTag_(signup.Email);
  if (dc.get(ca) >= LIMITS.confirmEmailsPerAddressPerDay || dc.get('CT') >= s.confirm_limit_per_day) {
    log_('confirm email limit', post['Post id']);
    return [];
  }
  dc.bump(ca);
  dc.bump('CT');
  revokeTokens_('confirm', signup['Sign-up id']);
  var ct = issueToken_('confirm', signup['Sign-up id'], localMinusHours(now, -CONFIRM_LINK_HOURS));
  return [mailMsg_(normEmail(signup.Email), tplConfirmAddress_(s, post, slot, signup, pageUrl_(s, 'confirm', { t: ct })))];
}

/** True when the Log already has a line (what, detail) today. */
function loggedToday_(what, detail) {
  var today = todayLocal_();
  return systemTab_(SYS_TAB.log)
    .rows()
    .some(function (r) {
      return r.What === what && String(r.Detail) === String(detail) && String(r.At).slice(0, 10) === today;
    });
}

/** True when the Log has ever had this line (kept 90 days). */
function loggedEver_(what, detail) {
  return systemTab_(SYS_TAB.log)
    .rows()
    .some(function (r) {
      return r.What === what && String(r.Detail) === String(detail);
    });
}

/** Opportunity categories' coordinators (valid addresses, normalized). */
function categoryCoordinators_(categoryId) {
  if (!categoryId) return [];
  var c = indexBy_(serviceTab_(TAB.categories).rows(), 'Id')[categoryId];
  if (!c) return [];
  return uniq_(splitList(c.Coordinators).filter(isEmail).map(normEmail));
}

/** "Someone new is waiting": messages to the approvers of the volunteer's first post (decision 24). */
function approverMsgs_(firstPost, name, items) {
  if (!items.length) return [];
  var s = settings_();
  var t = tplWaitingNotice_(s, name, items);
  return approverEmailsFor(firstPost, indexBy_(serviceTab_(TAB.categories).rows(), 'Id'), s, leaders_()).map(function (to) {
    return mailMsg_(to, t);
  });
}

// ---------- the Pre-approve list (decision 24): salted hashes only ----------

/** The salt for pre-approve hashes and volunteer ids, made once (64 hex). */
function preapproveSalt_() {
  var p = props_();
  var salt = p.getProperty('PREAPPROVE_SALT');
  if (!salt) {
    salt = newToken_();
    p.setProperty('PREAPPROVE_SALT', salt);
  }
  return salt;
}

function preapproveHash_(email) {
  return sha256Hex_(preapproveSalt_() + ':' + normEmail(email));
}

/** Opaque, stable volunteer id: not reversible by leaders; the server resolves it by scanning. */
function volunteerId_(email) {
  return sha256Hex_(preapproveSalt_() + ':v:' + normEmail(email)).slice(0, 16);
}

function isPreapproved_(email) {
  var h = preapproveHash_(email);
  return systemTab_(SYS_TAB.preapproved)
    .rows()
    .some(function (r) {
      return String(r.Hash) === h;
    });
}

/**
 * Approves a volunteer (call inside the lock): the Volunteers row Approved with Decided by/at;
 * their waiting sign-ups whose date is over lapse, the rest count. Returns the counted items.
 */
function approveWaitingLocked_(email, vrow, volsT, d, record, today) {
  volsT.update(vrow, merge_({ Status: VOLUNTEER_STATUS.approved }, record));
  var signupsT = serviceTab_(TAB.signups);
  var slotsT = serviceTab_(TAB.slots);
  var slotsById = indexBy_(d.slots, 'Slot id');
  var postsById = indexBy_(d.posts, 'Post id');
  var live = [];
  d.signups
    .filter(function (su) {
      return normEmail(su.Email) === email && isWaitingSignup_(su.Status);
    })
    .forEach(function (su) {
      var sl = slotsById[su['Slot id']];
      var p = postsById[su['Post id']];
      if (!sl || !p || sl.Date < today || p.Status === POST_STATUS.cancelled || p.Status === POST_STATUS.past) {
        signupsT.update(su, { Status: SIGNUP_STATUS.lapsed });
        if (sl) refreshFilled_(slotsT, sl, d.signups);
      } else {
        live.push(su);
      }
    });
  return confirmSignupsLocked_(live, d);
}

/**
 * Other Open posts still needing people, fill levels only: [{title, filled, needed, url}].
 * except: a post id or a list of them to leave out.
 */
function otherWays_(s, d, except) {
  var today = todayLocal_();
  var counts = countsBySlot(d.signups);
  var slotsByPost = groupBy_(d.slots, 'Post id');
  var skip = {};
  [].concat(except || []).forEach(function (id) {
    skip[id] = true;
  });
  return d.posts
    .filter(function (p) {
      return p.Status === POST_STATUS.open && !skip[p['Post id']];
    })
    .map(function (p) {
      return postSummary(p, slotsByPost[p['Post id']] || [], counts, today);
    })
    .filter(function (sum) {
      return sum.firstDate && !sum.full;
    })
    .sort(function (a, b) {
      return cmpLocal(a.firstDate, b.firstDate) || cmpLocal(a.title, b.title);
    })
    .slice(0, 10)
    .map(function (sum) {
      return { title: sum.title, filled: sum.filled, needed: sum.needed, url: pageUrl_(s, 'post', { p: sum.publicId }) };
    });
}

/**
 * Turns waiting sign-ups into Confirmed ones, oldest first, marking each that counts after its
 * role already had its number ("Over limit"). Call inside the lock; d.signups holds the same row
 * objects, so the counts follow. Returns [{signup, post, slot, over}].
 */
function confirmSignupsLocked_(list, d) {
  var signupsT = serviceTab_(TAB.signups);
  var slotsT = serviceTab_(TAB.slots);
  var slotsById = indexBy_(d.slots, 'Slot id');
  var postsById = indexBy_(d.posts, 'Post id');
  var out = [];
  list
    .slice()
    .sort(function (a, b) {
      return cmpLocal(a['Signed up at'], b['Signed up at']);
    })
    .forEach(function (su) {
      var slot = slotsById[su['Slot id']];
      var over = overLimitOnConfirm(slot, countsBySlot(d.signups));
      signupsT.update(su, { Status: SIGNUP_STATUS.confirmed, 'Over limit': over ? 'Yes' : '' });
      refreshFilled_(slotsT, slot, d.signups);
      out.push({ signup: su, post: postsById[su['Post id']], slot: slot, over: over });
    });
  return out;
}

/**
 * Call inside the lock: issues the links and builds the email for each newly counted sign-up:
 * the confirmation (private details, cancel link, My sign-ups link, other ways to serve) or, when
 * it is over the number, the withdraw email (its link ends when the role starts). One My sign-ups
 * link per address per batch (a new one replaces the old).
 */
function confirmationMsgs_(items, d) {
  var s = settings_();
  var slotsById = indexBy_(d.slots, 'Slot id');
  var meByEmail = {};
  return items.map(function (it) {
    var e = normEmail(it.signup.Email);
    if (!meByEmail[e]) meByEmail[e] = issueMeToken_(e, d.signups, slotsById);
    var meUrl = pageUrl_(s, 'me', { t: meByEmail[e] });
    var id = it.signup['Sign-up id'];
    var t;
    if (it.over) {
      var wt = issueToken_('withdraw', id, slotStart(it.slot));
      t = tplOverLimit_(s, it.post, it.slot, it.signup, { withdrawUrl: pageUrl_(s, 'confirm', { t: wt }), meUrl: meUrl, details: true });
    } else {
      var ct = issueToken_('cancel', id, addDays(it.slot.Date, 1) + ' 23:59');
      t = tplSignupConfirmed_(s, it.post, it.slot, it.signup, {
        cancelUrl: pageUrl_(s, 'confirm', { t: ct }),
        meUrl: meUrl,
        details: true,
        otherWays: otherWays_(s, d, it.post['Post id']),
      });
    }
    return mailMsg_(e, t);
  });
}

/**
 * Call inside the lock. "Fully filled": once per post (checked and logged here), when every role
 * dated today or later has its number. To the post's notice recipients and its category's
 * coordinators. Returns the messages.
 */
function filledMsgsLocked_(postIds, d) {
  var s = settings_();
  var today = todayLocal_();
  var counts = countsBySlot(d.signups);
  var postsById = indexBy_(d.posts, 'Post id');
  var slotsByPost = groupBy_(d.slots, 'Post id');
  var msgs = [];
  uniq_(postIds || []).forEach(function (id) {
    var post = postsById[id];
    if (!post || post.Status !== POST_STATUS.open) return;
    if (!postSummary(post, slotsByPost[id] || [], counts, today).full) return;
    if (loggedEver_('filled notice', id)) return;
    log_('filled notice', id);
    var t = tplFullyFilled_(s, post);
    uniq_(noticeRecipients(post, leaders_()).concat(categoryCoordinators_(post.Category))).forEach(function (to) {
      msgs.push(mailMsg_(to, t));
    });
  });
  return msgs;
}

/** {signup, post, slot, signups, d} for a sign-up id, or null. */
function signupById_(id) {
  var d = volunteerData_();
  var signup = indexBy_(d.signups, 'Sign-up id')[String(id)];
  if (!signup) return null;
  var post = indexBy_(d.posts, 'Post id')[signup['Post id']];
  var slot = indexBy_(d.slots, 'Slot id')[signup['Slot id']];
  if (!post || !slot) return null;
  return { signup: signup, post: post, slot: slot, signups: d.signups, d: d };
}

var LINK_KINDS = ['cancel', 'withdraw', 'confirm'];

/** What a cancel, withdraw or confirm link is for: title, date, time, role, status. No names or emails. */
function apiTokenInfo_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || LINK_KINDS.indexOf(row.kind) < 0) return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var f = signupById_(row.subject);
  if (!f) return { ok: false, error: TEXT.linkInvalid };
  var out = { ok: true, kind: row.kind, title: f.post.Title, date: f.slot.Date, start: f.slot.Start, role: f.slot.Role, status: f.signup.Status };
  if (row.kind === 'confirm') {
    var v = volunteersByEmail_(serviceTab_(TAB.volunteers).rows())[normEmail(f.signup.Email)];
    out.confirmed = !!(v && v['Email confirmed at']);
  }
  return out;
}

/**
 * The confirm-your-address button. Stamps Email confirmed at; the address's Waiting-email
 * sign-ups then wait for approval (one notice to the approvers of the first post), count at
 * once if the address was approved meanwhile, or lapse when their date has passed.
 */
function apiConfirm_(data) {
  var raw = data && data.t;
  var row = tokenRow_(raw);
  if (!row || row.kind !== 'confirm') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var done = withLock_(function () {
    var f = signupById_(row.subject);
    if (!f) return { error: TEXT.linkInvalid };
    var d = f.d;
    var email = normEmail(f.signup.Email);
    var volsT = serviceTab_(TAB.volunteers);
    var vrow = volunteersByEmail_(volsT.rows())[email];
    if (vrow && vrow['Email confirmed at']) return { already: true };
    var now = nowLocal_();
    var today = now.slice(0, 10);
    if (vrow) volsT.update(vrow, { 'Email confirmed at': now });
    else vrow = volsT.append({ Email: email, Name: f.signup.Name, Status: VOLUNTEER_STATUS.pending, 'First post': f.signup['Post id'], 'Email confirmed at': now });
    var state = volunteerState(email, volunteersByEmail_([vrow]), leaderEmails_());
    var slotsById = indexBy_(d.slots, 'Slot id');
    var postsById = indexBy_(d.posts, 'Post id');
    var signupsT = serviceTab_(TAB.signups);
    var slotsT = serviceTab_(TAB.slots);
    var moved = [];
    var toConfirm = [];
    var lapsedOwn = false;
    d.signups.forEach(function (su) {
      if (normEmail(su.Email) !== email || su.Status !== SIGNUP_STATUS.waitingEmail) return;
      var sl = slotsById[su['Slot id']];
      var p = postsById[su['Post id']];
      var over = !sl || !p || sl.Date < today || p.Status === POST_STATUS.cancelled || p.Status === POST_STATUS.past;
      if (over || state === 'blocked') {
        signupsT.update(su, { Status: SIGNUP_STATUS.lapsed });
        if (sl) refreshFilled_(slotsT, sl, d.signups);
        if (su['Sign-up id'] === f.signup['Sign-up id']) lapsedOwn = true;
      } else if (state === 'approved' || state === 'leader') {
        toConfirm.push(su);
      } else {
        signupsT.update(su, { Status: SIGNUP_STATUS.waitingApproval });
        refreshFilled_(slotsT, sl, d.signups);
        moved.push({ post: p, slot: sl });
      }
    });
    var confirmed = confirmSignupsLocked_(toConfirm, d);
    var firstPost = postsById[vrow['First post']] || f.post;
    var msgs = approverMsgs_(firstPost, vrow.Name || f.signup.Name, moved)
      .concat(confirmationMsgs_(confirmed, d))
      .concat(
        filledMsgsLocked_(
          confirmed.map(function (c) {
            return c.post['Post id'];
          }),
          d
        )
      );
    return { msgs: msgs, lapsedOwn: lapsedOwn };
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: TEXT.alreadyConfirmed };
  clearServeCache_();
  sendAll_('confirm', done.msgs);
  return { ok: true, message: done.lapsedOwn ? TEXT.confirmedPassed : TEXT.addressConfirmed };
}

/** The cancel notice to the post's leaders and its category's coordinators (urgent wording after the cutoff, unless still full). */
function cancelNoticeMsgs_(f, late, stillFull) {
  var t = tplCancelNotice_(settings_(), f.post, f.slot, f.signup, late, stillFull);
  return uniq_(noticeRecipients(f.post, leaders_()).concat(categoryCoordinators_(f.post.Category))).map(function (to) {
    return mailMsg_(to, t, 'high');
  });
}

function cutoffOf_(post) {
  return post['Cancel cutoff hours'] === '' ? settings_().default_cancel_cutoff_hours : post['Cancel cutoff hours'];
}

/**
 * Call inside the lock: cancels an active sign-up and its links. A waiting sign-up never counted,
 * so leaders hear nothing; a Confirmed one gives the cancel notice. {error} | {already} | {msgs}.
 */
function cancelSignupLocked_(f) {
  var waiting = isWaitingSignup_(f.signup.Status);
  if (f.signup.Status !== SIGNUP_STATUS.confirmed && !waiting) return { already: true };
  var now = nowLocal_();
  serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.cancelled, 'Cancelled at': now });
  var filled = refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
  revokeSignupTokens_(f.signup['Sign-up id']);
  if (waiting) return { msgs: [] };
  return { msgs: cancelNoticeMsgs_(f, cancelIsLate(f.slot, cutoffOf_(f.post), now), filled >= (Number(f.slot.Needed) || 0)) };
}

function cancelAnswer_(done) {
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: TEXT.alreadyCancelled };
  clearServeCache_();
  sendAll_('cancel', done.msgs);
  return { ok: true, message: TEXT.cancelled };
}

/** Cancel link (confirmation email, reminder). */
function apiCancel_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || row.kind !== 'cancel') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  return cancelAnswer_(
    withLock_(function () {
      var f = signupById_(row.subject);
      return f ? cancelSignupLocked_(f) : { error: TEXT.linkInvalid };
    })
  );
}

/** The My sign-ups link (t) and one of its own sign-ups (signupId), or an error answer. */
function mySignupLocked_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || row.kind !== 'me') return { error: TEXT.linkInvalid };
  if (row.expired) return { error: TEXT.linkExpired };
  var f = signupById_(data.signupId);
  if (!f || normEmail(f.signup.Email) !== normEmail(row.subject)) return { error: TEXT.notFound };
  return { f: f };
}

/** Cancel from My sign-ups: the "me" link plus the sign-up id, which must be that address's. */
function apiCancelMine_(data) {
  return cancelAnswer_(
    withLock_(function () {
      var x = mySignupLocked_(data);
      return x.error ? x : cancelSignupLocked_(x.f);
    })
  );
}

/** My sign-ups: "Send the confirm email again" for a sign-up still waiting for its email click. */
function apiResendConfirm_(data) {
  var done = withLock_(function () {
    var x = mySignupLocked_(data);
    if (x.error) return x;
    var f = x.f;
    var now = nowLocal_();
    var passed = f.slot.Start ? slotStart(f.slot) < now : f.slot.Date < now.slice(0, 10);
    if (f.signup.Status !== SIGNUP_STATUS.waitingEmail || passed) return { error: TEXT.notWaitingEmail };
    var msgs = confirmEmailLocked_(f.signup, f.post, f.slot, dayCounters_(), settings_(), now);
    return msgs.length ? { msgs: msgs } : { error: TEXT.resendLimit };
  });
  if (done.error) return { ok: false, error: done.error };
  sendAll_('resend confirm', done.msgs);
  return { ok: true, message: TEXT.resent };
}

/**
 * Withdraw link (over-limit email): the offer is withdrawn and, since the role still has its
 * number, nobody is told. If cancellations since then left it short, the leaders are told as
 * for a cancellation. Refused once the role has started.
 */
function apiWithdraw_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || row.kind !== 'withdraw') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var done = withLock_(function () {
    var f = signupById_(row.subject);
    if (!f) return { error: TEXT.linkInvalid };
    if (f.signup.Status !== SIGNUP_STATUS.confirmed) return { error: TEXT.notActive };
    var now = nowLocal_();
    if (now >= slotStart(f.slot)) return { error: TEXT.alreadyHappened };
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.withdrawn, 'Cancelled at': now });
    var filled = refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    revokeSignupTokens_(f.signup['Sign-up id']);
    var stillFull = filled >= (Number(f.slot.Needed) || 0);
    return { msgs: stillFull ? [] : cancelNoticeMsgs_(f, cancelIsLate(f.slot, cutoffOf_(f.post), now), false) };
  });
  if (done.error) return { ok: false, error: done.error };
  clearServeCache_();
  sendAll_('withdraw', done.msgs);
  return { ok: true, message: TEXT.withdrawn };
}

function apiRequestLeaderLink_(data) {
  return requestLeaderLink_(data && data.email);
}

// ---------- My sign-ups ----------

var NAME_TITLES = ['brother', 'sister', 'elder', 'bishop', 'president'];

/**
 * A first name to show other volunteers: a child's first name, else the first word of Name that
 * isn't a title (Brother, Sister, Elder, Bishop, President); "Sister Jones" → "Jones".
 */
function firstName_(su) {
  var child = String(su['Child first name'] || '').trim();
  if (child) return child;
  var words = String(su.Name || '').trim().split(/\s+/).filter(String);
  for (var i = 0; i < words.length; i++) {
    if (NAME_TITLES.indexOf(words[i].toLowerCase()) < 0) return words[i];
  }
  return words[0] || '';
}

/**
 * My sign-ups (a "me" link). Read-only. Only this address's sign-ups: upcoming (waiting or
 * confirmed, today or later; each cancelled with the me link and its id) and past (confirmed, date
 * gone). For an approved volunteer or a leader: the other volunteers' first names on the same post
 * (confirmed only, no emails), the private details while the post is on, and other ways to serve
 * (fill levels only).
 */
function apiMe_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || row.kind !== 'me') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var s = settings_();
  var email = normEmail(row.subject);
  var d = volunteerData_();
  var today = todayLocal_();
  var vols = volunteersByEmail_(serviceTab_(TAB.volunteers).rows());
  var state = volunteerState(email, vols, leaderEmails_());
  var trusted = state === 'approved' || state === 'leader';
  var postsById = indexBy_(d.posts, 'Post id');
  var slotsById = indexBy_(d.slots, 'Slot id');
  var byPost = groupBy_(d.signups, 'Post id');
  var mine = d.signups.filter(function (su) {
    return normEmail(su.Email) === email && slotsById[su['Slot id']] && postsById[su['Post id']];
  });
  var upcoming = [];
  var past = [];
  mine.forEach(function (su) {
    var sl = slotsById[su['Slot id']];
    var p = postsById[su['Post id']];
    var over = sl.Date < today || p.Status === POST_STATUS.past || p.Status === POST_STATUS.cancelled;
    var active = isActiveSignup_(su.Status);
    if (!over && !active) return;
    if (over && su.Status !== SIGNUP_STATUS.confirmed) return;
    var item = {
      title: p.Title,
      publicUrl: pageUrl_(s, 'post', { p: p['Public id'] }),
      date: sl.Date,
      start: sl.Start || '',
      end: sl.End || '',
      role: sl.Role,
      childName: su['Child first name'] || '',
      bringing: su.Bringing || '',
      status: su.Status,
      others: [],
    };
    if (trusted) {
      item.others = uniq_(
        (byPost[p['Post id']] || [])
          .filter(function (o) {
            return o.Status === SIGNUP_STATUS.confirmed && normEmail(o.Email) !== email;
          })
          .map(firstName_)
          .filter(String)
      );
      if (!over && su.Status === SIGNUP_STATUS.confirmed && p['Private details']) item.privateDetails = p['Private details'];
    }
    if (over) {
      past.push(item);
    } else {
      item.signupId = su['Sign-up id'];
      item.canResend = su.Status === SIGNUP_STATUS.waitingEmail;
      upcoming.push(item);
    }
  });
  var order = function (a, b) {
    return cmpLocal(a.date + ' ' + (a.start || '00:00'), b.date + ' ' + (b.start || '00:00')) || cmpLocal(a.title, b.title);
  };
  var minePosts = {};
  mine.forEach(function (su) {
    minePosts[su['Post id']] = true;
  });
  var otherWays = trusted ? otherWays_(s, d, Object.keys(minePosts)) : [];
  var vrow = vols[email];
  return { ok: true, name: vrow ? vrow.Name : '', upcoming: upcoming.sort(order), past: past.sort(order), otherWays: otherWays };
}

/** "Email me my link": the same answer always; sends only to an address with a sign-up, 3 a day. */
function apiRequestMeLink_(data) {
  var answer = { ok: true, message: TEXT.meLinkMessage };
  var raw = String((data && data.email) == null ? '' : data.email).trim();
  if (!isEmail(raw)) return answer;
  var email = normEmail(raw);
  var msgs = withLock_(function () {
    var d = volunteerData_();
    var has = d.signups.some(function (su) {
      return normEmail(su.Email) === email;
    });
    if (!has) return [];
    var tag = addrTag_('me:' + email);
    var today = todayLocal_();
    var count = systemTab_(SYS_TAB.log)
      .rows()
      .filter(function (r) {
        return r.What === 'me link requested' && String(r.Detail) === tag && String(r.At).slice(0, 10) === today;
      }).length;
    if (count >= LIMITS.meLinksPerAddressPerDay) return [];
    log_('me link requested', tag);
    var s = settings_();
    var t = issueMeToken_(email, d.signups, indexBy_(d.slots, 'Slot id'));
    return [mailMsg_(email, tplMeLink_(s, pageUrl_(s, 'me', { t: t })))];
  });
  sendAll_('me link', msgs);
  return answer;
}

// ===== 09-api-leader.js =====

/**
 * Leader API: what leader.html calls with a leader link (k). Every handler starts by checking
 * the link against the Leaders tab; what the leader may see and change comes from
 * leaderAccess() (role boxes plus the categories they coordinate). Emails of volunteers go only
 * to leaders who may edit the post, and to approvers on Waiting for approval.
 */

function relink_() {
  return { ok: false, error: TEXT.leaderRelink, relink: true };
}

/** {leader, email, access, s, categories} or null when the link is not valid now. */
function leaderCtx_(data) {
  var leader = leaderFromLink_(data && data.k);
  if (!leader) return null;
  var s = settings_();
  var categories = serviceTab_(TAB.categories).rows();
  return { leader: leader, email: normEmail(leader.Email), access: leaderAccess(leader, s.organizations, categories, s.default_approvers), s: s, categories: categories };
}

function opportunityCategories_() {
  return serviceTab_(TAB.categories)
    .rows()
    .filter(function (c) {
      return c.Kind === CATEGORY_KIND.opportunity && !isTicked(c.Archived) && c.Id;
    })
    .map(function (c) {
      return { id: String(c.Id), name: c.Name, icon: c.Icon, audiences: audiencesOf_(c['Default audiences']) };
    });
}

/** Categories this leader may create in (leaderAccess catOrgs). */
function creatableCategories_(access) {
  return opportunityCategories_().filter(function (c) {
    return access.catOrgs && access.catOrgs[c.id];
  });
}

function apiWhoami_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var a = lc.access;
  return {
    ok: true,
    leader: { name: lc.leader.Name, calling: lc.leader.Calling, organization: lc.leader.Organization },
    access: {
      isBishopric: a.isBishopric,
      isCouncil: a.seeAllNames,
      canApprove: a.isBishopric || a.editOrgs.length > 0 || a.isApprover,
      createOrgs: a.createOrgs,
      baseCreateOrgs: a.baseCreateOrgs,
      editOrgs: a.editOrgs,
      catOrgs: a.catOrgs,
      coordinates: a.categories,
      isApprover: !!a.isApprover,
      canManagePreapprove: !!a.isApprover,
    },
    organizations: lc.s.organizations,
    categories: creatableCategories_(a),
    defaults: { cutoffHours: lc.s.default_cancel_cutoff_hours },
  };
}

function slotOut_(sl, counts) {
  var c = (counts && counts[sl['Slot id']]) || { filled: 0, waiting: 0 };
  return {
    slotId: sl['Slot id'],
    date: sl.Date,
    start: sl.Start,
    end: sl.End,
    role: sl.Role,
    needed: Number(sl.Needed) || 0,
    filled: c.filled || 0,
    waiting: c.waiting || 0,
    roleNote: sl['Role note'] || '',
    bringingPrompt: sl['Bringing prompt'] || '',
  };
}

/** 'Ana (signed up by Sister Example)' for a child, else the name. */
function signupLabel_(su) {
  var child = String(su['Child first name'] || '').trim();
  return child ? child + ' (signed up by ' + su.Name + ')' : String(su.Name);
}

/** Posts the leader may see: current ones, or with {past: true} the Past and Cancelled ones. */
function apiListPosts_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var d = volunteerData_();
  var counts = countsBySlot(d.signups);
  var slotsByPost = groupBy_(d.slots, 'Post id');
  var signupsByPost = groupBy_(d.signups, 'Post id');
  var postsById = indexBy_(d.posts, 'Post id');
  var volunteers = volunteersByEmail_(serviceTab_(TAB.volunteers).rows());
  var leaderList = leaderEmails_();
  // May this leader approve or decline the person behind a waiting sign-up (decision 22)? The
  // same rule as the Waiting for approval tab: canApprove, on the volunteer's first post.
  var canDecide = function (su) {
    if (su.Status !== SIGNUP_STATUS.waitingApproval) return false;
    var v = volunteers[normEmail(su.Email)];
    if (!v || v.Status !== VOLUNTEER_STATUS.pending || !v['Email confirmed at']) return false;
    return canApprove(lc.access, lc.email, v, postsById[v['First post']] || null);
  };
  var wantPast = !!(data && data.past);
  var posts = d.posts
    .filter(function (p) {
      var over = p.Status === POST_STATUS.past || p.Status === POST_STATUS.cancelled;
      if (over !== wantPast) return false;
      return canSeePost(lc.access, p) || canEditPost(lc.access, lc.email, p);
    })
    .map(function (p) {
      var canEdit = canEditPost(lc.access, lc.email, p);
      var slots = (slotsByPost[p['Post id']] || []).slice().sort(slotOrder_);
      return {
        postId: p['Post id'],
        publicId: p['Public id'],
        publicUrl: pageUrl_(lc.s, 'post', { p: p['Public id'] }),
        title: p.Title,
        organization: p.Organization,
        category: p.Category,
        audiences: audiencesOf_(p.Audiences),
        status: p.Status,
        hasPrivateDetails: !!p['Private details'],
        fromRequest: isFromRequest_(p),
        canEdit: canEdit,
        firstDate: slots.length ? slots[0].Date : '',
        slots: slots.map(function (sl) {
          return slotOut_(sl, counts);
        }),
        signups: (signupsByPost[p['Post id']] || [])
          .filter(function (su) {
            return isActiveSignup_(su.Status);
          })
          .map(function (su) {
            var o = {
              signupId: su['Sign-up id'],
              slotId: su['Slot id'],
              name: su.Name,
              childName: su['Child first name'] || '',
              label: signupLabel_(su),
              bringing: su.Bringing || '',
              // The volunteer's status word (decision 24), not the sign-up's.
              status: volunteerStatusOf(su.Email, volunteers[normEmail(su.Email)] || null, leaderList),
              overLimit: isTicked(su['Over limit']),
              canDecide: canDecide(su),
            };
            // Addresses only to leaders who may edit the post (as before); deciding from the post
            // names the sign-up id instead.
            if (canEdit) o.email = su.Email;
            return o;
          }),
      };
    })
    .sort(function (a, b) {
      return cmpLocal(a.firstDate, b.firstDate) || cmpLocal(a.title, b.title);
    });
  return { ok: true, posts: posts };
}

/** A draft the script made from a request (decision 19): Created by "request <id>". */
function isFromRequest_(p) {
  return /^request /.test(String(p['Created by'] == null ? '' : p['Created by']));
}

function postForEdit_(p, slots, counts) {
  return {
    postId: p['Post id'],
    publicId: p['Public id'],
    organization: p.Organization,
    category: p.Category,
    title: p.Title,
    audiences: audiencesOf_(p.Audiences),
    publicNote: p['Public note'],
    privateDetails: p['Private details'],
    cutoffHours: p['Cancel cutoff hours'],
    status: p.Status,
    fromRequest: isFromRequest_(p),
    slots: slots
      .slice()
      .sort(slotOrder_)
      .map(function (sl) {
        return slotOut_(sl, counts);
      }),
  };
}

function apiGetPost_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var d = volunteerData_();
  var p = indexBy_(d.posts, 'Post id')[String(data.postId)];
  if (!p || !canEditPost(lc.access, lc.email, p)) return { ok: false, error: TEXT.notAllowed };
  var slots = d.slots.filter(function (sl) {
    return sl['Post id'] === p['Post id'];
  });
  return { ok: true, post: postForEdit_(p, slots, countsBySlot(d.signups)) };
}

/**
 * data: {k, mode: 'draft'|'publish'|'close', post}. Writes Posts and Slots. (Through doPost the
 * envelope's own 'action' is 'savePost', so the choice travels as 'mode'; a direct call may pass
 * it as 'action'.) Slots are matched
 * by slotId; a removed slot with people signed up is refused, as is "needed" below the number
 * already signed up.
 */
function apiSavePost_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var action = data.mode || data.action;
  if (action !== 'draft' && action !== 'publish' && action !== 'close') return { ok: false, error: TEXT.badRequest };
  var input = data.post || {};
  var result = withLock_(function () {
    var d = volunteerData_();
    var postsT = serviceTab_(TAB.posts);
    var slotsT = serviceTab_(TAB.slots);
    var existing = input.postId ? indexBy_(d.posts, 'Post id')[String(input.postId)] : null;
    if (input.postId && !existing) return { ok: false, error: TEXT.postNotFound };
    if (existing && !canEditPost(lc.access, lc.email, existing)) return { ok: false, error: TEXT.notAllowed };
    if (existing && existing.Status === POST_STATUS.cancelled) return { ok: false, error: TEXT.postCancelled };
    var now = nowLocal_();
    var who = { 'Last changed by': lc.leader.Name, 'Last changed at': now };

    if (action === 'close') {
      if (!existing) return { ok: false, error: TEXT.postNotFound };
      postsT.update(existing, merge_({ Status: POST_STATUS.closed }, who));
      return { ok: true, postId: existing['Post id'], publicId: existing['Public id'] };
    }

    var oldSlots = existing
      ? d.slots.filter(function (sl) {
          return sl['Post id'] === existing['Post id'];
        })
      : [];
    var oldById = indexBy_(oldSlots, 'Slot id');
    var keepDates = {};
    oldSlots.forEach(function (sl) {
      keepDates[sl['Slot id']] = sl.Date;
    });
    // Organizations follow the category's rule (leaderAccess); an edit that keeps the category
    // may keep the post's organization.
    var cat = String(input.category == null ? '' : input.category).trim();
    var sameCat = !!existing && cat === String(existing.Category || '');
    var allowed = allowedOrgsFor_(lc.access, cat);
    if (sameCat) allowed = uniq_(allowed.concat([existing.Organization]));
    var catIds = opportunityCategories_().map(function (c) {
      return c.id;
    });
    if (existing && existing.Category && catIds.indexOf(existing.Category) < 0) catIds.push(existing.Category);
    var v = validatePost(input, {
      allowedOrgs: allowed,
      categoryIds: catIds,
      todayLocal: now.slice(0, 10),
      publish: action === 'publish',
      // A new post needs a category, and so does a post that has one (it can't be blanked);
      // only an old post saved without one may stay that way.
      requireCategory: !existing || !!String(existing.Category || '').trim(),
      keepDates: keepDates,
    });
    var errors = v.ok ? {} : v.errors;
    if (cat && !sameCat && !allowedOrgsFor_(lc.access, cat).length) errors.category = TEXT.categoryNotAllowed;
    if (Object.keys(errors).length) return { ok: false, error: 'Please fix the marked fields.', fields: errors };

    var counts = countsBySlot(d.signups);
    var fields = {};
    var kept = {};
    var moved = false;
    v.slots.forEach(function (sl, i) {
      if (!sl.slotId) return;
      if (!oldById[sl.slotId]) {
        fields['slots[' + i + '].date'] = 'This date was removed by someone else. Reload the page.';
        return;
      }
      kept[sl.slotId] = true;
      var f = filledOf_(counts, sl.slotId);
      if (sl.needed < f) fields['slots[' + i + '].needed'] = f + ' people are signed up; needed cannot be less.';
      // Moving a booked date or start time (confirmed or waiting) would leave people at the old time.
      var old = oldById[sl.slotId];
      if (bookedOf_(counts, sl.slotId) > 0 && (sl.date !== old.Date || sl.start !== String(old.Start || ''))) {
        fields['slots[' + i + '].date'] = TEXT.removeSignupsFirst;
        moved = true;
      }
    });
    if (Object.keys(fields).length) {
      return { ok: false, error: moved ? TEXT.removeSignupsFirst : 'Please fix the marked fields.', fields: fields };
    }
    var removed = oldSlots.filter(function (sl) {
      return !kept[sl['Slot id']];
    });
    var blocked = removed.some(function (sl) {
      return bookedOf_(counts, sl['Slot id']) > 0;
    });
    if (blocked) return { ok: false, error: TEXT.removeSignupsFirst, fields: { slots: TEXT.removeSignupsFirst } };

    var p = v.post;
    var row = {
      Organization: p.organization,
      Category: p.category,
      Title: p.title,
      Audiences: p.audiences.join(', '),
      'Public note': p.publicNote,
      'Private details': p.privateDetails,
      'Cancel cutoff hours': p.cutoffHours === '' ? lc.s.default_cancel_cutoff_hours : p.cutoffHours,
      Status: action === 'publish' ? POST_STATUS.open : POST_STATUS.draft,
    };
    var postId;
    var publicId;
    if (existing) {
      postId = existing['Post id'];
      publicId = existing['Public id'];
      postsT.update(existing, merge_(row, who));
    } else {
      postId = newId_('p');
      publicId = newId_('');
      postsT.append(merge_(merge_(row, who), { 'Post id': postId, 'Public id': publicId, 'Created by': lc.email, 'Created at': now }));
    }
    var adds = [];
    v.slots.forEach(function (sl) {
      var cols = {
        Date: sl.date,
        Start: sl.start,
        End: sl.end,
        Role: sl.role,
        Needed: sl.needed,
        'Role note': sl.roleNote,
        'Bringing prompt': sl.bringingPrompt,
      };
      if (sl.slotId) {
        var old = oldById[sl.slotId];
        var changes = {};
        Object.keys(cols).forEach(function (c) {
          if (String(old[c]) !== String(cols[c])) changes[c] = cols[c];
        });
        if (Object.keys(changes).length) slotsT.update(old, changes);
      } else {
        adds.push(merge_(cols, { 'Slot id': newId_('t'), 'Post id': postId, Filled: 0, Waiting: 0 }));
      }
    });
    slotsT.removeMany(removed);
    slotsT.appendMany(adds);
    return { ok: true, postId: postId, publicId: publicId };
  });
  if (!result.ok) return result;
  clearServeCache_();
  result.publicUrl = pageUrl_(lc.s, 'post', { p: result.publicId });
  return result;
}

/** Sign-ups holding (Confirmed) or waiting for (Waiting-*) a place in the slot. */
function bookedOf_(counts, slotId) {
  var c = (counts && counts[slotId]) || {};
  return (c.filled || 0) + (c.waiting || 0);
}

function merge_(a, b) {
  var o = {};
  Object.keys(a).forEach(function (k) {
    o[k] = a[k];
  });
  Object.keys(b).forEach(function (k) {
    o[k] = b[k];
  });
  return o;
}

/** {signup, post, slot, signups} for a sign-up the leader may edit, or an error answer. */
function editableSignup_(lc, signupId) {
  var d = volunteerData_();
  var su = indexBy_(d.signups, 'Sign-up id')[String(signupId)];
  if (!su) return { error: 'That sign-up was not found.' };
  var post = indexBy_(d.posts, 'Post id')[su['Post id']];
  var slot = indexBy_(d.slots, 'Slot id')[su['Slot id']];
  if (!post || !slot || !canEditPost(lc.access, lc.email, post)) return { error: TEXT.notAllowed };
  return { signup: su, post: post, slot: slot, signups: d.signups };
}

function apiRemoveSignup_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var done = withLock_(function () {
    var f = editableSignup_(lc, data.signupId);
    if (f.error) return f;
    if (!isActiveSignup_(f.signup.Status)) return { already: true };
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.removed, 'Removed by': lc.leader.Name });
    refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    revokeSignupTokens_(f.signup['Sign-up id']);
    f.msgs = [mailMsg_(normEmail(f.signup.Email), tplRemoved_(lc.s, f.post, f.slot))];
    return f;
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: 'Already removed.' };
  clearServeCache_();
  sendAll_('remove', done.msgs);
  return { ok: true, message: 'Removed. We emailed ' + done.signup.Name + '.' };
}

/**
 * Calls off a whole post (data.date blank) or one of its dates (data.date set). Every Confirmed
 * sign-up on it becomes Removed by the leader, loses its cancel link and gets one email per
 * address. A cancelled post gets status Cancelled (off serve, no reminders, can't be reopened);
 * a cancelled date's slots are deleted and the post stays as it was.
 */
function cancelPostOrDate_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var note = String(data.note == null ? '' : data.note).trim();
  if (note.length > 300) return { ok: false, error: 'Keep the note under 300 characters.', fields: { note: 'Keep the note under 300 characters.' } };
  var date = String(data.date == null ? '' : data.date).trim();
  if (date && !isDateStr(date)) return { ok: false, error: 'Pick a date.' };
  var done = withLock_(function () {
    var d = volunteerData_();
    var post = indexBy_(d.posts, 'Post id')[String(data.postId)];
    if (!post) return { error: TEXT.postNotFound };
    if (!canEditPost(lc.access, lc.email, post)) return { error: TEXT.notAllowed };
    if (post.Status === POST_STATUS.cancelled) return { error: TEXT.postCancelled };
    if (post.Status === POST_STATUS.past) return { error: 'This opportunity is already over.' };
    var postSlots = d.slots.filter(function (sl) {
      return sl['Post id'] === post['Post id'];
    });
    var slots = date
      ? postSlots.filter(function (sl) {
          return sl.Date === date;
        })
      : postSlots;
    if (date && !slots.length) return { error: 'That date is not on this opportunity.' };
    if (date && slots.length === postSlots.length) return { error: TEXT.onlyDate };
    var slotIds = slots.map(function (sl) {
      return sl['Slot id'];
    });
    var signupsT = serviceTab_(TAB.signups);
    var hit = d.signups.filter(function (su) {
      return su['Post id'] === post['Post id'] && su.Status === SIGNUP_STATUS.confirmed && slotIds.indexOf(su['Slot id']) >= 0;
    });
    // The slot rows may be deleted, so Removed by keeps who, and which date and role was called off.
    var allSlots = indexBy_(postSlots, 'Slot id');
    hit.forEach(function (su) {
      var sl = allSlots[su['Slot id']];
      var what = (date ? 'date' : 'opportunity') + ' cancelled: ' + (sl ? fmtDateShort_(sl.Date) + ', ' + sl.Role : 'unknown date');
      signupsT.update(su, { Status: SIGNUP_STATUS.removed, 'Removed by': lc.leader.Name + ' (' + what + ')' });
    });
    // Sign-ups still waiting (email or approval) on what is called off simply lapse; no email.
    d.signups.forEach(function (su) {
      if (su['Post id'] === post['Post id'] && isWaitingSignup_(su.Status) && slotIds.indexOf(su['Slot id']) >= 0) {
        signupsT.update(su, { Status: SIGNUP_STATUS.lapsed });
      }
    });
    var stamp = { 'Last changed by': lc.leader.Name, 'Last changed at': nowLocal_() };
    if (date) {
      serviceTab_(TAB.slots).removeMany(slots);
      serviceTab_(TAB.posts).update(post, stamp);
    } else {
      stamp.Status = POST_STATUS.cancelled;
      serviceTab_(TAB.posts).update(post, stamp);
    }
    hit.forEach(function (su) {
      revokeSignupTokens_(su['Sign-up id']);
    });
    return { post: post, slots: slots, hit: hit };
  });
  if (done.error) return { ok: false, error: done.error };
  clearServeCache_();
  var slotById = indexBy_(done.slots, 'Slot id');
  var byEmail = {};
  done.hit.forEach(function (su) {
    var e = normEmail(su.Email);
    (byEmail[e] = byEmail[e] || []).push(slotById[su['Slot id']]);
  });
  // High: it must not wait behind the reserve and arrive after the event.
  sendAll_(
    'cancel post',
    Object.keys(byEmail).map(function (to) {
      return mailMsg_(to, tplPostCancelled_(lc.s, done.post, byEmail[to], note, !date), 'high');
    })
  );
  var n = Object.keys(byEmail).length;
  return { ok: true, message: (date ? 'Date cancelled.' : 'Opportunity cancelled.') + (n ? ' We emailed ' + n + ' ' + (n === 1 ? 'person' : 'people') + '.' : '') };
}

/** data: {k, postId, note?}. */
function apiCancelPost_(data) {
  var d = {};
  Object.keys(data || {}).forEach(function (k) {
    d[k] = data[k];
  });
  d.date = '';
  return cancelPostOrDate_(d);
}

/** data: {k, postId, date, note?}. */
function apiCancelDate_(data) {
  if (!data || !data.date) return { ok: false, error: 'Pick a date.' };
  return cancelPostOrDate_(data);
}

function apiSignOutEverywhere_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  revokeTokens_('leader', lc.email);
  sendLeaderLink_(lc.leader);
  return { ok: true, message: TEXT.signOutDone };
}

// ---------- approvals ----------

/** The Volunteers row and first post for an address, with the data read once. */
function volunteerCtx_(email) {
  var d = volunteerData_();
  var volsT = serviceTab_(TAB.volunteers);
  var v = volunteersByEmail_(volsT.rows())[normEmail(email)] || null;
  var postsById = indexBy_(d.posts, 'Post id');
  return { d: d, volsT: volsT, v: v, firstPost: v ? postsById[v['First post']] || null : null, postsById: postsById };
}

/**
 * Volunteers this leader may approve: Pending, address confirmed, first post in an organization
 * the leader edits (or any, for the bishopric). Name, email, first post and waiting sign-ups.
 */
function apiWaiting_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var d = volunteerData_();
  var postsById = indexBy_(d.posts, 'Post id');
  var slotsById = indexBy_(d.slots, 'Slot id');
  var byEmail = groupBy_(
    d.signups.map(function (su) {
      return { e: normEmail(su.Email), su: su };
    }),
    'e'
  );
  var out = serviceTab_(TAB.volunteers)
    .rows()
    .filter(function (v) {
      return v.Status === VOLUNTEER_STATUS.pending && !!v['Email confirmed at'] && isEmail(v.Email);
    })
    .filter(function (v) {
      return canApprove(lc.access, lc.email, v, postsById[v['First post']] || null);
    })
    .map(function (v) {
      var first = postsById[v['First post']];
      return {
        email: normEmail(v.Email),
        name: v.Name,
        confirmedAt: v['Email confirmed at'],
        firstPost: first ? first.Title : '',
        firstPostOrganization: first ? first.Organization : '',
        signups: (byEmail[normEmail(v.Email)] || [])
          .map(function (x) {
            return x.su;
          })
          .filter(function (su) {
            return su.Status === SIGNUP_STATUS.waitingApproval;
          })
          .map(function (su) {
            var p = postsById[su['Post id']] || {};
            var sl = slotsById[su['Slot id']] || {};
            return { title: p.Title || '', organization: p.Organization || '', date: sl.Date || '', start: sl.Start || '', role: sl.Role || '', childName: su['Child first name'] || '' };
          }),
      };
    })
    .sort(function (a, b) {
      return cmpLocal(a.confirmedAt, b.confirmedAt);
    });
  return { ok: true, volunteers: out };
}

/**
 * data: {k, email | signupId, decision: 'approve'|'decline'}. From the Waiting for approval tab
 * the volunteer is named by email; from a post (decision 22) by one of their sign-up ids, so a
 * leader who may approve but not edit the post never needs the address. Approve: the address is approved ward-wide and
 * each sign-up waiting for approval counts (confirmation, or the withdraw email when it is over
 * the number); one approved email. Decline: its waiting sign-ups lapse; one polite email. Both
 * record Decided by (the leader's name) and Decided at.
 */
function apiDecide_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var decision = data && data.decision;
  if (decision !== 'approve' && decision !== 'decline') return { ok: false, error: TEXT.badRequest };
  var done = withLock_(function () {
    var who = data.email;
    if (!who && data.signupId) {
      var su = indexBy_(serviceTab_(TAB.signups).rows(), 'Sign-up id')[String(data.signupId)];
      who = su ? su.Email : '';
    }
    var x = volunteerCtx_(who);
    if (!x.v) return { error: 'That volunteer was not found.' };
    if (!canApprove(lc.access, lc.email, x.v, x.firstPost)) return { error: TEXT.cannotApprove };
    if (x.v.Status !== VOLUNTEER_STATUS.pending || !x.v['Email confirmed at']) return { error: 'This person is not waiting for approval.' };
    var now = nowLocal_();
    var today = now.slice(0, 10);
    var email = normEmail(x.v.Email);
    var record = { 'Decided by': lc.leader.Name, 'Decided at': now };
    var signupsT = serviceTab_(TAB.signups);
    var slotsT = serviceTab_(TAB.slots);
    var slotsById = indexBy_(x.d.slots, 'Slot id');
    var mine = x.d.signups.filter(function (su) {
      return normEmail(su.Email) === email && isWaitingSignup_(su.Status);
    });
    var lapse = function (su) {
      signupsT.update(su, { Status: SIGNUP_STATUS.lapsed });
      if (slotsById[su['Slot id']]) refreshFilled_(slotsT, slotsById[su['Slot id']], x.d.signups);
    };
    if (decision === 'decline') {
      x.volsT.update(x.v, merge_({ Status: VOLUNTEER_STATUS.declined }, record));
      mine.forEach(lapse);
      return { v: x.v, decision: decision, msgs: [mailMsg_(email, tplContactToSignUp_(lc.s))] };
    }
    x.volsT.update(x.v, merge_({ Status: VOLUNTEER_STATUS.approved }, record));
    var live = [];
    mine.forEach(function (su) {
      var sl = slotsById[su['Slot id']];
      var p = x.postsById[su['Post id']];
      var over = !sl || !p || sl.Date < today || p.Status === POST_STATUS.cancelled || p.Status === POST_STATUS.past;
      if (over) lapse(su);
      else live.push(su);
    });
    var confirmed = confirmSignupsLocked_(live, x.d);
    var msgs = [mailMsg_(email, tplApproved_(lc.s, x.v))]
      .concat(confirmationMsgs_(confirmed, x.d))
      .concat(
        filledMsgsLocked_(
          confirmed.map(function (c) {
            return c.post['Post id'];
          }),
          x.d
        )
      );
    return { v: x.v, decision: decision, n: confirmed.length, msgs: msgs };
  });
  if (done.error) return { ok: false, error: done.error };
  clearServeCache_();
  sendAll_('decide', done.msgs);
  if (done.decision === 'decline') return { ok: true, message: 'Declined. We emailed ' + done.v.Name + '.' };
  var n = done.n;
  return { ok: true, message: 'Approved. ' + n + ' sign-up' + (n === 1 ? '' : 's') + ' now count' + (n === 1 ? 's' : '') + '. We emailed ' + done.v.Name + '.' };
}

/**
 * Bishopric only. data: {k, email, decision: 'undo'|'revoke'}. Undo a decline (or a revoke):
 * Pending again. Revoke an approval: Revoked, so new sign-ups are blocked; Confirmed sign-ups
 * stay and the answer says how many are still to come. Recorded like approvals.
 */
function apiBishopric_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  if (!lc.access.isBishopric) return { ok: false, error: TEXT.bishopricOnly };
  var decision = data && data.decision;
  if (decision !== 'undo' && decision !== 'revoke') return { ok: false, error: TEXT.badRequest };
  var done = withLock_(function () {
    var x = volunteerCtx_(data.email);
    if (!x.v) return { error: 'That volunteer was not found.' };
    var now = nowLocal_();
    var record = { 'Decided by': lc.leader.Name, 'Decided at': now };
    if (decision === 'undo') {
      if (x.v.Status !== VOLUNTEER_STATUS.declined && x.v.Status !== VOLUNTEER_STATUS.revoked) return { error: 'Only a decline or a revoke can be undone.' };
      x.volsT.update(x.v, merge_({ Status: VOLUNTEER_STATUS.pending }, record));
      return { message: 'Undone. ' + x.v.Name + ' is waiting again; their next sign-up comes to Waiting for approval.' };
    }
    if (x.v.Status !== VOLUNTEER_STATUS.approved) return { error: 'Only an approved volunteer can be revoked.' };
    x.volsT.update(x.v, merge_({ Status: VOLUNTEER_STATUS.revoked }, record));
    var today = now.slice(0, 10);
    var slotsById = indexBy_(x.d.slots, 'Slot id');
    var email = normEmail(x.v.Email);
    var n = x.d.signups.filter(function (su) {
      var sl = slotsById[su['Slot id']];
      return normEmail(su.Email) === email && su.Status === SIGNUP_STATUS.confirmed && sl && sl.Date >= today;
    }).length;
    return {
      message:
        "Revoked. They can't sign up again. " +
        (n ? n + ' upcoming sign-up' + (n === 1 ? ' stays' : 's stay') + '; remove ' + (n === 1 ? 'it' : 'them') + ' on My opportunities if needed.' : 'They have no upcoming sign-ups.'),
    };
  });
  if (done.error) return { ok: false, error: done.error };
  return { ok: true, message: done.message };
}

// ---------- 2.4 (decision 24): the volunteer list, decisions by id, the Pre-approve list ----------

/** Order of the volunteer list: needs_approval, email_not_confirmed, then the rest. */
var VOLUNTEER_LIST_ORDER = { needs_approval: 0, email_not_confirmed: 1 };

/**
 * Every address the portal knows: each Volunteers row, plus any leader or older (phase 1)
 * address that has sign-ups. {email: {row, signups: []}}.
 */
function knownVolunteers_(d, volRows) {
  var out = {};
  volRows.forEach(function (v) {
    if (!isEmail(v.Email)) return;
    out[normEmail(v.Email)] = { row: v, signups: [] };
  });
  d.signups.forEach(function (su) {
    if (!isEmail(su.Email)) return;
    var e = normEmail(su.Email);
    if (!out[e]) out[e] = { row: null, signups: [] };
    out[e].signups.push(su);
  });
  return out;
}

/** vid → email, by scanning the known addresses; '' when unknown. */
function emailForVid_(vid) {
  var want = String(vid == null ? '' : vid);
  if (!/^[0-9a-f]{16}$/.test(want)) return '';
  var known = knownVolunteers_(volunteerData_(), serviceTab_(TAB.volunteers).rows());
  var found = '';
  Object.keys(known).forEach(function (e) {
    if (!found && volunteerId_(e) === want) found = e;
  });
  return found;
}

/**
 * Any leader: everyone who has signed up or is on the Volunteers tab, with a status word, how
 * many upcoming sign-ups, their first sign-up and the children they signed up. Addresses, who
 * decided, and the allowed actions only for the bishopric and approvers.
 */
function apiListVolunteers_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var manager = !!lc.access.isApprover;
  var d = volunteerData_();
  var today = todayLocal_();
  var postsById = indexBy_(d.posts, 'Post id');
  var slotsById = indexBy_(d.slots, 'Slot id');
  var leaders = leaders_();
  var leaderList = leaderEmails_(leaders);
  var leaderNames = {};
  leaders.forEach(function (l) {
    if (isEmail(l.Email)) leaderNames[normEmail(l.Email)] = l.Name;
  });
  var known = knownVolunteers_(d, serviceTab_(TAB.volunteers).rows());
  var list = Object.keys(known).map(function (e) {
    var k = known[e];
    var v = k.row;
    var status = volunteerStatusOf(e, v, leaderList);
    var sorted = k.signups.slice().sort(function (a, b) {
      return cmpLocal(a['Signed up at'], b['Signed up at']);
    });
    var latest = sorted.length ? sorted[sorted.length - 1] : null;
    var firstPost = v && v['First post'] ? postsById[v['First post']] : sorted.length ? postsById[sorted[0]['Post id']] : null;
    var firstSignup = null;
    if (firstPost) {
      var dates = sorted
        .filter(function (su) {
          return su['Post id'] === firstPost['Post id'];
        })
        .map(function (su) {
          return slotsById[su['Slot id']] ? slotsById[su['Slot id']].Date : '';
        })
        .filter(String)
        .sort();
      firstSignup = { title: firstPost.Title, date: dates[0] || '' };
    }
    var children = uniq_(
      k.signups
        .map(function (su) {
          return String(su['Child first name'] || '').trim();
        })
        .filter(String)
    );
    var upcoming = k.signups.filter(function (su) {
      var sl = slotsById[su['Slot id']];
      return isActiveSignup_(su.Status) && sl && sl.Date >= today;
    }).length;
    var item = {
      vid: volunteerId_(e),
      name: (v && v.Name) || (latest && latest.Name) || leaderNames[e] || '',
      status: status,
      upcomingCount: upcoming,
      firstSignup: firstSignup,
      children: children,
    };
    if (manager) {
      item.email = e;
      item.decidedBy = v ? String(v['Decided by'] || '') : '';
      item.decidedAt = v ? String(v['Decided at'] || '') : '';
      var actions = [];
      if (status === 'needs_approval' && canApprove(lc.access, lc.email, v, v ? postsById[v['First post']] || null : null)) actions.push('approve', 'decline');
      if (status === 'approved' && v && lc.access.isBishopric) actions.push('revoke');
      if ((status === 'declined' || status === 'revoked') && lc.access.isBishopric) actions.push('undo');
      item.actions = actions;
    }
    return item;
  });
  list.sort(function (a, b) {
    var oa = VOLUNTEER_LIST_ORDER.hasOwnProperty(a.status) ? VOLUNTEER_LIST_ORDER[a.status] : 2;
    var ob = VOLUNTEER_LIST_ORDER.hasOwnProperty(b.status) ? VOLUNTEER_LIST_ORDER[b.status] : 2;
    return oa - ob || cmpLocal(String(a.name).toLowerCase(), String(b.name).toLowerCase());
  });
  return { ok: true, canSeeEmails: manager, canAct: manager, volunteers: list };
}

/** data: {k, vid, decision}. The same checks and effects as decide / bishopric. */
function apiDecideVolunteer_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var decision = data && data.decision;
  if (['approve', 'decline', 'revoke', 'undo'].indexOf(decision) < 0) return { ok: false, error: TEXT.badRequest };
  var email = emailForVid_(data.vid);
  if (!email) return { ok: false, error: TEXT.notFound };
  var pass = { k: data.k, email: email, decision: decision };
  return decision === 'approve' || decision === 'decline' ? apiDecide_(pass) : apiBishopric_(pass);
}

/** Any leader: how many addresses are on the Pre-approve list (0 unless they may manage it). */
function apiPreapproveCount_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var manager = !!lc.access.isApprover;
  return { ok: true, total: manager ? systemTab_(SYS_TAB.preapproved).rows().length : 0, canManage: manager };
}

/**
 * Bishopric and approvers: adds pasted addresses to the Pre-approve list as salted hashes. Split
 * on commas, semicolons, spaces and new lines; at most 2,000 per call. Nothing pasted is echoed,
 * logged or stored as text.
 */
function apiPreapproveAdd_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  if (!lc.access.isApprover) return { ok: false, error: TEXT.approversOnly };
  var entries = String((data && data.emails) == null ? '' : data.emails)
    .split(/[\s,;]+/)
    .filter(String);
  if (entries.length > 2000) return { ok: false, error: TEXT.tooManyPasted };
  return withLock_(function () {
    var t = systemTab_(SYS_TAB.preapproved);
    var have = {};
    t.rows().forEach(function (r) {
      have[String(r.Hash)] = true;
    });
    var now = nowLocal_();
    var add = [];
    var already = 0;
    var invalid = 0;
    entries.forEach(function (e) {
      if (!isEmail(e)) {
        invalid++;
        return;
      }
      var h = preapproveHash_(e);
      if (have[h]) {
        already++;
        return;
      }
      have[h] = true;
      add.push({ Hash: h, 'Added at': now, 'Added by': lc.leader.Name });
    });
    t.appendMany(add);
    return { ok: true, added: add.length, already: already, invalid: invalid, total: Object.keys(have).length };
  });
}

/** Bishopric and approvers: empties the Pre-approve list. */
function apiPreapproveClear_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  if (!lc.access.isApprover) return { ok: false, error: TEXT.approversOnly };
  return withLock_(function () {
    var t = systemTab_(SYS_TAB.preapproved);
    var rows = t.rows();
    t.removeMany(rows);
    return { ok: true, removed: rows.length };
  });
}

/** Bishopric only: every volunteer with status and who decided. */
function apiVolunteers_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  if (!lc.access.isBishopric) return { ok: false, error: TEXT.bishopricOnly };
  var postsById = indexBy_(serviceTab_(TAB.posts).rows(), 'Post id');
  var list = serviceTab_(TAB.volunteers)
    .rows()
    .filter(function (v) {
      return isEmail(v.Email);
    })
    .map(function (v) {
      var first = postsById[v['First post']];
      return {
        email: normEmail(v.Email),
        name: v.Name,
        status: v.Status || VOLUNTEER_STATUS.pending,
        decidedBy: v['Decided by'] || '',
        decidedAt: v['Decided at'] || '',
        emailConfirmed: !!v['Email confirmed at'],
        firstPost: first ? first.Title : '',
      };
    })
    .sort(function (a, b) {
      return cmpLocal(String(a.name).toLowerCase(), String(b.name).toLowerCase());
    });
  return { ok: true, volunteers: list };
}

/** Ward council and bishopric: short roles of open posts in the next 14 days. */
function apiNeedsHelp_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  if (!lc.access.seeAllNames) return { ok: false, error: TEXT.councilOnly };
  return { ok: true, rows: needsHelpRows_(lc.s) };
}

/** needsHelpSoon over the current tabs, each with its public link. */
function needsHelpRows_(s) {
  var d = volunteerData_();
  return needsHelpSoon(d.posts, groupBy_(d.slots, 'Post id'), countsBySlot(d.signups), todayLocal_()).map(function (r) {
    r.publicUrl = pageUrl_(s, 'post', { p: r.publicId });
    return r;
  });
}

// ===== 10-web.js =====

/**
 * Web entry points. The web app is deployed "Execute as: Me" (the shared account) and "Who has
 * access: Anyone".
 *   GET  ?api=serve|post|help|ping   JSON for the hub pages
 *   GET  ?page=serve|post|help|confirm|leader|me   the same pages served by the script (fallback)
 *   POST (text/plain body holding JSON {action, ...})   every action that changes or reads private data
 *   gpApi(req)   the fallback pages' google.script.run channel
 */

var PAGE_TITLES = {
  serve: 'Service Opportunities',
  post: 'Service Opportunity',
  help: 'Request Help or Service',
  confirm: 'Your Sign-up',
  leader: 'Leader Page',
  me: 'My Sign-ups',
};

var POST_ACTIONS = [
  'signup',
  'tokenInfo',
  'cancel',
  'confirm',
  'withdraw',
  'me',
  'requestMeLink',
  'cancelMine',
  'resendConfirm',
  'requestLeaderLink',
  'whoami',
  'listPosts',
  'getPost',
  'savePost',
  'removeSignup',
  'signOutEverywhere',
  'cancelPost',
  'cancelDate',
  'waiting',
  'decide',
  'bishopric',
  'volunteers',
  'needsHelp',
  'listVolunteers',
  'decideVolunteer',
  'preapproveCount',
  'preapproveAdd',
  'preapproveClear',
];

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  gpBegin_();
  var p = (e && e.parameter) || {};
  if (p.api === 'serve' || p.api === 'post' || p.api === 'help') {
    return jsonOut_(dispatch_(p.api, { p: p.p }));
  }
  if (p.api === 'ping') return jsonOut_({ ok: true, at: nowLocal_(), build: GP_BUILD });
  if (p.page && PAGE_TITLES.hasOwnProperty(p.page) && GP_PAGES.hasOwnProperty(p.page)) {
    var s = settings_();
    return HtmlService.createHtmlOutput(renderPage_(p.page, s, true))
      .setTitle(PAGE_TITLES[p.page] + ' · ' + (s.ward_name || 'Ward'))
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return jsonOut_({ ok: false, error: TEXT.notFound });
}

function doPost(e) {
  gpBegin_();
  var data = null;
  try {
    data = JSON.parse(e && e.postData && e.postData.contents);
  } catch (err) {
    data = null;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return jsonOut_({ ok: false, error: TEXT.badRequest });
  if (POST_ACTIONS.indexOf(data.action) < 0) return jsonOut_({ ok: false, error: TEXT.notFound });
  return jsonOut_(dispatch_(data.action, data));
}

/** The fallback pages call this through google.script.run. */
function gpApi(req) {
  gpBegin_();
  if (!req || typeof req !== 'object') return { ok: false, error: TEXT.badRequest };
  var a = req.action;
  if (a !== 'serve' && a !== 'post' && a !== 'help' && POST_ACTIONS.indexOf(a) < 0) return { ok: false, error: TEXT.notFound };
  // Round-trip through JSON so the page gets plain data (google.script.run refuses some values).
  return JSON.parse(JSON.stringify(dispatch_(a, req)));
}

/** Runs one action; never throws. Errors are logged and answered without details. */
function dispatch_(action, data) {
  data = data || {};
  var handlers = {
    serve: function () {
      return apiServe_();
    },
    post: function () {
      return apiPost_(data.p);
    },
    help: function () {
      return apiHelp_();
    },
    signup: function () {
      return apiSignup_(data);
    },
    tokenInfo: function () {
      return apiTokenInfo_(data);
    },
    cancel: function () {
      return apiCancel_(data);
    },
    confirm: function () {
      return apiConfirm_(data);
    },
    withdraw: function () {
      return apiWithdraw_(data);
    },
    me: function () {
      return apiMe_(data);
    },
    requestMeLink: function () {
      return apiRequestMeLink_(data);
    },
    cancelMine: function () {
      return apiCancelMine_(data);
    },
    resendConfirm: function () {
      return apiResendConfirm_(data);
    },
    requestLeaderLink: function () {
      return apiRequestLeaderLink_(data);
    },
    whoami: function () {
      return apiWhoami_(data);
    },
    listPosts: function () {
      return apiListPosts_(data);
    },
    getPost: function () {
      return apiGetPost_(data);
    },
    savePost: function () {
      return apiSavePost_(data);
    },
    removeSignup: function () {
      return apiRemoveSignup_(data);
    },
    signOutEverywhere: function () {
      return apiSignOutEverywhere_(data);
    },
    cancelPost: function () {
      return apiCancelPost_(data);
    },
    cancelDate: function () {
      return apiCancelDate_(data);
    },
    waiting: function () {
      return apiWaiting_(data);
    },
    decide: function () {
      return apiDecide_(data);
    },
    bishopric: function () {
      return apiBishopric_(data);
    },
    volunteers: function () {
      return apiVolunteers_(data);
    },
    needsHelp: function () {
      return apiNeedsHelp_(data);
    },
    listVolunteers: function () {
      return apiListVolunteers_(data);
    },
    decideVolunteer: function () {
      return apiDecideVolunteer_(data);
    },
    preapproveCount: function () {
      return apiPreapproveCount_(data);
    },
    preapproveAdd: function () {
      return apiPreapproveAdd_(data);
    },
    preapproveClear: function () {
      return apiPreapproveClear_(data);
    },
  };
  if (!handlers.hasOwnProperty(action)) return { ok: false, error: TEXT.notFound };
  try {
    ensureUpgraded_();
  } catch (e0) {
    log_('upgrade failed', clip(e0 && e0.message ? e0.message : e0, 300));
  }
  try {
    // When the phase 2 web app first answered: the end of the old web app's gap (migration).
    if (!props_().getProperty('PHASE2_WEB_AT')) props_().setProperty('PHASE2_WEB_AT', nowLocal_());
  } catch (e1) {
    // not needed to answer
  }
  try {
    return handlers[action]();
  } catch (err) {
    if (err && err.gpBusy) return { ok: false, error: TEXT.busy };
    log_('api error', action + ' | ' + clip(err && err.message ? err.message : err, 300));
    var contact = '';
    try {
      contact = settings_().contact_email;
    } catch (e2) {
      contact = '';
    }
    return { ok: false, error: TEXT.genericError + (contact || 'the ward') + '.' };
  }
}

/** JSON for inside a <script>: no '<' so nothing can close the script tag. */
function jsonForScript_(v) {
  return JSON.stringify(v)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(new RegExp(String.fromCharCode(0x2028), 'g'), '\\u2028')
    .replace(new RegExp(String.fromCharCode(0x2029), 'g'), '\\u2029');
}

/** Fills {{NAME}} placeholders: JSON inside <script> blocks, HTML-escaped everywhere else. */
function fillTemplate_(html, values) {
  var parts = html.split(/(<script\b[^>]*>[\s\S]*?<\/script>)/i);
  return parts
    .map(function (part, i) {
      var inScript = i % 2 === 1;
      return part.replace(/\{\{([A-Z_]+)\}\}/g, function (m, name) {
        if (!values.hasOwnProperty(name)) return m;
        return inScript ? jsonForScript_(values[name]) : esc(values[name]);
      });
    })
    .join('');
}

// ---------- the ward's look (2.3, decision 20) ----------

var THEME_SERIF_FALLBACK = "Georgia, 'Times New Roman', serif";

/** An https picture address safe inside CSS url("…"): no quotes, spaces, brackets or backslashes. */
function isThemeImageUrl_(v) {
  var u = String(v == null ? '' : v).trim();
  return u.length <= 500 && /^https:\/\/[^\s"'()<>\\]+$/i.test(u);
}

function isThemeColour_(v) {
  return /^#[0-9a-fA-F]{6}$/.test(String(v == null ? '' : v).trim());
}

/** A Google Fonts family name: letters, digits and spaces, at most 40. */
function isThemeFont_(v) {
  var f = String(v == null ? '' : v).trim();
  return f.length > 0 && f.length <= 40 && /^[A-Za-z0-9 ]+$/.test(f);
}

/** WCAG contrast ratio of a #rrggbb colour against white. */
function contrastWithWhite_(hex) {
  var h = String(hex).replace('#', '');
  var lin = function (i) {
    var c = parseInt(h.substr(i, 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  var L = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  return 1.05 / (L + 0.05);
}

/**
 * The Settings theme, checked: {bg, accent, font, headingFont, problems}. A value that fails its
 * check is left out (today's look for that part) and named in problems (Check health).
 */
function themeOf_(s) {
  var t = { bg: '', accent: '', font: '', headingFont: '', problems: [] };
  var val = function (k) {
    return String(s[k] == null ? '' : s[k]).trim();
  };
  var bg = val('theme_background_url');
  if (bg) {
    if (isThemeImageUrl_(bg)) t.bg = bg;
    else t.problems.push('theme_background_url must be a full https address of a picture (no spaces or quotes); it is ignored.');
  }
  var accent = val('theme_accent');
  if (accent) {
    if (isThemeColour_(accent)) t.accent = accent.toLowerCase();
    else t.problems.push('theme_accent must be a colour like #2f5d50; it is ignored.');
  }
  ['theme_font', 'theme_heading_font'].forEach(function (k) {
    var f = val(k);
    if (!f) return;
    if (isThemeFont_(f)) t[k === 'theme_font' ? 'font' : 'headingFont'] = f;
    else t.problems.push(k + ' must be a Google Fonts family name (letters, digits and spaces, at most 40), e.g. Lora; it is ignored.');
  });
  return t;
}

/** The <link> and <style> that put the theme on a page ('' when nothing is set). */
function themeHead_(t) {
  var vars = [];
  if (t.bg) {
    vars.push('--gp-bg: linear-gradient(rgba(255, 255, 255, 0.84), rgba(255, 255, 255, 0.42)), url("' + t.bg + '")');
    vars.push('--gp-panel: rgba(255, 255, 255, 0.92)');
    vars.push('--gp-panel-radius: 14px');
    vars.push('--gp-panel-pad: 1rem');
    vars.push('--gp-panel-top: 1.5rem');
  }
  if (t.accent) {
    vars.push('--gp-accent: ' + t.accent);
    vars.push('--gp-bar: ' + t.accent);
    // Text colours only when the accent reads on white: 4.5:1, or 5.3:1 over a picture (the panel
    // lets a little of the picture through); a lighter accent stays decoration.
    if (contrastWithWhite_(t.accent) >= (t.bg ? 5.3 : 4.5)) {
      vars.push('--gp-link: ' + t.accent);
      vars.push('--gp-button: ' + t.accent);
    }
  }
  if (t.font) vars.push("--gp-font: '" + t.font + "', " + THEME_SERIF_FALLBACK);
  if (t.headingFont) vars.push("--gp-heading-font: '" + t.headingFont + "', " + THEME_SERIF_FALLBACK);
  if (!vars.length) return '';
  var families = uniq_([t.font, t.headingFont].filter(String));
  var link = families.length
    ? '<link rel="stylesheet" href="' +
      esc(
        'https://fonts.googleapis.com/css2?' +
          families
            .map(function (f) {
              return 'family=' + f.replace(/ /g, '+');
            })
            .join('&') +
          '&display=swap'
      ) +
      '">\n'
    : '';
  return link + '<style id="gp-theme">\n:root {\n  ' + vars.join(';\n  ') + ';\n}\n</style>\n';
}

/** A page from GP_PAGES with the ward's values filled in, and the ward's look when set. */
function renderPage_(name, s, fallback) {
  var html = GP_PAGES[name];
  if (!s.preview_image_url) html = html.replace(/[^\n]*\{\{PREVIEW_IMAGE\}\}[^\n]*\n/g, '');
  // The theme goes in after the placeholders are filled, so nothing in it is ever read as one.
  var head = themeHead_(themeOf_(s));
  var filled = fillTemplate_(html, {
    WARD_NAME: s.ward_name || '',
    WEB_APP_URL: s.web_app_url || '',
    CONTACT_EMAIL: s.contact_email || '',
    PREVIEW_IMAGE: s.preview_image_url || '',
    FALLBACK: !!fallback,
    PAGE_TITLE: PAGE_TITLES[name] || '',
  });
  if (!head) return filled;
  return filled.replace('</head>', function () {
    return head + '</head>';
  });
}

/** The hub sections snippet with the ward's short links. */
function renderHubSections_(s) {
  var bare = function (u) {
    return String(u || '').replace(/^https?:\/\//, '');
  };
  return fillTemplate_(GP_HUB_SECTIONS, {
    WARD_NAME: s.ward_name || '',
    SERVE_SHORT_LINK: bare(s.serve_short_link),
    HELP_SHORT_LINK: bare(s.help_short_link),
  });
}

// ===== 11-requests.js =====

/**
 * Requests: one Google Form per request category, a private folder per category shared only
 * with its readers, and a month sheet in that folder. A form-submit trigger copies each answer
 * into the sheet, deletes it from the form and sends notices that say nothing about the
 * request. The daily job stamps Closed on, removes rows 30 days after closing and, on the 1st,
 * moves to a new month sheet and permanently deletes the old file (version history included).
 */

var REQ_Q = {
  name: 'Name',
  contact: 'Phone or email',
  moving: 'Moving in or out',
  date: 'Date',
  forWhom: 'For',
  offer: 'What would you like to give?',
  note: 'Note',
};

/** Question title → request sheet column, with the longest answer kept. */
var REQ_MAP = [
  ['Name', 'Name', 80],
  ['Phone or email', 'Phone or email', 100],
  ['Moving in or out', 'Moving', 20],
  ['Date', 'Moving date', 10],
  ['For', 'For', 20],
  ['What would you like to give?', 'Offer', 300],
  ['Note', 'Note', 200],
];

/** The giving offer form's own words (decision 16). */
var GIVING_TEXT = {
  intro:
    'Thank you for offering to help with Christmas gifts. Only the bishopric and the Christmas gift coordinators see this. A coordinator will contact you. Nothing is emailed back to you.',
  confirmation: 'Thank you. A coordinator will contact you.',
  offerLabel: 'Offer to give at Christmas',
  offerHelp: 'Up to 300 characters. For example: how many families or children you can help, and the kinds of gifts.',
};

function portalFolder_() {
  var id = props_().getProperty('PORTAL_FOLDER_ID');
  if (!id) throw new Error('Service Portal folder not found. Run Service Portal > Set up.');
  return DriveApp.getFolderById(id);
}

function joinNames_(list) {
  if (list.length <= 1) return list.join('');
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

function requestFormDescription_(s, c) {
  if (c.Id === GIVING_ID) {
    return [GIVING_TEXT.intro, '', FORM_FOOTER + (s.contact_email ? '\nContact: ' + s.contact_email : '')].join('\n');
  }
  var who = isTicked(c.Confidential)
    ? 'Only ' + (CONFIDENTIAL_WHO[c.Id] || CONFIDENTIAL_WHO_DEFAULT) + ' see this request.'
    : splitList(c['Owning organizations']).length
    ? 'Only the bishopric, the ' + joinNames_(splitList(c['Owning organizations'])) + ' leaders and the people they name see this request.'
    : 'Only the bishopric and the people it names see this request.';
  return [
    who,
    'Nothing is emailed back to you; a leader will contact you.',
    '',
    FORM_FOOTER + (s.contact_email ? '\nContact: ' + s.contact_email : ''),
  ].join('\n');
}

function addRequestQuestions_(form, c) {
  var short = function (n) {
    return FormApp.createTextValidation().setHelpText('Up to ' + n + ' characters.').requireTextLengthLessThanOrEqualTo(n).build();
  };
  form.addTextItem().setTitle(REQ_Q.name).setRequired(true).setValidation(short(80));
  form.addTextItem().setTitle(REQ_Q.contact).setRequired(true).setValidation(short(100));
  if (c.Id === 'moving') {
    form.addMultipleChoiceItem().setTitle(REQ_Q.moving).setChoiceValues(['Moving in', 'Moving out']).setRequired(true);
    form.addDateItem().setTitle(REQ_Q.date).setRequired(false);
  }
  if (c.Id === 'christmas') {
    form.addMultipleChoiceItem().setTitle(REQ_Q.forWhom).setChoiceValues(['My family', 'Another family']).setRequired(true);
  }
  if (c.Id === GIVING_ID) {
    form
      .addParagraphTextItem()
      .setTitle(REQ_Q.offer)
      .setRequired(true)
      .setHelpText(GIVING_TEXT.offerHelp)
      .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(300).build());
  }
  form
    .addParagraphTextItem()
    .setTitle(REQ_Q.note)
    .setRequired(false)
    .setHelpText(
      c.Id === GIVING_ID
        ? 'Optional, up to 200 characters, e.g. when you can deliver.'
        : 'Optional, up to 200 characters. Please leave out health or money details; a leader will ask what they need.'
    )
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(200).build());
}

function requestFormConfirmation_(c) {
  return c.Id === GIVING_ID ? GIVING_TEXT.confirmation : 'Thank you. A leader will contact you.';
}

/**
 * The request tab of a request sheet, with any header this version needs added at the end (a
 * sheet made before a header existed, e.g. Offer, keeps working).
 */
function requestTable_(ss, row) {
  var t = tabOf_(ss, REQUEST_TAB);
  var missing = Object.keys(row || {}).filter(function (k) {
    return t.headers.indexOf(k) < 0;
  });
  if (!missing.length) return t;
  ensureTab_(ss, REQUEST_TAB, uniq_(t.headers.filter(String).concat(REQUEST_HEADERS)));
  return tabOf_(ss, REQUEST_TAB);
}

/** Adds any request-sheet column this version needs (e.g. Make opportunity) to an older sheet. */
function ensureRequestColumns_(ss) {
  var t = tabOf_(ss, REQUEST_TAB);
  var missing = REQUEST_HEADERS.filter(function (h) {
    return t.headers.indexOf(h) < 0;
  });
  if (missing.length) ensureTab_(ss, REQUEST_TAB, uniq_(t.headers.filter(String).concat(REQUEST_HEADERS)));
}

// ---------- turning a request into a draft opportunity (2.2, decision 19) ----------

/** The request kind's Opportunity category row, when it names a live Opportunity category. */
function draftCategoryFor_(kind, catsById) {
  var id = String(kind['Opportunity category'] == null ? '' : kind['Opportunity category']).trim();
  var oc = id ? catsById[id] : null;
  if (!oc || oc.Kind !== CATEGORY_KIND.opportunity || isTicked(oc.Archived)) return null;
  return oc;
}

/**
 * The Posts and Slots rows for a draft made from request row r of request kind `kind` into
 * opportunity category oc. Public fields come only from the category: nothing from the request
 * but (when Copy contact is ticked) its name and contact in Private details, and its Moving date.
 */
function draftFromRequest_(s, kind, oc, r, todayLocal, nowLocal) {
  var org = splitList(oc['Owning organizations'])[0] || splitList(kind['Owning organizations'])[0] || 'Bishopric';
  var audiences = audiencesOf_(oc['Default audiences']);
  if (!audiences.length) audiences = org === 'Relief Society' ? ['Sisters'] : org === 'Elders Quorum' ? ['Brothers'] : AUDIENCES.slice();
  var date = isDateStr(r['Moving date']) && r['Moving date'] >= todayLocal ? r['Moving date'] : addDays(todayLocal, 7);
  var privateDetails = isTicked(r['Copy contact to private details'])
    ? 'Requested by ' + String(r.Name == null ? '' : r.Name).trim() + ', ' + String(r['Phone or email'] == null ? '' : r['Phone or email']).trim()
    : '';
  var postId = newId_('p');
  return {
    post: {
      'Post id': postId,
      'Public id': newId_(''),
      Organization: org,
      Category: String(oc.Id),
      Title: oc.Name,
      Audiences: audiences.join(', '),
      'Public note': '',
      'Private details': privateDetails,
      'Cancel cutoff hours': s.default_cancel_cutoff_hours,
      Status: POST_STATUS.draft,
      'Created by': 'request ' + r['Request id'],
      'Created at': nowLocal,
      'Last changed by': 'From a request',
      'Last changed at': nowLocal,
    },
    slot: { 'Slot id': newId_('t'), 'Post id': postId, Date: date, Start: '', End: '', Role: 'Help', Needed: 1, 'Role note': '', 'Bringing prompt': '', Filled: 0, Waiting: 0 },
  };
}

/**
 * Hourly job part: every request row with Make opportunity ticked and Posted as blank (or "Not
 * made: ...") becomes a Draft opportunity (never Open). Each request sheet is read without the
 * lock; only a sheet with a ticked row takes the script lock and is read again before anything is
 * written. Posted as is written and the box unticked, so a row is made once: a draft already made
 * for that request id (this run's included) is found by its Created by instead of made again, and
 * a row typed by hand without a Request id first gets one. A sheet without the 2.2 columns has
 * nothing ticked (Set up adds them). Notices go out after the lock, only to people who can edit
 * the draft, and say nothing about the request. A file that fails is reported at the end; the
 * others still run.
 */
function makeDraftsFromRequests_() {
  var s = settings_();
  var today = todayLocal_();
  var categories = serviceTab_(TAB.categories).rows();
  var catsById = indexBy_(categories, 'Id');
  var made = [];
  var errors = [];
  var isMarked = function (r) {
    return isTicked(r['Make opportunity']);
  };
  systemTab_(SYS_TAB.requestFiles)
    .rows()
    .forEach(function (f) {
      var kind = catsById[f['Category id']];
      if (!f['Sheet id'] || !kind) return;
      try {
        var ss = SpreadsheetApp.openById(f['Sheet id']);
        var peek = tabOf_(ss, REQUEST_TAB);
        if (peek.headers.indexOf('Make opportunity') < 0 || !peek.rows().some(isMarked)) return;
        withLock_(function () {
          var t = tabOf_(ss, REQUEST_TAB);
          var ticked = t.rows().filter(isMarked);
          if (!ticked.length) return;
          var now = nowLocal_();
          var postsT = serviceTab_(TAB.posts);
          var byCreator = indexBy_(postsT.rows(), 'Created by');
          ticked.forEach(function (r) {
            // Already made: just untick. A "Not made: ..." row may be ticked again once fixed.
            var postedAs = String(r['Posted as'] == null ? '' : r['Posted as']).trim();
            if (postedAs && postedAs.indexOf('Not made') !== 0) {
              t.update(r, { 'Make opportunity': false });
              return;
            }
            var oc = draftCategoryFor_(kind, catsById);
            if (!oc) {
              var set = String(kind['Opportunity category'] == null ? '' : kind['Opportunity category']).trim();
              t.update(r, {
                'Posted as':
                  'Not made: set Opportunity category for ' + kind.Name + ' to the Id of an Opportunity row in Categories (now: ' + (set || 'blank') + ')',
                'Make opportunity': false,
              });
              return;
            }
            // A row typed by hand may have no Request id: give it one, so it never matches another.
            if (!String(r['Request id'] == null ? '' : r['Request id']).trim()) t.update(r, { 'Request id': newId_('r') });
            var key = 'request ' + String(r['Request id']).trim();
            var post = byCreator[key];
            if (!post) {
              var d = draftFromRequest_(s, kind, oc, r, today, now);
              postsT.append(d.post);
              serviceTab_(TAB.slots).append(d.slot);
              post = d.post;
              byCreator[key] = post;
              made.push({ kind: kind, post: post });
            }
            t.update(r, {
              'Posted as': 'Draft made ' + today + ' — finish and publish it on the leader page (' + post.Title + ', ' + post['Post id'] + ')',
              'Make opportunity': false,
            });
          });
        });
      } catch (err) {
        var msg = clip(err && err.message ? err.message : err, 200);
        log_('draft from request error', f['Category id'] + ' | ' + msg);
        errors.push(f['Category id'] + ': ' + msg);
      }
    });
  if (made.length) {
    var leaders = leaders_();
    made.forEach(function (m) {
      draftNoticeRecipients_(m.kind, m.post, leaders, s.organizations, categories).forEach(function (to) {
        var t = tplDraftFromRequest_(s, m.kind.Name);
        sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
      });
    });
  }
  if (errors.length) throw new Error(errors.join(' ; '));
  return made.length;
}

/** The request kind's Notify people who can edit the draft, else the post's notice recipients. */
function draftNoticeRecipients_(kind, post, leaders, organizations, categories) {
  var byEmail = {};
  leaders.forEach(function (l) {
    if (isEmail(l.Email)) byEmail[normEmail(l.Email)] = l;
  });
  var to = requestNotifyList(kind, leaders).to.filter(function (e) {
    var l = byEmail[e];
    return !!l && canEditPost(leaderAccess(l, organizations, categories), e, post);
  });
  return to.length ? to : noticeRecipients(post, leaders);
}

/**
 * Lines naming each request form that is not on the Help page, and always the Christmas giving
 * form, with its link and where it shows (decisions 16 and 17).
 */
function privateFormLines_() {
  var files = indexBy_(systemTab_(SYS_TAB.requestFiles).rows(), 'Category id');
  var out = [];
  serviceTab_(TAB.categories)
    .rows()
    .forEach(function (c) {
      if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived)) return;
      var giving = c.Id === GIVING_ID;
      if (!giving && isTicked(c['On Help page'])) return;
      var f = files[c.Id];
      if (!f || !f['Form id']) return;
      var where = !giving
        ? '(not on the Help page; share privately)'
        : isTicked(c['On Serve page'])
        ? '(on the Service Opportunities page; you can also share the link)'
        : '(not on any public page; share privately)';
      try {
        out.push(c.Name + ' ' + where + ': ' + FormApp.openById(f['Form id']).getPublishedUrl());
      } catch (e) {
        out.push(c.Name + ': could not open its form (' + clip(e && e.message ? e.message : e, 120) + ').');
      }
    });
  return out;
}

/** A new month sheet for a category in its folder. Returns the Spreadsheet. */
function newRequestSheet_(folder, categoryName, month, headers) {
  var ss = SpreadsheetApp.create('Requests – ' + categoryName + ' – ' + month);
  var first = ss.getSheets()[0];
  first.setName(REQUEST_TAB);
  var sh = ensureTab_(ss, REQUEST_TAB, headers || REQUEST_HEADERS);
  var t = table_(sh);
  var rowsBelow = sh.getMaxRows() - 1;
  if (rowsBelow > 0) {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(REQUEST_STATUS, true).setAllowInvalid(false).build();
    sh.getRange(2, t.headers.indexOf('Status') + 1, rowsBelow, 1).setDataValidation(rule);
  }
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  return ss;
}

/**
 * The template form's file id from Settings form_template_url: {id}, {error} or null (blank).
 * Takes the editor link (…/forms/d/<id>/edit) or a bare id. A published …/forms/d/e/…/viewform
 * link is not the file id, so it is refused with what to paste instead.
 */
function formTemplateId_(url) {
  var u = String(url == null ? '' : url).trim();
  if (!u) return null;
  if (/\/forms\/d\/e\//.test(u) || /\/viewform\b/.test(u)) {
    return { error: "form_template_url: paste the form's edit link (from the form editor's address bar), not its viewform link." };
  }
  var m = /\/forms\/d\/([A-Za-z0-9_-]+)/.exec(u);
  if (m) return { id: m[1] };
  if (/^[A-Za-z0-9_-]+$/.test(u)) return { id: u };
  return { error: "form_template_url is not a Google Form edit link (it should look like https://docs.google.com/forms/d/…/edit)." };
}

/**
 * A new, empty request form. With form_template_url set it is a Drive copy of that branded form
 * (FormApp can't set a theme, but a copy keeps it) with every item removed; otherwise, or when the
 * template can't be copied, a plain FormApp form. Problems go into problems; Set up never stops.
 */
function newRequestForm_(s, c, portal, problems) {
  var title = requestFormTitle_(s, c);
  var tpl = formTemplateId_(s.form_template_url);
  if (tpl && tpl.error) {
    if (problems && problems.indexOf(tpl.error) < 0) problems.push(tpl.error);
  } else if (tpl) {
    var copy = null;
    try {
      copy = DriveApp.getFileById(tpl.id).makeCopy(title, portal);
      var form = FormApp.openById(copy.getId());
      form.getItems().forEach(function (item) {
        form.deleteItem(item);
      });
      // A template may carry its own response sheet, old answers or quiz mode: none of them.
      try {
        form.removeDestination();
      } catch (e1) {
        // it had no destination
      }
      try {
        form.deleteAllResponses();
      } catch (e2) {
        // it had no responses
      }
      try {
        form.setIsQuiz(false);
      } catch (e3) {
        // not a quiz
      }
      form.setTitle(title);
      return form;
    } catch (e) {
      // A copy that could not be opened or emptied is not left behind.
      if (copy) {
        try {
          copy.setTrashed(true);
        } catch (e4) {
          // nothing more to do
        }
      }
      var line = 'Could not copy the form template (' + clip(e && e.message ? e.message : e, 120) + '); made plain forms instead. Check form_template_url.';
      if (problems && problems.indexOf(line) < 0) problems.push(line);
    }
  }
  return FormApp.create(title);
}

function requestFormTitle_(s, c) {
  return c.Name + ' — ' + s.ward_name;
}

/**
 * A form made earlier gets the current title and description (so a ward that set up on older
 * wording gets the new one by running Set up again). Returns true when something changed.
 */
function refreshRequestForm_(s, c, formId) {
  var form = FormApp.openById(formId);
  var changed = false;
  var title = requestFormTitle_(s, c);
  if (form.getTitle() !== title) {
    form.setTitle(title);
    changed = true;
  }
  var description = requestFormDescription_(s, c);
  if (form.getDescription() !== description) {
    form.setDescription(description);
    changed = true;
  }
  return changed;
}

/**
 * One form, folder and month sheet per request category that has no form yet; forms already
 * made get their title and description refreshed. Re-runnable. Names of refreshed forms go into
 * refreshed and problems into problems (both optional).
 */
function buildRequestForms_(s, categories, refreshed, problems) {
  var portal = portalFolder_();
  var filesT = systemTab_(SYS_TAB.requestFiles);
  var have = indexBy_(filesT.rows(), 'Category id');
  var month = todayLocal_().slice(0, 7);
  var made = [];
  categories.forEach(function (c) {
    if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived) || !c.Id) return;
    var rec = have[c.Id];
    if (rec && rec['Form id']) {
      try {
        if (refreshRequestForm_(s, c, rec['Form id']) && refreshed) refreshed.push(c.Name);
      } catch (e) {
        if (problems) problems.push('Could not open the ' + c.Name + ' form to refresh its wording (' + clip(e && e.message ? e.message : e, 120) + ').');
      }
      try {
        if (rec['Sheet id']) ensureRequestColumns_(SpreadsheetApp.openById(rec['Sheet id']));
      } catch (e) {
        if (problems) problems.push('Could not open the ' + c.Name + ' request sheet to add its new columns (' + clip(e && e.message ? e.message : e, 120) + ').');
      }
      return;
    }
    var folderName = 'Requests – ' + c.Name;
    var existing = portal.getFoldersByName(folderName);
    var folder = existing.hasNext() ? existing.next() : portal.createFolder(folderName);
    var ss = newRequestSheet_(folder, c.Name, month);
    var form = newRequestForm_(s, c, portal, problems);
    form
      .setDescription(requestFormDescription_(s, c))
      .setCollectEmail(false)
      .setAllowResponseEdits(false)
      .setShowLinkToRespondAgain(false)
      .setPublishingSummary(false)
      .setConfirmationMessage(requestFormConfirmation_(c));
    addRequestQuestions_(form, c);
    // A copied template may have asked for sign-in or one response each: requests never do.
    try {
      form.setLimitOneResponsePerUser(false);
      form.setRequireLogin(false);
    } catch (e) {
      // setRequireLogin exists only for Workspace accounts
    }
    if (typeof form.setPublished === 'function') form.setPublished(true);
    form.setAcceptingResponses(true);
    DriveApp.getFileById(form.getId()).moveTo(portal);
    var row = { 'Category id': c.Id, 'Folder id': folder.getId(), 'Form id': form.getId(), 'Sheet id': ss.getId(), Month: month };
    if (rec) filesT.update(rec, row);
    else filesT.append(row);
    made.push(c.Name);
  });
  try {
    cache_().remove('help');
    cache_().remove(GIVING_URL_CACHE_KEY);
  } catch (e) {
    // the help cache expires on its own
  }
  return made;
}

/** Email every administrator once (high priority). */
function alertAdmins_(lines) {
  var s = settings_();
  var t = tplAdminAlert_(s, lines);
  var admins = adminEmails(leaders_());
  if (!admins.length) log_('admin alert with no administrators', lines.join(' / '));
  admins.forEach(function (to) {
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
  });
}

/** Removes every answer string from a message, so logs never carry request text. */
function scrub_(msg, answers) {
  var out = String(msg == null ? '' : msg);
  Object.keys(answers).forEach(function (k) {
    var v = String(answers[k] == null ? '' : answers[k]);
    if (v.length >= 2) out = out.split(v).join('…');
  });
  return clip(out, 300);
}

/** A real form-submit event carries functions; JSON from a web visitor can't. */
function isFormEvent_(e) {
  return !!(
    e &&
    e.source &&
    e.response &&
    typeof e.source.getId === 'function' &&
    typeof e.source.deleteResponse === 'function' &&
    typeof e.response.getItemResponses === 'function' &&
    typeof e.response.getId === 'function'
  );
}

/** What an administrator must do, by the step that failed. */
var REQ_STEP_HELP = {
  read: 'It is kept in the form’s Responses tab; copy it into the request sheet by hand, then delete it from the form.',
  file: 'It is kept in the form’s Responses tab; copy it into the request sheet by hand, then delete it from the form.',
  unform: 'It was filed in the request sheet but is still in the form’s Responses tab; delete it there.',
  notify: 'It was filed in the request sheet, but not every leader was told. Ask them to check their Requests folder.',
};

/** Form-submit trigger (one per request form). */
function gpOnRequestSubmit(e) {
  if (!isFormEvent_(e)) return;
  gpBegin_();
  var answers = {};
  var catId = '?';
  var catName = 'request';
  var step = 'read';
  try {
    e.response.getItemResponses().forEach(function (ir) {
      var v = ir.getResponse();
      answers[ir.getItem().getTitle()] = Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v);
    });
    var formId = e.source.getId();
    step = 'file';
    // Under the lock, so the monthly rotation can't switch sheets between finding and appending.
    var filed = withLock_(function () {
      var file = systemTab_(SYS_TAB.requestFiles).find('Form id', formId);
      if (!file) throw new Error('no Request files row for this form');
      catId = file['Category id'];
      var cat = serviceTab_(TAB.categories).find('Id', catId);
      if (!cat) throw new Error('category missing from the Categories tab');
      catName = cat.Name;
      var row = { 'Request id': newId_(cat.Id === GIVING_ID ? 'o' : 'r'), Received: nowLocal_(), Kind: cat.Name, Status: 'New' };
      REQ_MAP.forEach(function (m) {
        if (m[0] in answers) row[m[1]] = clip(answers[m[0]].trim(), m[2]);
      });
      requestTable_(SpreadsheetApp.openById(file['Sheet id']), row).append(row);
      return { file: file, cat: cat };
    });
    step = 'unform';
    e.source.deleteResponse(e.response.getId());
    step = 'notify';
    var s = settings_();
    var t = tplRequestNotice_(s, filed.cat.Name, DriveApp.getFolderById(filed.file['Folder id']).getUrl());
    var notify = requestNotifyList(filed.cat, leaders_());
    if (notify.dropped.length) log_('request notice dropped', catId + ' | not readers of this kind or not addresses: ' + notify.dropped.join(', '));
    notify.to.forEach(function (to) {
      sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
    });
  } catch (err) {
    var msg = scrub_(err && err.message ? err.message : err, answers);
    log_('request error', catId + ' | ' + step + ' | ' + msg);
    alertCapped_('request-error', ['A ' + catName + ' request ran into a problem. ' + REQ_STEP_HELP[step], 'Problem: ' + msg], 3);
  }
}

/**
 * Daily: stamp Closed on, purge after 30 days, rotate on a new month. Each file is handled under
 * the script lock, so a request can't be filed into a sheet that is being replaced. Old files
 * that could only be trashed are reported in one admin alert. Returns problem lines (the daily
 * job reports them).
 */
function dailyRequests_() {
  var today = todayLocal_();
  var filesT = systemTab_(SYS_TAB.requestFiles);
  var cats = indexBy_(serviceTab_(TAB.categories).rows(), 'Id');
  var problems = [];
  var trashed = [];
  filesT.rows().forEach(function (f) {
    if (!f['Sheet id']) return;
    try {
      withLock_(function () {
        var ss = SpreadsheetApp.openById(f['Sheet id']);
        var t = tabOf_(ss, REQUEST_TAB);
        var rows = t.rows();
        stampClosed(rows, today).forEach(function (x) {
          t.update(x.row, { 'Closed on': x.closedOn });
        });
        t.removeMany(rowsToPurge(rows, today));
        if (needsRotation(f.Month, today)) rotateRequestFile_(f, filesT, t, cats[f['Category id']], today, trashed);
      });
    } catch (err) {
      var msg = clip(err && err.message ? err.message : err, 300);
      log_('request daily error', f['Category id'] + ' | ' + msg);
      problems.push('Requests (' + f['Category id'] + '): ' + msg);
    }
  });
  if (trashed.length) alertAdmins_(trashed);
  return problems;
}

function rotateRequestFile_(f, filesT, oldTable, cat, today, trashed) {
  var month = today.slice(0, 7);
  var name = cat ? cat.Name : f['Category id'];
  var headers = uniq_(oldTable.headers.filter(String).concat(REQUEST_HEADERS));
  var folder = DriveApp.getFolderById(f['Folder id']);
  var fresh = newRequestSheet_(folder, name, month, headers);
  var carry = oldTable.rows();
  table_(fresh.getSheetByName(REQUEST_TAB)).appendMany(carry);
  var oldId = f['Sheet id'];
  filesT.update(f, { 'Sheet id': fresh.getId(), Month: month });
  try {
    if (typeof Drive.Files.remove === 'function') Drive.Files.remove(oldId);
    else Drive.Files['delete'](oldId);
    log_('request file rotated', f['Category id'] + ' | ' + month + ' | carried ' + carry.length);
  } catch (err) {
    DriveApp.getFileById(oldId).setTrashed(true);
    var line = 'The old ' + name + ' request sheet could not be permanently deleted, so it was moved to the Trash. Empty it from Drive > Trash (it holds closed requests).';
    log_('request file delete failed', f['Category id'] + ' | ' + clip(err && err.message ? err.message : err, 200));
    trashed.push(line);
  }
}

// ===== 12-setup.js =====

/**
 * The Service Portal menu in the Service Sheet. Run everything signed in as the shared account,
 * which owns every file, form, script and trigger.
 */

var JOB_HANDLERS = ['gpTenMinute', 'gpHourly', 'gpDaily', 'gpOnRequestSubmit'];
var HUB_FOLDER_NAME = 'Hub files (copy to the hub)';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Service Portal')
    .addItem('Set up', 'gpMenuSetUp')
    .addItem('Sync sharing', 'gpMenuSyncSharing')
    .addItem('Install triggers', 'gpMenuInstallTriggers')
    .addItem('Make hub files', 'gpMenuMakeHubFiles')
    .addItem('Send leader links now', 'gpMenuSendLeaderLinks')
    .addItem('Check health', 'gpMenuCheckHealth')
    .addToUi();
}

function ui_() {
  return SpreadsheetApp.getUi();
}

function tzMismatchLine_(s) {
  var scriptTz = Session.getScriptTimeZone();
  if (!s.time_zone || s.time_zone === scriptTz) return '';
  return (
    'The script time zone is ' + scriptTz + ' but Settings says ' + s.time_zone + '. ' +
    'Fix it: Extensions > Apps Script > Project Settings (gear) > Time zone > ' + s.time_zone + '.'
  );
}

function ensurePortalFolder_(serviceSs) {
  var p = props_();
  var id = p.getProperty('PORTAL_FOLDER_ID');
  var folder = null;
  if (id) {
    try {
      folder = DriveApp.getFolderById(id);
      if (folder.isTrashed()) folder = null;
    } catch (e) {
      folder = null;
    }
  }
  if (!folder) {
    folder = DriveApp.createFolder('Service Portal');
    p.setProperty('PORTAL_FOLDER_ID', folder.getId());
    DriveApp.getFileById(serviceSs.getId()).moveTo(folder);
  }
  return folder;
}

function ensureSystemSheet_(s, folder) {
  var p = props_();
  var id = p.getProperty('SYSTEM_ID');
  var sys = null;
  if (id) {
    try {
      sys = SpreadsheetApp.openById(id);
    } catch (e) {
      sys = null;
    }
  }
  if (!sys) {
    sys = SpreadsheetApp.create(s.ward_name + ' – Service System (private)');
    DriveApp.getFileById(sys.getId()).moveTo(folder);
    p.setProperty('SYSTEM_ID', sys.getId());
  }
  gpEnsureSystemTabs_(sys);
  GP_MEMO_.systemSs = sys;
  return sys;
}

/** Service Portal > Set up. Re-runnable: never duplicates a folder, form or file. */
function gpMenuSetUp() {
  if (!menuStart_()) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  props_().setProperty('SERVICE_ID', ss.getId());
  gpEnsureTabs_(ss);
  if (!props_().getProperty('PHASE2_AT')) props_().setProperty('PHASE2_AT', nowLocal_());
  var migrated = migratePhase1Volunteers_(true);
  var s = settings_();
  if (!s.ward_name || !s.time_zone || !s.contact_email) {
    ui_().alert('Fill in Settings (ward name, time zone, contact email) and the Leaders tab, then run Set up again.');
    return;
  }
  try {
    Utilities.formatDate(new Date(), s.time_zone, 'yyyy');
  } catch (e) {
    ui_().alert('The time_zone in Settings is not a time zone Google knows. Use a name like America/Denver, then run Set up again.');
    return;
  }
  var folder = ensurePortalFolder_(ss);
  ensureSystemSheet_(s, folder);
  props_().setProperty('SCHEMA_VERSION', GP_VERSION);
  var refreshed = [];
  var problems = [];
  var made = buildRequestForms_(s, serviceTab_(TAB.categories).rows(), refreshed, problems);
  var lines = ['Set up is done.'];
  if (migrated) lines.push('Volunteers from before phase 2 marked Approved: ' + migrated + '.');
  lines.push(made.length ? 'New request forms: ' + made.join(', ') + '.' : 'Request forms: already made.');
  if (refreshed.length) lines.push('Updated the wording of: ' + refreshed.join(', ') + '.');
  lines = lines.concat(privateFormLines_());
  if (problems.length) lines.push('Problems: ' + problems.join(' '));
  var tz = tzMismatchLine_(s);
  if (tz) lines.push('Time zone: ' + tz);
  lines.push('Next: deploy the web app, paste its address into Settings web_app_url, then run Install triggers and Sync sharing.');
  ui_().alert(lines.join('\n\n'));
}

// ---------- sharing ----------

function listPermissions_(fileId) {
  var out = [];
  var token = null;
  do {
    var opts = { fields: 'nextPageToken,permissions(id,type,role,emailAddress)', pageSize: 100 };
    if (token) opts.pageToken = token;
    var res = Drive.Permissions.list(fileId, opts);
    (res.permissions || []).forEach(function (p) {
      out.push(p);
    });
    token = res.nextPageToken;
  } while (token);
  return out;
}

function removePermission_(fileId, permId) {
  if (typeof Drive.Permissions.remove === 'function') Drive.Permissions.remove(fileId, permId);
  else Drive.Permissions['delete'](fileId, permId);
}

/**
 * Makes a file's or folder's sharing match desired ({email: role}). Share emails are off. Link
 * sharing ("anyone") and domain sharing are removed. Per-address failures go into problems.
 */
function applySharing_(fileId, desired, owner, label, problems) {
  var perms = listPermissions_(fileId);
  var current = {};
  var ids = {};
  perms.forEach(function (p) {
    if ((p.type === 'user' || p.type === 'group') && p.emailAddress) {
      current[normEmail(p.emailAddress)] = p.role;
      ids[normEmail(p.emailAddress)] = p.id;
    } else if (p.role !== 'owner') {
      try {
        removePermission_(fileId, p.id);
      } catch (e) {
        problems.push(label + ': could not turn off ' + p.type + ' sharing (' + clip(e.message, 120) + ').');
      }
    }
  });
  var diff = sharingDiff(current, desired, owner);
  diff.add.forEach(function (a) {
    try {
      Drive.Permissions.create({ role: a.role, type: 'user', emailAddress: a.email }, fileId, { sendNotificationEmail: false });
    } catch (e) {
      problems.push(label + ': could not share with ' + a.email + ' (' + clip(e.message, 120) + ').');
    }
  });
  diff.change.forEach(function (c) {
    try {
      Drive.Permissions.update({ role: c.role }, fileId, ids[c.email]);
    } catch (e) {
      problems.push(label + ': could not change ' + c.email + ' (' + clip(e.message, 120) + ').');
    }
  });
  diff.remove.forEach(function (email) {
    try {
      removePermission_(fileId, ids[email]);
    } catch (e) {
      problems.push(label + ': could not remove ' + email + ' (' + clip(e.message, 120) + ').');
    }
  });
  return diff;
}

/** Script-written tabs: only the owner may edit (no warning-only). */
function protectScriptTabs_(ss) {
  var me = Session.getEffectiveUser();
  PROTECTED_TABS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var existing = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    var p = existing.length ? existing[0] : sh.protect();
    p.setDescription('Written by the Service Portal script. Do not type here.');
    p.setWarningOnly(false);
    p.addEditor(me);
    p.removeEditors(p.getEditors());
    if (p.canDomainEdit()) p.setDomainEdit(false);
  });
}

/** Service Portal > Sync sharing. */
function gpMenuSyncSharing() {
  if (!menuStart_()) return;
  var owner = normEmail(Session.getEffectiveUser().getEmail());
  var leaders = leaders_();
  var problems = [];
  var summary = [];

  // Decision 14: the whole bishopric (Bishopric ticked) edits the Service Sheet. Its editors can
  // also edit the bound script, which can open every request sheet; the bishopric reads the
  // confidential requests anyway. Other ward council members view it.
  var sheetWant = {};
  leaders.forEach(function (l) {
    if (isTicked(l.Bishopric) || isTicked(l['Ward council'])) sheetWant[normEmail(l.Email)] = 'reader';
  });
  bishopricEmails(leaders).forEach(function (e) {
    sheetWant[e] = 'writer';
  });
  var d = applySharing_(serviceSs_().getId(), sheetWant, owner, 'Service Sheet', problems);
  summary.push(
    'Service Sheet: ' + Object.keys(sheetWant).length + ' people (the bishopric edits; other ward council members view); ' +
      d.add.length + ' added, ' + d.change.length + ' changed, ' + d.remove.length + ' removed.'
  );

  var cats = indexBy_(serviceTab_(TAB.categories).rows(), 'Id');
  systemTab_(SYS_TAB.requestFiles)
    .rows()
    .forEach(function (f) {
      var cat = cats[f['Category id']];
      if (!cat || !f['Folder id']) return;
      var want = {};
      requestReaders(cat, leaders).forEach(function (e) {
        want[e] = 'writer';
      });
      applySharing_(f['Folder id'], want, owner, 'Requests – ' + cat.Name, problems);
      summary.push('Requests – ' + cat.Name + ': ' + Object.keys(want).length + ' people.');
      var notify = requestNotifyList(cat, leaders);
      if (notify.dropped.length) {
        problems.push(
          cat.Name + ' Notify: these get no request email, because they cannot open its folder or are not email addresses: ' +
            notify.dropped.join(', ') + '. Fix Notify in Categories (blank = everyone who can open the folder).'
        );
      }
    });

  problems = problems.concat(notifyBishopProblems_(serviceTab_(TAB.categories).rows(), leaders));
  applySharing_(systemSs_().getId(), {}, owner, 'System Sheet', problems);
  applySharing_(portalFolder_().getId(), {}, owner, 'Service Portal folder', problems);
  summary.push('System Sheet and Service Portal folder: only this account.');
  protectScriptTabs_(serviceSs_());
  summary.push('Protected tabs: ' + PROTECTED_TABS.join(', ') + '.');
  if (problems.length) {
    summary.push('');
    summary.push('Problems (a person without a Google account cannot be given a file; ask them to make a free Google account with that address, or change their email in Leaders):');
    summary = summary.concat(problems);
  }
  ui_().alert(summary.join('\n'));
  return problems;
}

/**
 * One line per request kind (not archived) whose Notify names Bishop while no Leaders row has
 * Calling Bishop (any case): the bishop would get no request email. (An empty Coordinators list
 * behind Notify Coordinators is intended and not reported.)
 */
function notifyBishopProblems_(categories, leaders) {
  var haveBishop = leaders.some(function (l) {
    return String(l.Calling == null ? '' : l.Calling).trim().toLowerCase() === 'bishop';
  });
  if (haveBishop) return [];
  var out = [];
  categories.forEach(function (c) {
    if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived)) return;
    var says = splitList(c.Notify).some(function (e) {
      return String(e).trim().toLowerCase() === 'bishop';
    });
    if (says) {
      out.push(
        c.Name + ' Notify says Bishop, but no Leaders row has Calling Bishop, so the bishop gets no request email. ' +
          "Type Bishop in the bishop's Calling in Leaders, or change Notify in Categories."
      );
    }
  });
  return out;
}

// ---------- triggers ----------

/** Service Portal > Install triggers. Replaces this project's portal triggers. */
function gpMenuInstallTriggers() {
  if (!menuStart_()) return;
  var s = settings_();
  var tz = s.time_zone || Session.getScriptTimeZone();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (JOB_HANDLERS.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('gpTenMinute').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('gpHourly').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('gpDaily').timeBased().everyDays(1).atHour(2).inTimezone(tz).create();
  var forms = 0;
  systemTab_(SYS_TAB.requestFiles)
    .rows()
    .forEach(function (f) {
      if (!f['Form id']) return;
      ScriptApp.newTrigger('gpOnRequestSubmit').forForm(f['Form id']).onFormSubmit().create();
      forms++;
    });
  props_().setProperty('INSTALLED_AT', nowLocal_());
  ui_().alert('Triggers installed: every 10 minutes, hourly, daily at 2 am, and ' + forms + ' request form trigger(s).');
}

// ---------- hub files ----------

/** Service Portal > Make hub files: every page and the sections snippet, ready to copy. */
function gpMenuMakeHubFiles() {
  if (!menuStart_()) return;
  var s = settings_();
  if (!s.web_app_url) {
    ui_().alert('Deploy the web app first and paste its address into Settings web_app_url, then run Make hub files again.');
    return;
  }
  var portal = portalFolder_();
  var found = portal.getFoldersByName(HUB_FOLDER_NAME);
  var folder = found.hasNext() ? found.next() : portal.createFolder(HUB_FOLDER_NAME);
  var files = {};
  Object.keys(PAGE_TITLES).forEach(function (name) {
    files[name + '.html'] = renderPage_(name, s, false);
  });
  files['hub-sections.html'] = renderHubSections_(s);
  Object.keys(files).forEach(function (name) {
    var old = folder.getFilesByName(name);
    while (old.hasNext()) old.next().setTrashed(true);
    folder.createFile(name, files[name], MimeType.HTML);
  });
  ui_().alert(
    'Hub files are ready in the folder "' + HUB_FOLDER_NAME + '": ' + folder.getUrl() + '\n\n' +
    'Download each file and give them to the hub owner to put next to the hub page (index.html). ' +
    'hub-sections.html says where its sections go.'
  );
}

// ---------- leader links ----------

function gpMenuSendLeaderLinks() {
  if (!menuStart_()) return;
  var n = processLeaderLinkTicks_();
  ui_().alert(n ? 'Sent ' + n + ' leader link(s).' : 'No boxes are ticked. Tick "Send leader link" for each leader first.');
  return n;
}

// ---------- health ----------

function fetchOk_(url) {
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    return { code: res.getResponseCode(), text: res.getContentText() };
  } catch (e) {
    return { code: 0, text: String(e && e.message ? e.message : e) };
  }
}

/** Service Portal > Check health: one OK/PROBLEM line per piece. Returns the lines. */
function gpMenuCheckHealth() {
  if (!menuStart_()) return;
  var lines = healthLines_({ job: false });
  ui_().alert(lines.join('\n'));
  return lines;
}

/**
 * The health checks, one 'OK …' or 'PROBLEM …' line each, with counts only (no volunteer or
 * request data). opts.job: run from the daily job, which also checks the jobs run as the Service
 * Sheet's owner; from the menu (owner only) it names the account the listed triggers belong to.
 */
/** "Approver x is not on the Leaders tab" for each configured approver that isn't (decision 24). */
function approverProblems_(categories, s, leaders) {
  var onTab = {};
  leaders.forEach(function (l) {
    if (isEmail(l.Email)) onTab[normEmail(l.Email)] = true;
  });
  var listed = splitList(s.default_approvers);
  categories.forEach(function (c) {
    if (c.Kind === CATEGORY_KIND.opportunity && !isTicked(c.Archived)) listed = listed.concat(splitList(c.Approvers));
  });
  return uniq_(listed.map(normEmail))
    .filter(function (e) {
      return !onTab[e];
    })
    .map(function (e) {
      return 'Approver ' + clip(e, 80) + ' is not on the Leaders tab, so they get no approval emails. Add a Leaders row for them, or remove them from Approvers / default_approvers.';
    });
}

function healthLines_(opts) {
  opts = opts || {};
  var lines = [];
  var add = function (ok, text) {
    lines.push((ok ? 'OK ' : 'PROBLEM ') + text);
  };
  var s = settings_();
  var missing = ['ward_name', 'time_zone', 'contact_email', 'web_app_url'].filter(function (k) {
    return !s[k];
  });
  add(!missing.length, missing.length ? 'Settings: fill in ' + missing.join(', ') + '.' : 'Settings complete.');

  if (s.web_app_url) {
    var ping = fetchOk_(s.web_app_url + '?api=ping');
    var pingOk = false;
    var pingBuild = '';
    try {
      var pong = JSON.parse(ping.text);
      pingOk = ping.code === 200 && pong.ok === true;
      pingBuild = String(pong.build || '');
    } catch (e) {
      pingOk = false;
    }
    add(pingOk, pingOk ? 'Web app answers.' : 'Web app does not answer (' + ping.code + '). Check the deployment: Execute as Me, Who has access Anyone.');
    // The web app runs its deployed version; this check runs the code last saved. They differ
    // until someone makes a New version of the deployment.
    if (pingOk) {
      var current = pingBuild === GP_BUILD;
      add(current, current ? 'Web app runs the saved script (build ' + GP_BUILD + ').' : 'The web app is an older version: Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy.');
    }
  } else {
    add(false, 'Web app: no web_app_url in Settings.');
  }

  if (s.hub_url) {
    var hubUrl = String(s.hub_url).replace(/\/+$/, '') + '/serve.html';
    var hub = fetchOk_(hubUrl);
    add(hub.code === 200, hub.code === 200 ? 'Hub serve.html reachable.' : 'Hub serve.html not reachable (' + hub.code + '): ' + hubUrl);
  } else {
    add(true, 'Hub: none set; members use the fallback pages (' + (s.web_app_url || 'web app') + '?page=serve).');
  }

  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) {
    have[t.getHandlerFunction()] = (have[t.getHandlerFunction()] || 0) + 1;
  });
  var files = [];
  var systemOk = true;
  try {
    files = systemTab_(SYS_TAB.requestFiles).rows();
  } catch (e) {
    systemOk = false;
  }
  var formCount = files.filter(function (f) {
    return f['Form id'];
  }).length;
  var trigOk = have.gpTenMinute && have.gpHourly && have.gpDaily && (have.gpOnRequestSubmit || 0) >= formCount;
  add(
    !!trigOk,
    'Triggers: gpTenMinute ' + (have.gpTenMinute || 0) + ', gpHourly ' + (have.gpHourly || 0) + ', gpDaily ' + (have.gpDaily || 0) +
      ', gpOnRequestSubmit ' + (have.gpOnRequestSubmit || 0) + ' of ' + formCount + (trigOk ? '.' : '. Run Install triggers.')
  );
  // getProjectTriggers lists only the running account's triggers: say whose they are.
  var me = normEmail(Session.getEffectiveUser().getEmail());
  if (opts.job) {
    var ownerUser = null;
    try {
      ownerUser = DriveApp.getFileById(serviceSs_().getId()).getOwner();
    } catch (e) {
      ownerUser = null;
    }
    var sheetOwner = ownerUser ? normEmail(ownerUser.getEmail()) : '';
    var sameOwner = !sheetOwner || sheetOwner === me;
    add(
      sameOwner,
      sameOwner
        ? 'Timed jobs run as the Service Sheet owner.'
        : 'Timed jobs run as ' + me + ', not as the Service Sheet owner ' + sheetOwner + '. Sign in as ' + sheetOwner +
            " and run Install triggers, then remove the other account's triggers (Extensions > Apps Script > Triggers, signed in as that account)."
    );
  } else {
    var kinds = ScriptApp.getProjectTriggers().map(function (t) {
      var src = '';
      try {
        src = String(t.getTriggerSource());
      } catch (e) {
        src = '';
      }
      return t.getHandlerFunction() + (src ? ' (' + src + ')' : '');
    });
    add(
      true,
      'Triggers belong to ' + me + ' (this account): ' + (kinds.length ? kinds.join(', ') : 'none') +
        '. Triggers another account made never show here; if one is missing above, run Install triggers signed in as this account.'
    );
  }
  // Each job stamps LAST_RAN_<job> when it finishes; a job that stops (or whose runs are
  // refused) shows up here even though its trigger is still listed.
  var now = nowLocal_();
  var installed = props_().getProperty('INSTALLED_AT') || '';
  Object.keys(JOB_MAX_MINUTES).forEach(function (job) {
    var max = JOB_MAX_MINUTES[job];
    var last = props_().getProperty('LAST_RAN_' + job) || '';
    if (last) {
      var age = minutesBetween_(last, now);
      add(age <= max, job + ' last ran ' + last + (age <= max ? '.' : ', more than ' + max + ' minutes ago. Open Extensions > Apps Script > Executions to see why.'));
    } else if (installed && minutesBetween_(installed, now) <= max) {
      add(true, job + ' has not run yet (triggers installed ' + installed + ').');
    } else {
      add(false, job + ' has not run' + (installed ? ' since the triggers were installed at ' + installed : '') + '. Run Install triggers signed in as this account, then open Extensions > Apps Script > Executions.');
    }
  });
  add(systemOk, systemOk ? 'System Sheet present.' : 'System Sheet missing. Run Set up.');

  var reqCats = serviceTab_(TAB.categories)
    .rows()
    .filter(function (c) {
      return c.Kind === CATEGORY_KIND.request && !isTicked(c.Archived);
    });
  add(formCount >= reqCats.length, 'Request forms: ' + formCount + ' of ' + reqCats.length + (formCount >= reqCats.length ? '.' : '. Run Set up.'));
  notifyBishopProblems_(reqCats, leaders_()).forEach(function (line) {
    add(false, line);
  });
  // Approvers (2.4): an address that isn't on the Leaders tab gets no approval email.
  approverProblems_(serviceTab_(TAB.categories).rows(), s, leaders_()).forEach(function (line) {
    add(false, line);
  });
  // Test mode (2.3.1): always a PROBLEM while on, so it can't be forgotten at go-live.
  var testMail = testMailList_(s.test_mail_only);
  if (testMail.on) {
    if (!testMail.catchAll) add(false, 'Test mode: test_mail_only has no valid address, so no email is sent at all. Fix it, or empty it to send email normally.');
    else add(false, 'Test mode: email to anyone not in test_mail_only goes to ' + testMail.catchAll + '.');
    testMail.bad.forEach(function (b) {
      add(false, 'test_mail_only: "' + clip(b, 60) + '" is not an email address, so every email goes to ' + (testMail.catchAll || 'nobody') + '. Fix or remove it.');
    });
  }
  // The ward's look (2.3): a bad value is ignored on the pages; say so here.
  themeOf_(s).problems.forEach(function (line) {
    add(false, line);
  });
  var tpl = formTemplateId_(s.form_template_url);
  if (tpl && tpl.error) add(false, tpl.error);

  var quota = mailQuota_();
  add(quota > s.email_reserve, 'Email left today: ' + quota + ' (reserve ' + s.email_reserve + ').');

  var outbox = systemOk ? systemTab_(SYS_TAB.outbox).rows() : [];
  var queued = outbox.filter(function (m) {
    return m.Status === 'Queued';
  }).length;
  var failed = outbox.filter(function (m) {
    return m.Status === 'Failed';
  }).length;
  add(!failed, 'Outbox: ' + queued + ' waiting, ' + failed + ' failed.');

  var tz = tzMismatchLine_(s);
  var sheetTz = serviceSs_().getSpreadsheetTimeZone();
  var sheetTzOk = !s.time_zone || sheetTz === s.time_zone;
  add(
    !tz && sheetTzOk,
    tz || (sheetTzOk ? 'Time zone matches (' + (s.time_zone || Session.getScriptTimeZone()) + ').' : 'The Service Sheet time zone is ' + sheetTz + '; set File > Settings > Time zone to ' + s.time_zone + '.')
  );
  return lines;
}

// ---------- upgrade from phase 1 ----------

/**
 * Phase 1 had no approval step: a leader removed anyone they didn't recognize. Every non-leader
 * address holding a Confirmed sign-up is marked Approved (Decided by "Phase 1 sign-up") when
 *   - it has no Volunteers row and that sign-up was taken by phase 1 code: before the phase 2
 *     web app first answered (PHASE2_WEB_AT, set by dispatch_; unset = the old web app is still
 *     the live one). That covers the old web app serving between pasting the script and making
 *     its new version, and leaves alone a former leader who signed up later (leaders get no row);
 *   - or its only row is Pending with no Decided by, and the Confirmed sign-up was taken by phase
 *     1 code (the same cutoff, PHASE2_WEB_AT): someone phase 1 (or the old web app in the gap)
 *     had accepted who then signed up again through phase 2. A Pending row with a Decided by is a
 *     bishopric undo, never touched.
 * Phase 2 never confirms a Pending address, so nothing else matches. Runs at every Set up
 * (force) and once, lazily, from ensureUpgraded_. Returns how many rows it added or changed.
 */
function migratePhase1Volunteers_(force) {
  var p = props_();
  if (!force && p.getProperty('VOLUNTEERS_MIGRATED')) return 0;
  var webCut = p.getProperty('PHASE2_WEB_AT') || '';
  // Phase 1 code took every sign-up up to this moment (now, while the old web app is still live).
  var cut = webCut || nowLocal_();
  var n = withLock_(function () {
    var volsT = serviceTab_(TAB.volunteers);
    var have = volunteersByEmail_(volsT.rows());
    var leaders = leaderEmails_();
    var now = nowLocal_();
    var add = [];
    var done = {};
    var changed = 0;
    serviceTab_(TAB.signups)
      .rows()
      .sort(function (a, b) {
        return cmpLocal(a['Signed up at'], b['Signed up at']);
      })
      .forEach(function (su) {
        var e = normEmail(su.Email);
        if (su.Status !== SIGNUP_STATUS.confirmed || !isEmail(e) || done[e] || leaders.indexOf(e) >= 0) return;
        var v = have[e];
        var record = { Status: VOLUNTEER_STATUS.approved, 'Decided by': 'Phase 1 sign-up', 'Decided at': now };
        if (!v) {
          if (cmpLocal(su['Signed up at'], cut) > 0) return;
          done[e] = true;
          add.push(merge_({ Email: e, Name: su.Name, 'First post': su['Post id'] }, record));
        } else if (v.Status === VOLUNTEER_STATUS.pending && !String(v['Decided by'] || '').trim() && cmpLocal(su['Signed up at'], cut) <= 0) {
          done[e] = true;
          volsT.update(v, record);
          changed++;
        }
      });
    volsT.appendMany(add);
    return add.length + changed;
  });
  p.setProperty('VOLUNTEERS_MIGRATED', nowLocal_());
  return n;
}

/**
 * Brings a sheet set up by an earlier version up to this one before any job or web call uses it:
 * adds missing tabs, columns and Settings rows (gpEnsureTabs_, the System Sheet's tabs), records
 * when phase 2 began, and runs the phase 1 volunteer migration once. Does nothing until Set up has
 * made the portal's tabs (no Posts tab), and nothing more once SCHEMA_VERSION is this version.
 */
function ensureUpgraded_() {
  var p = props_();
  if (p.getProperty('SCHEMA_VERSION') === GP_VERSION) return;
  var ss = serviceSs_();
  if (!ss.getSheetByName(TAB.posts)) return;
  withLock_(function () {
    if (p.getProperty('SCHEMA_VERSION') === GP_VERSION) return;
    gpEnsureTabs_(ss);
    if (p.getProperty('SYSTEM_ID')) gpEnsureSystemTabs_(systemSs_());
    if (!p.getProperty('PHASE2_AT')) p.setProperty('PHASE2_AT', nowLocal_());
    migratePhase1Volunteers_(false);
    p.setProperty('SCHEMA_VERSION', GP_VERSION);
    log_('upgraded', GP_VERSION);
  });
}

// ===== 13-jobs.js =====

/**
 * Timed jobs (installed by Install triggers). Each logs its own errors and emails the
 * administrators at most once a day per job.
 */

/** Emails the administrators at most maxPerDay times a day for one key. */
function alertCapped_(key, lines, maxPerDay) {
  var p = props_();
  var today = todayLocal_();
  var parts = String(p.getProperty('ALERTS_' + key) || '').split('|');
  var n = parts[0] === today ? Number(parts[1]) || 0 : 0;
  if (n >= maxPerDay) return;
  p.setProperty('ALERTS_' + key, today + '|' + (n + 1));
  alertAdmins_(lines);
}

/** Emails the administrators once per key per day. */
function alertOncePerDay_(key, lines) {
  alertCapped_(key, lines, 1);
}

/** How long each job may go without a successful run before Check health says PROBLEM. */
var JOB_MAX_MINUTES = { gpTenMinute: 30, gpHourly: 120, gpDaily: 26 * 60 };

/**
 * Runs a timed job. Only this project's own triggers or the owner in the editor may run it
 * (calledByOwner_); a web visitor gets nothing done and nothing back. A refused run leaves one
 * Log line per job per hour (so a flood can't fill the Log). A successful run stamps the Script
 * Property LAST_RAN_<job>, which Check health reads. Returns nothing.
 */
function runJob_(name, e, fn) {
  gpBegin_();
  if (!calledByOwner_(e)) {
    try {
      var key = 'refused_' + name;
      if (!cache_().get(key)) {
        cache_().put(key, '1', 3600);
        log_('job refused', name + ' | not from its trigger or the owner');
      }
    } catch (e3) {
      // nothing more to do
    }
    return;
  }
  try {
    // A sheet not yet set up for this version (the script pasted, Set up not run) is upgraded
    // first, so no job works on missing columns.
    ensureUpgraded_();
    fn();
    props_().setProperty('LAST_RAN_' + name, nowLocal_());
  } catch (err) {
    var msg = clip(err && err.message ? err.message : err, 300);
    log_('job error', name + ' | ' + msg);
    try {
      alertOncePerDay_(name, ['The ' + name + ' job failed: ' + msg]);
    } catch (e2) {
      log_('alert failed', name + ' | ' + e2);
    }
  }
}

/**
 * Runs a job's parts one after another, each on its own: one failing doesn't stop the rest. While
 * the sheet is not yet upgraded to this version (ensureUpgraded_ could not run), a part that meets
 * a missing tab or column is skipped and logged; any other failure is thrown at the end, so
 * runJob_ logs it and alerts once a day.
 */
function runParts_(job, parts) {
  var errors = [];
  var upgraded = props_().getProperty('SCHEMA_VERSION') === GP_VERSION;
  parts.forEach(function (p) {
    try {
      p[1]();
    } catch (err) {
      if (err && err.gpBusy) {
        errors.push(p[0] + ': ' + TEXT.busy);
        return;
      }
      var msg = clip(err && err.message ? err.message : err, 300);
      // Before the sheet could be upgraded, a missing column is expected: skip. After, it is a real problem.
      if (!upgraded && /Missing column|is missing\. Run/.test(msg)) log_('job part skipped', job + ' / ' + p[0] + ' | ' + msg);
      else errors.push(p[0] + ': ' + msg);
    }
  });
  if (errors.length) throw new Error(errors.join(' ; '));
}

/** Writes every slot's Filled and Waiting from the Sign-ups tab (only cells that changed). */
function refreshAllFilled_() {
  withLock_(function () {
    var slotsT = serviceTab_(TAB.slots);
    var counts = countsBySlot(serviceTab_(TAB.signups).rows());
    slotsT.rows().forEach(function (sl) {
      var c = counts[sl['Slot id']] || { filled: 0, waiting: 0 };
      var changes = {};
      if (Number(sl.Filled) !== c.filled || sl.Filled === '') changes.Filled = c.filled;
      if (Number(sl.Waiting) !== c.waiting || sl.Waiting === '') changes.Waiting = c.waiting;
      if (Object.keys(changes).length) slotsT.update(sl, changes);
    });
  });
}

// ---------- sent keys (nudges, warnings): Script Properties SENT_<KIND>_<postId|date> = day sent ----------

var SENT_NUDGE = 'SENT_NUDGE_';
var SENT_WARN = 'SENT_WARN_';
var SENT_KEEP_DAYS = 30;

function sentKeys_(prefix) {
  var all = props_().getProperties();
  var out = {};
  Object.keys(all).forEach(function (k) {
    if (k.indexOf(prefix) === 0) out[k.slice(prefix.length)] = all[k];
  });
  return out;
}

function markSent_(prefix, key) {
  props_().setProperty(prefix + key, todayLocal_());
}

/** Forgets sent keys older than 30 days (their dates are long past). */
function pruneSentKeys_(today) {
  var cutoff = addDays(today, -SENT_KEEP_DAYS);
  var p = props_();
  var all = p.getProperties();
  Object.keys(all).forEach(function (k) {
    if ((k.indexOf(SENT_NUDGE) === 0 || k.indexOf(SENT_WARN) === 0) && String(all[k]) < cutoff) p.deleteProperty(k);
  });
}

/** Waiting sign-ups whose date has passed (or whose role is gone) lapse. No email. */
function lapseWaiting_() {
  return withLock_(function () {
    var d = volunteerData_();
    var slotsById = indexBy_(d.slots, 'Slot id');
    var ids = lapsesDue(d.signups, slotsById, todayLocal_());
    if (!ids.length) return 0;
    var signupsT = serviceTab_(TAB.signups);
    var slotsT = serviceTab_(TAB.slots);
    var byId = indexBy_(d.signups, 'Sign-up id');
    var touched = {};
    ids.forEach(function (id) {
      signupsT.update(byId[id], { Status: SIGNUP_STATUS.lapsed });
      touched[byId[id]['Slot id']] = true;
    });
    Object.keys(touched).forEach(function (slotId) {
      if (slotsById[slotId]) refreshFilled_(slotsT, slotsById[slotId], d.signups);
    });
    return ids.length;
  });
}

/**
 * 48 hours ahead, sign-ups still waiting for approval: one urgent email per post and date to the
 * approvers of each waiting volunteer's first post (the post's own approvers when that is gone).
 */
function sendNudges_() {
  var s = settings_();
  var d = volunteerData_();
  var slotsById = indexBy_(d.slots, 'Slot id');
  var postsById = indexBy_(d.posts, 'Post id');
  var due = nudgesDue(d.signups, slotsById, postsById, nowLocal_(), sentKeys_(SENT_NUDGE));
  if (!due.length) return 0;
  var vols = volunteersByEmail_(serviceTab_(TAB.volunteers).rows());
  var leaders = leaders_();
  var categoriesById = indexBy_(serviceTab_(TAB.categories).rows(), 'Id');
  due.forEach(function (n) {
    var post = postsById[n.postId];
    var here = d.signups.filter(function (su) {
      var sl = slotsById[su['Slot id']];
      return su.Status === SIGNUP_STATUS.waitingApproval && su['Post id'] === n.postId && sl && sl.Date === n.date;
    });
    var to = [];
    here.forEach(function (su) {
      var v = vols[normEmail(su.Email)];
      var first = v ? postsById[v['First post']] : null;
      to = to.concat(approverEmailsFor(first || post, categoriesById, s, leaders));
    });
    var t = tplNudge_(s, post, n.date, here.length);
    uniq_(to).forEach(function (e) {
      sendAll_('job notice', [mailMsg_(e, t, 'high')]);
    });
    markSent_(SENT_NUDGE, n.key);
  });
  return due.length;
}

/** Fill warnings (service spec section 4): to the category's coordinators and Also warn, once per post date. */
function sendWarnings_() {
  var s = settings_();
  var d = volunteerData_();
  var categoriesById = indexBy_(serviceTab_(TAB.categories).rows(), 'Id');
  var postsById = indexBy_(d.posts, 'Post id');
  var due = warningsDue(d.posts, groupBy_(d.slots, 'Post id'), countsBySlot(d.signups), categoriesById, nowLocal_(), sentKeys_(SENT_WARN));
  due.forEach(function (w) {
    var post = postsById[w.postId];
    var cat = categoriesById[post.Category];
    var to = uniq_(
      splitList(cat.Coordinators)
        .concat(splitList(cat['Also warn']))
        .filter(isEmail)
        .map(normEmail)
    );
    // Nobody to warn yet: leave the key unmarked, so coordinators added later still hear.
    if (!to.length) return;
    var t = tplWarning_(s, post, w.date, w.short, pageUrl_(s, 'post', { p: post['Public id'] }));
    to.forEach(function (e) {
      sendAll_('job notice', [mailMsg_(e, t, 'high')]);
    });
    markSent_(SENT_WARN, w.key);
  });
  return due.length;
}

/** The Needs help soon tab, rewritten from the rule only when it changed. */
function writeNeedsHelpTab_() {
  var want = needsHelpRows_(settings_()).map(function (r) {
    return { Date: r.date, Start: r.start, Title: r.title, Organization: r.organization, Role: r.role, Filled: r.filled, Needed: r.needed, Link: r.publicUrl };
  });
  var key = function (list) {
    return JSON.stringify(
      list.map(function (r) {
        return [r.Date, r.Start, String(r.Title), String(r.Organization), String(r.Role), Number(r.Filled), Number(r.Needed), String(r.Link)];
      })
    );
  };
  withLock_(function () {
    var t = serviceTab_(TAB.needsHelp);
    var have = t.rows();
    if (key(have) === key(want)) return;
    // Clear (not delete) the old rows: Sheets refuses to delete every row below a frozen header.
    var last = t.sheet.getLastRow();
    if (last > 1) t.sheet.getRange(2, 1, last - 1, t.headers.length).clearContent();
    t.appendMany(want);
  });
}

/**
 * Day-before reminders, with a fresh cancel link, and the private details only when the
 * volunteer is approved (or on the Leaders tab) now: a revoked volunteer's sign-up stays but gets
 * no details. Due sign-ups are claimed (Reminded at stamped) under the lock from a fresh read, so
 * someone who cancels or is removed before the claim gets nothing; the emails go out after the
 * lock is released. Details sent at records when details went out.
 */
function sendReminders_() {
  var s = settings_();
  var now = nowLocal_();
  var claimed = withLock_(function () {
    var d = volunteerData_();
    var slotsById = indexBy_(d.slots, 'Slot id');
    var postsById = indexBy_(d.posts, 'Post id');
    var byId = indexBy_(d.signups, 'Sign-up id');
    var signupsT = serviceTab_(TAB.signups);
    var vols = volunteersByEmail_(serviceTab_(TAB.volunteers).rows());
    var leaderList = leaderEmails_();
    return remindersDue(d.signups, slotsById, postsById, now, s.reminder_hour).map(function (id) {
      var su = byId[id];
      var post = postsById[su['Post id']];
      var state = volunteerState(su.Email, vols, leaderList);
      var details = (state === 'approved' || state === 'leader') && !!post['Private details'];
      var stamp = { 'Reminded at': now };
      if (details) stamp['Details sent at'] = now;
      signupsT.update(su, stamp);
      var slot = slotsById[su['Slot id']];
      // The cancel link is made with the claim, so a stamped reminder always has its email.
      var token = issueToken_('cancel', su['Sign-up id'], addDays(slot.Date, 1) + ' 23:59');
      return mailMsg_(normEmail(su.Email), tplReminder_(s, post, slot, su, pageUrl_(s, 'confirm', { t: token }), details), 'high');
    });
  });
  sendAll_('reminder', claimed);
  return claimed.length;
}

function markPastPosts_() {
  return withLock_(function () {
    var postsT = serviceTab_(TAB.posts);
    var posts = postsT.rows();
    var ids = postsToMarkPast(posts, groupBy_(serviceTab_(TAB.slots).rows(), 'Post id'), todayLocal_());
    posts.forEach(function (p) {
      if (ids.indexOf(p['Post id']) >= 0) postsT.update(p, { Status: POST_STATUS.past });
    });
    return ids.length;
  });
}

function gpTenMinute(e) {
  runJob_('gpTenMinute', e, function () {
    runParts_('gpTenMinute', [
      ['outbox', drainOutbox_],
      ['leader links', processLeaderLinkTicks_],
      ['counts', refreshAllFilled_],
      ['needs help soon', writeNeedsHelpTab_],
    ]);
  });
}

function gpHourly(e) {
  runJob_('gpHourly', e, function () {
    runParts_('gpHourly', [
      ['lapses', lapseWaiting_],
      ['reminders', sendReminders_],
      ['nudges', sendNudges_],
      ['warnings', sendWarnings_],
      ['past posts', markPastPosts_],
      ['drafts from requests', makeDraftsFromRequests_],
      ['serve cache', clearServeCache_],
    ]);
  });
}

function gpDaily(e) {
  runJob_('gpDaily', e, function () {
    var problems = dailyRequests_();
    var now = nowLocal_();
    var today = now.slice(0, 10);
    withLock_(function () {
      var tokensT = systemTab_(SYS_TAB.tokens);
      tokensT.removeMany(
        tokensT.rows().filter(function (t) {
          return !t.Expires || t.Expires <= now;
        })
      );
    });
    var logT = systemTab_(SYS_TAB.log);
    var logCutoff = addDays(today, -LOG_KEEP_DAYS);
    logT.removeMany(
      logT.rows().filter(function (l) {
        return String(l.At).slice(0, 10) < logCutoff;
      })
    );
    var mailCutoff = addDays(today, -FAILED_MAIL_KEEP_DAYS);
    var oldFailed = [];
    withLock_(function () {
      var outT = systemTab_(SYS_TAB.outbox);
      oldFailed = outT.rows().filter(function (m) {
        return m.Status === 'Failed' && String(m['Queued at']).slice(0, 10) < mailCutoff;
      });
      if (oldFailed.length) {
        problems.push('These emails could not be sent and have been removed from the Outbox:');
        oldFailed.forEach(function (m) {
          problems.push('  ' + m.To + ' | ' + m.Subject + ' | ' + m.Error);
        });
        outT.removeMany(oldFailed);
      }
    });
    if (problems.length) alertOncePerDay_('gpDaily-report', problems);
    pruneSentKeys_(today);
    pruneCounters_();
    // The health email: only the PROBLEM lines of Check health, and only when there is one.
    var bad = healthLines_({ job: true }).filter(function (l) {
      return l.indexOf('PROBLEM') === 0;
    });
    if (bad.length) alertOncePerDay_('health', bad);
  });
}

// ===== pages (generated from google-portal/pages/) =====

var GP_PAGES = {
 "serve": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #5b6776;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n  /* The ward's look (Settings theme_*): --gp-bg, --gp-panel, --gp-panel-radius, --gp-panel-pad,\n     --gp-panel-top, --gp-button and --gp-heading-font are set only by a theme; their fallbacks are the standard look. */\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background-color: var(--gp-page);\n  background-image: var(--gp-bg, none);\n  background-position: center;\n  background-size: cover;\n  background-repeat: no-repeat;\n  background-attachment: fixed;\n  line-height: 1.5;\n  min-height: 100vh;\n}\n/* Phones: iOS ignores fixed backgrounds, so the picture scrolls with the page. */\n@media (max-width: 760px) {\n  body { background-attachment: scroll; }\n}\n\n/* With a background picture, text sits on a light panel so it stays readable. */\n.gp-wrap, .gp-footer {\n  background: var(--gp-panel, transparent);\n  border-radius: var(--gp-panel-radius, 0);\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: var(--gp-panel-top, 0) auto 0;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1, h2, h3 { font-family: var(--gp-heading-font, var(--gp-font)); }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-button, var(--gp-heading));\n  background: var(--gp-button, var(--gp-heading));\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-button, var(--gp-heading)); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n/* A person's buttons stay together and wrap as one group; on a narrow phone they wrap among\n   themselves rather than overflow. */\n.gp-actions { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; max-width: 100%; }\n.gp-actions button { margin: 0; padding: 0.35rem 0.75rem; font-size: 0.88rem; white-space: nowrap; }\n/* Serve page: Brothers and Sisters side by side on wide screens, stacked on phones. */\n.gp-pair { display: grid; grid-template-columns: 1fr; gap: 0 1rem; }\n.gp-pair > .gp-section { min-width: 0; }\n.gp-cat { font-size: 0.8rem; color: var(--gp-muted); margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.04em; }\n.gp-cat-icon { margin-right: 0.35rem; text-transform: none; }\n.gp-aud { font-size: 0.85rem; color: var(--gp-heading); margin: 0 0 0.1rem; }\n@media (min-width: 720px) {\n  .gp-pair { grid-template-columns: 1fr 1fr; }\n}\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n.gp-offer { padding: 0.6rem 0.9rem; text-align: center; margin-bottom: 1rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: var(--gp-panel-pad, 0) 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap gp-wide\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1>{{PAGE_TITLE}}</h1>\n  </header>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** A post's audiences in the fixed order (Brothers, Sisters, Youth, Children). */\n  function audiencesOf(p) {\n    var have = p.audiences || [];\n    return AUDIENCES.filter(function (a) {\n      return have.indexOf(a) >= 0;\n    });\n  }\n\n  /** 'Brothers · Sisters' (the fixed order). */\n  function audienceLine(p) {\n    return audiencesOf(p).join(' · ');\n  }\n\n  /**\n   * {Everyone: [], Brothers: [], Sisters: [], Youth: [], Children: []}, each post in exactly one\n   * group: Everyone when it has more than one audience, else its one audience (decision 23).\n   * Full posts last in each group.\n   */\n  function groupByAudience(posts) {\n    var out = { Everyone: [] };\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      var aud = audiencesOf(p);\n      if (aud.length > 1) out.Everyone.push(p);\n      else if (aud.length === 1) out[aud[0]].push(p);\n    });\n    ['Everyone'].concat(AUDIENCES).forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    audienceLine: audienceLine,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'serve', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n\n  function card(p) {\n    var dates = p.firstDate === p.lastDate ? GP.fmtDate(p.firstDate) : GP.fmtDate(p.firstDate) + ' – ' + GP.fmtDate(p.lastDate);\n    return el('a', { class: 'gp-card' + (p.full ? ' gp-full' : ''), href: GP.pageUrl('post', { p: p.publicId }) }, [\n      p.categoryName ? el('p', { class: 'gp-cat' }, [p.categoryIcon ? el('span', { class: 'gp-cat-icon', 'aria-hidden': 'true' }, p.categoryIcon) : null, p.categoryName]) : null,\n      el('h3', {}, p.title),\n      // For a post shown under Everyone: whom it is for, in the fixed order.\n      (p.audiences || []).length > 1 ? el('p', { class: 'gp-aud' }, GP.audienceLine(p)) : null,\n      // ...and, when it is for Youth or Children, the parent line its own section would show.\n      (p.audiences || []).length > 1 && (p.audiences.indexOf('Youth') >= 0 || p.audiences.indexOf('Children') >= 0)\n        ? el('p', { class: 'gp-meta gp-parent' }, 'A parent signs up for their child')\n        : null,\n      el('p', { class: 'gp-meta' }, (p.organization ? p.organization + ' · ' : '') + dates),\n      p.full ? el('p', { class: 'gp-filled' }, 'Filled ✓') : GP.fillBar(p.filled, p.needed),\n      p.full ? null : el('p', { class: 'gp-count' }, p.filled + ' of ' + p.needed + ' filled'),\n    ]);\n  }\n\n  /** One group's heading and cards, or null when it has none. */\n  function section(groups, a, title) {\n    if (!groups[a].length) return null;\n    var young = a === 'Youth' || a === 'Children';\n    return el('section', { class: 'gp-section' }, [\n      el('h2', {}, title || a),\n      young ? el('p', { class: 'gp-meta' }, 'A parent signs up for their child') : null,\n    ].concat(groups[a].map(card)));\n  }\n\n  GP.call('serve').then(\n    function (res) {\n      if (!res || !res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n      var groups = GP.groupByAudience(res.posts);\n      var parts = [];\n      // The Christmas giving card first (only when the ward ticked On Serve page for it).\n      (res.offers || []).forEach(function (o) {\n        parts.push(\n          el('a', { class: 'gp-card gp-offer', href: o.url, target: '_blank', rel: 'noopener' }, [\n            el('strong', {}, (o.icon ? o.icon + ' ' : '') + o.label),\n          ])\n        );\n      });\n      // Posts for more than one audience once, full width, under Everyone (decision 23); then\n      // Brothers and Sisters side by side on wide screens (stacked on phones), then Youth and Children.\n      var listed = 0;\n      var everyone = section(groups, 'Everyone', (res.labels && res.labels.everyone) || 'Everyone');\n      if (everyone) {\n        listed++;\n        parts.push(everyone);\n      }\n      var pair = [section(groups, 'Brothers'), section(groups, 'Sisters')].filter(Boolean);\n      listed += pair.length;\n      if (pair.length) parts.push(el('div', { class: pair.length === 2 ? 'gp-pair' : '' }, pair));\n      ['Youth', 'Children'].forEach(function (a) {\n        var sec = section(groups, a);\n        if (sec) {\n          listed++;\n          parts.push(sec);\n        }\n      });\n      if (!listed) parts.push(el('p', { class: 'gp-muted' }, 'Nothing to sign up for right now. Please check back soon.'));\n      parts.push(\n        el('p', { style: 'margin-top:1.5rem;text-align:center' }, [\n          el('a', { class: 'gp-btn gp-light', href: GP.pageUrl('help') }, 'Request help or service'),\n        ])\n      );\n      GP.show(main, parts);\n    },\n    function () {\n      GP.show(main, GP.unreachable('serve'));\n    }\n  );\n})();\n</script>\n</body>\n</html>\n",
 "post": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #5b6776;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n  /* The ward's look (Settings theme_*): --gp-bg, --gp-panel, --gp-panel-radius, --gp-panel-pad,\n     --gp-panel-top, --gp-button and --gp-heading-font are set only by a theme; their fallbacks are the standard look. */\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background-color: var(--gp-page);\n  background-image: var(--gp-bg, none);\n  background-position: center;\n  background-size: cover;\n  background-repeat: no-repeat;\n  background-attachment: fixed;\n  line-height: 1.5;\n  min-height: 100vh;\n}\n/* Phones: iOS ignores fixed backgrounds, so the picture scrolls with the page. */\n@media (max-width: 760px) {\n  body { background-attachment: scroll; }\n}\n\n/* With a background picture, text sits on a light panel so it stays readable. */\n.gp-wrap, .gp-footer {\n  background: var(--gp-panel, transparent);\n  border-radius: var(--gp-panel-radius, 0);\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: var(--gp-panel-top, 0) auto 0;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1, h2, h3 { font-family: var(--gp-heading-font, var(--gp-font)); }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-button, var(--gp-heading));\n  background: var(--gp-button, var(--gp-heading));\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-button, var(--gp-heading)); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n/* A person's buttons stay together and wrap as one group; on a narrow phone they wrap among\n   themselves rather than overflow. */\n.gp-actions { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; max-width: 100%; }\n.gp-actions button { margin: 0; padding: 0.35rem 0.75rem; font-size: 0.88rem; white-space: nowrap; }\n/* Serve page: Brothers and Sisters side by side on wide screens, stacked on phones. */\n.gp-pair { display: grid; grid-template-columns: 1fr; gap: 0 1rem; }\n.gp-pair > .gp-section { min-width: 0; }\n.gp-cat { font-size: 0.8rem; color: var(--gp-muted); margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.04em; }\n.gp-cat-icon { margin-right: 0.35rem; text-transform: none; }\n.gp-aud { font-size: 0.85rem; color: var(--gp-heading); margin: 0 0 0.1rem; }\n@media (min-width: 720px) {\n  .gp-pair { grid-template-columns: 1fr 1fr; }\n}\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n.gp-offer { padding: 0.6rem 0.9rem; text-align: center; margin-bottom: 1rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: var(--gp-panel-pad, 0) 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1 id=\"gp-title\">{{PAGE_TITLE}}</h1>\n  </header>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n  <p style=\"text-align:center;margin-top:1.5rem\"><a id=\"gp-back\" class=\"gp-btn gp-light\" href=\"serve.html\">All service opportunities</a></p>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** A post's audiences in the fixed order (Brothers, Sisters, Youth, Children). */\n  function audiencesOf(p) {\n    var have = p.audiences || [];\n    return AUDIENCES.filter(function (a) {\n      return have.indexOf(a) >= 0;\n    });\n  }\n\n  /** 'Brothers · Sisters' (the fixed order). */\n  function audienceLine(p) {\n    return audiencesOf(p).join(' · ');\n  }\n\n  /**\n   * {Everyone: [], Brothers: [], Sisters: [], Youth: [], Children: []}, each post in exactly one\n   * group: Everyone when it has more than one audience, else its one audience (decision 23).\n   * Full posts last in each group.\n   */\n  function groupByAudience(posts) {\n    var out = { Everyone: [] };\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      var aud = audiencesOf(p);\n      if (aud.length > 1) out.Everyone.push(p);\n      else if (aud.length === 1) out[aud[0]].push(p);\n    });\n    ['Everyone'].concat(AUDIENCES).forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    audienceLine: audienceLine,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'post', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n  GP.$('gp-back').setAttribute('href', GP.pageUrl('serve'));\n\n  function byDate(slots) {\n    var out = [];\n    var at = {};\n    slots.forEach(function (s) {\n      if (!(s.date in at)) {\n        at[s.date] = out.length;\n        out.push({ date: s.date, slots: [] });\n      }\n      out[at[s.date]].slots.push(s);\n    });\n    return out;\n  }\n\n  function slotLine(s) {\n    var when = GP.fmtTimes(s.start, s.end);\n    return el('div', { class: 'gp-slot' }, [\n      el('strong', {}, s.role),\n      when ? el('span', { class: 'gp-meta' }, ' · ' + when) : null,\n      // Over the number is fine (a waiting sign-up approved later): say so plainly, \"12 of 10\".\n      s.full\n        ? el('div', { class: 'gp-filled' }, 'Filled ✓' + (s.filled > s.needed ? ' · ' + s.filled + ' of ' + s.needed : ''))\n        : el('div', {}, [GP.fillBar(s.filled, s.needed), el('span', { class: 'gp-count' }, s.filled + ' of ' + s.needed + ' filled')]),\n      s.roleNote ? el('p', { class: 'gp-meta' }, s.roleNote) : null,\n    ]);\n  }\n\n  function signupForm(post) {\n    var open = post.slots.filter(function (s) {\n      return !s.full && !s.past;\n    });\n    if (!open.length) return el('p', { class: 'gp-muted' }, 'Every role is filled. Thank you!');\n    var chosen = null;\n    var out = el('div', { id: 'gp-out' });\n    var bringWrap = el('div', { class: 'gp-hidden' });\n    var bringLabel = el('label', { for: 'gp-bring' }, 'What are you bringing?');\n    var bring = el('input', { type: 'text', id: 'gp-bring', maxlength: '200' });\n    bringWrap.appendChild(bringLabel);\n    bringWrap.appendChild(bring);\n    var errs = {};\n    function errBox(key) {\n      errs[key] = el('p', { class: 'gp-error', role: 'alert' });\n      return errs[key];\n    }\n    var choices = open.map(function (s) {\n      var input = el('input', {\n        type: 'radio',\n        name: 'gp-slot',\n        value: s.slotId,\n        onchange: function () {\n          chosen = s;\n          bringLabel.textContent = s.bringingPrompt || 'What are you bringing?';\n          bringWrap.className = s.bringingPrompt ? '' : 'gp-hidden';\n        },\n      });\n      var when = GP.fmtTimes(s.start, s.end);\n      return el('label', { class: 'gp-check' }, [input, GP.fmtDate(s.date) + (when ? ', ' + when : '') + ' · ' + s.role + ' (' + (s.needed - s.filled) + ' open)']);\n    });\n    var name = el('input', { type: 'text', id: 'gp-name', autocomplete: 'name', maxlength: '80' });\n    var email = el('input', { type: 'email', id: 'gp-email', autocomplete: 'email', maxlength: '254' });\n    var button = el('button', { type: 'submit' }, 'Sign up');\n    // Youth and Children posts: a parent signs up themselves or a child (first name only).\n    var young = post.audiences.indexOf('Youth') >= 0 || post.audiences.indexOf('Children') >= 0;\n    var who = 'me';\n    var nameLabel = el('label', { for: 'gp-name' }, 'Your name');\n    var childWrap = young ? el('div', { class: 'gp-hidden' }) : null;\n    var child = young ? el('input', { type: 'text', id: 'gp-child', maxlength: '40', autocomplete: 'off' }) : null;\n    if (young) {\n      childWrap.appendChild(el('label', { for: 'gp-child' }, \"Your child's first name\"));\n      childWrap.appendChild(child);\n    }\n    function whoChoice(value, label) {\n      var input = el('input', {\n        type: 'radio',\n        name: 'gp-who',\n        value: value,\n        checked: value === 'me',\n        onchange: function () {\n          who = value;\n          childWrap.className = value === 'child' ? '' : 'gp-hidden';\n          nameLabel.textContent = value === 'child' ? 'Your name (the parent)' : 'Your name';\n        },\n      });\n      return el('label', { class: 'gp-check' }, [input, label]);\n    }\n    var whoBox = young\n      ? el('fieldset', { style: 'border:none;padding:0;margin:0.6rem 0 0' }, [\n          el('legend', { class: 'gp-meta' }, 'Who is serving?'),\n          whoChoice('me', 'Me'),\n          whoChoice('child', 'My child'),\n          el('p', { class: 'gp-meta' }, 'A parent signs up for their child. Use your own name and email; we never ask for a child\\'s email. Sign up each child (and yourself) separately.'),\n        ])\n      : null;\n    var form = el(\n      'form',\n      {\n        onsubmit: function (e) {\n          e.preventDefault();\n          Object.keys(errs).forEach(function (k) {\n            errs[k].textContent = '';\n          });\n          if (!chosen) {\n            errs.slot.textContent = 'Pick a date and role.';\n            return;\n          }\n          var childName = young && who === 'child' ? String(child.value || '').trim() : '';\n          if (young && who === 'child' && !childName) {\n            errs.childName.textContent = \"Type your child's first name.\";\n            return;\n          }\n          button.disabled = true;\n          GP.call('signup', { publicId: post.publicId, slotId: chosen.slotId, name: name.value, email: email.value, bringing: chosen.bringingPrompt ? bring.value : '', childName: childName }).then(\n            function (res) {\n              button.disabled = false;\n              if (res && res.ok) {\n                // Reload so the counts include this sign-up; the message replaces the form.\n                return GP.call('post', { p: post.publicId }).then(\n                  function (again) {\n                    if (again && again.ok) render(again.post, res.message);\n                    else GP.show(formWrap, GP.message('ok', res.message));\n                  },\n                  function () {\n                    GP.show(formWrap, GP.message('ok', res.message));\n                  }\n                );\n              }\n              Object.keys((res && res.fields) || {}).forEach(function (k) {\n                if (errs[k]) errs[k].textContent = res.fields[k];\n              });\n              GP.show(out, GP.message('alert', GP.errorText(res)));\n            },\n            function () {\n              button.disabled = false;\n              GP.show(out, GP.unreachable('post'));\n            }\n          );\n        },\n      },\n      [\n        el('h2', {}, 'Sign up'),\n        el('fieldset', { style: 'border:none;padding:0;margin:0' }, [el('legend', { class: 'gp-meta' }, 'Pick a date and role')].concat(choices)),\n        errBox('slot'),\n        whoBox,\n        childWrap,\n        errBox('childName'),\n        nameLabel,\n        name,\n        errBox('name'),\n        el('label', { for: 'gp-email' }, 'Your email (for your confirmation and reminder)'),\n        email,\n        errBox('email'),\n        bringWrap,\n        errBox('bringing'),\n        el('p', {}, [button]),\n        out,\n      ]\n    );\n    var formWrap = el('div', {}, [form]);\n    return formWrap;\n  }\n\n  function render(post, doneMessage) {\n    GP.$('gp-title').textContent = post.title;\n    document.title = post.title + ' · ' + GP.config().wardName;\n    var parts = [\n      el('div', { class: 'gp-card' }, [\n        el('p', { class: 'gp-meta' }, [post.organization, post.audiences.length ? ' · For ' + post.audiences.join(', ') : ''].join('')),\n        post.publicNote ? el('p', { class: 'gp-note' }, post.publicNote) : null,\n      ]),\n    ];\n    byDate(post.slots).forEach(function (d) {\n      parts.push(el('h2', {}, GP.fmtDate(d.date)));\n      parts.push(el('div', { class: 'gp-card' }, d.slots.map(slotLine)));\n    });\n    if (doneMessage) parts.push(GP.message('ok', doneMessage));\n    else if (post.status === 'Open') parts.push(signupForm(post));\n    else if (post.status === 'Past') parts.push(el('p', { class: 'gp-muted' }, 'This opportunity is over. Thank you to everyone who served.'));\n    else if (post.status === 'Cancelled') parts.push(el('p', { class: 'gp-muted' }, 'This opportunity was cancelled.'));\n    else parts.push(el('p', { class: 'gp-muted' }, 'This opportunity is closed to new sign-ups.'));\n    GP.show(main, parts);\n  }\n\n  GP.hash().then(function (h) {\n    if (!h.p) return GP.show(main, GP.message('alert', 'This link is missing part of its address. Open it again from the list.'));\n    GP.call('post', { p: h.p }).then(\n      function (res) {\n        if (!res || !res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n        render(res.post);\n      },\n      function () {\n        GP.show(main, GP.unreachable('post'));\n      }\n    );\n  });\n})();\n</script>\n</body>\n</html>\n",
 "help": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #5b6776;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n  /* The ward's look (Settings theme_*): --gp-bg, --gp-panel, --gp-panel-radius, --gp-panel-pad,\n     --gp-panel-top, --gp-button and --gp-heading-font are set only by a theme; their fallbacks are the standard look. */\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background-color: var(--gp-page);\n  background-image: var(--gp-bg, none);\n  background-position: center;\n  background-size: cover;\n  background-repeat: no-repeat;\n  background-attachment: fixed;\n  line-height: 1.5;\n  min-height: 100vh;\n}\n/* Phones: iOS ignores fixed backgrounds, so the picture scrolls with the page. */\n@media (max-width: 760px) {\n  body { background-attachment: scroll; }\n}\n\n/* With a background picture, text sits on a light panel so it stays readable. */\n.gp-wrap, .gp-footer {\n  background: var(--gp-panel, transparent);\n  border-radius: var(--gp-panel-radius, 0);\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: var(--gp-panel-top, 0) auto 0;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1, h2, h3 { font-family: var(--gp-heading-font, var(--gp-font)); }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-button, var(--gp-heading));\n  background: var(--gp-button, var(--gp-heading));\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-button, var(--gp-heading)); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n/* A person's buttons stay together and wrap as one group; on a narrow phone they wrap among\n   themselves rather than overflow. */\n.gp-actions { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; max-width: 100%; }\n.gp-actions button { margin: 0; padding: 0.35rem 0.75rem; font-size: 0.88rem; white-space: nowrap; }\n/* Serve page: Brothers and Sisters side by side on wide screens, stacked on phones. */\n.gp-pair { display: grid; grid-template-columns: 1fr; gap: 0 1rem; }\n.gp-pair > .gp-section { min-width: 0; }\n.gp-cat { font-size: 0.8rem; color: var(--gp-muted); margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.04em; }\n.gp-cat-icon { margin-right: 0.35rem; text-transform: none; }\n.gp-aud { font-size: 0.85rem; color: var(--gp-heading); margin: 0 0 0.1rem; }\n@media (min-width: 720px) {\n  .gp-pair { grid-template-columns: 1fr 1fr; }\n}\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n.gp-offer { padding: 0.6rem 0.9rem; text-align: center; margin-bottom: 1rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: var(--gp-panel-pad, 0) 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1>{{PAGE_TITLE}}</h1>\n  </header>\n  <p>Pick what you need. Each choice opens a short form. Nothing is emailed back to you; a leader will contact you.</p>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n  <p style=\"text-align:center;margin-top:1.5rem\"><a id=\"gp-serve\" class=\"gp-btn gp-light\" href=\"serve.html\">Ways to serve</a></p>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** A post's audiences in the fixed order (Brothers, Sisters, Youth, Children). */\n  function audiencesOf(p) {\n    var have = p.audiences || [];\n    return AUDIENCES.filter(function (a) {\n      return have.indexOf(a) >= 0;\n    });\n  }\n\n  /** 'Brothers · Sisters' (the fixed order). */\n  function audienceLine(p) {\n    return audiencesOf(p).join(' · ');\n  }\n\n  /**\n   * {Everyone: [], Brothers: [], Sisters: [], Youth: [], Children: []}, each post in exactly one\n   * group: Everyone when it has more than one audience, else its one audience (decision 23).\n   * Full posts last in each group.\n   */\n  function groupByAudience(posts) {\n    var out = { Everyone: [] };\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      var aud = audiencesOf(p);\n      if (aud.length > 1) out.Everyone.push(p);\n      else if (aud.length === 1) out[aud[0]].push(p);\n    });\n    ['Everyone'].concat(AUDIENCES).forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    audienceLine: audienceLine,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'help', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n  GP.$('gp-serve').setAttribute('href', GP.pageUrl('serve'));\n  GP.call('help').then(\n    function (res) {\n      if (!res || !res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n      if (!res.tiles.length) return GP.show(main, el('p', { class: 'gp-muted' }, 'Requests are not open yet. Please contact a leader.'));\n      GP.show(\n        main,\n        el(\n          'div',\n          { class: 'gp-tiles' },\n          res.tiles.map(function (t) {\n            return el('a', { class: 'gp-card gp-tile', href: t.url, target: '_blank', rel: 'noopener' }, [\n              el('span', { class: 'gp-icon', 'aria-hidden': 'true' }, t.icon || '•'),\n              el('strong', {}, t.name),\n            ]);\n          })\n        )\n      );\n    },\n    function () {\n      GP.show(main, GP.unreachable('help'));\n    }\n  );\n})();\n</script>\n</body>\n</html>\n",
 "confirm": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #5b6776;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n  /* The ward's look (Settings theme_*): --gp-bg, --gp-panel, --gp-panel-radius, --gp-panel-pad,\n     --gp-panel-top, --gp-button and --gp-heading-font are set only by a theme; their fallbacks are the standard look. */\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background-color: var(--gp-page);\n  background-image: var(--gp-bg, none);\n  background-position: center;\n  background-size: cover;\n  background-repeat: no-repeat;\n  background-attachment: fixed;\n  line-height: 1.5;\n  min-height: 100vh;\n}\n/* Phones: iOS ignores fixed backgrounds, so the picture scrolls with the page. */\n@media (max-width: 760px) {\n  body { background-attachment: scroll; }\n}\n\n/* With a background picture, text sits on a light panel so it stays readable. */\n.gp-wrap, .gp-footer {\n  background: var(--gp-panel, transparent);\n  border-radius: var(--gp-panel-radius, 0);\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: var(--gp-panel-top, 0) auto 0;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1, h2, h3 { font-family: var(--gp-heading-font, var(--gp-font)); }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-button, var(--gp-heading));\n  background: var(--gp-button, var(--gp-heading));\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-button, var(--gp-heading)); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n/* A person's buttons stay together and wrap as one group; on a narrow phone they wrap among\n   themselves rather than overflow. */\n.gp-actions { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; max-width: 100%; }\n.gp-actions button { margin: 0; padding: 0.35rem 0.75rem; font-size: 0.88rem; white-space: nowrap; }\n/* Serve page: Brothers and Sisters side by side on wide screens, stacked on phones. */\n.gp-pair { display: grid; grid-template-columns: 1fr; gap: 0 1rem; }\n.gp-pair > .gp-section { min-width: 0; }\n.gp-cat { font-size: 0.8rem; color: var(--gp-muted); margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.04em; }\n.gp-cat-icon { margin-right: 0.35rem; text-transform: none; }\n.gp-aud { font-size: 0.85rem; color: var(--gp-heading); margin: 0 0 0.1rem; }\n@media (min-width: 720px) {\n  .gp-pair { grid-template-columns: 1fr 1fr; }\n}\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n.gp-offer { padding: 0.6rem 0.9rem; text-align: center; margin-bottom: 1rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: var(--gp-panel-pad, 0) 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1>{{PAGE_TITLE}}</h1>\n  </header>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** A post's audiences in the fixed order (Brothers, Sisters, Youth, Children). */\n  function audiencesOf(p) {\n    var have = p.audiences || [];\n    return AUDIENCES.filter(function (a) {\n      return have.indexOf(a) >= 0;\n    });\n  }\n\n  /** 'Brothers · Sisters' (the fixed order). */\n  function audienceLine(p) {\n    return audiencesOf(p).join(' · ');\n  }\n\n  /**\n   * {Everyone: [], Brothers: [], Sisters: [], Youth: [], Children: []}, each post in exactly one\n   * group: Everyone when it has more than one audience, else its one audience (decision 23).\n   * Full posts last in each group.\n   */\n  function groupByAudience(posts) {\n    var out = { Everyone: [] };\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      var aud = audiencesOf(p);\n      if (aud.length > 1) out.Everyone.push(p);\n      else if (aud.length === 1) out[aud[0]].push(p);\n    });\n    ['Everyone'].concat(AUDIENCES).forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    audienceLine: audienceLine,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'confirm', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n  GP.hash().then(function (h) {\n    if (!h.t) return GP.show(main, GP.message('alert', 'This link is missing part of its address. Open it again from your email.'));\n    // One page for three kinds of emailed link: confirm your address, withdraw an offer, cancel.\n    var KINDS = {\n      confirm: { action: 'confirm', label: 'Confirm my address', cls: '', intro: 'Please confirm this is your email address so your sign-up can go ahead.' },\n      withdraw: { action: 'withdraw', label: 'Withdraw my offer', cls: 'gp-danger', intro: 'This role already has the people it needs. You may stay signed up, or withdraw your offer below.' },\n      cancel: { action: 'cancel', label: 'Cancel my sign-up', cls: 'gp-danger', intro: \"Can't make it? Cancel below so someone else can take your place.\" },\n    };\n    var ACTIVE = { Confirmed: true, 'Waiting-email': true, 'Waiting-approval': true };\n    GP.call('tokenInfo', { t: h.t }).then(\n      function (res) {\n        if (!res || !res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n        var kind = KINDS[res.kind] || KINDS.cancel;\n        var when = GP.fmtDate(res.date) + (res.start ? ', ' + GP.fmtTime(res.start) : '');\n        var info = el('div', { class: 'gp-card' }, [el('h3', {}, res.title), el('p', {}, res.role + ' · ' + when)]);\n        if (res.kind === 'confirm' && res.confirmed) return GP.show(main, [info, GP.message('ok', 'Your address is already confirmed.')]);\n        if (res.kind === 'withdraw' && res.status !== 'Confirmed') return GP.show(main, [info, GP.message('ok', 'This sign-up is no longer active.')]);\n        if (res.kind === 'cancel' && !ACTIVE[res.status]) return GP.show(main, [info, GP.message('ok', 'This sign-up is already cancelled.')]);\n        var out = el('div');\n        // The change happens only on this click (email scanners open links but never press buttons).\n        var button = el(\n          'button',\n          {\n            type: 'button',\n            class: kind.cls,\n            onclick: function () {\n              button.disabled = true;\n              GP.call(kind.action, { t: h.t }).then(\n                function (r) {\n                  if (r && r.ok) return GP.show(main, [info, GP.message('ok', r.message)]);\n                  button.disabled = false;\n                  GP.show(out, GP.message('alert', GP.errorText(r)));\n                },\n                function () {\n                  button.disabled = false;\n                  GP.show(out, GP.unreachable('confirm'));\n                }\n              );\n            },\n          },\n          kind.label\n        );\n        GP.show(main, [info, el('p', {}, kind.intro), el('p', {}, [button]), out]);\n      },\n      function () {\n        GP.show(main, GP.unreachable('confirm'));\n      }\n    );\n  });\n})();\n</script>\n</body>\n</html>\n",
 "leader": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #5b6776;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n  /* The ward's look (Settings theme_*): --gp-bg, --gp-panel, --gp-panel-radius, --gp-panel-pad,\n     --gp-panel-top, --gp-button and --gp-heading-font are set only by a theme; their fallbacks are the standard look. */\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background-color: var(--gp-page);\n  background-image: var(--gp-bg, none);\n  background-position: center;\n  background-size: cover;\n  background-repeat: no-repeat;\n  background-attachment: fixed;\n  line-height: 1.5;\n  min-height: 100vh;\n}\n/* Phones: iOS ignores fixed backgrounds, so the picture scrolls with the page. */\n@media (max-width: 760px) {\n  body { background-attachment: scroll; }\n}\n\n/* With a background picture, text sits on a light panel so it stays readable. */\n.gp-wrap, .gp-footer {\n  background: var(--gp-panel, transparent);\n  border-radius: var(--gp-panel-radius, 0);\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: var(--gp-panel-top, 0) auto 0;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1, h2, h3 { font-family: var(--gp-heading-font, var(--gp-font)); }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-button, var(--gp-heading));\n  background: var(--gp-button, var(--gp-heading));\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-button, var(--gp-heading)); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n/* A person's buttons stay together and wrap as one group; on a narrow phone they wrap among\n   themselves rather than overflow. */\n.gp-actions { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; max-width: 100%; }\n.gp-actions button { margin: 0; padding: 0.35rem 0.75rem; font-size: 0.88rem; white-space: nowrap; }\n/* Serve page: Brothers and Sisters side by side on wide screens, stacked on phones. */\n.gp-pair { display: grid; grid-template-columns: 1fr; gap: 0 1rem; }\n.gp-pair > .gp-section { min-width: 0; }\n.gp-cat { font-size: 0.8rem; color: var(--gp-muted); margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.04em; }\n.gp-cat-icon { margin-right: 0.35rem; text-transform: none; }\n.gp-aud { font-size: 0.85rem; color: var(--gp-heading); margin: 0 0 0.1rem; }\n@media (min-width: 720px) {\n  .gp-pair { grid-template-columns: 1fr 1fr; }\n}\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n.gp-offer { padding: 0.6rem 0.9rem; text-align: center; margin-bottom: 1rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: var(--gp-panel-pad, 0) 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap gp-wide\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1>{{PAGE_TITLE}}</h1>\n  </header>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** A post's audiences in the fixed order (Brothers, Sisters, Youth, Children). */\n  function audiencesOf(p) {\n    var have = p.audiences || [];\n    return AUDIENCES.filter(function (a) {\n      return have.indexOf(a) >= 0;\n    });\n  }\n\n  /** 'Brothers · Sisters' (the fixed order). */\n  function audienceLine(p) {\n    return audiencesOf(p).join(' · ');\n  }\n\n  /**\n   * {Everyone: [], Brothers: [], Sisters: [], Youth: [], Children: []}, each post in exactly one\n   * group: Everyone when it has more than one audience, else its one audience (decision 23).\n   * Full posts last in each group.\n   */\n  function groupByAudience(posts) {\n    var out = { Everyone: [] };\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      var aud = audiencesOf(p);\n      if (aud.length > 1) out.Everyone.push(p);\n      else if (aud.length === 1) out[aud[0]].push(p);\n    });\n    ['Everyone'].concat(AUDIENCES).forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    audienceLine: audienceLine,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'leader', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n  var STATUS_LABEL = { 'Waiting-email': 'Waiting for their email click', 'Waiting-approval': 'Waiting for approval' };\n  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var K = '';\n  var me = null;\n  var state = { tab: 'list', past: false, form: null, errors: {}, formError: '', flash: null, relink: '' };\n  var lastLinkCheck = 0;\n\n  // ---------- helpers ----------\n\n  /**\n   * Calls the script with this leader link. An answer saying the link no longer works (relink)\n   * keeps the page as it is, form and all, and shows the \"Email me a leader link\" box above it.\n   */\n  function call(action, data) {\n    data = data || {};\n    data.k = K;\n    return GP.call(action, data).then(function (res) {\n      if (res && res.relink) {\n        if (!me) {\n          showRequest(res.error);\n        } else if (!state.relink) {\n          state.relink = res.error || 'This leader link no longer works.';\n          render();\n          window.scrollTo(0, 0);\n        }\n        throw { handled: true };\n      }\n      return res;\n    });\n  }\n\n  /**\n   * Is the link still good? Asked when a form opens and when the page comes back into view (at\n   * most once a minute), so a stale link shows up before anyone types (decision 22).\n   */\n  function checkLink(force) {\n    if (!me || state.relink) return;\n    var now = new Date().getTime();\n    if (!force && now - lastLinkCheck < 60000) return;\n    lastLinkCheck = now;\n    call('whoami').then(function () {}, function () {});\n  }\n\n  function failed(err, box) {\n    if (err && err.handled) return;\n    GP.show(box || main, GP.unreachable('leader'));\n  }\n\n  function flash(kind, text) {\n    state.flash = { kind: kind, text: text };\n  }\n\n  function uniq(list) {\n    var out = [];\n    list.forEach(function (x) {\n      if (out.indexOf(x) < 0) out.push(x);\n    });\n    return out;\n  }\n\n  function blankRole() {\n    return { slotId: '', start: '', end: '', role: '', needed: 1, roleNote: '', bringingPrompt: '' };\n  }\n\n  function copyRole(r) {\n    return { slotId: '', start: r.start, end: r.end, role: r.role, needed: r.needed, roleNote: r.roleNote, bringingPrompt: r.bringingPrompt };\n  }\n\n  /**\n   * Organizations this form may use: with no category the leader's own; in a category, the ones\n   * its rule gives this leader (whoami catOrgs). An edit that keeps the category keeps the post's\n   * organization too.\n   */\n  function orgsFor(f) {\n    var list = f.category ? (me.access.catOrgs && me.access.catOrgs[f.category]) || [] : me.access.baseCreateOrgs;\n    if (f.postId && f.category === f.origCategory && f.origOrganization) list = list.concat([f.origOrganization]);\n    return uniq(list);\n  }\n\n  function categoryById(id) {\n    for (var i = 0; i < me.categories.length; i++) if (me.categories[i].id === id) return me.categories[i];\n    return null;\n  }\n\n  function newForm() {\n    // A coordinator with no organization of their own starts in their first category.\n    var cat = me.access.baseCreateOrgs.length ? '' : me.categories[0] ? me.categories[0].id : '';\n    var f = {\n      postId: '',\n      status: '',\n      organization: '',\n      category: cat,\n      title: '',\n      audiences: [],\n      publicNote: '',\n      privateDetails: '',\n      cutoffHours: '',\n      dates: [{ date: '', roles: [blankRole()] }],\n    };\n    f.organization = orgsFor(f)[0] || '';\n    var c = categoryById(cat);\n    if (c && c.audiences) f.audiences = c.audiences.slice();\n    return f;\n  }\n\n  /** Server post → form model (slots grouped by date). */\n  function toForm(post) {\n    var dates = [];\n    var at = {};\n    post.slots.forEach(function (s) {\n      if (!(s.date in at)) {\n        at[s.date] = dates.length;\n        dates.push({ date: s.date, roles: [] });\n      }\n      dates[at[s.date]].roles.push({\n        slotId: s.slotId,\n        start: s.start || '',\n        end: s.end || '',\n        role: s.role,\n        needed: s.needed,\n        roleNote: s.roleNote || '',\n        bringingPrompt: s.bringingPrompt || '',\n        filled: s.filled || 0,\n      });\n    });\n    return {\n      postId: post.postId,\n      status: post.status,\n      fromRequest: !!post.fromRequest,\n      origCategory: post.category || '',\n      origOrganization: post.organization,\n      organization: post.organization,\n      category: post.category || '',\n      title: post.title,\n      audiences: post.audiences.slice(),\n      publicNote: post.publicNote || '',\n      privateDetails: post.privateDetails || '',\n      cutoffHours: post.cutoffHours === '' || post.cutoffHours === null || post.cutoffHours === undefined ? '' : String(post.cutoffHours),\n      dates: dates.length ? dates : [{ date: '', roles: [blankRole()] }],\n    };\n  }\n\n  /** Form model → [slots], plus where each slot index sits ([dateIndex, roleIndex]). */\n  function flatten(form) {\n    var slots = [];\n    var where = [];\n    form.dates.forEach(function (d, di) {\n      d.roles.forEach(function (r, ri) {\n        slots.push({\n          slotId: r.slotId,\n          date: d.date,\n          start: r.start,\n          end: r.end,\n          role: r.role,\n          needed: r.needed,\n          roleNote: r.roleNote,\n          bringingPrompt: r.bringingPrompt,\n        });\n        where.push([di, ri]);\n      });\n    });\n    return { slots: slots, where: where };\n  }\n\n  function slotErrorKey(form, di, ri, field) {\n    var map = flatten(form).where;\n    for (var i = 0; i < map.length; i++) if (map[i][0] === di && map[i][1] === ri) return 'slots[' + i + '].' + field;\n    return '';\n  }\n\n  function err(key) {\n    var msg = state.errors[key];\n    return msg ? el('p', { class: 'gp-error', role: 'alert' }, msg) : null;\n  }\n\n  function field(label, input, key) {\n    return el('div', {}, [el('label', { for: input.id }, label), input, err(key)]);\n  }\n\n  var uid = 0;\n  function nextId(prefix) {\n    uid += 1;\n    return prefix + uid;\n  }\n\n  // ---------- request a link ----------\n\n  function showRequest(error) {\n    GP.show(main, requestParts(error));\n  }\n\n  /** The \"Email me a leader link\" box. */\n  function requestParts(error) {\n    var email = el('input', { type: 'email', id: 'gp-req-email', autocomplete: 'email', maxlength: '254' });\n    var out = el('div');\n    var button = el('button', { type: 'submit' }, 'Email me a leader link');\n    var form = el(\n      'form',\n      {\n        onsubmit: function (e) {\n          e.preventDefault();\n          button.disabled = true;\n          GP.call('requestLeaderLink', { email: email.value }).then(\n            function (res) {\n              button.disabled = false;\n              GP.show(out, GP.message(res && res.ok ? 'ok' : 'alert', res && res.ok ? res.message : GP.errorText(res)));\n            },\n            function () {\n              button.disabled = false;\n              GP.show(out, GP.unreachable('leader'));\n            }\n          );\n        },\n      },\n      [el('label', { for: 'gp-req-email' }, 'Your email, as it is on the ward leader list'), email, el('p', {}, [button])]\n    );\n    return [\n      error ? GP.message('alert', error) : null,\n      el('p', {}, 'Leaders open this page with a personal link sent by email. Type your email and we will send you one.'),\n      form,\n      out,\n    ];\n  }\n\n  /** Shown above the page when the link stopped working while it was open. */\n  function relinkBox(error) {\n    return el('div', { class: 'gp-card', id: 'gp-relink' }, requestParts(error).concat([\n      el('p', { class: 'gp-meta' }, 'Nothing below was saved. Copy anything you typed before you open the new link (it opens a fresh page).'),\n    ]));\n  }\n\n  // ---------- the signed-in page ----------\n\n  function tab(name, label, before) {\n    return el('button', {\n      type: 'button',\n      role: 'tab',\n      'aria-selected': String(state.tab === name),\n      onclick: function () {\n        if (before) before();\n        state.tab = name;\n        render();\n      },\n    }, label);\n  }\n\n  function render() {\n    var a = me.access;\n    var tabs = el('div', { class: 'gp-tabs', role: 'tablist' }, [\n      tab('list', 'My opportunities'),\n      a.canApprove ? tab('waiting', 'Waiting for approval') : null,\n      a.isCouncil ? tab('needs', 'Needs help soon') : null,\n      tab('form', state.form && state.form.postId ? 'Edit opportunity' : 'New opportunity', function () {\n        if (!state.form) state.form = newForm();\n        state.errors = {};\n        state.formError = '';\n        checkLink(true);\n      }),\n      a.isBishopric ? tab('volunteers', 'Volunteers') : null,\n    ]);\n    var signOut = el('button', {\n      type: 'button',\n      class: 'gp-light',\n      onclick: function () {\n        if (!window.confirm('Sign out everywhere? Your current link stops working and we email you a new one.')) return;\n        call('signOutEverywhere').then(function (res) {\n          GP.show(main, GP.message(res.ok ? 'ok' : 'alert', res.ok ? res.message : GP.errorText(res)));\n        }, failed);\n      },\n    }, 'Sign out everywhere');\n    var who = el('div', { class: 'gp-card' }, [\n      el('p', { style: 'margin:0' }, 'Signed in as ' + me.leader.name + (me.leader.organization ? ', ' + me.leader.organization : '')),\n      signOut,\n    ]);\n    var body = el('div');\n    var note = state.flash ? GP.message(state.flash.kind, state.flash.text) : null;\n    state.flash = null;\n    GP.show(main, [state.relink ? relinkBox(state.relink) : null, who, tabs, note, body]);\n    // With a dead link only the form (already on the page) is shown; the other tabs need the link.\n    if (state.relink && state.tab !== 'form') return;\n    if (state.tab === 'waiting') renderWaiting(body);\n    else if (state.tab === 'needs') renderNeeds(body);\n    else if (state.tab === 'volunteers') renderVolunteers(body);\n    else if (state.tab === 'form') renderForm(body);\n    else renderList(body);\n  }\n\n  /** Runs a leader action, then shows its answer above the current tab. */\n  function act(action, data, box, btn) {\n    if (btn) btn.disabled = true;\n    call(action, data).then(function (res) {\n      flash(res.ok ? 'ok' : 'alert', res.ok ? res.message : GP.errorText(res));\n      render();\n    }, function (e) {\n      if (btn) btn.disabled = false;\n      failed(e, box);\n    });\n  }\n\n  // ---------- Waiting for approval ----------\n\n  function renderWaiting(body) {\n    GP.show(body, el('p', { class: 'gp-loading' }, 'Loading…'));\n    call('waiting').then(function (res) {\n      if (!res.ok) return GP.show(body, GP.message('alert', GP.errorText(res)));\n      var parts = [\n        el('p', { class: 'gp-meta' }, 'People who confirmed their email and wait for a leader. Check the ward directory, then approve or decline. Approval counts for the whole ward; you and the time are recorded.'),\n      ];\n      if (!res.volunteers.length) parts.push(el('p', { class: 'gp-muted' }, 'Nobody is waiting for you.'));\n      res.volunteers.forEach(function (v) {\n        var out = el('div');\n        var approve = el('button', { type: 'button', onclick: function () { act('decide', { email: v.email, decision: 'approve' }, out, approve); } }, 'Approve');\n        var decline = el('button', {\n          type: 'button',\n          class: 'gp-danger',\n          onclick: function () {\n            if (!window.confirm('Decline ' + v.name + '? Their waiting sign-ups end, and they are asked to contact the ward. The bishopric can undo this.')) return;\n            act('decide', { email: v.email, decision: 'decline' }, out, decline);\n          },\n        }, 'Decline');\n        parts.push(el('div', { class: 'gp-card' }, [\n          el('h3', {}, v.name),\n          el('p', { class: 'gp-meta' }, v.email + ' · first signed up for ' + (v.firstPost || 'an opportunity') + (v.firstPostOrganization ? ' (' + v.firstPostOrganization + ')' : '')),\n          v.signups.length\n            ? el('div', {}, v.signups.map(function (s) {\n                return el('div', { class: 'gp-person' }, (s.childName ? s.childName + ': ' : '') + s.title + ' · ' + GP.fmtDate(s.date) + (s.start ? ', ' + GP.fmtTime(s.start) : '') + ' · ' + s.role);\n              }))\n            : el('p', { class: 'gp-muted' }, 'No sign-ups waiting right now.'),\n          el('p', {}, [approve, decline]),\n          out,\n        ]));\n      });\n      GP.show(body, parts);\n    }, function (e) { failed(e, body); });\n  }\n\n  // ---------- Needs help soon ----------\n\n  function renderNeeds(body) {\n    GP.show(body, el('p', { class: 'gp-loading' }, 'Loading…'));\n    call('needsHelp').then(function (res) {\n      if (!res.ok) return GP.show(body, GP.message('alert', GP.errorText(res)));\n      var parts = [el('p', { class: 'gp-meta' }, 'Open roles still short in the next 14 days, soonest first.')];\n      if (!res.rows.length) parts.push(el('p', { class: 'gp-muted' }, 'Nothing is short in the next 14 days.'));\n      res.rows.forEach(function (r) {\n        parts.push(el('div', { class: 'gp-slot' }, [\n          el('strong', {}, GP.fmtDate(r.date) + (r.start ? ', ' + GP.fmtTimes(r.start, r.end) : '') + ' · ' + r.role),\n          el('span', { class: 'gp-count' }, ' ' + r.filled + ' of ' + r.needed + ' filled'),\n          el('div', { class: 'gp-meta' }, [r.organization + ' · ', el('a', { href: r.publicUrl, target: '_blank', rel: 'noopener' }, r.title)]),\n        ]));\n      });\n      GP.show(body, parts);\n    }, function (e) { failed(e, body); });\n  }\n\n  // ---------- Volunteers (bishopric) ----------\n\n  function renderVolunteers(body) {\n    GP.show(body, el('p', { class: 'gp-loading' }, 'Loading…'));\n    call('volunteers').then(function (res) {\n      if (!res.ok) return GP.show(body, GP.message('alert', GP.errorText(res)));\n      var parts = [el('p', { class: 'gp-meta' }, 'Everyone who has signed up. Undo a decline to let someone sign up again; revoke an approval when someone should no longer serve (their current sign-ups stay until you remove them).')];\n      if (!res.volunteers.length) parts.push(el('p', { class: 'gp-muted' }, 'No volunteers yet.'));\n      res.volunteers.forEach(function (v) {\n        var out = el('div');\n        var bits = [\n          el('strong', {}, v.name),\n          el('span', { class: 'gp-meta' }, ' ' + v.email),\n          el('div', { class: 'gp-meta' }, v.status + (v.status === 'Pending' && !v.emailConfirmed ? ' (has not clicked the email yet)' : '') + (v.decidedBy ? ' · ' + v.decidedBy + ', ' + v.decidedAt : '') + (v.firstPost ? ' · first: ' + v.firstPost : '')),\n        ];\n        if (v.status === 'Declined' || v.status === 'Revoked') {\n          var undo = el('button', { type: 'button', class: 'gp-light', onclick: function () { act('bishopric', { email: v.email, decision: 'undo' }, out, undo); } }, 'Undo ' + (v.status === 'Declined' ? 'decline' : 'revoke'));\n          bits.push(undo);\n        }\n        if (v.status === 'Approved') {\n          var revoke = el('button', {\n            type: 'button',\n            class: 'gp-danger',\n            onclick: function () {\n              if (!window.confirm('Revoke ' + v.name + '? They can no longer sign up. Their current sign-ups stay until you remove them.')) return;\n              act('bishopric', { email: v.email, decision: 'revoke' }, out, revoke);\n            },\n          }, 'Revoke');\n          bits.push(revoke);\n        }\n        bits.push(out);\n        parts.push(el('div', { class: 'gp-person' }, bits));\n      });\n      GP.show(body, parts);\n    }, function (e) { failed(e, body); });\n  }\n\n  // ---------- My opportunities ----------\n\n  function renderList(body) {\n    GP.show(body, el('p', { class: 'gp-loading' }, 'Loading…'));\n    call('listPosts', { past: state.past }).then(function (res) {\n      if (!res.ok) return GP.show(body, GP.message('alert', GP.errorText(res)));\n      var parts = [];\n      if (!res.posts.length) {\n        parts.push(el('p', { class: 'gp-muted' }, state.past ? 'No past opportunities.' : 'No opportunities yet. Use New opportunity to make one.'));\n      }\n      res.posts.forEach(function (p) {\n        parts.push(postCard(p));\n      });\n      parts.push(\n        el('p', {}, [\n          el('button', { type: 'button', class: 'gp-light', onclick: function () { state.past = !state.past; render(); } }, state.past ? 'Show current opportunities' : 'Show past opportunities'),\n        ])\n      );\n      GP.show(body, parts);\n    }, function (e) { failed(e, body); });\n  }\n\n  /** The inline \"are you sure\" panel for cancelling a post (date blank) or one date. */\n  function cancelPanel(p, date, box) {\n    var note = el('textarea', { id: nextId('gp-cancel-note-'), maxlength: '300', placeholder: 'Optional note for the email (up to 300 characters)' });\n    var msg = el('div');\n    var question = date\n      ? 'Cancel ' + GP.fmtDate(date) + '? Everyone signed up for that date gets an email, and no reminders go out for it.'\n      : 'Cancel this opportunity? Everyone signed up gets an email, and no reminders go out.';\n    var yes = el('button', {\n      type: 'button',\n      class: 'gp-danger',\n      onclick: function () {\n        yes.disabled = true;\n        call(date ? 'cancelDate' : 'cancelPost', { postId: p.postId, date: date || '', note: note.value }).then(function (res) {\n          if (!res.ok) {\n            yes.disabled = false;\n            return GP.show(msg, GP.message('alert', GP.errorText(res)));\n          }\n          flash('ok', res.message);\n          render();\n        }, function (e) {\n          yes.disabled = false;\n          failed(e, msg);\n        });\n      },\n    }, date ? 'Yes, cancel this date' : 'Yes, cancel it');\n    var no = el('button', { type: 'button', class: 'gp-light', onclick: function () { GP.clear(box); } }, 'Keep it');\n    GP.show(box, el('div', { class: 'gp-alert' }, [\n      el('p', { style: 'margin-top:0' }, question),\n      el('label', { for: note.id }, 'Note (optional)'),\n      note,\n      el('p', {}, [yes, no]),\n      msg,\n    ]));\n  }\n\n  function postCard(p) {\n    var bySlot = {};\n    p.signups.forEach(function (s) {\n      (bySlot[s.slotId] = bySlot[s.slotId] || []).push(s);\n    });\n    var live = p.status !== 'Past' && p.status !== 'Cancelled';\n    var out = el('div');\n    var items = [\n      el('h3', {}, p.title),\n      el('p', { class: 'gp-meta' }, [\n        p.status + ' · ' + p.organization + (p.audiences.length ? ' · ' + p.audiences.join(', ') : ''),\n        p.fromRequest ? ' ' : null,\n        p.fromRequest ? el('span', { class: 'gp-tag' }, 'From a request') : null,\n      ]),\n    ];\n    if (p.status === 'Open') {\n      var copyBtn = el('button', { type: 'button', class: 'gp-light', onclick: function () { GP.copyText(p.publicUrl, copyBtn); } }, 'Copy');\n      items.push(el('p', { class: 'gp-meta' }, ['Public link: ', el('a', { href: p.publicUrl, target: '_blank', rel: 'noopener' }, p.publicUrl), ' ', copyBtn]));\n    }\n    if (p.status === 'Closed' || p.status === 'Draft') {\n      items.push(el('p', { class: 'gp-meta' }, 'No one new can sign up. People already signed up keep their place and still get their reminder.'));\n    }\n    var dates = {};\n    p.slots.forEach(function (s) {\n      dates[s.date] = true;\n    });\n    var multiDate = Object.keys(dates).length > 1;\n    var bookedDates = {};\n    p.signups.forEach(function (su) {\n      p.slots.forEach(function (x) {\n        if (x.slotId === su.slotId) bookedDates[x.date] = true;\n      });\n    });\n    // The last role of each date: its last row carries that date's \"Cancel this date\".\n    var lastSlotOfDate = {};\n    p.slots.forEach(function (s) {\n      lastSlotOfDate[s.date] = s.slotId;\n    });\n    p.slots.forEach(function (s) {\n      // One \"Cancel this date\" per date with people signed up, when the post has other dates;\n      // it goes at the end of the date's last row, after that row's own buttons.\n      var cancelDate = null;\n      var dateBox = null;\n      if (p.canEdit && live && multiDate && bookedDates[s.date] && lastSlotOfDate[s.date] === s.slotId) {\n        dateBox = el('div');\n        var box = dateBox;\n        cancelDate = el('button', { type: 'button', class: 'gp-danger', onclick: function () { cancelPanel(p, s.date, box); } }, 'Cancel this date');\n      }\n      var list = bySlot[s.slotId] || [];\n      var people = list.map(function (su, i) {\n        return personRow(p, s, su, out, i === list.length - 1 ? cancelDate : null);\n      });\n      if (!people.length) {\n        people = [el('div', { class: 'gp-person' }, [el('span', { class: 'gp-muted' }, 'No one yet.'), cancelDate ? el('span', { class: 'gp-actions' }, [cancelDate]) : null])];\n      }\n      items.push(\n        el('div', { class: 'gp-slot' }, [\n          el('strong', {}, GP.fmtDate(s.date) + (s.start ? ', ' + GP.fmtTimes(s.start, s.end) : '') + ' · ' + s.role),\n          el('span', { class: 'gp-count' }, ' ' + s.filled + ' of ' + s.needed + (s.waiting ? ' · ' + s.waiting + ' waiting' : '') + (s.filled >= s.needed ? ' · Filled ✓' : '')),\n        ].concat(people).concat(dateBox ? [dateBox] : []))\n      );\n    });\n    if (p.canEdit && live) {\n      var cancelBox = el('div');\n      var actions = [\n        el('button', { type: 'button', onclick: function () { openForEdit(p.postId, false, out); } }, 'Edit'),\n        el('button', { type: 'button', class: 'gp-light', onclick: function () { openForEdit(p.postId, true, out); } }, 'Copy this post'),\n      ];\n      if (p.status === 'Open' || p.status === 'Draft') {\n        actions.push(\n          el('button', {\n            type: 'button',\n            class: 'gp-light',\n            onclick: function () {\n              var q = 'Close \"' + p.title + '\"? No one new can sign up. People already signed up keep their place and still get their reminder. (If it is not happening at all, use Cancel this opportunity.)';\n              if (!window.confirm(q)) return;\n              call('savePost', { mode: 'close', post: { postId: p.postId } }).then(function (res) {\n                flash(res.ok ? 'ok' : 'alert', res.ok ? 'Closed.' : GP.errorText(res));\n                render();\n              }, function (e) { failed(e, out); });\n            },\n          }, 'Close')\n        );\n      }\n      actions.push(el('button', { type: 'button', class: 'gp-danger', onclick: function () { cancelPanel(p, '', cancelBox); } }, 'Cancel this opportunity'));\n      items.push(el('p', {}, actions));\n      items.push(cancelBox);\n    } else if (p.canEdit && p.status === 'Past') {\n      items.push(el('p', {}, [el('button', { type: 'button', class: 'gp-light', onclick: function () { openForEdit(p.postId, true, out); } }, 'Copy this post')]));\n    }\n    items.push(out);\n    return el('div', { class: 'gp-card' }, items);\n  }\n\n  /**\n   * One line per person: name, tags, what they bring, email (to editors only), then the buttons\n   * together in this order: Approve, Decline, Remove, and on the date's last row Cancel this date.\n   */\n  function personRow(p, s, su, out, cancelDate) {\n    var bits = [el('span', {}, su.label || su.name)];\n    var buttons = [];\n    if (STATUS_LABEL[su.status]) bits.push(el('span', { class: 'gp-tag' }, STATUS_LABEL[su.status]));\n    if (su.overLimit) bits.push(el('span', { class: 'gp-tag' }, 'Over the number'));\n    if (su.bringing) bits.push(el('span', { class: 'gp-meta' }, 'Bringing: ' + su.bringing));\n    if (su.email) bits.push(el('span', { class: 'gp-meta' }, su.email));\n    // Approve / Decline right here when this leader may decide for this person (decision 22); the\n    // Waiting for approval tab does the same.\n    if (su.canDecide) {\n      var approve = el('button', {\n        type: 'button',\n        onclick: function () {\n          act('decide', { signupId: su.signupId, decision: 'approve' }, out, approve);\n        },\n      }, 'Approve');\n      var decline = el('button', {\n        type: 'button',\n        class: 'gp-danger',\n        onclick: function () {\n          if (!window.confirm('Decline ' + su.name + '? Their waiting sign-ups end, and they are asked to contact the ward. The bishopric can undo this.')) return;\n          act('decide', { signupId: su.signupId, decision: 'decline' }, out, decline);\n        },\n      }, 'Decline');\n      buttons.push(approve, decline);\n    }\n    if (p.canEdit && p.status !== 'Past' && p.status !== 'Cancelled') {\n      buttons.push(\n        el('button', {\n          type: 'button',\n          class: 'gp-danger',\n          onclick: function () {\n            if (!window.confirm('Remove ' + su.name + ' from ' + s.role + ' on ' + GP.fmtDate(s.date) + '? We will email them.')) return;\n            call('removeSignup', { signupId: su.signupId }).then(function (res) {\n              flash(res.ok ? 'ok' : 'alert', res.ok ? res.message : GP.errorText(res));\n              render();\n            }, function (e) { failed(e, out); });\n          },\n        }, 'Remove')\n      );\n    }\n    if (cancelDate) buttons.push(cancelDate);\n    if (buttons.length) bits.push(el('span', { class: 'gp-actions' }, buttons));\n    return el('div', { class: 'gp-person' }, bits);\n  }\n\n  function openForEdit(postId, asCopy, out) {\n    call('getPost', { postId: postId }).then(function (res) {\n      if (!res.ok) return GP.show(out, GP.message('alert', GP.errorText(res)));\n      var f = toForm(res.post);\n      if (asCopy) {\n        f.postId = '';\n        f.status = '';\n        f.title = ('Copy of ' + f.title).slice(0, 100);\n        f.dates.forEach(function (d) {\n          d.roles = d.roles.map(copyRole);\n        });\n        // A copy keeps its category when this leader may create in it; otherwise one must be picked.\n        if (!categoryById(f.category)) f.category = '';\n        if (orgsFor(f).indexOf(f.organization) < 0) f.organization = orgsFor(f)[0] || '';\n      }\n      state.form = f;\n      state.errors = {};\n      state.formError = '';\n      state.tab = 'form';\n      render();\n      checkLink(true);\n    }, function (e) { failed(e, out); });\n  }\n\n  // ---------- New / edit opportunity ----------\n\n  function bindText(input, obj, key) {\n    input.addEventListener('input', function () {\n      obj[key] = input.value;\n    });\n    return input;\n  }\n\n  function renderForm(body) {\n    var f = state.form || (state.form = newForm());\n    var orgs = orgsFor(f);\n    if (!orgs.length) {\n      return GP.show(body, GP.message('alert', \"Your leader role can't create opportunities yet. Ask the bishopric to tick Org editor for you on the Leaders tab, or to add your email to a category's Coordinators.\"));\n    }\n    if (orgs.indexOf(f.organization) < 0) f.organization = orgs[0];\n\n    var org = el('select', { id: 'gp-org', onchange: function () { f.organization = org.value; } }, orgs.map(function (o) {\n      return el('option', { value: o, selected: o === f.organization ? 'selected' : null }, o);\n    }));\n    org.value = f.organization;\n    // A new post (and a copy) needs a category; an old post saved without one may stay that way.\n    var blankLabel = f.postId ? '(none)' : 'Pick a category';\n    var catChoices = (f.category ? [] : [el('option', { value: '' }, blankLabel)]).concat(\n      me.categories.map(function (c) {\n        return el('option', { value: c.id }, (c.icon ? c.icon + ' ' : '') + c.name);\n      })\n    );\n    if (f.category && !categoryById(f.category)) catChoices.push(el('option', { value: f.category }, f.category));\n    var cat = el('select', {\n      id: 'gp-cat',\n      onchange: function () {\n        f.category = cat.value;\n        var c = categoryById(f.category);\n        if (c && c.audiences && c.audiences.length && !f.audiences.length) f.audiences = c.audiences.slice();\n        render();\n      },\n    }, catChoices);\n    cat.value = f.category;\n    var childNote = el('p', { class: 'gp-meta' + (f.audiences.indexOf('Youth') >= 0 || f.audiences.indexOf('Children') >= 0 ? '' : ' gp-hidden') },\n      'Who is serving: the sign-up form asks \"Me / My child\" and takes a child\\'s first name. Every email goes to the parent; you see \"Ana (signed up by …)\".');\n    var title = bindText(el('input', { type: 'text', id: 'gp-title-in', maxlength: '100', value: f.title }), f, 'title');\n    var audiences = el('div', { role: 'group', 'aria-label': 'Who is it for' }, GP.AUDIENCES.map(function (a) {\n      var box = el('input', {\n        type: 'checkbox',\n        checked: f.audiences.indexOf(a) >= 0,\n        onchange: function () {\n          f.audiences = GP.AUDIENCES.filter(function (x) {\n            return x === a ? box.checked : f.audiences.indexOf(x) >= 0;\n          });\n          var young = f.audiences.indexOf('Youth') >= 0 || f.audiences.indexOf('Children') >= 0;\n          childNote.className = 'gp-meta' + (young ? '' : ' gp-hidden');\n        },\n      });\n      return el('label', { class: 'gp-check' }, [box, a]);\n    }));\n    var note = bindText(el('textarea', { id: 'gp-note', maxlength: '2000' }), f, 'publicNote');\n    note.value = f.publicNote;\n    var priv = bindText(el('textarea', { id: 'gp-priv', maxlength: '1000' }), f, 'privateDetails');\n    priv.value = f.privateDetails;\n    var cutoff = bindText(el('input', { type: 'number', id: 'gp-cutoff', min: '0', max: '168', step: '1', value: f.cutoffHours, placeholder: String(me.defaults.cutoffHours) }), f, 'cutoffHours');\n\n    var parts = [\n      el('h2', {}, f.postId ? 'Edit opportunity' : 'New opportunity'),\n      f.fromRequest\n        ? el('p', { class: 'gp-alert', role: 'note' }, [\n            el('span', { class: 'gp-tag' }, 'From a request'),\n            \" Check the date and write the public note. Never put the family's name, address or situation in the public note.\",\n          ])\n        : null,\n      state.formError ? GP.message('alert', state.formError) : null,\n      field('Category', cat, 'category'),\n      field('Organization', org, 'organization'),\n      field('Title (everyone sees this)', title, 'title'),\n      el('div', {}, [el('label', {}, 'Who is it for?'), audiences, err('audiences'), childNote]),\n      field('Public note (everyone sees this)', note, 'publicNote'),\n      field('Private details: an address, a gate code (sent only to approved volunteers who are signed up: in their confirmation email, their reminder and My sign-ups, until the date is over)', priv, 'privateDetails'),\n      field('Cancel cutoff in hours (after this, a cancellation tells you that you are short)', cutoff, 'cutoffHours'),\n      el('h2', {}, 'Dates and roles'),\n      err('slots'),\n    ];\n    f.dates.forEach(function (d, di) {\n      parts.push(dateBlock(f, d, di));\n    });\n    parts.push(\n      el('p', {}, [\n        el('button', { type: 'button', class: 'gp-light', onclick: function () {\n          var last = f.dates[f.dates.length - 1];\n          f.dates.push({ date: '', roles: last ? last.roles.map(copyRole) : [blankRole()] });\n          render();\n        } }, 'Add date'),\n      ])\n    );\n    parts.push(addDatesPanel(f));\n    var actions = [];\n    if (f.status === 'Open') {\n      actions.push(el('button', { type: 'button', onclick: function () { save('publish'); } }, 'Save changes'));\n      actions.push(el('button', { type: 'button', class: 'gp-light', onclick: function () { save('draft'); } }, 'Save as draft (hide it)'));\n      parts.push(el('p', { class: 'gp-meta' }, 'Save as draft hides it from the public page. People already signed up keep their place and still get their reminder.'));\n    } else if (f.status === 'Closed') {\n      actions.push(el('button', { type: 'button', onclick: function () { save('publish'); } }, 'Reopen and save'));\n      actions.push(el('button', { type: 'button', class: 'gp-light', onclick: function () { save('draft'); } }, 'Save as draft'));\n    } else {\n      actions.push(el('button', { type: 'button', class: 'gp-light', onclick: function () { save('draft'); } }, 'Save as draft'));\n      actions.push(el('button', { type: 'button', onclick: function () { save('publish'); } }, 'Publish'));\n    }\n    actions.push(el('button', { type: 'button', class: 'gp-light', onclick: function () {\n      if (!window.confirm('Leave this form? Changes you have not saved are lost.')) return;\n      state.form = null;\n      state.errors = {};\n      state.formError = '';\n      state.tab = 'list';\n      render();\n    } }, 'Cancel'));\n    parts.push(el('p', {}, actions));\n    GP.show(body, parts);\n  }\n\n  function dateBlock(f, d, di) {\n    var date = el('input', { type: 'date', id: nextId('gp-date-'), value: d.date });\n    date.addEventListener('input', function () {\n      d.date = date.value;\n    });\n    var roles = d.roles.map(function (r, ri) {\n      return roleBlock(f, d, di, r, ri);\n    });\n    return el('div', { class: 'gp-date' }, [\n      el('div', {}, [el('label', { for: date.id }, 'Date'), date, err(slotErrorKey(f, di, 0, 'date'))]),\n    ].concat(roles).concat([\n      el('p', {}, [\n        el('button', { type: 'button', class: 'gp-light', onclick: function () { d.roles.push(blankRole()); render(); } }, 'Add role'),\n        el('button', { type: 'button', class: 'gp-light', onclick: function () {\n          f.dates.splice(di + 1, 0, { date: '', roles: d.roles.map(copyRole) });\n          render();\n        } }, 'Copy this date'),\n        f.dates.length > 1\n          ? el('button', { type: 'button', class: 'gp-danger', onclick: function () { f.dates.splice(di, 1); render(); } }, 'Remove date')\n          : null,\n      ]),\n    ]));\n  }\n\n  function roleBlock(f, d, di, r, ri) {\n    function input(type, key, attrs) {\n      var a = { type: type, id: nextId('gp-r-'), value: r[key] === undefined ? '' : String(r[key]) };\n      Object.keys(attrs || {}).forEach(function (k) {\n        a[k] = attrs[k];\n      });\n      return bindText(el('input', a), r, key);\n    }\n    var role = input('text', 'role', { maxlength: '60', placeholder: 'e.g. Bring a meal' });\n    var needed = input('number', 'needed', { min: '1', max: '200', step: '1' });\n    var start = input('time', 'start');\n    var end = input('time', 'end');\n    var roleNote = input('text', 'roleNote', { maxlength: '300' });\n    var prompt = input('text', 'bringingPrompt', { maxlength: '100', placeholder: 'e.g. What are you bringing?' });\n    var key = function (fieldName) {\n      return slotErrorKey(f, di, ri, fieldName);\n    };\n    return el('div', { class: 'gp-role' }, [\n      el('div', { class: 'gp-row' }, [field('Role', role, key('role')), field('How many people', needed, key('needed'))]),\n      el('div', { class: 'gp-row' }, [field('Start (optional)', start, key('start')), field('End (optional)', end, key('end'))]),\n      field('Note for this role (optional)', roleNote, key('roleNote')),\n      field('Ask volunteers (optional)', prompt, key('bringingPrompt')),\n      r.filled ? el('p', { class: 'gp-meta' }, r.filled + ' signed up') : null,\n      d.roles.length > 1\n        ? el('button', { type: 'button', class: 'gp-danger', onclick: function () { d.roles.splice(ri, 1); render(); } }, 'Remove role')\n        : null,\n    ]);\n  }\n\n  function addDatesPanel(f) {\n    var start = el('input', { type: 'date', id: 'gp-many-start' });\n    var end = el('input', { type: 'date', id: 'gp-many-end' });\n    var boxes = WEEKDAYS.map(function (w, i) {\n      return el('input', { type: 'checkbox', value: String(i) });\n    });\n    var msg = el('div');\n    return el('details', { class: 'gp-card' }, [\n      el('summary', {}, 'Add dates (for meal trains and other repeating needs)'),\n      el('div', { class: 'gp-row' }, [field('From', start, ''), field('To', end, '')]),\n      el('p', { class: 'gp-meta' }, 'On these days (none ticked means every day):'),\n      el('div', { class: 'gp-row' }, boxes.map(function (b, i) {\n        return el('label', { class: 'gp-check' }, [b, WEEKDAYS[i]]);\n      })),\n      el('p', {}, [\n        el('button', { type: 'button', class: 'gp-light', onclick: function () {\n          var days = boxes.filter(function (b) { return b.checked; }).map(function (b) { return Number(b.value); });\n          var list = GP.expandDates(start.value, end.value, days);\n          if (!list.length) return GP.show(msg, GP.message('alert', 'Pick a start and an end date (the end on or after the start).'));\n          var template = f.dates[f.dates.length - 1];\n          var roles = template ? template.roles : [blankRole()];\n          // Fill the first empty date block before adding new ones.\n          if (f.dates.length === 1 && !f.dates[0].date) f.dates = [];\n          list.forEach(function (day) {\n            f.dates.push({ date: day, roles: roles.map(copyRole) });\n          });\n          render();\n        } }, 'Add these dates'),\n      ]),\n      msg,\n    ]);\n  }\n\n  function save(action) {\n    var f = state.form;\n    var post = {\n      postId: f.postId,\n      organization: f.organization,\n      category: f.category,\n      title: f.title,\n      audiences: f.audiences,\n      publicNote: f.publicNote,\n      privateDetails: f.privateDetails,\n      cutoffHours: f.cutoffHours,\n      slots: flatten(f).slots,\n    };\n    call('savePost', { mode: action, post: post }).then(function (res) {\n      if (!res.ok) {\n        state.errors = res.fields || {};\n        state.formError = GP.errorText(res);\n        render();\n        window.scrollTo(0, 0);\n        return;\n      }\n      state.form = null;\n      state.errors = {};\n      state.formError = '';\n      state.tab = 'list';\n      flash('ok', action === 'publish' ? 'Published. Share this link: ' + res.publicUrl : 'Saved as a draft. Nobody else sees it until you publish it.');\n      render();\n      window.scrollTo(0, 0);\n    }, function (e) {\n      if (e && e.handled) return;\n      state.formError = \"Can't reach the portal right now. What you typed is still here; try Save again in a minute.\";\n      render();\n      window.scrollTo(0, 0);\n    });\n  }\n\n  // ---------- start ----------\n\n  GP.hash().then(function (h) {\n    K = h.k || '';\n    if (!K) return showRequest('');\n    call('whoami').then(function (res) {\n      if (!res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n      me = res;\n      lastLinkCheck = new Date().getTime();\n      render();\n    }, failed);\n  });\n\n  // Coming back to the page (another tab, another app): check the link again, at most once a minute.\n  if (typeof document.addEventListener === 'function') {\n    document.addEventListener('visibilitychange', function () {\n      if (document.visibilityState === 'visible') checkLink(false);\n    });\n  }\n  if (typeof window.addEventListener === 'function') {\n    window.addEventListener('focus', function () {\n      checkLink(false);\n    });\n  }\n})();\n</script>\n</body>\n</html>\n",
 "me": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #5b6776;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n  /* The ward's look (Settings theme_*): --gp-bg, --gp-panel, --gp-panel-radius, --gp-panel-pad,\n     --gp-panel-top, --gp-button and --gp-heading-font are set only by a theme; their fallbacks are the standard look. */\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background-color: var(--gp-page);\n  background-image: var(--gp-bg, none);\n  background-position: center;\n  background-size: cover;\n  background-repeat: no-repeat;\n  background-attachment: fixed;\n  line-height: 1.5;\n  min-height: 100vh;\n}\n/* Phones: iOS ignores fixed backgrounds, so the picture scrolls with the page. */\n@media (max-width: 760px) {\n  body { background-attachment: scroll; }\n}\n\n/* With a background picture, text sits on a light panel so it stays readable. */\n.gp-wrap, .gp-footer {\n  background: var(--gp-panel, transparent);\n  border-radius: var(--gp-panel-radius, 0);\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: var(--gp-panel-top, 0) auto 0;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1, h2, h3 { font-family: var(--gp-heading-font, var(--gp-font)); }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-button, var(--gp-heading));\n  background: var(--gp-button, var(--gp-heading));\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-button, var(--gp-heading)); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n/* A person's buttons stay together and wrap as one group; on a narrow phone they wrap among\n   themselves rather than overflow. */\n.gp-actions { display: inline-flex; flex-wrap: wrap; gap: 0.35rem; max-width: 100%; }\n.gp-actions button { margin: 0; padding: 0.35rem 0.75rem; font-size: 0.88rem; white-space: nowrap; }\n/* Serve page: Brothers and Sisters side by side on wide screens, stacked on phones. */\n.gp-pair { display: grid; grid-template-columns: 1fr; gap: 0 1rem; }\n.gp-pair > .gp-section { min-width: 0; }\n.gp-cat { font-size: 0.8rem; color: var(--gp-muted); margin: 0 0 0.2rem; text-transform: uppercase; letter-spacing: 0.04em; }\n.gp-cat-icon { margin-right: 0.35rem; text-transform: none; }\n.gp-aud { font-size: 0.85rem; color: var(--gp-heading); margin: 0 0 0.1rem; }\n@media (min-width: 720px) {\n  .gp-pair { grid-template-columns: 1fr 1fr; }\n}\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n.gp-offer { padding: 0.6rem 0.9rem; text-align: center; margin-bottom: 1rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: var(--gp-panel-pad, 0) 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1>{{PAGE_TITLE}}</h1>\n  </header>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** A post's audiences in the fixed order (Brothers, Sisters, Youth, Children). */\n  function audiencesOf(p) {\n    var have = p.audiences || [];\n    return AUDIENCES.filter(function (a) {\n      return have.indexOf(a) >= 0;\n    });\n  }\n\n  /** 'Brothers · Sisters' (the fixed order). */\n  function audienceLine(p) {\n    return audiencesOf(p).join(' · ');\n  }\n\n  /**\n   * {Everyone: [], Brothers: [], Sisters: [], Youth: [], Children: []}, each post in exactly one\n   * group: Everyone when it has more than one audience, else its one audience (decision 23).\n   * Full posts last in each group.\n   */\n  function groupByAudience(posts) {\n    var out = { Everyone: [] };\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      var aud = audiencesOf(p);\n      if (aud.length > 1) out.Everyone.push(p);\n      else if (aud.length === 1) out[aud[0]].push(p);\n    });\n    ['Everyone'].concat(AUDIENCES).forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    audienceLine: audienceLine,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'me', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n  var STATUS = { 'Waiting-email': 'Waiting: please click the link in your confirm email', 'Waiting-approval': 'Waiting for a leader to approve' };\n  var T = '';\n\n  /** No link (or an old one): ask for a new one by email. */\n  function showRequest(error) {\n    var email = el('input', { type: 'email', id: 'gp-me-email', autocomplete: 'email', maxlength: '254' });\n    var out = el('div');\n    var button = el('button', { type: 'submit' }, 'Email me my link');\n    var form = el(\n      'form',\n      {\n        onsubmit: function (e) {\n          e.preventDefault();\n          button.disabled = true;\n          GP.call('requestMeLink', { email: email.value }).then(\n            function (res) {\n              button.disabled = false;\n              GP.show(out, GP.message(res && res.ok ? 'ok' : 'alert', res && res.ok ? res.message : GP.errorText(res)));\n            },\n            function () {\n              button.disabled = false;\n              GP.show(out, GP.unreachable('me'));\n            }\n          );\n        },\n      },\n      [el('label', { for: 'gp-me-email' }, 'The email you signed up with'), email, el('p', {}, [button])]\n    );\n    GP.show(main, [\n      error ? GP.message('alert', error) : null,\n      el('p', {}, 'Your sign-ups open from a personal link in your confirmation email. Type your email and we will send you a new one.'),\n      form,\n      out,\n    ]);\n  }\n\n  function when(s) {\n    return GP.fmtDate(s.date) + (s.start ? ', ' + GP.fmtTimes(s.start, s.end) : '');\n  }\n\n  function card(s, upcoming) {\n    var out = el('div');\n    var bits = [\n      el('h3', {}, [el('a', { href: s.publicUrl }, s.title)]),\n      el('p', { class: 'gp-meta' }, when(s) + ' · ' + s.role + (s.childName ? ' · for ' + s.childName : '')),\n    ];\n    if (STATUS[s.status]) bits.push(el('p', {}, [el('span', { class: 'gp-tag' }, STATUS[s.status])]));\n    if (s.bringing) bits.push(el('p', { class: 'gp-meta' }, 'Bringing: ' + s.bringing));\n    if (s.privateDetails) bits.push(el('div', { class: 'gp-note' }, [el('strong', {}, 'Details (please keep them private): '), s.privateDetails]));\n    if (s.others && s.others.length) bits.push(el('p', { class: 'gp-meta' }, 'Also serving: ' + s.others.join(', ')));\n    if (upcoming && s.canResend) {\n      var resend = el('button', {\n        type: 'button',\n        class: 'gp-light',\n        onclick: function () {\n          resend.disabled = true;\n          GP.call('resendConfirm', { t: T, signupId: s.signupId }).then(\n            function (r) {\n              resend.disabled = false;\n              GP.show(out, GP.message(r && r.ok ? 'ok' : 'alert', r && r.ok ? r.message : GP.errorText(r)));\n            },\n            function () {\n              resend.disabled = false;\n              GP.show(out, GP.unreachable('me'));\n            }\n          );\n        },\n      }, 'Send the confirm email again');\n      bits.push(el('p', {}, [resend]));\n    }\n    if (upcoming && s.signupId) {\n      var button = el('button', {\n        type: 'button',\n        class: 'gp-danger',\n        onclick: function () {\n          if (!window.confirm('Cancel ' + s.role + ' on ' + GP.fmtDate(s.date) + '?')) return;\n          button.disabled = true;\n          GP.call('cancelMine', { t: T, signupId: s.signupId }).then(\n            function (r) {\n              if (r && r.ok) return load(r.message);\n              button.disabled = false;\n              GP.show(out, GP.message('alert', GP.errorText(r)));\n            },\n            function () {\n              button.disabled = false;\n              GP.show(out, GP.unreachable('me'));\n            }\n          );\n        },\n      }, 'Cancel');\n      bits.push(el('p', {}, [button]));\n    }\n    bits.push(out);\n    return el('div', { class: 'gp-card' }, bits);\n  }\n\n  function render(res, note) {\n    var parts = [];\n    if (note) parts.push(GP.message('ok', note));\n    parts.push(el('h2', {}, 'Coming up'));\n    if (!res.upcoming.length) parts.push(el('p', { class: 'gp-muted' }, 'Nothing coming up.'));\n    res.upcoming.forEach(function (s) {\n      parts.push(card(s, true));\n    });\n    if (res.otherWays.length) {\n      parts.push(el('h2', {}, 'Other ways to serve'));\n      res.otherWays.forEach(function (o) {\n        parts.push(el('a', { class: 'gp-card', href: o.url }, [\n          el('h3', {}, o.title),\n          GP.fillBar(o.filled, o.needed),\n          el('p', { class: 'gp-count' }, o.filled + ' of ' + o.needed + ' filled'),\n        ]));\n      });\n    }\n    if (res.past.length) {\n      parts.push(el('h2', {}, 'Past'));\n      res.past.forEach(function (s) {\n        parts.push(card(s, false));\n      });\n    }\n    GP.show(main, parts);\n  }\n\n  function load(note) {\n    GP.call('me', { t: T }).then(\n      function (res) {\n        if (!res || !res.ok) return showRequest(GP.errorText(res));\n        render(res, note);\n      },\n      function () {\n        GP.show(main, GP.unreachable('me'));\n      }\n    );\n  }\n\n  GP.hash().then(function (h) {\n    T = h.t || '';\n    if (!T) return showRequest('');\n    load('');\n  });\n})();\n</script>\n</body>\n</html>\n"
};

var GP_HUB_SECTIONS = "<!--\n  Service Portal: the two hub sections.\n  Where to paste: open the hub's index.html and paste everything from \"BEGIN\" to \"END\" near the\n  top of the page's links, before the ward's own sections (for example before \"Ward Links\").\n  The pages it links (serve.html, help.html) sit next to index.html in the hub.\n  QR codes: make one for each short link the same way the hub's other QR codes are made\n  (zippa.run shows a QR code for every short link), download them, name them serve-qr.png and\n  help-qr.png, and put them next to index.html.\n-->\n<!-- BEGIN Service Portal sections -->\n<style>\n  .gp-hub-section { max-width: 480px; margin: 0 auto 1.25rem; font-family: Georgia, serif; color: #2c3a4a; }\n  .gp-hub-section h2 { font-size: 1rem; font-weight: 700; color: #1d3557; margin: 0 0 0.6rem; padding-bottom: 0.3rem; border-bottom: 2px solid #c9b882; text-align: center; }\n  .gp-hub-card { display: flex; align-items: center; gap: 0.75rem; background: #ffffff; border: 1px solid #dde3ed; border-radius: 14px; box-shadow: 0 2px 10px rgba(29,53,87,0.07); padding: 0.75rem 1rem; text-decoration: none; color: #1d3557; min-height: 44px; }\n  .gp-hub-card:hover { background: #f4f7fc; }\n  .gp-hub-card img { width: 72px; height: 72px; flex: none; border-radius: 6px; }\n  .gp-hub-card strong { display: block; font-size: 0.98rem; }\n  .gp-hub-card span { display: block; font-size: 0.8rem; color: #6b7a8d; }\n</style>\n<section class=\"gp-hub-section\" aria-labelledby=\"gp-hub-serve\">\n  <h2 id=\"gp-hub-serve\">Service Opportunities</h2>\n  <a class=\"gp-hub-card\" href=\"serve.html\">\n    <img src=\"serve-qr.png\" alt=\"QR code for Service Opportunities\">\n    <span><strong>Ways to serve in {{WARD_NAME}}</strong><span>{{SERVE_SHORT_LINK}}</span></span>\n  </a>\n</section>\n<section class=\"gp-hub-section\" aria-labelledby=\"gp-hub-help\">\n  <h2 id=\"gp-hub-help\">Service Requests</h2>\n  <a class=\"gp-hub-card\" href=\"help.html\">\n    <img src=\"help-qr.png\" alt=\"QR code for Service Requests\">\n    <span><strong>Request help or service</strong><span>{{HELP_SHORT_LINK}}</span></span>\n  </a>\n</section>\n<!-- END Service Portal sections -->\n";

/** Fingerprint of this build (google-portal/build.mjs). */
var GP_BUILD = "1f9b5019e6c4";
