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

// ===== pages (generated from google-portal/pages/) =====

var GP_PAGES = {
 "serve": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>serve</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n",
 "post": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>post</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n",
 "help": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>help</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n",
 "confirm": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>confirm</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n",
 "leader": "<!doctype html>\n<html lang=\"en\">\n<head>\n<meta charset=\"utf-8\">\n<title>leader</title>\n<style>\n/* Service Portal page styles (filled in by Task 8). */\n</style>\n</head>\n<body>\n<script>\n/* Service Portal page code (filled in by Task 8). */\nvar GP = {};\n</script>\n</body>\n</html>\n"
};

var GP_HUB_SECTIONS = "<!-- Service Portal hub sections (filled in by Task 8). -->\n";
