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
      to = to.concat(approversFor(first || post, leaders));
    });
    var t = tplNudge_(s, post, n.date, here.length);
    uniq_(to).forEach(function (e) {
      sendOrQueue_({ to: e, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
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
      sendOrQueue_({ to: e, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
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
    writeNeedsHelpTab_();
  });
}

function gpHourly(e) {
  runJob_('gpHourly', e, function () {
    lapseWaiting_();
    sendReminders_();
    sendNudges_();
    sendWarnings_();
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
    pruneSentKeys_(today);
    // The health email: only the PROBLEM lines of Check health, and only when there is one.
    var bad = healthLines_({ job: true }).filter(function (l) {
      return l.indexOf('PROBLEM') === 0;
    });
    if (bad.length) alertOncePerDay_('health', bad);
  });
}
