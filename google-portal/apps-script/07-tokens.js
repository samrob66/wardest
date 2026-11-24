/**
 * Tokens (cancel links) and leader links. Random 256-bit values, stored only as SHA-256 hex in
 * the System Sheet's Tokens tab, carried after # in page addresses and sent to the script only
 * in POST bodies.
 */

function isRawToken_(raw) {
  return typeof raw === 'string' && /^[0-9a-f]{64}$/.test(raw);
}

/** Stores the hash and returns the raw token. A new leader link deletes that leader's older ones. */
function issueToken_(kind, subject, expiresLocal) {
  var raw = newToken_();
  withLock_(function () {
    var t = systemTab_(SYS_TAB.tokens);
    if (kind === 'leader') {
      t.removeMany(
        t.rows().filter(function (r) {
          return r.Kind === 'leader' && String(r.Subject) === String(subject);
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
