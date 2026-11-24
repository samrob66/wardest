/**
 * Public API: what the serve, post, help and confirm pages call. Each handler returns a plain
 * object {ok: true, ...} or {ok: false, error, fields?}. Public answers never contain a
 * volunteer's name or email, private details, or anything from a request.
 */

function wardInfo_(s) {
  return { name: s.ward_name, contact: s.contact_email, serveLink: s.serve_short_link, helpLink: s.help_short_link };
}

function clearServeCache_() {
  try {
    cache_().remove('serve');
  } catch (e) {
    // a cache miss only costs a sheet read
  }
}

function volunteerData_() {
  return {
    posts: serviceTab_(TAB.posts).rows(),
    slots: serviceTab_(TAB.slots).rows(),
    signups: serviceTab_(TAB.signups).rows(),
  };
}

function groupBy_(rows, key) {
  var out = {};
  rows.forEach(function (r) {
    (out[r[key]] = out[r[key]] || []).push(r);
  });
  return out;
}

function indexBy_(rows, key) {
  var out = {};
  rows.forEach(function (r) {
    out[r[key]] = r;
  });
  return out;
}

function contactSuffix_(s) {
  return (s.contact_email || 'the ward') + '.';
}

/** Writes the slot's Filled count from the sign-ups (call inside the lock). */
function refreshFilled_(slotsTable, slotRow, signups) {
  var counts = countsBySlot(signups);
  var f = filledOf_(counts, slotRow['Slot id']);
  if (Number(slotRow.Filled) !== f) slotsTable.update(slotRow, { Filled: f });
  return f;
}

/** Open posts with a date today or later, by Brothers/Sisters/Youth/Children on the page. */
function apiServe_() {
  var cached = cache_().get('serve');
  if (cached) return JSON.parse(cached);
  var s = settings_();
  var d = volunteerData_();
  var today = todayLocal_();
  var counts = countsBySlot(d.signups);
  var slotsByPost = groupBy_(d.slots, 'Post id');
  var posts = d.posts
    .filter(function (p) {
      return p.Status === POST_STATUS.open;
    })
    .map(function (p) {
      return postSummary(p, slotsByPost[p['Post id']] || [], counts, today);
    })
    .filter(function (sum) {
      return sum.firstDate;
    })
    .sort(function (a, b) {
      return cmpLocal(a.firstDate, b.firstDate) || cmpLocal(a.title, b.title);
    });
  var answer = { ok: true, ward: wardInfo_(s), posts: posts };
  var json = JSON.stringify(answer);
  if (json.length < 90000) {
    try {
      cache_().put('serve', json, SERVE_CACHE_SECONDS);
    } catch (e) {
      // too big or cache unavailable: answer anyway
    }
  }
  return answer;
}

function findPublicPost_(posts, publicId) {
  var id = String(publicId == null ? '' : publicId).trim();
  if (!id || id.length > 40) return null;
  for (var i = 0; i < posts.length; i++) {
    if (String(posts[i]['Public id']) === id && posts[i].Status !== POST_STATUS.draft) return posts[i];
  }
  return null;
}

function apiPost_(publicId) {
  var s = settings_();
  var d = volunteerData_();
  var post = findPublicPost_(d.posts, publicId);
  if (!post) return { ok: false, error: TEXT.postNotFound };
  var slots = d.slots.filter(function (sl) {
    return sl['Post id'] === post['Post id'];
  });
  return { ok: true, ward: wardInfo_(s), post: publicPost(post, slots, countsBySlot(d.signups), todayLocal_()) };
}

/** Request tiles: request categories with a form, not archived. */
function apiHelp_() {
  var cached = cache_().get('help');
  if (cached) return JSON.parse(cached);
  var s = settings_();
  var files = indexBy_(systemTab_(SYS_TAB.requestFiles).rows(), 'Category id');
  var tiles = [];
  serviceTab_(TAB.categories)
    .rows()
    .forEach(function (c) {
      if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived)) return;
      var f = files[c.Id];
      if (!f || !f['Form id']) return;
      var url = '';
      try {
        url = FormApp.openById(f['Form id']).getPublishedUrl();
      } catch (e) {
        log_('help form missing', c.Id + ' | ' + e);
        return;
      }
      tiles.push({ id: c.Id, name: c.Name, icon: c.Icon, url: url });
    });
  var answer = { ok: true, ward: wardInfo_(s), tiles: tiles };
  try {
    cache_().put('help', JSON.stringify(answer), HELP_CACHE_SECONDS);
  } catch (e) {
    // answer anyway
  }
  return answer;
}

// ---------- refused-attempt counters (script cache: no daily quota, expire by themselves) ----------

/** Keys for today's refused-attempt counters: per address (hashed) and per post per minute. */
function attemptKeys_(email, postId, nowLocal) {
  var day = nowLocal.slice(0, 10).replace(/-/g, '');
  return {
    addr: 'RA_' + day + '_' + sha256Hex_(normEmail(email)).slice(0, 32),
    post: postId ? 'RP_' + day + '_' + postId + '_' + nowLocal.slice(11).replace(':', '') : '',
  };
}

function readCount_(key) {
  return key ? Number(cache_().get(key)) || 0 : 0;
}

/** Per-address counters live 6 hours (the cache's longest), per-minute ones 2 minutes. */
function bumpCount_(key) {
  if (key) cache_().put(key, String(readCount_(key) + 1), key.indexOf('RP_') === 0 ? 120 : 21600);
}

/** data: {publicId, slotId, name, email, bringing}. */
function apiSignup_(data) {
  data = data || {};
  var s = settings_();
  var name = String(data.name == null ? '' : data.name).trim();
  var email = String(data.email == null ? '' : data.email).trim();
  var bringing = String(data.bringing == null ? '' : data.bringing).trim();
  var fields = {};
  if (!name || name.length > 80) fields.name = 'Type your name (up to 80 characters).';
  if (!isEmail(email)) fields.email = 'Type one email address, like name@example.com.';
  if (bringing.length > 200) fields.bringing = 'Keep this under 200 characters.';
  if (Object.keys(fields).length) return { ok: false, error: 'Please check the form.', fields: fields };
  email = normEmail(email);

  var done = withLock_(function () {
    var d = volunteerData_();
    var now = nowLocal_();
    var keys = attemptKeys_(email, '', now);
    var post = findPublicPost_(d.posts, data.publicId);
    if (!post) {
      bumpCount_(keys.addr);
      return { error: TEXT.postNotFound };
    }
    keys = attemptKeys_(email, post['Post id'], now);
    var slot = null;
    d.slots.forEach(function (sl) {
      if (sl['Slot id'] === String(data.slotId) && sl['Post id'] === post['Post id']) slot = sl;
    });
    var today = now.slice(0, 10);
    // Refused attempts count too, so nobody can probe without limit whether an address is signed up.
    var addressToday = readCount_(keys.addr);
    var totalToday = 0;
    var postMinute = readCount_(keys.post);
    d.signups.forEach(function (su) {
      var at = String(su['Signed up at']);
      if (at.slice(0, 10) === today) {
        totalToday++;
        if (normEmail(su.Email) === email) addressToday++;
      }
      if (su['Post id'] === post['Post id'] && at === now) postMinute++;
    });
    var limit = rateCheck(
      { addressToday: addressToday, totalToday: totalToday, postMinute: postMinute },
      {
        perAddress: LIMITS.signupEmailsPerAddressPerDay,
        perDay: s.signup_limit_per_day,
        perPostMinute: LIMITS.signupsPerPostPerMinute,
        leaderLinks: Infinity,
      }
    );
    if (limit) {
      log_('sign-up limit', limit + ' | ' + post['Post id']);
      return { error: TEXT.rateLimited + contactSuffix_(s) };
    }
    var counts = countsBySlot(d.signups);
    var check = checkSignup({ post: post, slot: slot, counts: counts, existing: d.signups, email: email, todayLocal: today, nowLocal: now });
    if (!check.ok) {
      bumpCount_(keys.addr);
      bumpCount_(keys.post);
      return { error: check.error };
    }
    var signup = {
      'Sign-up id': newId_('s'),
      'Post id': post['Post id'],
      'Slot id': slot['Slot id'],
      Email: email,
      Name: name,
      Bringing: slot['Bringing prompt'] ? bringing : '',
      Status: SIGNUP_STATUS.confirmed,
      'Signed up at': now,
    };
    serviceTab_(TAB.signups).append(signup);
    refreshFilled_(serviceTab_(TAB.slots), slot, d.signups.concat([signup]));
    var token = issueToken_('cancel', signup['Sign-up id'], addDays(slot.Date, 1) + ' 23:59');
    return { post: post, slot: slot, signup: signup, token: token };
  });
  if (done.error) return { ok: false, error: done.error };
  clearServeCache_();
  var t = tplSignupConfirmed_(s, done.post, done.slot, done.signup, pageUrl_(s, 'confirm', { t: done.token }));
  sendOrQueue_({ to: email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  return { ok: true, message: TEXT.signedUp };
}

function signupFromToken_(raw) {
  var tok = readToken_(raw, 'cancel');
  if (!tok) return null;
  var d = volunteerData_();
  var signup = null;
  d.signups.forEach(function (su) {
    if (su['Sign-up id'] === tok.subject) signup = su;
  });
  if (!signup) return null;
  var post = indexBy_(d.posts, 'Post id')[signup['Post id']];
  var slot = indexBy_(d.slots, 'Slot id')[signup['Slot id']];
  if (!post || !slot) return null;
  return { signup: signup, post: post, slot: slot, signups: d.signups };
}

/** What a cancel link is for: title, date, time, role, status. No name or email. */
function apiTokenInfo_(data) {
  var f = signupFromToken_(data && data.t);
  if (!f) return { ok: false, error: TEXT.linkInvalid };
  return { ok: true, kind: 'cancel', title: f.post.Title, date: f.slot.Date, start: f.slot.Start, role: f.slot.Role, status: f.signup.Status };
}

function apiCancel_(data) {
  var raw = data && data.t;
  if (!readToken_(raw, 'cancel')) return { ok: false, error: TEXT.linkInvalid };
  var done = withLock_(function () {
    var f = signupFromToken_(raw);
    if (!f) return { error: TEXT.linkInvalid };
    if (f.signup.Status !== SIGNUP_STATUS.confirmed) return { already: true };
    var now = nowLocal_();
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.cancelled, 'Cancelled at': now });
    var filled = refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    var cutoff = f.post['Cancel cutoff hours'] === '' ? settings_().default_cancel_cutoff_hours : f.post['Cancel cutoff hours'];
    return {
      f: f,
      late: cancelIsLate(f.slot, cutoff, now),
      stillFull: filled >= (Number(f.slot.Needed) || 0),
    };
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: TEXT.alreadyCancelled };
  revokeTokens_('cancel', done.f.signup['Sign-up id']);
  clearServeCache_();
  var s = settings_();
  var t = tplCancelNotice_(s, done.f.post, done.f.slot, done.f.signup, done.late, done.stillFull);
  noticeRecipients(done.f.post, leaders_()).forEach(function (to) {
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
  });
  return { ok: true, message: TEXT.cancelled };
}

function apiRequestLeaderLink_(data) {
  return requestLeaderLink_(data && data.email);
}
