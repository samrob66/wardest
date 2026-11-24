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

var GP_VERSION = 'phase-2';

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
  noChildren: 'Children and youth can be signed up only for opportunities for youth or children.',
  linkExpired: 'This link has expired.',
  alreadyConfirmed: 'Your address is already confirmed.',
  addressConfirmed: 'Thank you. Your address is confirmed. A ward leader will look at your sign-up soon, and we will email you when it counts.',
  confirmedPassed: 'Your address is confirmed. The date you signed up for has passed, so that sign-up has ended.',
  withdrawn: 'Your offer is withdrawn. Thank you for being willing to help.',
  notActive: 'This sign-up is no longer active.',
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
};

/** Exact headers, in order. Phase 2 columns exist now and stay blank. */
var SERVICE_HEADERS = {
  'Read me': [],
  Settings: ['Key', 'Value', 'Help'],
  Leaders: ['Name', 'Email', 'Calling', 'Organization', 'Bishopric', 'Ward council', 'Org editor', 'Coordinator', 'Send leader link', 'Link sent'],
  Categories: ['Id', 'Name', 'Icon', 'Kind', 'Owning organizations', 'Default audiences', 'Coordinators', 'Any ward council may create', 'Confidential', 'Warn hours', 'Also warn', 'Discord', 'Archived'],
  Posts: ['Post id', 'Public id', 'Organization', 'Category', 'Title', 'Audiences', 'Public note', 'Private details', 'Cancel cutoff hours', 'Status', 'Created by', 'Created at', 'Last changed by', 'Last changed at'],
  Slots: ['Slot id', 'Post id', 'Date', 'Start', 'End', 'Role', 'Needed', 'Role note', 'Bringing prompt', 'Filled', 'Waiting'],
  'Sign-ups': ['Sign-up id', 'Post id', 'Slot id', 'Email', 'Name', 'Child first name', 'Bringing', 'Status', 'Signed up at', 'Reminded at', 'Details sent at', 'Over limit', 'Removed by', 'Cancelled at'],
  Volunteers: ['Email', 'Name', 'Status', 'Decided by', 'Decided at', 'First post', 'Email confirmed at'],
  'Needs help soon': [],
};

var SYSTEM_HEADERS = {
  Tokens: ['Hash', 'Kind', 'Subject', 'Expires', 'Created'],
  Outbox: ['Id', 'Queued at', 'To', 'Subject', 'Html', 'Text', 'Priority', 'Status', 'Error'],
  Log: ['At', 'What', 'Detail'],
  'Request files': ['Category id', 'Folder id', 'Form id', 'Sheet id', 'Month'],
};

/** Each request sheet's one tab. */
var REQUEST_TAB = 'Requests';
var REQUEST_HEADERS = ['Request id', 'Received', 'Kind', 'Name', 'Phone or email', 'Moving', 'Moving date', 'For', 'Note', 'Status', 'Assigned to', 'Leader note', 'Closed on'];
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
var DATE_COLS = ['Date', 'Moving date', 'Closed on'];
var TIME_COLS = ['Start', 'End'];
var LOCAL_DT_COLS = ['Created at', 'Last changed at', 'Signed up at', 'Reminded at', 'Details sent at', 'Cancelled at', 'Decided at', 'Email confirmed at', 'Link sent', 'Expires', 'Created', 'Queued at', 'At', 'Received'];
var MONTH_COLS = ['Month'];
/** Free text kept as typed (no date or number guessing by Sheets). */
var TEXT_COLS = ['Name', 'Email', 'Title', 'Public note', 'Private details', 'Role', 'Role note', 'Bringing prompt', 'Bringing', 'Child first name', 'Phone or email', 'Note', 'Leader note', 'Assigned to', 'To', 'Subject', 'Html', 'Text', 'Detail', 'Created by', 'Last changed by', 'Removed by', 'Decided by', 'Hash', 'Public id'];
var CHECKBOX_COLS = ['Bishopric', 'Ward council', 'Org editor', 'Coordinator', 'Send leader link', 'Any ward council may create', 'Confidential', 'Discord', 'Archived'];

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
  ['signup_limit_per_day', 40, 'Most sign-ups accepted in one day, all posts together.'],
  ['confirm_limit_per_day', 20, 'Most confirm-your-address emails sent in one day, all addresses together.'],
  ['organizations', 'Bishopric, Elders Quorum, Relief Society, Young Men, Young Women, Primary, Sunday School, Ward Mission, Temple and Family History, Activities', 'Organizations, separated by commas.'],
  ['discord', 'off', 'Discord announcements (phase 2). Leave off.'],
];
var NUMBER_SETTINGS = ['reminder_hour', 'default_cancel_cutoff_hours', 'email_reserve', 'signup_limit_per_day', 'confirm_limit_per_day'];

/** Categories seeded once, when the tab is empty. */
var DEFAULT_CATEGORIES = [
  { Id: 'moving', Name: 'Moving help', Icon: '🚚', Kind: 'Request', 'Owning organizations': 'Elders Quorum, Relief Society' },
  { Id: 'christmas', Name: 'Christmas help', Icon: '🎄', Kind: 'Request', 'Owning organizations': 'Bishopric', Confidential: true },
  { Id: 'other', Name: 'Other help', Icon: '💬', Kind: 'Request', 'Owning organizations': 'Bishopric', Confidential: true },
  { Id: 'meals', Name: 'Meals', Icon: '🍲', Kind: 'Opportunity', 'Owning organizations': 'Relief Society' },
  { Id: 'moving-help', Name: 'Moving', Icon: '📦', Kind: 'Opportunity', 'Owning organizations': 'Elders Quorum' },
  { Id: 'service-project', Name: 'Service project', Icon: '🛠️', Kind: 'Opportunity' },
  { Id: 'activity', Name: 'Activity help', Icon: '🎉', Kind: 'Opportunity' },
  { Id: 'temple', Name: 'Temple and family history', Icon: '🌳', Kind: 'Opportunity' },
  { Id: 'youth', Name: 'Youth activity help', Icon: '🧭', Kind: 'Opportunity' },
  { Id: 'children', Name: 'Primary help', Icon: '🧸', Kind: 'Opportunity' },
  { Id: 'other-service', Name: 'Other service', Icon: '🤝', Kind: 'Opportunity' },
];

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
    var active = normEmail(Session.getActiveUser().getEmail());
    return !!active && active === normEmail(Session.getEffectiveUser().getEmail());
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

/** Sends one email now. msg: {to, subject, html, text, name?, replyTo?}. */
function sendMailNow_(msg) {
  var opts = {
    to: msg.to,
    subject: msg.subject,
    htmlBody: msg.html,
    body: msg.text,
  };
  if (msg.name) opts.name = msg.name;
  if (msg.replyTo) opts.replyTo = msg.replyTo;
  MailApp.sendEmail(opts);
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
    'Who may edit: only the bishop and the Executive Secretary edit this sheet. Other leaders view it and ask the Executive Secretary for changes to Settings, Leaders or Categories. (Editors of this sheet can also change its script, which can open every request sheet, so edit access stays with those two.)',
    'Settings: ward name, time zone, contact email, web addresses and limits.',
    'Leaders: who gets a leader link and which files. Tick the role boxes; tick "Send leader link" to email a link. Then run Service Portal > Sync sharing.',
    'Categories: kinds of opportunities and requests, their owners and coordinators.',
    'Posts, Slots, Sign-ups: written only by the script from the leader page and the public pages. Do not type in them.',
    'Volunteers, Needs help soon: for phase 2; the script fills them.',
    '',
    PAGE_FOOTER,
    '',
    GEMINI_RULE,
    '',
    'Requests are not in this sheet. Each kind of request has its own folder and sheet, shared only with its leaders.',
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
 * ctx:   {allowedOrgs[], categoryIds[], todayLocal, publish, keepDates?: {slotId: date}}
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
  if (category && (ctx.categoryIds || []).indexOf(category) < 0) errors.category = 'Pick a category from the list.';
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
  return (access.editOrgs || []).indexOf(firstPost.Organization) >= 0;
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
 * What a leader may do, from the Leaders tab's role boxes and the Categories tab:
 * Bishopric: every organization. Ward council: see every post's names; edit and create for
 * their own organization. Org editor: see, edit and create for their own organization only.
 * Coordinator: a leader whose email is in an opportunity category's Coordinators column sees and
 * edits that category's posts (any organization) and creates in it for the category's owning
 * organizations (their own organization when it has none). "Any ward council may create" lets
 * every Ward council leader create in that category the same way. The Coordinator box alone
 * gives nothing: a category must list them.
 * categories: Categories rows (optional).
 */
function leaderAccess(leader, organizations, categories) {
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
  (categories || []).forEach(function (c) {
    var id = str_(c.Id);
    if (!id || c.Kind !== CATEGORY_KIND.opportunity || isTicked(c.Archived)) return;
    var listed = !!me && splitList(c.Coordinators).map(normEmail).indexOf(me) >= 0;
    if (listed) coordinated.push(id);
    if (!listed && !(wardCouncil && isTicked(c['Any ward council may create']))) return;
    var owners = splitList(c['Owning organizations']).filter(function (o) {
      return orgs.indexOf(o) >= 0;
    });
    catOrgs[id] = owners.length ? owners : ownList.slice();
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
  };
}

/** Organizations a new post in this category may belong to, for this leader. */
function allowedOrgsFor_(access, category) {
  var extra = (access.catOrgs && access.catOrgs[str_(category)]) || [];
  return uniq_((access.baseCreateOrgs || access.createOrgs || []).concat(extra));
}

function coordinates_(access, post) {
  return !!post.Category && (access.categories || []).indexOf(String(post.Category)) >= 0;
}

function canSeePost(access, post) {
  return !!(access.seeAllNames || access.editOrgs.indexOf(post.Organization) >= 0 || coordinates_(access, post));
}

/** The post's creator may always edit it; otherwise an organization they edit, or a category they coordinate. */
function canEditPost(access, leaderEmail, post) {
  var me = normEmail(leaderEmail);
  if (me && normEmail(post['Created by']) === me) return true;
  return access.editOrgs.indexOf(post.Organization) >= 0 || coordinates_(access, post);
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
 * Who reads a request category's folder: its Coordinators, plus (when confidential) the Leaders
 * whose Calling is Bishop, otherwise the Leaders whose Organization owns the category.
 * Normalized and de-duplicated.
 */
function requestReaders(category, leaders) {
  var out = splitList(category.Coordinators)
    .filter(isEmail)
    .map(normEmail);
  var owners = splitList(category['Owning organizations']);
  var confidential = isTicked(category.Confidential);
  leaders.forEach(function (l) {
    if (!isEmail(l.Email)) return;
    var yes = confidential
      ? String(l.Calling == null ? '' : l.Calling).trim().toLowerCase() === 'bishop'
      : owners.indexOf(String(l.Organization == null ? '' : l.Organization).trim()) >= 0;
    if (yes) out.push(normEmail(l.Email));
  });
  return uniq_(out);
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
 * msg: {to, subject, html, text, priority: 'high'|'normal'} → 'sent' | 'queued' | 'refused'.
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
      sendMailNow_({ to: to, subject: msg.subject, html: html, text: text, name: from.name, replyTo: from.replyTo });
      log_('mail sent', to + ' | ' + msg.subject);
      return 'sent';
    } catch (e) {
      error = clip(e && e.message ? e.message : e, 300);
      log_('mail error', to + ' | ' + msg.subject + ' | ' + error);
    }
  }
  systemTab_(SYS_TAB.outbox).append({
    Id: newId_('m'),
    'Queued at': nowLocal_(),
    To: to,
    Subject: msg.subject,
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
      sendMailNow_({ to: m.To, subject: m.Subject, html: m.Html, text: m.Text, name: from.name, replyTo: from.replyTo });
      sentIds[m.Id] = true;
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
    if (sentIds[m.Id]) log_('mail sent', m.To + ' | ' + m.Subject);
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
  var posts = d.posts
    .filter(function (p) {
      return p.Status === POST_STATUS.open;
    })
    .map(function (p) {
      return postSummary(p, slotsByPost[p['Post id']] || [], counts, today);
    })
    .filter(function (sum) {
      return sum.firstDate;
    })
    .sort(function (a, b) {
      return cmpLocal(a.firstDate, b.firstDate) || cmpLocal(a.title, b.title);
    });
  var answer = { ok: true, ward: wardInfo_(s), posts: posts };
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

/** Request tiles: request categories with a form, not archived. */
function apiHelp_() {
  var cached = cache_().get('help');
  if (cached) return JSON.parse(cached);
  var s = settings_();
  var files = indexBy_(systemTab_(SYS_TAB.requestFiles).rows(), 'Category id');
  var tiles = [];
  serviceTab_(TAB.categories)
    .rows()
    .forEach(function (c) {
      if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived)) return;
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

// ---------- refused-attempt counters (script cache: no daily quota, expire by themselves) ----------

/** Keys for today's refused-attempt counters: per address (hashed) and per post per minute. */
function attemptKeys_(email, postId, nowLocal) {
  var day = nowLocal.slice(0, 10).replace(/-/g, '');
  return {
    addr: 'RA_' + day + '_' + sha256Hex_(normEmail(email)).slice(0, 32),
    post: postId ? 'RP_' + day + '_' + postId + '_' + nowLocal.slice(11).replace(':', '') : '',
  };
}

function readCount_(key) {
  return key ? Number(cache_().get(key)) || 0 : 0;
}

/** Per-address counters live 6 hours (the cache's longest), per-minute ones 2 minutes. */
function bumpCount_(key) {
  if (key) cache_().put(key, String(readCount_(key) + 1), key.indexOf('RP_') === 0 ? 120 : 21600);
}

/** data: {publicId, slotId, name, email, bringing, childName}. Always the same answer when accepted. */
function apiSignup_(data) {
  data = data || {};
  var s = settings_();
  var name = String(data.name == null ? '' : data.name).trim();
  var email = String(data.email == null ? '' : data.email).trim();
  var bringing = String(data.bringing == null ? '' : data.bringing).trim();
  var childName = String(data.childName == null ? '' : data.childName).trim();
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
    var keys = attemptKeys_(email, '', now);
    var post = findPublicPost_(d.posts, data.publicId);
    if (!post) {
      bumpCount_(keys.addr);
      return { error: TEXT.postNotFound };
    }
    keys = attemptKeys_(email, post['Post id'], now);
    var slot = null;
    d.slots.forEach(function (sl) {
      if (sl['Slot id'] === String(data.slotId) && sl['Post id'] === post['Post id']) slot = sl;
    });
    var today = now.slice(0, 10);
    // Refused and blocked attempts count too, so nobody can probe without limit what an address is.
    var addressToday = readCount_(keys.addr);
    var totalToday = 0;
    var postMinute = readCount_(keys.post);
    d.signups.forEach(function (su) {
      var at = String(su['Signed up at']);
      if (at.slice(0, 10) === today) {
        totalToday++;
        if (normEmail(su.Email) === email) addressToday++;
      }
      if (su['Post id'] === post['Post id'] && at === now) postMinute++;
    });
    var limit = rateCheck(
      { addressToday: addressToday, totalToday: totalToday, postMinute: postMinute },
      {
        perAddress: LIMITS.signupEmailsPerAddressPerDay,
        perDay: s.signup_limit_per_day,
        perPostMinute: LIMITS.signupsPerPostPerMinute,
        leaderLinks: Infinity,
      }
    );
    if (limit) {
      log_('sign-up limit', limit + ' | ' + post['Post id']);
      return { error: TEXT.rateLimited + contactSuffix_(s) };
    }
    var bump = function () {
      bumpCount_(keys.addr);
      bumpCount_(keys.post);
    };
    if (childName && !allowsChildren_(post)) {
      bump();
      return { error: 'Please check the form.', fields: { childName: TEXT.noChildren } };
    }
    var volsT = serviceTab_(TAB.volunteers);
    var byEmail = volunteersByEmail_(volsT.rows());
    var leaderList = leaders_();
    var state = volunteerState(email, byEmail, leaderEmails_(leaderList));
    var counts = countsBySlot(d.signups);
    var check = checkSignup({
      post: post,
      slot: slot,
      counts: counts,
      existing: d.signups,
      email: email,
      childName: childName,
      state: state === 'blocked' ? 'new' : state,
      todayLocal: today,
      nowLocal: now,
    });
    // These answers don't depend on who the address belongs to.
    if (!check.ok && [TEXT.notOpen, TEXT.roleNotFound, TEXT.datePassed].indexOf(check.error) >= 0) {
      bump();
      return { error: check.error };
    }
    // From here every outcome answers the same sentence; only the email differs.
    if (state === 'blocked') {
      bump();
      return { outcome: 'blocked' };
    }
    if (!check.ok) {
      bump();
      return { outcome: check.error === TEXT.roleFull ? 'full' : 'duplicate', post: post, slot: slot };
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
    serviceTab_(TAB.signups).append(signup);
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
    var out = { outcome: status, post: post, slot: slot, signup: signup, d: d, now: now };
    if (status === SIGNUP_STATUS.waitingEmail) {
      var ck = confirmKeys_(email, now);
      if (readCount_(ck.addr) >= LIMITS.confirmEmailsPerAddressPerDay || readCount_(ck.total) >= s.confirm_limit_per_day) {
        log_('confirm email limit', post['Post id']);
      } else {
        bumpCount_(ck.addr);
        bumpCount_(ck.total);
        out.sendConfirm = true;
      }
    }
    if (status === SIGNUP_STATUS.waitingApproval) {
      out.firstPost = indexBy_(d.posts, 'Post id')[vrow['First post']] || post;
      out.volName = vrow.Name || name;
    }
    return out;
  });
  if (done.error) {
    var refused = { ok: false, error: done.error };
    if (done.fields) refused.fields = done.fields;
    return refused;
  }
  clearServeCache_();
  var t;
  if (done.outcome === 'blocked') {
    // One "please contact" email a day per address, however often it tries.
    var tag = sha256Hex_(email).slice(0, 32);
    if (!loggedToday_('blocked sign-up', tag)) {
      log_('blocked sign-up', tag);
      t = tplContactToSignUp_(s);
      sendOrQueue_({ to: email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
    }
  } else if (done.outcome === 'full') {
    t = tplRoleFull_(s, done.post, done.slot);
    sendOrQueue_({ to: email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  } else if (done.outcome === SIGNUP_STATUS.confirmed) {
    sendConfirmations_([{ signup: done.signup, post: done.post, slot: done.slot, over: false }], done.d);
    filledNotices_([done.post['Post id']]);
  } else if (done.outcome === SIGNUP_STATUS.waitingEmail && done.sendConfirm) {
    var ct = issueToken_('confirm', done.signup['Sign-up id'], localMinusHours(done.now, -CONFIRM_LINK_HOURS));
    t = tplConfirmAddress_(s, done.post, done.slot, done.signup, pageUrl_(s, 'confirm', { t: ct }));
    sendOrQueue_({ to: email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  } else if (done.outcome === SIGNUP_STATUS.waitingApproval) {
    notifyApprovers_(done.firstPost, done.volName, [{ post: done.post, slot: done.slot }]);
  }
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

/** Today's confirm-your-address counters: per address (hashed) and for the whole ward. */
function confirmKeys_(email, nowLocal) {
  var day = nowLocal.slice(0, 10).replace(/-/g, '');
  return { addr: 'CA_' + day + '_' + sha256Hex_(normEmail(email)).slice(0, 32), total: 'CT_' + day };
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

/** "Someone new is waiting": to the approvers of the volunteer's first post. */
function notifyApprovers_(firstPost, name, items) {
  if (!items.length) return;
  var s = settings_();
  var t = tplWaitingNotice_(s, name, items);
  approversFor(firstPost, leaders_()).forEach(function (to) {
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  });
}

/** Other Open posts still needing people, fill levels only: [{title, filled, needed, url}]. */
function otherWays_(s, d, exceptPostId) {
  var today = todayLocal_();
  var counts = countsBySlot(d.signups);
  var slotsByPost = groupBy_(d.slots, 'Post id');
  return d.posts
    .filter(function (p) {
      return p.Status === POST_STATUS.open && p['Post id'] !== exceptPostId;
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
 * Emails each newly counted sign-up: the confirmation (private details, cancel link, My sign-ups
 * link, other ways to serve) or, when it is over the number, the withdraw email. One My sign-ups
 * link per address per batch (a new one replaces the old).
 */
function sendConfirmations_(items, d) {
  var s = settings_();
  var slotsById = indexBy_(d.slots, 'Slot id');
  var meByEmail = {};
  items.forEach(function (it) {
    var e = normEmail(it.signup.Email);
    if (!meByEmail[e]) meByEmail[e] = issueMeToken_(e, d.signups, slotsById);
    var meUrl = pageUrl_(s, 'me', { t: meByEmail[e] });
    var id = it.signup['Sign-up id'];
    var expires = addDays(it.slot.Date, 1) + ' 23:59';
    var t;
    if (it.over) {
      var wt = issueToken_('withdraw', id, expires);
      t = tplOverLimit_(s, it.post, it.slot, it.signup, { withdrawUrl: pageUrl_(s, 'confirm', { t: wt }), meUrl: meUrl, details: true });
    } else {
      var ct = issueToken_('cancel', id, expires);
      t = tplSignupConfirmed_(s, it.post, it.slot, it.signup, {
        cancelUrl: pageUrl_(s, 'confirm', { t: ct }),
        meUrl: meUrl,
        details: true,
        otherWays: otherWays_(s, d, it.post['Post id']),
      });
    }
    sendOrQueue_({ to: e, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  });
}

/**
 * "Fully filled": once per post, when every role dated today or later has its number. To the
 * post's notice recipients and its category's coordinators.
 */
function filledNotices_(postIds) {
  var ids = uniq_(postIds || []);
  if (!ids.length) return;
  var s = settings_();
  var d = volunteerData_();
  var today = todayLocal_();
  var counts = countsBySlot(d.signups);
  var postsById = indexBy_(d.posts, 'Post id');
  var slotsByPost = groupBy_(d.slots, 'Post id');
  ids.forEach(function (id) {
    var post = postsById[id];
    if (!post || post.Status !== POST_STATUS.open) return;
    if (!postSummary(post, slotsByPost[id] || [], counts, today).full) return;
    if (loggedEver_('filled notice', id)) return;
    log_('filled notice', id);
    var t = tplFullyFilled_(s, post);
    uniq_(noticeRecipients(post, leaders_()).concat(categoryCoordinators_(post.Category))).forEach(function (to) {
      sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
    });
  });
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

function signupFromToken_(raw, kind) {
  var tok = readToken_(raw, kind || 'cancel');
  if (!tok) return null;
  return signupById_(tok.subject);
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
    return { d: d, moved: moved, confirmed: confirmed, lapsedOwn: lapsedOwn, name: vrow.Name || f.signup.Name, firstPost: postsById[vrow['First post']] || f.post };
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: TEXT.alreadyConfirmed };
  clearServeCache_();
  notifyApprovers_(done.firstPost, done.name, done.moved);
  if (done.confirmed.length) {
    sendConfirmations_(done.confirmed, done.d);
    filledNotices_(done.confirmed.map(function (c) {
      return c.post['Post id'];
    }));
  }
  return { ok: true, message: done.lapsedOwn ? TEXT.confirmedPassed : TEXT.addressConfirmed };
}

/** The cancel notice to the post's leaders (urgent wording after the cutoff, unless still full). */
function sendCancelNotice_(f, late, stillFull) {
  var t = tplCancelNotice_(settings_(), f.post, f.slot, f.signup, late, stillFull);
  noticeRecipients(f.post, leaders_()).forEach(function (to) {
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
  });
}

function cutoffOf_(post) {
  return post['Cancel cutoff hours'] === '' ? settings_().default_cancel_cutoff_hours : post['Cancel cutoff hours'];
}

/**
 * Cancel link (confirmation email, reminder, My sign-ups). A waiting sign-up is simply cancelled
 * (it never counted, so leaders hear nothing); a Confirmed one tells the post's leaders.
 */
function apiCancel_(data) {
  var raw = data && data.t;
  var row = tokenRow_(raw);
  if (!row || row.kind !== 'cancel') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var done = withLock_(function () {
    var f = signupById_(row.subject);
    if (!f) return { error: TEXT.linkInvalid };
    var now = nowLocal_();
    var waiting = isWaitingSignup_(f.signup.Status);
    if (f.signup.Status !== SIGNUP_STATUS.confirmed && !waiting) return { already: true };
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.cancelled, 'Cancelled at': now });
    var filled = refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    return {
      f: f,
      waiting: waiting,
      late: cancelIsLate(f.slot, cutoffOf_(f.post), now),
      stillFull: filled >= (Number(f.slot.Needed) || 0),
    };
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: TEXT.alreadyCancelled };
  revokeSignupTokens_(done.f.signup['Sign-up id']);
  clearServeCache_();
  if (!done.waiting) sendCancelNotice_(done.f, done.late, done.stillFull);
  return { ok: true, message: TEXT.cancelled };
}

/**
 * Withdraw link (over-limit email): the offer is withdrawn and, since the role still has its
 * number, nobody is told. If cancellations since then left it short, the leaders are told as
 * for a cancellation.
 */
function apiWithdraw_(data) {
  var raw = data && data.t;
  var row = tokenRow_(raw);
  if (!row || row.kind !== 'withdraw') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var done = withLock_(function () {
    var f = signupById_(row.subject);
    if (!f) return { error: TEXT.linkInvalid };
    if (f.signup.Status !== SIGNUP_STATUS.confirmed) return { error: TEXT.notActive };
    var now = nowLocal_();
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.withdrawn, 'Cancelled at': now });
    var filled = refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    return { f: f, late: cancelIsLate(f.slot, cutoffOf_(f.post), now), stillFull: filled >= (Number(f.slot.Needed) || 0) };
  });
  if (done.error) return { ok: false, error: done.error };
  revokeSignupTokens_(done.f.signup['Sign-up id']);
  clearServeCache_();
  if (!done.stillFull) sendCancelNotice_(done.f, done.late, false);
  return { ok: true, message: TEXT.withdrawn };
}

function apiRequestLeaderLink_(data) {
  return requestLeaderLink_(data && data.email);
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
  return { leader: leader, email: normEmail(leader.Email), access: leaderAccess(leader, s.organizations, categories), s: s, categories: categories };
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

/** Categories this leader may create in: all of them with an organization of their own, else only theirs. */
function creatableCategories_(access) {
  var all = opportunityCategories_();
  if ((access.baseCreateOrgs || []).length) return all;
  return all.filter(function (c) {
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
      canApprove: a.isBishopric || a.editOrgs.length > 0,
      createOrgs: a.createOrgs,
      baseCreateOrgs: a.baseCreateOrgs,
      editOrgs: a.editOrgs,
      catOrgs: a.catOrgs,
      coordinates: a.categories,
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
              status: su.Status,
              overLimit: isTicked(su['Over limit']),
            };
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
    var cat = String(input.category == null ? '' : input.category).trim();
    var allowed = existing
      ? uniq_(lc.access.editOrgs.concat([existing.Organization], (lc.access.catOrgs && lc.access.catOrgs[cat]) || []))
      : allowedOrgsFor_(lc.access, cat);
    var catIds = opportunityCategories_().map(function (c) {
      return c.id;
    });
    if (existing && existing.Category && catIds.indexOf(existing.Category) < 0) catIds.push(existing.Category);
    var v = validatePost(input, {
      allowedOrgs: allowed,
      categoryIds: catIds,
      todayLocal: now.slice(0, 10),
      publish: action === 'publish',
      keepDates: keepDates,
    });
    if (!v.ok) return { ok: false, error: 'Please fix the marked fields.', fields: v.errors };
    // A leader who edits this post only as a coordinator of its category keeps it in one of theirs.
    var byOrgOrCreator = existing && (normEmail(existing['Created by']) === lc.email || lc.access.editOrgs.indexOf(existing.Organization) >= 0);
    if (existing && !byOrgOrCreator && lc.access.categories.indexOf(v.post.category) < 0) {
      return { ok: false, error: 'Please fix the marked fields.', fields: { category: 'Keep it in a category you coordinate.' } };
    }

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
      // Moving a booked date or start time would leave the people signed up at the old time.
      var old = oldById[sl.slotId];
      if (f > 0 && (sl.date !== old.Date || sl.start !== String(old.Start || ''))) {
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
      return filledOf_(counts, sl['Slot id']) > 0;
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
    return f;
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: 'Already removed.' };
  revokeSignupTokens_(done.signup['Sign-up id']);
  clearServeCache_();
  var t = tplRemoved_(lc.s, done.post, done.slot);
  sendOrQueue_({ to: done.signup.Email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
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
  Object.keys(byEmail).forEach(function (to) {
    var t = tplPostCancelled_(lc.s, done.post, byEmail[to], note, !date);
    // High: it must not wait behind the reserve and arrive after the event.
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
  });
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
 * data: {k, email, decision: 'approve'|'decline'}. Approve: the address is approved ward-wide and
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
    var x = volunteerCtx_(data.email);
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
      return { v: x.v, decision: decision };
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
    return { v: x.v, decision: decision, d: x.d, confirmed: confirmSignupsLocked_(live, x.d) };
  });
  if (done.error) return { ok: false, error: done.error };
  clearServeCache_();
  var s = lc.s;
  var to = normEmail(done.v.Email);
  var t;
  if (done.decision === 'decline') {
    t = tplContactToSignUp_(s);
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
    return { ok: true, message: 'Declined. We emailed ' + done.v.Name + '.' };
  }
  t = tplApproved_(s, done.v);
  sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  sendConfirmations_(done.confirmed, done.d);
  filledNotices_(
    done.confirmed.map(function (c) {
      return c.post['Post id'];
    })
  );
  var n = done.confirmed.length;
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
 *   GET  ?page=serve|post|help|confirm|leader   the same pages served by the script (fallback)
 *   POST (text/plain body holding JSON {action, ...})   every action that changes or reads private data
 *   gpApi(req)   the fallback pages' google.script.run channel
 */

var PAGE_TITLES = {
  serve: 'Service Opportunities',
  post: 'Service Opportunity',
  help: 'Request Help or Service',
  confirm: 'Your Sign-up',
  leader: 'Leader Page',
};

var POST_ACTIONS = [
  'signup',
  'tokenInfo',
  'cancel',
  'confirm',
  'withdraw',
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
  if (p.api === 'ping') return jsonOut_({ ok: true, at: nowLocal_() });
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
  };
  if (!handlers.hasOwnProperty(action)) return { ok: false, error: TEXT.notFound };
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

/** A page from GP_PAGES with the ward's values filled in. */
function renderPage_(name, s, fallback) {
  var html = GP_PAGES[name];
  if (!s.preview_image_url) html = html.replace(/[^\n]*\{\{PREVIEW_IMAGE\}\}[^\n]*\n/g, '');
  return fillTemplate_(html, {
    WARD_NAME: s.ward_name || '',
    WEB_APP_URL: s.web_app_url || '',
    CONTACT_EMAIL: s.contact_email || '',
    PREVIEW_IMAGE: s.preview_image_url || '',
    FALLBACK: !!fallback,
    PAGE_TITLE: PAGE_TITLES[name] || '',
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
  note: 'Note',
};

/** Question title → request sheet column, with the longest answer kept. */
var REQ_MAP = [
  ['Name', 'Name', 80],
  ['Phone or email', 'Phone or email', 100],
  ['Moving in or out', 'Moving', 20],
  ['Date', 'Moving date', 10],
  ['For', 'For', 20],
  ['Note', 'Note', 200],
];

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
  var who = isTicked(c.Confidential)
    ? 'Only the bishop and the people he names see this request.'
    : 'Only the ' + (joinNames_(splitList(c['Owning organizations'])) || 'bishopric') + ' leaders see this request.';
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
  form
    .addParagraphTextItem()
    .setTitle(REQ_Q.note)
    .setRequired(false)
    .setHelpText('Optional, up to 200 characters. Please leave out health or money details; a leader will ask what they need.')
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(200).build());
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

/** One form, folder and month sheet per request category that has no form yet. Re-runnable. */
function buildRequestForms_(s, categories) {
  var portal = portalFolder_();
  var filesT = systemTab_(SYS_TAB.requestFiles);
  var have = indexBy_(filesT.rows(), 'Category id');
  var month = todayLocal_().slice(0, 7);
  var made = [];
  categories.forEach(function (c) {
    if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived) || !c.Id) return;
    var rec = have[c.Id];
    if (rec && rec['Form id']) return;
    var folderName = 'Requests – ' + c.Name;
    var existing = portal.getFoldersByName(folderName);
    var folder = existing.hasNext() ? existing.next() : portal.createFolder(folderName);
    var ss = newRequestSheet_(folder, c.Name, month);
    var form = FormApp.create(c.Name + ' — ' + s.ward_name);
    form
      .setDescription(requestFormDescription_(s, c))
      .setCollectEmail(false)
      .setAllowResponseEdits(false)
      .setShowLinkToRespondAgain(false)
      .setPublishingSummary(false)
      .setConfirmationMessage('Thank you. A leader will contact you.');
    addRequestQuestions_(form, c);
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
      var row = { 'Request id': newId_('r'), Received: nowLocal_(), Kind: cat.Name, Status: 'New' };
      REQ_MAP.forEach(function (m) {
        if (m[0] in answers) row[m[1]] = clip(answers[m[0]].trim(), m[2]);
      });
      tabOf_(SpreadsheetApp.openById(file['Sheet id']), REQUEST_TAB).append(row);
      return { file: file, cat: cat };
    });
    step = 'unform';
    e.source.deleteResponse(e.response.getId());
    step = 'notify';
    var s = settings_();
    var t = tplRequestNotice_(s, filed.cat.Name, DriveApp.getFolderById(filed.file['Folder id']).getUrl());
    requestReaders(filed.cat, leaders_()).forEach(function (to) {
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
  var made = buildRequestForms_(s, serviceTab_(TAB.categories).rows());
  var lines = ['Set up is done.'];
  lines.push(made.length ? 'New request forms: ' + made.join(', ') + '.' : 'Request forms: already made.');
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

  // Only the administrators (Bishop, Executive Secretary) may edit the Service Sheet: its editors
  // can also edit the script bound to it, which runs as this account and can open every request
  // sheet, including the bishop-only ones. Every other bishopric and ward council leader views it.
  var sheetWant = {};
  leaders.forEach(function (l) {
    if (isTicked(l.Bishopric) || isTicked(l['Ward council'])) sheetWant[normEmail(l.Email)] = 'reader';
  });
  adminEmails(leaders).forEach(function (e) {
    sheetWant[e] = 'writer';
  });
  var d = applySharing_(serviceSs_().getId(), sheetWant, owner, 'Service Sheet', problems);
  summary.push(
    'Service Sheet: ' + Object.keys(sheetWant).length + ' people (bishop and Executive Secretary edit; other bishopric and ward council view); ' +
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
    });

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

/** Service Portal > Make hub files: the five pages and the sections snippet, ready to copy. */
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
  ['serve', 'post', 'help', 'confirm', 'leader'].forEach(function (name) {
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
    try {
      pingOk = ping.code === 200 && JSON.parse(ping.text).ok === true;
    } catch (e) {
      pingOk = false;
    }
    add(pingOk, pingOk ? 'Web app answers.' : 'Web app does not answer (' + ping.code + '). Check the deployment: Execute as Me, Who has access Anyone.');
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
  ui_().alert(lines.join('\n'));
  return lines;
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

/** Writes every slot's Filled from the Sign-ups tab (only cells that changed). */
function refreshAllFilled_() {
  withLock_(function () {
    var slotsT = serviceTab_(TAB.slots);
    var counts = countsBySlot(serviceTab_(TAB.signups).rows());
    slotsT.rows().forEach(function (sl) {
      var f = filledOf_(counts, sl['Slot id']);
      if (Number(sl.Filled) !== f || sl.Filled === '') slotsT.update(sl, { Filled: f });
    });
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
      return { su: su, slot: slotsById[su['Slot id']], post: post, details: details };
    });
  });
  claimed.forEach(function (c) {
    var token = issueToken_('cancel', c.su['Sign-up id'], addDays(c.slot.Date, 1) + ' 23:59');
    var t = tplReminder_(s, c.post, c.slot, c.su, pageUrl_(s, 'confirm', { t: token }), c.details);
    sendOrQueue_({ to: c.su.Email, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
  });
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
    drainOutbox_();
    processLeaderLinkTicks_();
    refreshAllFilled_();
  });
}

function gpHourly(e) {
  runJob_('gpHourly', e, function () {
    sendReminders_();
    markPastPosts_();
    clearServeCache_();
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
  });
}

// ===== pages (generated from google-portal/pages/) =====

var GP_PAGES = {
 "serve": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #6b7a8d;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background: var(--gp-page);\n  line-height: 1.5;\n  min-height: 100vh;\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: 0 auto;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-heading);\n  background: var(--gp-heading);\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-heading); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: 0 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1>{{PAGE_TITLE}}</h1>\n  </header>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** {Brothers: [], Sisters: [], Youth: [], Children: []}; full posts last in each group. */\n  function groupByAudience(posts) {\n    var out = {};\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      (p.audiences || []).forEach(function (a) {\n        if (out[a]) out[a].push(p);\n      });\n    });\n    AUDIENCES.forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'serve', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n\n  function card(p) {\n    var dates = p.firstDate === p.lastDate ? GP.fmtDate(p.firstDate) : GP.fmtDate(p.firstDate) + ' – ' + GP.fmtDate(p.lastDate);\n    return el('a', { class: 'gp-card' + (p.full ? ' gp-full' : ''), href: GP.pageUrl('post', { p: p.publicId }) }, [\n      el('h3', {}, p.title),\n      el('p', { class: 'gp-meta' }, (p.organization ? p.organization + ' · ' : '') + dates),\n      p.full ? el('p', { class: 'gp-filled' }, 'Filled ✓') : GP.fillBar(p.filled, p.needed),\n      p.full ? null : el('p', { class: 'gp-count' }, p.filled + ' of ' + p.needed + ' filled'),\n    ]);\n  }\n\n  GP.call('serve').then(\n    function (res) {\n      if (!res || !res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n      var groups = GP.groupByAudience(res.posts);\n      var parts = [];\n      GP.AUDIENCES.forEach(function (a) {\n        if (!groups[a].length) return;\n        parts.push(el('h2', {}, a));\n        groups[a].forEach(function (p) {\n          parts.push(card(p));\n        });\n      });\n      if (!parts.length) parts.push(el('p', { class: 'gp-muted' }, 'Nothing to sign up for right now. Please check back soon.'));\n      parts.push(\n        el('p', { style: 'margin-top:1.5rem;text-align:center' }, [\n          el('a', { class: 'gp-btn gp-light', href: GP.pageUrl('help') }, 'Request help or service'),\n        ])\n      );\n      GP.show(main, parts);\n    },\n    function () {\n      GP.show(main, GP.unreachable('serve'));\n    }\n  );\n})();\n</script>\n</body>\n</html>\n",
 "post": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #6b7a8d;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background: var(--gp-page);\n  line-height: 1.5;\n  min-height: 100vh;\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: 0 auto;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-heading);\n  background: var(--gp-heading);\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-heading); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: 0 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1 id=\"gp-title\">{{PAGE_TITLE}}</h1>\n  </header>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n  <p style=\"text-align:center;margin-top:1.5rem\"><a id=\"gp-back\" class=\"gp-btn gp-light\" href=\"serve.html\">All service opportunities</a></p>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** {Brothers: [], Sisters: [], Youth: [], Children: []}; full posts last in each group. */\n  function groupByAudience(posts) {\n    var out = {};\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      (p.audiences || []).forEach(function (a) {\n        if (out[a]) out[a].push(p);\n      });\n    });\n    AUDIENCES.forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'post', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n  GP.$('gp-back').setAttribute('href', GP.pageUrl('serve'));\n\n  function byDate(slots) {\n    var out = [];\n    var at = {};\n    slots.forEach(function (s) {\n      if (!(s.date in at)) {\n        at[s.date] = out.length;\n        out.push({ date: s.date, slots: [] });\n      }\n      out[at[s.date]].slots.push(s);\n    });\n    return out;\n  }\n\n  function slotLine(s) {\n    var when = GP.fmtTimes(s.start, s.end);\n    return el('div', { class: 'gp-slot' }, [\n      el('strong', {}, s.role),\n      when ? el('span', { class: 'gp-meta' }, ' · ' + when) : null,\n      s.full\n        ? el('div', { class: 'gp-filled' }, 'Filled ✓')\n        : el('div', {}, [GP.fillBar(s.filled, s.needed), el('span', { class: 'gp-count' }, s.filled + ' of ' + s.needed + ' filled')]),\n      s.roleNote ? el('p', { class: 'gp-meta' }, s.roleNote) : null,\n    ]);\n  }\n\n  function signupForm(post) {\n    var open = post.slots.filter(function (s) {\n      return !s.full && !s.past;\n    });\n    if (!open.length) return el('p', { class: 'gp-muted' }, 'Every role is filled. Thank you!');\n    var chosen = null;\n    var out = el('div', { id: 'gp-out' });\n    var bringWrap = el('div', { class: 'gp-hidden' });\n    var bringLabel = el('label', { for: 'gp-bring' }, 'What are you bringing?');\n    var bring = el('input', { type: 'text', id: 'gp-bring', maxlength: '200' });\n    bringWrap.appendChild(bringLabel);\n    bringWrap.appendChild(bring);\n    var errs = {};\n    function errBox(key) {\n      errs[key] = el('p', { class: 'gp-error', role: 'alert' });\n      return errs[key];\n    }\n    var choices = open.map(function (s) {\n      var input = el('input', {\n        type: 'radio',\n        name: 'gp-slot',\n        value: s.slotId,\n        onchange: function () {\n          chosen = s;\n          bringLabel.textContent = s.bringingPrompt || 'What are you bringing?';\n          bringWrap.className = s.bringingPrompt ? '' : 'gp-hidden';\n        },\n      });\n      var when = GP.fmtTimes(s.start, s.end);\n      return el('label', { class: 'gp-check' }, [input, GP.fmtDate(s.date) + (when ? ', ' + when : '') + ' · ' + s.role + ' (' + (s.needed - s.filled) + ' open)']);\n    });\n    var name = el('input', { type: 'text', id: 'gp-name', autocomplete: 'name', maxlength: '80' });\n    var email = el('input', { type: 'email', id: 'gp-email', autocomplete: 'email', maxlength: '254' });\n    var button = el('button', { type: 'submit' }, 'Sign up');\n    var form = el(\n      'form',\n      {\n        onsubmit: function (e) {\n          e.preventDefault();\n          Object.keys(errs).forEach(function (k) {\n            errs[k].textContent = '';\n          });\n          if (!chosen) {\n            errs.slot.textContent = 'Pick a date and role.';\n            return;\n          }\n          button.disabled = true;\n          GP.call('signup', { publicId: post.publicId, slotId: chosen.slotId, name: name.value, email: email.value, bringing: chosen.bringingPrompt ? bring.value : '' }).then(\n            function (res) {\n              button.disabled = false;\n              if (res && res.ok) {\n                // Reload so the counts include this sign-up; the message replaces the form.\n                return GP.call('post', { p: post.publicId }).then(\n                  function (again) {\n                    if (again && again.ok) render(again.post, res.message);\n                    else GP.show(formWrap, GP.message('ok', res.message));\n                  },\n                  function () {\n                    GP.show(formWrap, GP.message('ok', res.message));\n                  }\n                );\n              }\n              Object.keys((res && res.fields) || {}).forEach(function (k) {\n                if (errs[k]) errs[k].textContent = res.fields[k];\n              });\n              GP.show(out, GP.message('alert', GP.errorText(res)));\n            },\n            function () {\n              button.disabled = false;\n              GP.show(out, GP.unreachable('post'));\n            }\n          );\n        },\n      },\n      [\n        el('h2', {}, 'Sign up'),\n        el('fieldset', { style: 'border:none;padding:0;margin:0' }, [el('legend', { class: 'gp-meta' }, 'Pick a date and role')].concat(choices)),\n        errBox('slot'),\n        el('label', { for: 'gp-name' }, 'Your name'),\n        name,\n        errBox('name'),\n        el('label', { for: 'gp-email' }, 'Your email (for your confirmation and reminder)'),\n        email,\n        errBox('email'),\n        bringWrap,\n        errBox('bringing'),\n        el('p', {}, [button]),\n        out,\n      ]\n    );\n    var formWrap = el('div', {}, [form]);\n    return formWrap;\n  }\n\n  function render(post, doneMessage) {\n    GP.$('gp-title').textContent = post.title;\n    document.title = post.title + ' · ' + GP.config().wardName;\n    var parts = [\n      el('div', { class: 'gp-card' }, [\n        el('p', { class: 'gp-meta' }, [post.organization, post.audiences.length ? ' · For ' + post.audiences.join(', ') : ''].join('')),\n        post.publicNote ? el('p', { class: 'gp-note' }, post.publicNote) : null,\n      ]),\n    ];\n    byDate(post.slots).forEach(function (d) {\n      parts.push(el('h2', {}, GP.fmtDate(d.date)));\n      parts.push(el('div', { class: 'gp-card' }, d.slots.map(slotLine)));\n    });\n    if (doneMessage) parts.push(GP.message('ok', doneMessage));\n    else if (post.status === 'Open') parts.push(signupForm(post));\n    else if (post.status === 'Past') parts.push(el('p', { class: 'gp-muted' }, 'This opportunity is over. Thank you to everyone who served.'));\n    else if (post.status === 'Cancelled') parts.push(el('p', { class: 'gp-muted' }, 'This opportunity was cancelled.'));\n    else parts.push(el('p', { class: 'gp-muted' }, 'This opportunity is closed to new sign-ups.'));\n    GP.show(main, parts);\n  }\n\n  GP.hash().then(function (h) {\n    if (!h.p) return GP.show(main, GP.message('alert', 'This link is missing part of its address. Open it again from the list.'));\n    GP.call('post', { p: h.p }).then(\n      function (res) {\n        if (!res || !res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n        render(res.post);\n      },\n      function () {\n        GP.show(main, GP.unreachable('post'));\n      }\n    );\n  });\n})();\n</script>\n</body>\n</html>\n",
 "help": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #6b7a8d;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background: var(--gp-page);\n  line-height: 1.5;\n  min-height: 100vh;\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: 0 auto;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-heading);\n  background: var(--gp-heading);\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-heading); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: 0 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1>{{PAGE_TITLE}}</h1>\n  </header>\n  <p>Pick what you need. Each choice opens a short form. Nothing is emailed back to you; a leader will contact you.</p>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n  <p style=\"text-align:center;margin-top:1.5rem\"><a id=\"gp-serve\" class=\"gp-btn gp-light\" href=\"serve.html\">Ways to serve</a></p>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** {Brothers: [], Sisters: [], Youth: [], Children: []}; full posts last in each group. */\n  function groupByAudience(posts) {\n    var out = {};\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      (p.audiences || []).forEach(function (a) {\n        if (out[a]) out[a].push(p);\n      });\n    });\n    AUDIENCES.forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'help', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n  GP.$('gp-serve').setAttribute('href', GP.pageUrl('serve'));\n  GP.call('help').then(\n    function (res) {\n      if (!res || !res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n      if (!res.tiles.length) return GP.show(main, el('p', { class: 'gp-muted' }, 'Requests are not open yet. Please contact a leader.'));\n      GP.show(\n        main,\n        el(\n          'div',\n          { class: 'gp-tiles' },\n          res.tiles.map(function (t) {\n            return el('a', { class: 'gp-card gp-tile', href: t.url, target: '_blank', rel: 'noopener' }, [\n              el('span', { class: 'gp-icon', 'aria-hidden': 'true' }, t.icon || '•'),\n              el('strong', {}, t.name),\n            ]);\n          })\n        )\n      );\n    },\n    function () {\n      GP.show(main, GP.unreachable('help'));\n    }\n  );\n})();\n</script>\n</body>\n</html>\n",
 "confirm": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #6b7a8d;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background: var(--gp-page);\n  line-height: 1.5;\n  min-height: 100vh;\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: 0 auto;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-heading);\n  background: var(--gp-heading);\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-heading); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: 0 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1>{{PAGE_TITLE}}</h1>\n  </header>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** {Brothers: [], Sisters: [], Youth: [], Children: []}; full posts last in each group. */\n  function groupByAudience(posts) {\n    var out = {};\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      (p.audiences || []).forEach(function (a) {\n        if (out[a]) out[a].push(p);\n      });\n    });\n    AUDIENCES.forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'confirm', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n  GP.hash().then(function (h) {\n    if (!h.t) return GP.show(main, GP.message('alert', 'This link is missing part of its address. Open it again from your email.'));\n    GP.call('tokenInfo', { t: h.t }).then(\n      function (res) {\n        if (!res || !res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n        var when = GP.fmtDate(res.date) + (res.start ? ', ' + GP.fmtTime(res.start) : '');\n        var info = el('div', { class: 'gp-card' }, [el('h3', {}, res.title), el('p', {}, res.role + ' · ' + when)]);\n        if (res.status !== 'Confirmed') return GP.show(main, [info, GP.message('ok', 'This sign-up is already cancelled.')]);\n        var out = el('div');\n        // Cancelling happens only on this click (email scanners open links but never press buttons).\n        var button = el(\n          'button',\n          {\n            type: 'button',\n            class: 'gp-danger',\n            onclick: function () {\n              button.disabled = true;\n              GP.call('cancel', { t: h.t }).then(\n                function (r) {\n                  if (r && r.ok) return GP.show(main, [info, GP.message('ok', r.message)]);\n                  button.disabled = false;\n                  GP.show(out, GP.message('alert', GP.errorText(r)));\n                },\n                function () {\n                  button.disabled = false;\n                  GP.show(out, GP.unreachable('confirm'));\n                }\n              );\n            },\n          },\n          'Cancel my sign-up'\n        );\n        GP.show(main, [info, el('p', {}, \"Can't make it? Cancel below so someone else can take your place.\"), el('p', {}, [button]), out]);\n      },\n      function () {\n        GP.show(main, GP.unreachable('confirm'));\n      }\n    );\n  });\n})();\n</script>\n</body>\n</html>\n",
 "leader": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<base target=\"_top\">\n<title>{{PAGE_TITLE}} · {{WARD_NAME}}</title>\n<meta property=\"og:title\" content=\"{{WARD_NAME}} · {{PAGE_TITLE}}\">\n<meta property=\"og:type\" content=\"website\">\n<meta property=\"og:image\" content=\"{{PREVIEW_IMAGE}}\">\n<style>\n:root {\n  /* Recolour here: every colour on the pages comes from these. */\n  --gp-ink: #2c3a4a;\n  --gp-heading: #1d3557;\n  --gp-accent: #c9b882;\n  --gp-muted: #6b7a8d;\n  --gp-link: #4a6fa5;\n  --gp-page: #eef2f7;\n  --gp-card: #ffffff;\n  --gp-line: #dde3ed;\n  --gp-soft: #f4f7fc;\n  --gp-good: #2f7d4f;\n  --gp-warn: #a4472b;\n  --gp-bar: #4a6fa5;\n  --gp-font: Georgia, 'Times New Roman', serif;\n}\n\n* { box-sizing: border-box; }\n\nhtml { -webkit-text-size-adjust: 100%; }\n\nbody {\n  margin: 0;\n  font-family: var(--gp-font);\n  color: var(--gp-ink);\n  background: var(--gp-page);\n  line-height: 1.5;\n  min-height: 100vh;\n}\n\n.gp-wrap {\n  max-width: 560px;\n  margin: 0 auto;\n  padding: 1.5rem 1rem 3rem;\n}\n\n.gp-wrap.gp-wide { max-width: 760px; }\n\n.gp-head { text-align: center; margin-bottom: 1.25rem; }\n.gp-ward { font-size: 0.85rem; color: var(--gp-muted); letter-spacing: 0.02em; margin: 0; }\nh1 { font-size: 1.4rem; color: var(--gp-heading); margin: 0.2rem 0 0; }\nh2 {\n  font-size: 1.05rem;\n  color: var(--gp-heading);\n  margin: 1.5rem 0 0.6rem;\n  padding-bottom: 0.3rem;\n  border-bottom: 2px solid var(--gp-accent);\n}\nh3 { font-size: 1rem; color: var(--gp-heading); margin: 0 0 0.3rem; }\n\na { color: var(--gp-link); overflow-wrap: anywhere; }\n\n.gp-card {\n  background: var(--gp-card);\n  border: 1px solid var(--gp-line);\n  border-radius: 14px;\n  box-shadow: 0 2px 10px rgba(29, 53, 87, 0.07);\n  padding: 0.9rem 1rem;\n  margin: 0 0 0.75rem;\n}\n\na.gp-card { display: block; text-decoration: none; color: inherit; }\na.gp-card:hover, a.gp-card:focus { background: var(--gp-soft); }\n\n.gp-meta { font-size: 0.85rem; color: var(--gp-muted); margin: 0.1rem 0; }\n.gp-note { white-space: pre-wrap; margin: 0.4rem 0; }\n\n.gp-bar {\n  height: 8px;\n  border-radius: 4px;\n  background: var(--gp-line);\n  overflow: hidden;\n  margin: 0.45rem 0 0.2rem;\n}\n.gp-bar > span { display: block; height: 100%; background: var(--gp-bar); }\n.gp-count { font-size: 0.85rem; color: var(--gp-muted); }\n.gp-filled { color: var(--gp-good); font-weight: bold; }\n.gp-full { opacity: 0.75; }\n\n.gp-btn, button {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  min-height: 44px;\n  padding: 0.55rem 1rem;\n  border-radius: 10px;\n  border: 1px solid var(--gp-heading);\n  background: var(--gp-heading);\n  color: #ffffff;\n  font: inherit;\n  font-size: 0.95rem;\n  cursor: pointer;\n  text-decoration: none;\n  margin: 0.2rem 0.3rem 0.2rem 0;\n}\n.gp-btn.gp-light, button.gp-light { background: var(--gp-card); color: var(--gp-heading); }\n.gp-btn.gp-danger, button.gp-danger { background: var(--gp-card); color: var(--gp-warn); border-color: var(--gp-warn); }\nbutton:disabled { opacity: 0.55; cursor: default; }\n\nlabel { display: block; font-size: 0.9rem; margin: 0.7rem 0 0.2rem; color: var(--gp-heading); }\ninput[type='text'], input[type='email'], input[type='number'], input[type='date'], input[type='time'], select, textarea {\n  width: 100%;\n  min-height: 44px;\n  padding: 0.5rem 0.6rem;\n  border: 1px solid var(--gp-line);\n  border-radius: 8px;\n  font: inherit;\n  background: #ffffff;\n  color: var(--gp-ink);\n}\ntextarea { min-height: 88px; }\n.gp-check { display: flex; align-items: center; gap: 0.5rem; margin: 0.35rem 0; font-size: 0.95rem; min-height: 44px; }\n.gp-check input { width: 22px; height: 22px; }\n.gp-row { display: flex; flex-wrap: wrap; gap: 0.6rem; }\n.gp-row > * { flex: 1 1 140px; }\n\n.gp-error { color: var(--gp-warn); font-size: 0.88rem; margin: 0.25rem 0; }\n.gp-ok { background: #eef7f1; border: 1px solid #b9dcc6; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-alert { background: #fbf1ec; border: 1px solid #e7c2b3; border-radius: 10px; padding: 0.8rem 1rem; }\n.gp-muted { color: var(--gp-muted); }\n.gp-loading { color: var(--gp-muted); text-align: center; padding: 1.5rem 0; }\n.gp-hidden { display: none !important; }\n\n.gp-slot { border-top: 1px solid var(--gp-line); padding: 0.55rem 0; }\n.gp-slot:first-child { border-top: none; }\n.gp-person { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem 0.6rem; padding: 0.3rem 0 0.3rem 0.8rem; }\n.gp-tag { font-size: 0.78rem; background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 999px; padding: 0.05rem 0.55rem; color: var(--gp-muted); }\n\n.gp-tabs { display: flex; gap: 0.4rem; margin: 0.5rem 0 1rem; flex-wrap: wrap; }\n.gp-tabs button { flex: 1 1 auto; }\n.gp-tabs button[aria-selected='false'] { background: var(--gp-card); color: var(--gp-heading); }\n\n.gp-date { background: var(--gp-soft); border: 1px solid var(--gp-line); border-radius: 12px; padding: 0.7rem; margin: 0.7rem 0; }\n.gp-role { background: var(--gp-card); border: 1px solid var(--gp-line); border-radius: 10px; padding: 0.5rem 0.7rem; margin: 0.5rem 0; }\n\n.gp-tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }\n.gp-tile { text-align: center; padding: 1.1rem 0.6rem; min-height: 120px; }\n.gp-tile .gp-icon { font-size: 2.2rem; display: block; margin-bottom: 0.4rem; }\n\n.gp-footer {\n  max-width: 560px;\n  margin: 2rem auto 1rem;\n  padding: 0 1rem;\n  font-size: 0.78rem;\n  color: var(--gp-muted);\n  text-align: center;\n}\n.gp-footer p { margin: 0.3rem 0; }\n\n@media (max-width: 400px) {\n  .gp-wrap { padding: 1rem 0.75rem 2.5rem; }\n  h1 { font-size: 1.25rem; }\n}\n</style>\n</head>\n<body>\n<main class=\"gp-wrap gp-wide\">\n  <header class=\"gp-head\">\n    <p class=\"gp-ward\">{{WARD_NAME}}</p>\n    <h1>{{PAGE_TITLE}}</h1>\n  </header>\n  <div id=\"gp-main\"><p class=\"gp-loading\">Loading…</p></div>\n</main>\n<footer class=\"gp-footer\" id=\"gp-footer\">\n  <p>This page is an independent tool made by Church members. It is not an official product of, or sponsored by, The Church of Jesus Christ of Latter-day Saints.</p>\n  <p class=\"gp-contact\">Contact: <a href=\"mailto:{{CONTACT_EMAIL}}\">{{CONTACT_EMAIL}}</a></p>\n</footer>\n<script>\n/* Service Portal page code, shared by every page (inlined by build.mjs).\n   Hub pages talk to the web app with fetch; the fallback pages served by the script itself use\n   google.script.run. Data only ever reaches the page through textContent, never as HTML. */\nvar GP = (function () {\n  'use strict';\n  var cfg = { page: '', wardName: '', webAppUrl: '', contact: '', fallback: false };\n  var GET_ACTIONS = { serve: true, post: true, help: true };\n  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];\n  var AUDIENCES = ['Brothers', 'Sisters', 'Youth', 'Children'];\n\n  function init(c) {\n    cfg = {\n      page: c.page || '',\n      wardName: c.wardName || '',\n      webAppUrl: c.webAppUrl || '',\n      contact: c.contact || '',\n      fallback: !!c.fallback,\n    };\n    return cfg;\n  }\n\n  function config() {\n    return cfg;\n  }\n\n  // ---------- talking to the script ----------\n\n  function call(action, data) {\n    data = data || {};\n    var req = { action: action };\n    Object.keys(data).forEach(function (k) {\n      req[k] = data[k];\n    });\n    if (cfg.fallback) {\n      return new Promise(function (resolve, reject) {\n        google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).gpApi(req);\n      });\n    }\n    var opts;\n    var url = cfg.webAppUrl;\n    if (GET_ACTIONS[action]) {\n      url += '?api=' + encodeURIComponent(action) + (data.p ? '&p=' + encodeURIComponent(data.p) : '');\n      opts = { method: 'GET', redirect: 'follow' };\n    } else {\n      // A text/plain body keeps this a \"simple\" request: no preflight.\n      opts = { method: 'POST', body: JSON.stringify(req), redirect: 'follow' };\n    }\n    return fetch(url, opts).then(function (res) {\n      if (!res.ok) throw new Error('HTTP ' + res.status);\n      return res.json();\n    });\n  }\n\n  function parseHash(h) {\n    var out = {};\n    String(h || '')\n      .replace(/^#/, '')\n      .split('&')\n      .forEach(function (part) {\n        if (!part) return;\n        var i = part.indexOf('=');\n        var k = i < 0 ? part : part.slice(0, i);\n        var v = i < 0 ? '' : part.slice(i + 1);\n        try {\n          out[decodeURIComponent(k)] = decodeURIComponent(v);\n        } catch (e) {\n          out[k] = v;\n        }\n      });\n    return out;\n  }\n\n  function hash() {\n    if (cfg.fallback) {\n      return new Promise(function (resolve) {\n        google.script.url.getLocation(function (loc) {\n          resolve(parseHash(loc.hash));\n        });\n      });\n    }\n    return Promise.resolve(parseHash(window.location.hash));\n  }\n\n  function hashString(h) {\n    return Object.keys(h || {})\n      .map(function (k) {\n        return k + '=' + encodeURIComponent(h[k]);\n      })\n      .join('&');\n  }\n\n  /** Address of another portal page: hub file, or the web app's ?page= in the fallback. */\n  function pageUrl(page, h) {\n    var tail = hashString(h);\n    var base = cfg.fallback ? cfg.webAppUrl + '?page=' + page : page + '.html';\n    return base + (tail ? '#' + tail : '');\n  }\n\n  // ---------- DOM ----------\n\n  /** el('a', {href: x, class: 'y', onclick: fn}, ['text', node]) — text only via textContent. */\n  function el(tag, attrs, children) {\n    var node = document.createElement(tag);\n    Object.keys(attrs || {}).forEach(function (k) {\n      var v = attrs[k];\n      if (v === null || v === undefined || v === false) return;\n      if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);\n      else if (k === 'class') node.className = v;\n      else if (k === 'text') node.textContent = v;\n      else if (k === 'value') node.value = v;\n      else if (k === 'checked') node.checked = !!v;\n      else if (k === 'href') node.setAttribute('href', safeHref(v));\n      else node.setAttribute(k, v === true ? '' : String(v));\n    });\n    (Array.isArray(children) ? children : children === undefined ? [] : [children]).forEach(function (c) {\n      if (c === null || c === undefined || c === false) return;\n      node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);\n    });\n    return node;\n  }\n\n  function safeHref(v) {\n    var s = String(v);\n    return /^(https?:|mailto:|[a-z0-9-]+\\.html|#|\\?)/i.test(s) ? s : '#';\n  }\n\n  function $(id) {\n    return document.getElementById(id);\n  }\n\n  function clear(node) {\n    node.innerHTML = '';\n    return node;\n  }\n\n  function show(node, children) {\n    clear(node);\n    (Array.isArray(children) ? children : [children]).forEach(function (c) {\n      if (c) node.appendChild(c);\n    });\n  }\n\n  function message(kind, text) {\n    return el('div', { class: kind === 'ok' ? 'gp-ok' : 'gp-alert', role: kind === 'ok' ? 'status' : 'alert' }, text);\n  }\n\n  /** Turns the footer's contact into a mail link, or hides it when there is no contact. */\n  function footer() {\n    var f = $('gp-footer');\n    if (!f) return;\n    var c = f.querySelector('.gp-contact');\n    if (c && !cfg.contact) c.className += ' gp-hidden';\n  }\n\n  function unreachable(page) {\n    var url = cfg.webAppUrl + '?page=' + page + (window.location && window.location.hash ? window.location.hash : '');\n    return el('div', { class: 'gp-alert', role: 'alert' }, [\n      \"Can't load right now. Try this link instead: \",\n      el('a', { href: url }, url),\n    ]);\n  }\n\n  function errorText(res) {\n    return (res && res.error) || 'Something went wrong. Please try again.';\n  }\n\n  function copyText(text, button) {\n    function done() {\n      if (button) {\n        var old = button.textContent;\n        button.textContent = 'Copied';\n        setTimeout(function () {\n          button.textContent = old;\n        }, 1500);\n      }\n    }\n    if (navigator.clipboard && navigator.clipboard.writeText) {\n      navigator.clipboard.writeText(text).then(done, function () {\n        window.prompt('Copy this link:', text);\n      });\n    } else {\n      window.prompt('Copy this link:', text);\n    }\n  }\n\n  // ---------- pure helpers ----------\n\n  function isDate(s) {\n    if (typeof s !== 'string' || !/^\\d{4}-\\d{2}-\\d{2}$/.test(s)) return false;\n    var d = new Date(Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)));\n    return d.getUTCMonth() === +s.slice(5, 7) - 1 && d.getUTCDate() === +s.slice(8, 10);\n  }\n\n  function utc(s) {\n    return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));\n  }\n\n  function iso(ms) {\n    var d = new Date(ms);\n    var m = d.getUTCMonth() + 1;\n    var day = d.getUTCDate();\n    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;\n  }\n\n  /** Every date from start to end (inclusive) on the given weekdays (0 = Sunday; none = all). At most 100. */\n  function expandDates(start, end, weekdays) {\n    if (!isDate(start) || !isDate(end)) return [];\n    var days = weekdays && weekdays.length ? weekdays.map(Number) : [0, 1, 2, 3, 4, 5, 6];\n    var out = [];\n    for (var t = utc(start); t <= utc(end) && out.length < 100; t += 86400000) {\n      if (days.indexOf(new Date(t).getUTCDay()) >= 0) out.push(iso(t));\n    }\n    return out;\n  }\n\n  /** {Brothers: [], Sisters: [], Youth: [], Children: []}; full posts last in each group. */\n  function groupByAudience(posts) {\n    var out = {};\n    AUDIENCES.forEach(function (a) {\n      out[a] = [];\n    });\n    (posts || []).forEach(function (p) {\n      (p.audiences || []).forEach(function (a) {\n        if (out[a]) out[a].push(p);\n      });\n    });\n    AUDIENCES.forEach(function (a) {\n      out[a] = out[a]\n        .filter(function (p) {\n          return !p.full;\n        })\n        .concat(\n          out[a].filter(function (p) {\n            return p.full;\n          })\n        );\n    });\n    return out;\n  }\n\n  /** 'Thu, Dec 3' */\n  function fmtDate(s) {\n    if (!isDate(s)) return String(s || '');\n    var d = new Date(utc(s));\n    return DAYS[d.getUTCDay()] + ', ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();\n  }\n\n  /** '6:30 PM' */\n  function fmtTime(t) {\n    if (!/^\\d{2}:\\d{2}$/.test(String(t || ''))) return '';\n    var h = +t.slice(0, 2);\n    return (h % 12 === 0 ? 12 : h % 12) + ':' + t.slice(3) + (h < 12 ? ' AM' : ' PM');\n  }\n\n  function fmtTimes(start, end) {\n    if (!start) return '';\n    return fmtTime(start) + (end ? '–' + fmtTime(end) : '');\n  }\n\n  function fillBar(filled, needed) {\n    var pct = needed ? Math.min(100, Math.round((filled / needed) * 100)) : 0;\n    return el('div', { class: 'gp-bar', role: 'img', 'aria-label': filled + ' of ' + needed + ' filled' }, [\n      el('span', { style: 'width:' + pct + '%' }),\n    ]);\n  }\n\n  return {\n    init: init,\n    config: config,\n    call: call,\n    hash: hash,\n    parseHash: parseHash,\n    pageUrl: pageUrl,\n    el: el,\n    $: $,\n    clear: clear,\n    show: show,\n    message: message,\n    footer: footer,\n    unreachable: unreachable,\n    errorText: errorText,\n    copyText: copyText,\n    expandDates: expandDates,\n    groupByAudience: groupByAudience,\n    fmtDate: fmtDate,\n    fmtTime: fmtTime,\n    fmtTimes: fmtTimes,\n    fillBar: fillBar,\n    isDate: isDate,\n    AUDIENCES: AUDIENCES,\n  };\n})();\n</script>\n<script>\nGP.init({ page: 'leader', wardName: {{WARD_NAME}}, webAppUrl: {{WEB_APP_URL}}, contact: {{CONTACT_EMAIL}}, fallback: {{FALLBACK}} });\nGP.footer();\n(function () {\n  var el = GP.el;\n  var main = GP.$('gp-main');\n  var STATUS_LABEL = { 'Waiting-email': 'Waiting for their email click', 'Waiting-approval': 'Waiting for approval' };\n  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];\n  var K = '';\n  var me = null;\n  var state = { tab: 'list', past: false, form: null, errors: {}, formError: '', flash: null };\n\n  // ---------- helpers ----------\n\n  function call(action, data) {\n    data = data || {};\n    data.k = K;\n    return GP.call(action, data).then(function (res) {\n      if (res && res.relink) {\n        showRequest(res.error);\n        throw { handled: true };\n      }\n      return res;\n    });\n  }\n\n  function failed(err, box) {\n    if (err && err.handled) return;\n    GP.show(box || main, GP.unreachable('leader'));\n  }\n\n  function flash(kind, text) {\n    state.flash = { kind: kind, text: text };\n  }\n\n  function uniq(list) {\n    var out = [];\n    list.forEach(function (x) {\n      if (out.indexOf(x) < 0) out.push(x);\n    });\n    return out;\n  }\n\n  function blankRole() {\n    return { slotId: '', start: '', end: '', role: '', needed: 1, roleNote: '', bringingPrompt: '' };\n  }\n\n  function copyRole(r) {\n    return { slotId: '', start: r.start, end: r.end, role: r.role, needed: r.needed, roleNote: r.roleNote, bringingPrompt: r.bringingPrompt };\n  }\n\n  /** Organizations this form may use: the leader's own, plus the chosen category's when they coordinate it. */\n  function orgsFor(f) {\n    var extra = (me.access.catOrgs && me.access.catOrgs[f.category]) || [];\n    var base = f.postId ? me.access.editOrgs.concat([f.organization]) : me.access.baseCreateOrgs;\n    return uniq(base.concat(extra));\n  }\n\n  function categoryById(id) {\n    for (var i = 0; i < me.categories.length; i++) if (me.categories[i].id === id) return me.categories[i];\n    return null;\n  }\n\n  function newForm() {\n    // A coordinator with no organization of their own starts in their first category.\n    var cat = me.access.baseCreateOrgs.length ? '' : me.categories[0] ? me.categories[0].id : '';\n    var f = {\n      postId: '',\n      status: '',\n      organization: '',\n      category: cat,\n      title: '',\n      audiences: [],\n      publicNote: '',\n      privateDetails: '',\n      cutoffHours: '',\n      dates: [{ date: '', roles: [blankRole()] }],\n    };\n    f.organization = orgsFor(f)[0] || '';\n    var c = categoryById(cat);\n    if (c && c.audiences) f.audiences = c.audiences.slice();\n    return f;\n  }\n\n  /** Server post → form model (slots grouped by date). */\n  function toForm(post) {\n    var dates = [];\n    var at = {};\n    post.slots.forEach(function (s) {\n      if (!(s.date in at)) {\n        at[s.date] = dates.length;\n        dates.push({ date: s.date, roles: [] });\n      }\n      dates[at[s.date]].roles.push({\n        slotId: s.slotId,\n        start: s.start || '',\n        end: s.end || '',\n        role: s.role,\n        needed: s.needed,\n        roleNote: s.roleNote || '',\n        bringingPrompt: s.bringingPrompt || '',\n        filled: s.filled || 0,\n      });\n    });\n    return {\n      postId: post.postId,\n      status: post.status,\n      organization: post.organization,\n      category: post.category || '',\n      title: post.title,\n      audiences: post.audiences.slice(),\n      publicNote: post.publicNote || '',\n      privateDetails: post.privateDetails || '',\n      cutoffHours: post.cutoffHours === '' || post.cutoffHours === null || post.cutoffHours === undefined ? '' : String(post.cutoffHours),\n      dates: dates.length ? dates : [{ date: '', roles: [blankRole()] }],\n    };\n  }\n\n  /** Form model → [slots], plus where each slot index sits ([dateIndex, roleIndex]). */\n  function flatten(form) {\n    var slots = [];\n    var where = [];\n    form.dates.forEach(function (d, di) {\n      d.roles.forEach(function (r, ri) {\n        slots.push({\n          slotId: r.slotId,\n          date: d.date,\n          start: r.start,\n          end: r.end,\n          role: r.role,\n          needed: r.needed,\n          roleNote: r.roleNote,\n          bringingPrompt: r.bringingPrompt,\n        });\n        where.push([di, ri]);\n      });\n    });\n    return { slots: slots, where: where };\n  }\n\n  function slotErrorKey(form, di, ri, field) {\n    var map = flatten(form).where;\n    for (var i = 0; i < map.length; i++) if (map[i][0] === di && map[i][1] === ri) return 'slots[' + i + '].' + field;\n    return '';\n  }\n\n  function err(key) {\n    var msg = state.errors[key];\n    return msg ? el('p', { class: 'gp-error', role: 'alert' }, msg) : null;\n  }\n\n  function field(label, input, key) {\n    return el('div', {}, [el('label', { for: input.id }, label), input, err(key)]);\n  }\n\n  var uid = 0;\n  function nextId(prefix) {\n    uid += 1;\n    return prefix + uid;\n  }\n\n  // ---------- request a link ----------\n\n  function showRequest(error) {\n    var email = el('input', { type: 'email', id: 'gp-req-email', autocomplete: 'email', maxlength: '254' });\n    var out = el('div');\n    var button = el('button', { type: 'submit' }, 'Email me a leader link');\n    var form = el(\n      'form',\n      {\n        onsubmit: function (e) {\n          e.preventDefault();\n          button.disabled = true;\n          GP.call('requestLeaderLink', { email: email.value }).then(\n            function (res) {\n              button.disabled = false;\n              GP.show(out, GP.message(res && res.ok ? 'ok' : 'alert', res && res.ok ? res.message : GP.errorText(res)));\n            },\n            function () {\n              button.disabled = false;\n              GP.show(out, GP.unreachable('leader'));\n            }\n          );\n        },\n      },\n      [el('label', { for: 'gp-req-email' }, 'Your email, as it is on the ward leader list'), email, el('p', {}, [button])]\n    );\n    GP.show(main, [\n      error ? GP.message('alert', error) : null,\n      el('p', {}, 'Leaders open this page with a personal link sent by email. Type your email and we will send you one.'),\n      form,\n      out,\n    ]);\n  }\n\n  // ---------- the signed-in page ----------\n\n  function tab(name, label, before) {\n    return el('button', {\n      type: 'button',\n      role: 'tab',\n      'aria-selected': String(state.tab === name),\n      onclick: function () {\n        if (before) before();\n        state.tab = name;\n        render();\n      },\n    }, label);\n  }\n\n  function render() {\n    var a = me.access;\n    var tabs = el('div', { class: 'gp-tabs', role: 'tablist' }, [\n      tab('list', 'My opportunities'),\n      a.canApprove ? tab('waiting', 'Waiting for approval') : null,\n      a.isCouncil ? tab('needs', 'Needs help soon') : null,\n      tab('form', state.form && state.form.postId ? 'Edit opportunity' : 'New opportunity', function () {\n        if (!state.form) state.form = newForm();\n        state.errors = {};\n        state.formError = '';\n      }),\n      a.isBishopric ? tab('volunteers', 'Volunteers') : null,\n    ]);\n    var signOut = el('button', {\n      type: 'button',\n      class: 'gp-light',\n      onclick: function () {\n        if (!window.confirm('Sign out everywhere? Your current link stops working and we email you a new one.')) return;\n        call('signOutEverywhere').then(function (res) {\n          GP.show(main, GP.message(res.ok ? 'ok' : 'alert', res.ok ? res.message : GP.errorText(res)));\n        }, failed);\n      },\n    }, 'Sign out everywhere');\n    var who = el('div', { class: 'gp-card' }, [\n      el('p', { style: 'margin:0' }, 'Signed in as ' + me.leader.name + (me.leader.organization ? ', ' + me.leader.organization : '')),\n      signOut,\n    ]);\n    var body = el('div');\n    var note = state.flash ? GP.message(state.flash.kind, state.flash.text) : null;\n    state.flash = null;\n    GP.show(main, [who, tabs, note, body]);\n    if (state.tab === 'waiting') renderWaiting(body);\n    else if (state.tab === 'needs') renderNeeds(body);\n    else if (state.tab === 'volunteers') renderVolunteers(body);\n    else if (state.tab === 'form') renderForm(body);\n    else renderList(body);\n  }\n\n  /** Runs a leader action, then shows its answer above the current tab. */\n  function act(action, data, box, btn) {\n    if (btn) btn.disabled = true;\n    call(action, data).then(function (res) {\n      flash(res.ok ? 'ok' : 'alert', res.ok ? res.message : GP.errorText(res));\n      render();\n    }, function (e) {\n      if (btn) btn.disabled = false;\n      failed(e, box);\n    });\n  }\n\n  // ---------- Waiting for approval ----------\n\n  function renderWaiting(body) {\n    GP.show(body, el('p', { class: 'gp-loading' }, 'Loading…'));\n    call('waiting').then(function (res) {\n      if (!res.ok) return GP.show(body, GP.message('alert', GP.errorText(res)));\n      var parts = [\n        el('p', { class: 'gp-meta' }, 'People who confirmed their email and wait for a leader. Check the ward directory, then approve or decline. Approval counts for the whole ward; you and the time are recorded.'),\n      ];\n      if (!res.volunteers.length) parts.push(el('p', { class: 'gp-muted' }, 'Nobody is waiting for you.'));\n      res.volunteers.forEach(function (v) {\n        var out = el('div');\n        var approve = el('button', { type: 'button', onclick: function () { act('decide', { email: v.email, decision: 'approve' }, out, approve); } }, 'Approve');\n        var decline = el('button', {\n          type: 'button',\n          class: 'gp-danger',\n          onclick: function () {\n            if (!window.confirm('Decline ' + v.name + '? Their waiting sign-ups end, and they are asked to contact the ward. The bishopric can undo this.')) return;\n            act('decide', { email: v.email, decision: 'decline' }, out, decline);\n          },\n        }, 'Decline');\n        parts.push(el('div', { class: 'gp-card' }, [\n          el('h3', {}, v.name),\n          el('p', { class: 'gp-meta' }, v.email + ' · first signed up for ' + (v.firstPost || 'an opportunity') + (v.firstPostOrganization ? ' (' + v.firstPostOrganization + ')' : '')),\n          v.signups.length\n            ? el('div', {}, v.signups.map(function (s) {\n                return el('div', { class: 'gp-person' }, (s.childName ? s.childName + ': ' : '') + s.title + ' · ' + GP.fmtDate(s.date) + (s.start ? ', ' + GP.fmtTime(s.start) : '') + ' · ' + s.role);\n              }))\n            : el('p', { class: 'gp-muted' }, 'No sign-ups waiting right now.'),\n          el('p', {}, [approve, decline]),\n          out,\n        ]));\n      });\n      GP.show(body, parts);\n    }, function (e) { failed(e, body); });\n  }\n\n  // ---------- Needs help soon ----------\n\n  function renderNeeds(body) {\n    GP.show(body, el('p', { class: 'gp-loading' }, 'Loading…'));\n    call('needsHelp').then(function (res) {\n      if (!res.ok) return GP.show(body, GP.message('alert', GP.errorText(res)));\n      var parts = [el('p', { class: 'gp-meta' }, 'Open roles still short in the next 14 days, soonest first.')];\n      if (!res.rows.length) parts.push(el('p', { class: 'gp-muted' }, 'Nothing is short in the next 14 days.'));\n      res.rows.forEach(function (r) {\n        parts.push(el('div', { class: 'gp-slot' }, [\n          el('strong', {}, GP.fmtDate(r.date) + (r.start ? ', ' + GP.fmtTimes(r.start, r.end) : '') + ' · ' + r.role),\n          el('span', { class: 'gp-count' }, ' ' + r.filled + ' of ' + r.needed + ' filled'),\n          el('div', { class: 'gp-meta' }, [r.organization + ' · ', el('a', { href: r.publicUrl, target: '_blank', rel: 'noopener' }, r.title)]),\n        ]));\n      });\n      GP.show(body, parts);\n    }, function (e) { failed(e, body); });\n  }\n\n  // ---------- Volunteers (bishopric) ----------\n\n  function renderVolunteers(body) {\n    GP.show(body, el('p', { class: 'gp-loading' }, 'Loading…'));\n    call('volunteers').then(function (res) {\n      if (!res.ok) return GP.show(body, GP.message('alert', GP.errorText(res)));\n      var parts = [el('p', { class: 'gp-meta' }, 'Everyone who has signed up. Undo a decline to let someone sign up again; revoke an approval when someone should no longer serve (their current sign-ups stay until you remove them).')];\n      if (!res.volunteers.length) parts.push(el('p', { class: 'gp-muted' }, 'No volunteers yet.'));\n      res.volunteers.forEach(function (v) {\n        var out = el('div');\n        var bits = [\n          el('strong', {}, v.name),\n          el('span', { class: 'gp-meta' }, ' ' + v.email),\n          el('div', { class: 'gp-meta' }, v.status + (v.status === 'Pending' && !v.emailConfirmed ? ' (has not clicked the email yet)' : '') + (v.decidedBy ? ' · ' + v.decidedBy + ', ' + v.decidedAt : '') + (v.firstPost ? ' · first: ' + v.firstPost : '')),\n        ];\n        if (v.status === 'Declined' || v.status === 'Revoked') {\n          var undo = el('button', { type: 'button', class: 'gp-light', onclick: function () { act('bishopric', { email: v.email, decision: 'undo' }, out, undo); } }, 'Undo ' + (v.status === 'Declined' ? 'decline' : 'revoke'));\n          bits.push(undo);\n        }\n        if (v.status === 'Approved') {\n          var revoke = el('button', {\n            type: 'button',\n            class: 'gp-danger',\n            onclick: function () {\n              if (!window.confirm('Revoke ' + v.name + '? They can no longer sign up. Their current sign-ups stay until you remove them.')) return;\n              act('bishopric', { email: v.email, decision: 'revoke' }, out, revoke);\n            },\n          }, 'Revoke');\n          bits.push(revoke);\n        }\n        bits.push(out);\n        parts.push(el('div', { class: 'gp-person' }, bits));\n      });\n      GP.show(body, parts);\n    }, function (e) { failed(e, body); });\n  }\n\n  // ---------- My opportunities ----------\n\n  function renderList(body) {\n    GP.show(body, el('p', { class: 'gp-loading' }, 'Loading…'));\n    call('listPosts', { past: state.past }).then(function (res) {\n      if (!res.ok) return GP.show(body, GP.message('alert', GP.errorText(res)));\n      var parts = [];\n      if (!res.posts.length) {\n        parts.push(el('p', { class: 'gp-muted' }, state.past ? 'No past opportunities.' : 'No opportunities yet. Use New opportunity to make one.'));\n      }\n      res.posts.forEach(function (p) {\n        parts.push(postCard(p));\n      });\n      parts.push(\n        el('p', {}, [\n          el('button', { type: 'button', class: 'gp-light', onclick: function () { state.past = !state.past; render(); } }, state.past ? 'Show current opportunities' : 'Show past opportunities'),\n        ])\n      );\n      GP.show(body, parts);\n    }, function (e) { failed(e, body); });\n  }\n\n  /** The inline \"are you sure\" panel for cancelling a post (date blank) or one date. */\n  function cancelPanel(p, date, box) {\n    var note = el('textarea', { id: nextId('gp-cancel-note-'), maxlength: '300', placeholder: 'Optional note for the email (up to 300 characters)' });\n    var msg = el('div');\n    var question = date\n      ? 'Cancel ' + GP.fmtDate(date) + '? Everyone signed up for that date gets an email, and no reminders go out for it.'\n      : 'Cancel this opportunity? Everyone signed up gets an email, and no reminders go out.';\n    var yes = el('button', {\n      type: 'button',\n      class: 'gp-danger',\n      onclick: function () {\n        yes.disabled = true;\n        call(date ? 'cancelDate' : 'cancelPost', { postId: p.postId, date: date || '', note: note.value }).then(function (res) {\n          if (!res.ok) {\n            yes.disabled = false;\n            return GP.show(msg, GP.message('alert', GP.errorText(res)));\n          }\n          flash('ok', res.message);\n          render();\n        }, function (e) {\n          yes.disabled = false;\n          failed(e, msg);\n        });\n      },\n    }, date ? 'Yes, cancel this date' : 'Yes, cancel it');\n    var no = el('button', { type: 'button', class: 'gp-light', onclick: function () { GP.clear(box); } }, 'Keep it');\n    GP.show(box, el('div', { class: 'gp-alert' }, [\n      el('p', { style: 'margin-top:0' }, question),\n      el('label', { for: note.id }, 'Note (optional)'),\n      note,\n      el('p', {}, [yes, no]),\n      msg,\n    ]));\n  }\n\n  function postCard(p) {\n    var bySlot = {};\n    p.signups.forEach(function (s) {\n      (bySlot[s.slotId] = bySlot[s.slotId] || []).push(s);\n    });\n    var live = p.status !== 'Past' && p.status !== 'Cancelled';\n    var out = el('div');\n    var items = [\n      el('h3', {}, p.title),\n      el('p', { class: 'gp-meta' }, p.status + ' · ' + p.organization + (p.audiences.length ? ' · ' + p.audiences.join(', ') : '')),\n    ];\n    if (p.status === 'Open') {\n      var copyBtn = el('button', { type: 'button', class: 'gp-light', onclick: function () { GP.copyText(p.publicUrl, copyBtn); } }, 'Copy');\n      items.push(el('p', { class: 'gp-meta' }, ['Public link: ', el('a', { href: p.publicUrl, target: '_blank', rel: 'noopener' }, p.publicUrl), ' ', copyBtn]));\n    }\n    if (p.status === 'Closed' || p.status === 'Draft') {\n      items.push(el('p', { class: 'gp-meta' }, 'No one new can sign up. People already signed up keep their place and still get their reminder.'));\n    }\n    var dates = {};\n    p.slots.forEach(function (s) {\n      dates[s.date] = true;\n    });\n    var multiDate = Object.keys(dates).length > 1;\n    var bookedDates = {};\n    p.signups.forEach(function (su) {\n      p.slots.forEach(function (x) {\n        if (x.slotId === su.slotId) bookedDates[x.date] = true;\n      });\n    });\n    var cancelShown = {};\n    p.slots.forEach(function (s) {\n      var people = (bySlot[s.slotId] || []).map(function (su) {\n        return personRow(p, s, su, out);\n      });\n      var dateBits = [];\n      // One \"Cancel this date\" per date with people signed up, when the post has other dates.\n      if (p.canEdit && live && multiDate && bookedDates[s.date] && !cancelShown[s.date]) {\n        cancelShown[s.date] = true;\n        var dateBox = el('div');\n        dateBits.push(el('button', { type: 'button', class: 'gp-danger', onclick: function () { cancelPanel(p, s.date, dateBox); } }, 'Cancel this date'));\n        dateBits.push(dateBox);\n      }\n      items.push(\n        el('div', { class: 'gp-slot' }, [\n          el('strong', {}, GP.fmtDate(s.date) + (s.start ? ', ' + GP.fmtTimes(s.start, s.end) : '') + ' · ' + s.role),\n          el('span', { class: 'gp-count' }, ' ' + s.filled + ' of ' + s.needed + (s.waiting ? ' · ' + s.waiting + ' waiting' : '') + (s.filled >= s.needed ? ' · Filled ✓' : '')),\n        ].concat(people.length ? people : [el('div', { class: 'gp-person gp-muted' }, 'No one yet.')]).concat(dateBits))\n      );\n    });\n    if (p.canEdit && live) {\n      var cancelBox = el('div');\n      var actions = [\n        el('button', { type: 'button', onclick: function () { openForEdit(p.postId, false, out); } }, 'Edit'),\n        el('button', { type: 'button', class: 'gp-light', onclick: function () { openForEdit(p.postId, true, out); } }, 'Copy this post'),\n      ];\n      if (p.status === 'Open' || p.status === 'Draft') {\n        actions.push(\n          el('button', {\n            type: 'button',\n            class: 'gp-light',\n            onclick: function () {\n              var q = 'Close \"' + p.title + '\"? No one new can sign up. People already signed up keep their place and still get their reminder. (If it is not happening at all, use Cancel this opportunity.)';\n              if (!window.confirm(q)) return;\n              call('savePost', { mode: 'close', post: { postId: p.postId } }).then(function (res) {\n                flash(res.ok ? 'ok' : 'alert', res.ok ? 'Closed.' : GP.errorText(res));\n                render();\n              }, function (e) { failed(e, out); });\n            },\n          }, 'Close')\n        );\n      }\n      actions.push(el('button', { type: 'button', class: 'gp-danger', onclick: function () { cancelPanel(p, '', cancelBox); } }, 'Cancel this opportunity'));\n      items.push(el('p', {}, actions));\n      items.push(cancelBox);\n    } else if (p.canEdit && p.status === 'Past') {\n      items.push(el('p', {}, [el('button', { type: 'button', class: 'gp-light', onclick: function () { openForEdit(p.postId, true, out); } }, 'Copy this post')]));\n    }\n    items.push(out);\n    return el('div', { class: 'gp-card' }, items);\n  }\n\n  function personRow(p, s, su, out) {\n    var bits = [el('span', {}, su.label || su.name)];\n    if (STATUS_LABEL[su.status]) bits.push(el('span', { class: 'gp-tag' }, STATUS_LABEL[su.status]));\n    if (su.overLimit) bits.push(el('span', { class: 'gp-tag' }, 'Over the number'));\n    if (su.bringing) bits.push(el('span', { class: 'gp-meta' }, 'Bringing: ' + su.bringing));\n    if (su.email) bits.push(el('span', { class: 'gp-meta' }, su.email));\n    if (p.canEdit && p.status !== 'Past' && p.status !== 'Cancelled') {\n      bits.push(\n        el('button', {\n          type: 'button',\n          class: 'gp-danger',\n          onclick: function () {\n            if (!window.confirm('Remove ' + su.name + ' from ' + s.role + ' on ' + GP.fmtDate(s.date) + '? We will email them.')) return;\n            call('removeSignup', { signupId: su.signupId }).then(function (res) {\n              flash(res.ok ? 'ok' : 'alert', res.ok ? res.message : GP.errorText(res));\n              render();\n            }, function (e) { failed(e, out); });\n          },\n        }, 'Remove')\n      );\n    }\n    return el('div', { class: 'gp-person' }, bits);\n  }\n\n  function openForEdit(postId, asCopy, out) {\n    call('getPost', { postId: postId }).then(function (res) {\n      if (!res.ok) return GP.show(out, GP.message('alert', GP.errorText(res)));\n      var f = toForm(res.post);\n      if (asCopy) {\n        f.postId = '';\n        f.status = '';\n        f.title = ('Copy of ' + f.title).slice(0, 100);\n        f.dates.forEach(function (d) {\n          d.roles = d.roles.map(copyRole);\n        });\n        if (!me.access.baseCreateOrgs.length && !categoryById(f.category)) f.category = me.categories[0] ? me.categories[0].id : '';\n        if (orgsFor(f).indexOf(f.organization) < 0) f.organization = orgsFor(f)[0] || '';\n      }\n      state.form = f;\n      state.errors = {};\n      state.formError = '';\n      state.tab = 'form';\n      render();\n    }, function (e) { failed(e, out); });\n  }\n\n  // ---------- New / edit opportunity ----------\n\n  function bindText(input, obj, key) {\n    input.addEventListener('input', function () {\n      obj[key] = input.value;\n    });\n    return input;\n  }\n\n  function renderForm(body) {\n    var f = state.form || (state.form = newForm());\n    var orgs = orgsFor(f);\n    if (!orgs.length) {\n      return GP.show(body, GP.message('alert', \"Your leader role can't create opportunities yet. Ask the bishopric to tick Org editor for you on the Leaders tab, or to add your email to a category's Coordinators.\"));\n    }\n    if (orgs.indexOf(f.organization) < 0) f.organization = orgs[0];\n\n    var org = el('select', { id: 'gp-org', onchange: function () { f.organization = org.value; } }, orgs.map(function (o) {\n      return el('option', { value: o, selected: o === f.organization ? 'selected' : null }, o);\n    }));\n    org.value = f.organization;\n    // Leaders with an organization of their own may leave the category blank; coordinators pick one of theirs.\n    var catChoices = (me.access.baseCreateOrgs.length ? [el('option', { value: '' }, '(none)')] : []).concat(\n      me.categories.map(function (c) {\n        return el('option', { value: c.id }, (c.icon ? c.icon + ' ' : '') + c.name);\n      })\n    );\n    if (f.category && !categoryById(f.category)) catChoices.push(el('option', { value: f.category }, f.category));\n    var cat = el('select', {\n      id: 'gp-cat',\n      onchange: function () {\n        f.category = cat.value;\n        var c = categoryById(f.category);\n        if (c && c.audiences && c.audiences.length && !f.audiences.length) f.audiences = c.audiences.slice();\n        render();\n      },\n    }, catChoices);\n    cat.value = f.category;\n    var childNote = el('p', { class: 'gp-meta' + (f.audiences.indexOf('Youth') >= 0 || f.audiences.indexOf('Children') >= 0 ? '' : ' gp-hidden') },\n      'Who is serving: the sign-up form asks \"Me / My child\" and takes a child\\'s first name. Every email goes to the parent; you see \"Ana (signed up by …)\".');\n    var title = bindText(el('input', { type: 'text', id: 'gp-title-in', maxlength: '100', value: f.title }), f, 'title');\n    var audiences = el('div', { role: 'group', 'aria-label': 'Who is it for' }, GP.AUDIENCES.map(function (a) {\n      var box = el('input', {\n        type: 'checkbox',\n        checked: f.audiences.indexOf(a) >= 0,\n        onchange: function () {\n          f.audiences = GP.AUDIENCES.filter(function (x) {\n            return x === a ? box.checked : f.audiences.indexOf(x) >= 0;\n          });\n          var young = f.audiences.indexOf('Youth') >= 0 || f.audiences.indexOf('Children') >= 0;\n          childNote.className = 'gp-meta' + (young ? '' : ' gp-hidden');\n        },\n      });\n      return el('label', { class: 'gp-check' }, [box, a]);\n    }));\n    var note = bindText(el('textarea', { id: 'gp-note', maxlength: '2000' }), f, 'publicNote');\n    note.value = f.publicNote;\n    var priv = bindText(el('textarea', { id: 'gp-priv', maxlength: '1000' }), f, 'privateDetails');\n    priv.value = f.privateDetails;\n    var cutoff = bindText(el('input', { type: 'number', id: 'gp-cutoff', min: '0', max: '168', step: '1', value: f.cutoffHours, placeholder: String(me.defaults.cutoffHours) }), f, 'cutoffHours');\n\n    var parts = [\n      el('h2', {}, f.postId ? 'Edit opportunity' : 'New opportunity'),\n      state.formError ? GP.message('alert', state.formError) : null,\n      field('Category', cat, 'category'),\n      field('Organization', org, 'organization'),\n      field('Title (everyone sees this)', title, 'title'),\n      el('div', {}, [el('label', {}, 'Who is it for?'), audiences, err('audiences'), childNote]),\n      field('Public note (everyone sees this)', note, 'publicNote'),\n      field('Private details: an address, a gate code (sent only to approved volunteers who are signed up: in their confirmation email, their reminder and My sign-ups, until the date is over)', priv, 'privateDetails'),\n      field('Cancel cutoff in hours (after this, a cancellation tells you that you are short)', cutoff, 'cutoffHours'),\n      el('h2', {}, 'Dates and roles'),\n      err('slots'),\n    ];\n    f.dates.forEach(function (d, di) {\n      parts.push(dateBlock(f, d, di));\n    });\n    parts.push(\n      el('p', {}, [\n        el('button', { type: 'button', class: 'gp-light', onclick: function () {\n          var last = f.dates[f.dates.length - 1];\n          f.dates.push({ date: '', roles: last ? last.roles.map(copyRole) : [blankRole()] });\n          render();\n        } }, 'Add date'),\n      ])\n    );\n    parts.push(addDatesPanel(f));\n    var actions = [];\n    if (f.status === 'Open') {\n      actions.push(el('button', { type: 'button', onclick: function () { save('publish'); } }, 'Save changes'));\n      actions.push(el('button', { type: 'button', class: 'gp-light', onclick: function () { save('draft'); } }, 'Save as draft (hide it)'));\n      parts.push(el('p', { class: 'gp-meta' }, 'Save as draft hides it from the public page. People already signed up keep their place and still get their reminder.'));\n    } else if (f.status === 'Closed') {\n      actions.push(el('button', { type: 'button', onclick: function () { save('publish'); } }, 'Reopen and save'));\n      actions.push(el('button', { type: 'button', class: 'gp-light', onclick: function () { save('draft'); } }, 'Save as draft'));\n    } else {\n      actions.push(el('button', { type: 'button', class: 'gp-light', onclick: function () { save('draft'); } }, 'Save as draft'));\n      actions.push(el('button', { type: 'button', onclick: function () { save('publish'); } }, 'Publish'));\n    }\n    actions.push(el('button', { type: 'button', class: 'gp-light', onclick: function () {\n      if (!window.confirm('Leave this form? Changes you have not saved are lost.')) return;\n      state.form = null;\n      state.errors = {};\n      state.formError = '';\n      state.tab = 'list';\n      render();\n    } }, 'Cancel'));\n    parts.push(el('p', {}, actions));\n    GP.show(body, parts);\n  }\n\n  function dateBlock(f, d, di) {\n    var date = el('input', { type: 'date', id: nextId('gp-date-'), value: d.date });\n    date.addEventListener('input', function () {\n      d.date = date.value;\n    });\n    var roles = d.roles.map(function (r, ri) {\n      return roleBlock(f, d, di, r, ri);\n    });\n    return el('div', { class: 'gp-date' }, [\n      el('div', {}, [el('label', { for: date.id }, 'Date'), date, err(slotErrorKey(f, di, 0, 'date'))]),\n    ].concat(roles).concat([\n      el('p', {}, [\n        el('button', { type: 'button', class: 'gp-light', onclick: function () { d.roles.push(blankRole()); render(); } }, 'Add role'),\n        el('button', { type: 'button', class: 'gp-light', onclick: function () {\n          f.dates.splice(di + 1, 0, { date: '', roles: d.roles.map(copyRole) });\n          render();\n        } }, 'Copy this date'),\n        f.dates.length > 1\n          ? el('button', { type: 'button', class: 'gp-danger', onclick: function () { f.dates.splice(di, 1); render(); } }, 'Remove date')\n          : null,\n      ]),\n    ]));\n  }\n\n  function roleBlock(f, d, di, r, ri) {\n    function input(type, key, attrs) {\n      var a = { type: type, id: nextId('gp-r-'), value: r[key] === undefined ? '' : String(r[key]) };\n      Object.keys(attrs || {}).forEach(function (k) {\n        a[k] = attrs[k];\n      });\n      return bindText(el('input', a), r, key);\n    }\n    var role = input('text', 'role', { maxlength: '60', placeholder: 'e.g. Bring a meal' });\n    var needed = input('number', 'needed', { min: '1', max: '200', step: '1' });\n    var start = input('time', 'start');\n    var end = input('time', 'end');\n    var roleNote = input('text', 'roleNote', { maxlength: '300' });\n    var prompt = input('text', 'bringingPrompt', { maxlength: '100', placeholder: 'e.g. What are you bringing?' });\n    var key = function (fieldName) {\n      return slotErrorKey(f, di, ri, fieldName);\n    };\n    return el('div', { class: 'gp-role' }, [\n      el('div', { class: 'gp-row' }, [field('Role', role, key('role')), field('How many people', needed, key('needed'))]),\n      el('div', { class: 'gp-row' }, [field('Start (optional)', start, key('start')), field('End (optional)', end, key('end'))]),\n      field('Note for this role (optional)', roleNote, key('roleNote')),\n      field('Ask volunteers (optional)', prompt, key('bringingPrompt')),\n      r.filled ? el('p', { class: 'gp-meta' }, r.filled + ' signed up') : null,\n      d.roles.length > 1\n        ? el('button', { type: 'button', class: 'gp-danger', onclick: function () { d.roles.splice(ri, 1); render(); } }, 'Remove role')\n        : null,\n    ]);\n  }\n\n  function addDatesPanel(f) {\n    var start = el('input', { type: 'date', id: 'gp-many-start' });\n    var end = el('input', { type: 'date', id: 'gp-many-end' });\n    var boxes = WEEKDAYS.map(function (w, i) {\n      return el('input', { type: 'checkbox', value: String(i) });\n    });\n    var msg = el('div');\n    return el('details', { class: 'gp-card' }, [\n      el('summary', {}, 'Add dates (for meal trains and other repeating needs)'),\n      el('div', { class: 'gp-row' }, [field('From', start, ''), field('To', end, '')]),\n      el('p', { class: 'gp-meta' }, 'On these days (none ticked means every day):'),\n      el('div', { class: 'gp-row' }, boxes.map(function (b, i) {\n        return el('label', { class: 'gp-check' }, [b, WEEKDAYS[i]]);\n      })),\n      el('p', {}, [\n        el('button', { type: 'button', class: 'gp-light', onclick: function () {\n          var days = boxes.filter(function (b) { return b.checked; }).map(function (b) { return Number(b.value); });\n          var list = GP.expandDates(start.value, end.value, days);\n          if (!list.length) return GP.show(msg, GP.message('alert', 'Pick a start and an end date (the end on or after the start).'));\n          var template = f.dates[f.dates.length - 1];\n          var roles = template ? template.roles : [blankRole()];\n          // Fill the first empty date block before adding new ones.\n          if (f.dates.length === 1 && !f.dates[0].date) f.dates = [];\n          list.forEach(function (day) {\n            f.dates.push({ date: day, roles: roles.map(copyRole) });\n          });\n          render();\n        } }, 'Add these dates'),\n      ]),\n      msg,\n    ]);\n  }\n\n  function save(action) {\n    var f = state.form;\n    var post = {\n      postId: f.postId,\n      organization: f.organization,\n      category: f.category,\n      title: f.title,\n      audiences: f.audiences,\n      publicNote: f.publicNote,\n      privateDetails: f.privateDetails,\n      cutoffHours: f.cutoffHours,\n      slots: flatten(f).slots,\n    };\n    call('savePost', { mode: action, post: post }).then(function (res) {\n      if (!res.ok) {\n        state.errors = res.fields || {};\n        state.formError = GP.errorText(res);\n        render();\n        window.scrollTo(0, 0);\n        return;\n      }\n      state.form = null;\n      state.errors = {};\n      state.formError = '';\n      state.tab = 'list';\n      flash('ok', action === 'publish' ? 'Published. Share this link: ' + res.publicUrl : 'Saved as a draft. Nobody else sees it until you publish it.');\n      render();\n      window.scrollTo(0, 0);\n    }, function (e) {\n      if (e && e.handled) return;\n      state.formError = \"Can't reach the portal right now. What you typed is still here; try Save again in a minute.\";\n      render();\n      window.scrollTo(0, 0);\n    });\n  }\n\n  // ---------- start ----------\n\n  GP.hash().then(function (h) {\n    K = h.k || '';\n    if (!K) return showRequest('');\n    call('whoami').then(function (res) {\n      if (!res.ok) return GP.show(main, GP.message('alert', GP.errorText(res)));\n      me = res;\n      render();\n    }, failed);\n  });\n})();\n</script>\n</body>\n</html>\n"
};

var GP_HUB_SECTIONS = "<!--\n  Service Portal: the two hub sections.\n  Where to paste: open the hub's index.html and paste everything from \"BEGIN\" to \"END\" near the\n  top of the page's links, before the ward's own sections (for example before \"Ward Links\").\n  The pages it links (serve.html, help.html) sit next to index.html in the hub.\n  QR codes: make one for each short link the same way the hub's other QR codes are made\n  (zippa.run shows a QR code for every short link), download them, name them serve-qr.png and\n  help-qr.png, and put them next to index.html.\n-->\n<!-- BEGIN Service Portal sections -->\n<style>\n  .gp-hub-section { max-width: 480px; margin: 0 auto 1.25rem; font-family: Georgia, serif; color: #2c3a4a; }\n  .gp-hub-section h2 { font-size: 1rem; font-weight: 700; color: #1d3557; margin: 0 0 0.6rem; padding-bottom: 0.3rem; border-bottom: 2px solid #c9b882; text-align: center; }\n  .gp-hub-card { display: flex; align-items: center; gap: 0.75rem; background: #ffffff; border: 1px solid #dde3ed; border-radius: 14px; box-shadow: 0 2px 10px rgba(29,53,87,0.07); padding: 0.75rem 1rem; text-decoration: none; color: #1d3557; min-height: 44px; }\n  .gp-hub-card:hover { background: #f4f7fc; }\n  .gp-hub-card img { width: 72px; height: 72px; flex: none; border-radius: 6px; }\n  .gp-hub-card strong { display: block; font-size: 0.98rem; }\n  .gp-hub-card span { display: block; font-size: 0.8rem; color: #6b7a8d; }\n</style>\n<section class=\"gp-hub-section\" aria-labelledby=\"gp-hub-serve\">\n  <h2 id=\"gp-hub-serve\">Service Opportunities</h2>\n  <a class=\"gp-hub-card\" href=\"serve.html\">\n    <img src=\"serve-qr.png\" alt=\"QR code for Service Opportunities\">\n    <span><strong>Ways to serve in {{WARD_NAME}}</strong><span>{{SERVE_SHORT_LINK}}</span></span>\n  </a>\n</section>\n<section class=\"gp-hub-section\" aria-labelledby=\"gp-hub-help\">\n  <h2 id=\"gp-hub-help\">Service Requests</h2>\n  <a class=\"gp-hub-card\" href=\"help.html\">\n    <img src=\"help-qr.png\" alt=\"QR code for Service Requests\">\n    <span><strong>Request help or service</strong><span>{{HELP_SHORT_LINK}}</span></span>\n  </a>\n</section>\n<!-- END Service Portal sections -->\n";
