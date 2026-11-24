/**
 * Timed jobs (installed by Install triggers). Each logs its own errors and emails the
 * administrators at most once a day per job.
 */

/** Emails the administrators once per key per day. */
function alertOncePerDay_(key, lines) {
  var p = props_();
  var today = todayLocal_();
  if (p.getProperty('ALERTED_' + key) === today) return;
  p.setProperty('ALERTED_' + key, today);
  alertAdmins_(lines);
}

function runJob_(name, fn) {
  gpBegin_();
  try {
    return fn();
  } catch (err) {
    var msg = clip(err && err.message ? err.message : err, 300);
    log_('job error', name + ' | ' + msg);
    try {
      alertOncePerDay_(name, ['The ' + name + ' job failed: ' + msg]);
    } catch (e2) {
      log_('alert failed', name + ' | ' + e2);
    }
    return null;
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

/** Day-before reminders, with private details and a fresh cancel link. */
function sendReminders_() {
  var s = settings_();
  var now = nowLocal_();
  var d = volunteerData_();
  var slotsById = indexBy_(d.slots, 'Slot id');
  var postsById = indexBy_(d.posts, 'Post id');
  var due = remindersDue(d.signups, slotsById, postsById, now, s.reminder_hour);
  if (!due.length) return 0;
  var signupsT = serviceTab_(TAB.signups);
  var byId = indexBy_(d.signups, 'Sign-up id');
  due.forEach(function (id) {
    var su = byId[id];
    var slot = slotsById[su['Slot id']];
    var post = postsById[su['Post id']];
    var token = issueToken_('cancel', id, addDays(slot.Date, 1) + ' 23:59');
    var t = tplReminder_(s, post, slot, su, pageUrl_(s, 'confirm', { t: token }));
    sendOrQueue_({ to: su.Email, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
    signupsT.update(su, { 'Reminded at': now, 'Details sent at': now });
  });
  return due.length;
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

function gpTenMinute() {
  return runJob_('gpTenMinute', function () {
    var mail = drainOutbox_();
    processLeaderLinkTicks_();
    refreshAllFilled_();
    return mail;
  });
}

function gpHourly() {
  return runJob_('gpHourly', function () {
    var reminded = sendReminders_();
    var past = markPastPosts_();
    clearServeCache_();
    return { reminded: reminded, past: past };
  });
}

function gpDaily() {
  return runJob_('gpDaily', function () {
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
    return problems;
  });
}
