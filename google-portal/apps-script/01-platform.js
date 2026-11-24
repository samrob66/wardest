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
