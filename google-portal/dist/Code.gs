// GENERATED FILE: do not edit. Built by google-portal/build.mjs from google-portal/apps-script/
// and google-portal/pages/ in the WardForward repository.
// To update: change those source files, run `npm run gp:build`, then in the Apps Script editor
// select everything in Code.gs, paste this whole file over it, Save, and make a new version of the
// web app deployment (Deploy > Manage deployments > pencil > Version: New version > Deploy).

// ===== 00-config.js =====

/**
 * Service Portal (Google-only volunteer portal), phase 1.
 * Every tab name, header, status, text and default lives in this file.
 *
 * Source: google-portal/apps-script/ in the WardForward repository. Code.gs is generated from
 * these files; change them there, not in the Apps Script editor.
 */

var GP_VERSION = 'phase-1';

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
  alreadyCancelled: 'This sign-up is already cancelled.',
  cancelled: 'Your sign-up is cancelled. Thank you for letting us know.',
  linkInvalid: 'This link has expired or is no longer valid.',
  leaderLinkMessage: "If that address is on the ward's leader list, a link is on its way.",
  leaderRelink: 'This leader link has expired or is no longer valid. Ask for a new one.',
  notAllowed: "You can't change this opportunity.",
  removeSignupsFirst: 'Remove the people signed up for this date first.',
  signOutDone: 'We emailed you a new leader link. The old one no longer works.',
  phaseOneDetailsNote:
    "Private details go to volunteers in their reminder the day before. Remove anyone you don't recognize before then.",
};

/** Limits (spec section 7.3, phase 1 values). */
var LIMITS = {
  signupEmailsPerAddressPerDay: 3,
  signupsPerPostPerMinute: 10,
  leaderLinksPerAddressPerDay: 3,
};

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
  Volunteers: ['Email', 'Name', 'Status', 'Decided by', 'Decided at', 'First post'],
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

var POST_STATUS = { draft: 'Draft', open: 'Open', closed: 'Closed', past: 'Past' };
var SIGNUP_STATUS = {
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
  removed: 'Removed',
  waitingEmail: 'Waiting-email',
  waitingApproval: 'Waiting-approval',
};
var CATEGORY_KIND = { opportunity: 'Opportunity', request: 'Request' };

/** Column types, by header name (any tab). Read back as text; written with format '@'. */
var DATE_COLS = ['Date', 'Moving date', 'Closed on'];
var TIME_COLS = ['Start', 'End'];
var LOCAL_DT_COLS = ['Created at', 'Last changed at', 'Signed up at', 'Reminded at', 'Details sent at', 'Cancelled at', 'Decided at', 'Link sent', 'Expires', 'Created', 'Queued at', 'At', 'Received'];
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
  ['organizations', 'Bishopric, Elders Quorum, Relief Society, Young Men, Young Women, Primary, Sunday School, Ward Mission, Temple and Family History, Activities', 'Organizations, separated by commas.'],
  ['discord', 'off', 'Discord announcements (phase 2). Leave off.'],
];
var NUMBER_SETTINGS = ['reminder_hour', 'default_cancel_cutoff_hours', 'email_reserve', 'signup_limit_per_day'];

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
    'Settings: ward name, time zone, contact email, web addresses and limits. The bishopric and Executive Secretary edit it.',
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

/**
 * Can this person sign up for this slot now?
 * A slot with a start time closes at its start; one without stays open all of its day.
 */
function checkSignup(a) {
  var post = a.post;
  var slot = a.slot;
  if (!post || post.Status !== POST_STATUS.open) return { ok: false, error: TEXT.notOpen };
  if (!slot || slot['Post id'] !== post['Post id']) return { ok: false, error: TEXT.roleNotFound };
  var passed = slot.Start ? slotStart(slot) < a.nowLocal : slot.Date < a.nowLocal.slice(0, 10);
  if (passed) return { ok: false, error: TEXT.datePassed };
  var email = normEmail(a.email);
  var dup = (a.existing || []).some(function (s) {
    return s['Slot id'] === slot['Slot id'] && s.Status === SIGNUP_STATUS.confirmed && normEmail(s.Email) === email;
  });
  if (dup) return { ok: false, error: TEXT.alreadySignedUp };
  if (filledOf_(a.counts, slot['Slot id']) >= (Number(slot.Needed) || 0)) return { ok: false, error: TEXT.roleFull };
  return { ok: true };
}

/** True once now is at or past (slot start − cutoff hours). */
function cancelIsLate(slot, cutoffHours, nowLocal) {
  var h = Number(cutoffHours) || 0;
  return nowLocal >= localMinusHours(slotStart(slot), h);
}

/** Sign-up ids whose day-before reminder is due now. */
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
      if (post.Status !== POST_STATUS.open) return false;
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
 * What a leader may do, from the Leaders tab's role boxes (phase 1):
 * Bishopric: every organization. Ward council: see every post's names; edit and create for
 * their own organization. Org editor: see, edit and create for their own organization only.
 * Coordinator alone: nothing yet (phase 2 adds their categories).
 */
function leaderAccess(leader, organizations) {
  var orgs = (organizations || []).slice();
  var bishopric = isTicked(leader.Bishopric);
  var wardCouncil = isTicked(leader['Ward council']);
  var orgEditor = isTicked(leader['Org editor']);
  var own = str_(leader.Organization);
  var ownList = orgs.indexOf(own) >= 0 ? [own] : [];
  var edit = bishopric ? orgs : wardCouncil || orgEditor ? ownList : [];
  return {
    isBishopric: bishopric,
    seeAllNames: bishopric || wardCouncil,
    editOrgs: edit.slice(),
    createOrgs: edit.slice(),
  };
}

function canSeePost(access, post) {
  return !!(access.seeAllNames || access.editOrgs.indexOf(post.Organization) >= 0);
}

/** The post's creator may always edit it; otherwise the organization must be one they edit. */
function canEditPost(access, leaderEmail, post) {
  var me = normEmail(leaderEmail);
  if (me && normEmail(post['Created by']) === me) return true;
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

// ===== pages (generated from google-portal/pages/) =====

var GP_PAGES = {
 "serve": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>serve</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n",
 "post": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>post</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n",
 "help": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>help</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n",
 "confirm": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>confirm</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n",
 "leader": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>leader</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n"
};

var GP_HUB_SECTIONS = "<!-- Service Portal hub sections (filled in by Task 8). -->\n";
