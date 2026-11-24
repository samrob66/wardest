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

function tplSignupConfirmed_(s, post, slot, signup, cancelUrl) {
  var when = fmtWhen_(slot);
  var text = [
    'Hi ' + signup.Name + ',',
    "You're signed up for " + slot.Role + ' on ' + when + ' (' + post.Title + ').',
    signup.Bringing ? "You're bringing: " + signup.Bringing : '',
    'We will email you any details you need (such as an address) in a reminder the day before.',
    "Can't make it? Cancel here: " + cancelUrl,
    'Thank you for serving.',
  ].filter(String);
  var html =
    paras_([
      'Hi ' + esc(signup.Name) + ',',
      "You're signed up for <strong>" + esc(slot.Role) + '</strong> on ' + esc(when) + ' (' + esc(post.Title) + ').',
    ]) +
    (signup.Bringing ? paras_(["You're bringing: " + esc(signup.Bringing)]) : '') +
    paras_(['We will email you any details you need (such as an address) in a reminder the day before.']) +
    button_(cancelUrl, 'Cancel my sign-up') +
    paras_(['Thank you for serving.']);
  return { subject: "You're signed up: " + post.Title, html: html, text: text.join('\n\n') };
}

function tplReminder_(s, post, slot, signup, cancelUrl) {
  var when = fmtWhen_(slot);
  var details = post['Private details'];
  var text = [
    'Hi ' + signup.Name + ',',
    'A reminder: you signed up for ' + slot.Role + ' tomorrow, ' + when + ' (' + post.Title + ').',
    signup.Bringing ? "You're bringing: " + signup.Bringing : '',
    details ? 'Details (please keep them private):\n' + details : '',
    "Can't make it after all? Cancel here: " + cancelUrl,
  ].filter(String);
  var html =
    paras_([
      'Hi ' + esc(signup.Name) + ',',
      'A reminder: you signed up for <strong>' + esc(slot.Role) + '</strong> tomorrow, ' + esc(when) + ' (' + esc(post.Title) + ').',
    ]) +
    (signup.Bringing ? paras_(["You're bringing: " + esc(signup.Bringing)]) : '') +
    (details
      ? paras_(['<strong>Details</strong> (please keep them private):<br>' + esc(details).replace(/\n/g, '<br>')])
      : '') +
    button_(cancelUrl, 'Cancel my sign-up');
  return { subject: 'Reminder: ' + post.Title + ' tomorrow', html: html, text: text.join('\n\n') };
}

function tplDetails_(s, post, slot) {
  var when = fmtWhen_(slot);
  var details = post['Private details'] || '';
  var text = [
    'Here are the details for ' + slot.Role + ' on ' + when + ' (' + post.Title + '). Please keep them private:',
    details,
  ];
  var html = paras_([
    'Here are the details for <strong>' + esc(slot.Role) + '</strong> on ' + esc(when) + ' (' + esc(post.Title) + '). Please keep them private:',
    esc(details).replace(/\n/g, '<br>'),
  ]);
  return { subject: 'Details for ' + post.Title, html: html, text: text.join('\n\n') };
}

function tplCancelNotice_(s, post, slot, signup, late, stillFull) {
  var short = late && !stillFull;
  var when = fmtWhen_(slot);
  var line = signup.Name + ' cancelled ' + slot.Role + ' on ' + when + ' (' + post.Title + ').';
  var more = short
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
