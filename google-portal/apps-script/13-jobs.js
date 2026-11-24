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
