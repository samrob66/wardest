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

function tplAdminAlert_(s, lines) {
  var intro = 'The ' + (s.ward_name || 'ward') + ' Service Portal needs attention:';
  return {
    subject: (s.ward_name || 'Ward') + ' Service Portal: needs attention',
    html: paras_([esc(intro), lines.map(esc).join('<br>'), 'Open the Service Sheet and run Service Portal > Check health.']),
    text: [intro, lines.join('\n'), 'Open the Service Sheet and run Service Portal > Check health.'].join('\n\n'),
  };
}
