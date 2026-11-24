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
