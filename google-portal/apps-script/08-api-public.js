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

/** Writes the slot's Filled and Waiting counts from the sign-ups (call inside the lock). Returns Filled. */
function refreshFilled_(slotsTable, slotRow, signups) {
  var c = countsBySlot(signups)[slotRow['Slot id']] || { filled: 0, waiting: 0 };
  var changes = {};
  if (Number(slotRow.Filled) !== c.filled) changes.Filled = c.filled;
  if (Number(slotRow.Waiting) !== c.waiting) changes.Waiting = c.waiting;
  if (Object.keys(changes).length) slotsTable.update(slotRow, changes);
  return c.filled;
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

/** data: {publicId, slotId, name, email, bringing, childName}. Always the same answer when accepted. */
function apiSignup_(data) {
  data = data || {};
  var s = settings_();
  var name = String(data.name == null ? '' : data.name).trim();
  var email = String(data.email == null ? '' : data.email).trim();
  var bringing = String(data.bringing == null ? '' : data.bringing).trim();
  var childName = String(data.childName == null ? '' : data.childName).trim();
  var fields = {};
  if (!name || name.length > 80) fields.name = 'Type your name (up to 80 characters).';
  if (!isEmail(email)) fields.email = 'Type one email address, like name@example.com.';
  if (bringing.length > 200) fields.bringing = 'Keep this under 200 characters.';
  if (childName.length > 40) fields.childName = "Type the child's first name (up to 40 characters).";
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
    // Refused and blocked attempts count too, so nobody can probe without limit what an address is.
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
    var bump = function () {
      bumpCount_(keys.addr);
      bumpCount_(keys.post);
    };
    if (childName && !allowsChildren_(post)) {
      bump();
      return { error: 'Please check the form.', fields: { childName: TEXT.noChildren } };
    }
    var volsT = serviceTab_(TAB.volunteers);
    var byEmail = volunteersByEmail_(volsT.rows());
    var leaderList = leaders_();
    var state = volunteerState(email, byEmail, leaderEmails_(leaderList));
    var counts = countsBySlot(d.signups);
    var check = checkSignup({
      post: post,
      slot: slot,
      counts: counts,
      existing: d.signups,
      email: email,
      childName: childName,
      state: state === 'blocked' ? 'new' : state,
      todayLocal: today,
      nowLocal: now,
    });
    // These answers don't depend on who the address belongs to.
    if (!check.ok && [TEXT.notOpen, TEXT.roleNotFound, TEXT.datePassed].indexOf(check.error) >= 0) {
      bump();
      return { error: check.error };
    }
    // From here every outcome answers the same sentence; only the email differs.
    if (state === 'blocked') {
      bump();
      return { outcome: 'blocked' };
    }
    if (!check.ok) {
      bump();
      return { outcome: check.error === TEXT.roleFull ? 'full' : 'duplicate', post: post, slot: slot };
    }
    var status = signupStatusFor(state);
    var signup = {
      'Sign-up id': newId_('s'),
      'Post id': post['Post id'],
      'Slot id': slot['Slot id'],
      Email: email,
      Name: name,
      'Child first name': childName,
      Bringing: slot['Bringing prompt'] ? bringing : '',
      Status: status,
      'Signed up at': now,
    };
    serviceTab_(TAB.signups).append(signup);
    d.signups.push(signup);
    refreshFilled_(serviceTab_(TAB.slots), slot, d.signups);
    var vrow = byEmail[email] || null;
    if (state === 'leader') {
      // Leaders skip approval; a Volunteers row they already have is marked Approved.
      if (vrow && vrow.Status !== VOLUNTEER_STATUS.approved) {
        volsT.update(vrow, { Status: VOLUNTEER_STATUS.approved, 'Decided by': 'Leader list', 'Decided at': now });
      }
    } else if (!vrow) {
      vrow = volsT.append({ Email: email, Name: name, Status: VOLUNTEER_STATUS.pending, 'First post': post['Post id'] });
    }
    var out = { outcome: status, post: post, slot: slot, signup: signup, d: d, now: now };
    if (status === SIGNUP_STATUS.waitingEmail) {
      var ck = confirmKeys_(email, now);
      if (readCount_(ck.addr) >= LIMITS.confirmEmailsPerAddressPerDay || readCount_(ck.total) >= s.confirm_limit_per_day) {
        log_('confirm email limit', post['Post id']);
      } else {
        bumpCount_(ck.addr);
        bumpCount_(ck.total);
        out.sendConfirm = true;
      }
    }
    if (status === SIGNUP_STATUS.waitingApproval) {
      out.firstPost = indexBy_(d.posts, 'Post id')[vrow['First post']] || post;
      out.volName = vrow.Name || name;
    }
    return out;
  });
  if (done.error) {
    var refused = { ok: false, error: done.error };
    if (done.fields) refused.fields = done.fields;
    return refused;
  }
  clearServeCache_();
  var t;
  if (done.outcome === 'blocked') {
    // One "please contact" email a day per address, however often it tries.
    var tag = sha256Hex_(email).slice(0, 32);
    if (!loggedToday_('blocked sign-up', tag)) {
      log_('blocked sign-up', tag);
      t = tplContactToSignUp_(s);
      sendOrQueue_({ to: email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
    }
  } else if (done.outcome === 'full') {
    t = tplRoleFull_(s, done.post, done.slot);
    sendOrQueue_({ to: email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  } else if (done.outcome === SIGNUP_STATUS.confirmed) {
    sendConfirmations_([{ signup: done.signup, post: done.post, slot: done.slot, over: false }], done.d);
    filledNotices_([done.post['Post id']]);
  } else if (done.outcome === SIGNUP_STATUS.waitingEmail && done.sendConfirm) {
    var ct = issueToken_('confirm', done.signup['Sign-up id'], localMinusHours(done.now, -CONFIRM_LINK_HOURS));
    t = tplConfirmAddress_(s, done.post, done.slot, done.signup, pageUrl_(s, 'confirm', { t: ct }));
    sendOrQueue_({ to: email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  } else if (done.outcome === SIGNUP_STATUS.waitingApproval) {
    notifyApprovers_(done.firstPost, done.volName, [{ post: done.post, slot: done.slot }]);
  }
  return { ok: true, message: TEXT.signupThanks };
}

function allowsChildren_(post) {
  var a = audiencesOf_(post.Audiences);
  return a.indexOf('Youth') >= 0 || a.indexOf('Children') >= 0;
}

function leaderEmails_(leaders) {
  return (leaders || leaders_()).map(function (l) {
    return normEmail(l.Email);
  });
}

/** Today's confirm-your-address counters: per address (hashed) and for the whole ward. */
function confirmKeys_(email, nowLocal) {
  var day = nowLocal.slice(0, 10).replace(/-/g, '');
  return { addr: 'CA_' + day + '_' + sha256Hex_(normEmail(email)).slice(0, 32), total: 'CT_' + day };
}

/** True when the Log already has a line (what, detail) today. */
function loggedToday_(what, detail) {
  var today = todayLocal_();
  return systemTab_(SYS_TAB.log)
    .rows()
    .some(function (r) {
      return r.What === what && String(r.Detail) === String(detail) && String(r.At).slice(0, 10) === today;
    });
}

/** True when the Log has ever had this line (kept 90 days). */
function loggedEver_(what, detail) {
  return systemTab_(SYS_TAB.log)
    .rows()
    .some(function (r) {
      return r.What === what && String(r.Detail) === String(detail);
    });
}

/** Opportunity categories' coordinators (valid addresses, normalized). */
function categoryCoordinators_(categoryId) {
  if (!categoryId) return [];
  var c = indexBy_(serviceTab_(TAB.categories).rows(), 'Id')[categoryId];
  if (!c) return [];
  return uniq_(splitList(c.Coordinators).filter(isEmail).map(normEmail));
}

/** "Someone new is waiting": to the approvers of the volunteer's first post. */
function notifyApprovers_(firstPost, name, items) {
  if (!items.length) return;
  var s = settings_();
  var t = tplWaitingNotice_(s, name, items);
  approversFor(firstPost, leaders_()).forEach(function (to) {
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  });
}

/**
 * Other Open posts still needing people, fill levels only: [{title, filled, needed, url}].
 * except: a post id or a list of them to leave out.
 */
function otherWays_(s, d, except) {
  var today = todayLocal_();
  var counts = countsBySlot(d.signups);
  var slotsByPost = groupBy_(d.slots, 'Post id');
  var skip = {};
  [].concat(except || []).forEach(function (id) {
    skip[id] = true;
  });
  return d.posts
    .filter(function (p) {
      return p.Status === POST_STATUS.open && !skip[p['Post id']];
    })
    .map(function (p) {
      return postSummary(p, slotsByPost[p['Post id']] || [], counts, today);
    })
    .filter(function (sum) {
      return sum.firstDate && !sum.full;
    })
    .sort(function (a, b) {
      return cmpLocal(a.firstDate, b.firstDate) || cmpLocal(a.title, b.title);
    })
    .slice(0, 10)
    .map(function (sum) {
      return { title: sum.title, filled: sum.filled, needed: sum.needed, url: pageUrl_(s, 'post', { p: sum.publicId }) };
    });
}

/**
 * Turns waiting sign-ups into Confirmed ones, oldest first, marking each that counts after its
 * role already had its number ("Over limit"). Call inside the lock; d.signups holds the same row
 * objects, so the counts follow. Returns [{signup, post, slot, over}].
 */
function confirmSignupsLocked_(list, d) {
  var signupsT = serviceTab_(TAB.signups);
  var slotsT = serviceTab_(TAB.slots);
  var slotsById = indexBy_(d.slots, 'Slot id');
  var postsById = indexBy_(d.posts, 'Post id');
  var out = [];
  list
    .slice()
    .sort(function (a, b) {
      return cmpLocal(a['Signed up at'], b['Signed up at']);
    })
    .forEach(function (su) {
      var slot = slotsById[su['Slot id']];
      var over = overLimitOnConfirm(slot, countsBySlot(d.signups));
      signupsT.update(su, { Status: SIGNUP_STATUS.confirmed, 'Over limit': over ? 'Yes' : '' });
      refreshFilled_(slotsT, slot, d.signups);
      out.push({ signup: su, post: postsById[su['Post id']], slot: slot, over: over });
    });
  return out;
}

/**
 * Emails each newly counted sign-up: the confirmation (private details, cancel link, My sign-ups
 * link, other ways to serve) or, when it is over the number, the withdraw email. One My sign-ups
 * link per address per batch (a new one replaces the old).
 */
function sendConfirmations_(items, d) {
  var s = settings_();
  var slotsById = indexBy_(d.slots, 'Slot id');
  var meByEmail = {};
  items.forEach(function (it) {
    var e = normEmail(it.signup.Email);
    if (!meByEmail[e]) meByEmail[e] = issueMeToken_(e, d.signups, slotsById);
    var meUrl = pageUrl_(s, 'me', { t: meByEmail[e] });
    var id = it.signup['Sign-up id'];
    var expires = addDays(it.slot.Date, 1) + ' 23:59';
    var t;
    if (it.over) {
      var wt = issueToken_('withdraw', id, expires);
      t = tplOverLimit_(s, it.post, it.slot, it.signup, { withdrawUrl: pageUrl_(s, 'confirm', { t: wt }), meUrl: meUrl, details: true });
    } else {
      var ct = issueToken_('cancel', id, expires);
      t = tplSignupConfirmed_(s, it.post, it.slot, it.signup, {
        cancelUrl: pageUrl_(s, 'confirm', { t: ct }),
        meUrl: meUrl,
        details: true,
        otherWays: otherWays_(s, d, it.post['Post id']),
      });
    }
    sendOrQueue_({ to: e, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  });
}

/**
 * "Fully filled": once per post, when every role dated today or later has its number. To the
 * post's notice recipients and its category's coordinators.
 */
function filledNotices_(postIds) {
  var ids = uniq_(postIds || []);
  if (!ids.length) return;
  var s = settings_();
  var d = volunteerData_();
  var today = todayLocal_();
  var counts = countsBySlot(d.signups);
  var postsById = indexBy_(d.posts, 'Post id');
  var slotsByPost = groupBy_(d.slots, 'Post id');
  ids.forEach(function (id) {
    var post = postsById[id];
    if (!post || post.Status !== POST_STATUS.open) return;
    if (!postSummary(post, slotsByPost[id] || [], counts, today).full) return;
    if (loggedEver_('filled notice', id)) return;
    log_('filled notice', id);
    var t = tplFullyFilled_(s, post);
    uniq_(noticeRecipients(post, leaders_()).concat(categoryCoordinators_(post.Category))).forEach(function (to) {
      sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
    });
  });
}

/** {signup, post, slot, signups, d} for a sign-up id, or null. */
function signupById_(id) {
  var d = volunteerData_();
  var signup = indexBy_(d.signups, 'Sign-up id')[String(id)];
  if (!signup) return null;
  var post = indexBy_(d.posts, 'Post id')[signup['Post id']];
  var slot = indexBy_(d.slots, 'Slot id')[signup['Slot id']];
  if (!post || !slot) return null;
  return { signup: signup, post: post, slot: slot, signups: d.signups, d: d };
}

function signupFromToken_(raw, kind) {
  var tok = readToken_(raw, kind || 'cancel');
  if (!tok) return null;
  return signupById_(tok.subject);
}

var LINK_KINDS = ['cancel', 'withdraw', 'confirm'];

/** What a cancel, withdraw or confirm link is for: title, date, time, role, status. No names or emails. */
function apiTokenInfo_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || LINK_KINDS.indexOf(row.kind) < 0) return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var f = signupById_(row.subject);
  if (!f) return { ok: false, error: TEXT.linkInvalid };
  var out = { ok: true, kind: row.kind, title: f.post.Title, date: f.slot.Date, start: f.slot.Start, role: f.slot.Role, status: f.signup.Status };
  if (row.kind === 'confirm') {
    var v = volunteersByEmail_(serviceTab_(TAB.volunteers).rows())[normEmail(f.signup.Email)];
    out.confirmed = !!(v && v['Email confirmed at']);
  }
  return out;
}

/**
 * The confirm-your-address button. Stamps Email confirmed at; the address's Waiting-email
 * sign-ups then wait for approval (one notice to the approvers of the first post), count at
 * once if the address was approved meanwhile, or lapse when their date has passed.
 */
function apiConfirm_(data) {
  var raw = data && data.t;
  var row = tokenRow_(raw);
  if (!row || row.kind !== 'confirm') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var done = withLock_(function () {
    var f = signupById_(row.subject);
    if (!f) return { error: TEXT.linkInvalid };
    var d = f.d;
    var email = normEmail(f.signup.Email);
    var volsT = serviceTab_(TAB.volunteers);
    var vrow = volunteersByEmail_(volsT.rows())[email];
    if (vrow && vrow['Email confirmed at']) return { already: true };
    var now = nowLocal_();
    var today = now.slice(0, 10);
    if (vrow) volsT.update(vrow, { 'Email confirmed at': now });
    else vrow = volsT.append({ Email: email, Name: f.signup.Name, Status: VOLUNTEER_STATUS.pending, 'First post': f.signup['Post id'], 'Email confirmed at': now });
    var state = volunteerState(email, volunteersByEmail_([vrow]), leaderEmails_());
    var slotsById = indexBy_(d.slots, 'Slot id');
    var postsById = indexBy_(d.posts, 'Post id');
    var signupsT = serviceTab_(TAB.signups);
    var slotsT = serviceTab_(TAB.slots);
    var moved = [];
    var toConfirm = [];
    var lapsedOwn = false;
    d.signups.forEach(function (su) {
      if (normEmail(su.Email) !== email || su.Status !== SIGNUP_STATUS.waitingEmail) return;
      var sl = slotsById[su['Slot id']];
      var p = postsById[su['Post id']];
      var over = !sl || !p || sl.Date < today || p.Status === POST_STATUS.cancelled || p.Status === POST_STATUS.past;
      if (over || state === 'blocked') {
        signupsT.update(su, { Status: SIGNUP_STATUS.lapsed });
        if (sl) refreshFilled_(slotsT, sl, d.signups);
        if (su['Sign-up id'] === f.signup['Sign-up id']) lapsedOwn = true;
      } else if (state === 'approved' || state === 'leader') {
        toConfirm.push(su);
      } else {
        signupsT.update(su, { Status: SIGNUP_STATUS.waitingApproval });
        refreshFilled_(slotsT, sl, d.signups);
        moved.push({ post: p, slot: sl });
      }
    });
    var confirmed = confirmSignupsLocked_(toConfirm, d);
    return { d: d, moved: moved, confirmed: confirmed, lapsedOwn: lapsedOwn, name: vrow.Name || f.signup.Name, firstPost: postsById[vrow['First post']] || f.post };
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: TEXT.alreadyConfirmed };
  clearServeCache_();
  notifyApprovers_(done.firstPost, done.name, done.moved);
  if (done.confirmed.length) {
    sendConfirmations_(done.confirmed, done.d);
    filledNotices_(done.confirmed.map(function (c) {
      return c.post['Post id'];
    }));
  }
  return { ok: true, message: done.lapsedOwn ? TEXT.confirmedPassed : TEXT.addressConfirmed };
}

/** The cancel notice to the post's leaders (urgent wording after the cutoff, unless still full). */
function sendCancelNotice_(f, late, stillFull) {
  var t = tplCancelNotice_(settings_(), f.post, f.slot, f.signup, late, stillFull);
  noticeRecipients(f.post, leaders_()).forEach(function (to) {
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
  });
}

function cutoffOf_(post) {
  return post['Cancel cutoff hours'] === '' ? settings_().default_cancel_cutoff_hours : post['Cancel cutoff hours'];
}

/**
 * Cancel link (confirmation email, reminder, My sign-ups). A waiting sign-up is simply cancelled
 * (it never counted, so leaders hear nothing); a Confirmed one tells the post's leaders.
 */
function apiCancel_(data) {
  var raw = data && data.t;
  var row = tokenRow_(raw);
  if (!row || row.kind !== 'cancel') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var done = withLock_(function () {
    var f = signupById_(row.subject);
    if (!f) return { error: TEXT.linkInvalid };
    var now = nowLocal_();
    var waiting = isWaitingSignup_(f.signup.Status);
    if (f.signup.Status !== SIGNUP_STATUS.confirmed && !waiting) return { already: true };
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.cancelled, 'Cancelled at': now });
    var filled = refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    return {
      f: f,
      waiting: waiting,
      late: cancelIsLate(f.slot, cutoffOf_(f.post), now),
      stillFull: filled >= (Number(f.slot.Needed) || 0),
    };
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: TEXT.alreadyCancelled };
  revokeSignupTokens_(done.f.signup['Sign-up id']);
  clearServeCache_();
  if (!done.waiting) sendCancelNotice_(done.f, done.late, done.stillFull);
  return { ok: true, message: TEXT.cancelled };
}

/**
 * Withdraw link (over-limit email): the offer is withdrawn and, since the role still has its
 * number, nobody is told. If cancellations since then left it short, the leaders are told as
 * for a cancellation.
 */
function apiWithdraw_(data) {
  var raw = data && data.t;
  var row = tokenRow_(raw);
  if (!row || row.kind !== 'withdraw') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var done = withLock_(function () {
    var f = signupById_(row.subject);
    if (!f) return { error: TEXT.linkInvalid };
    if (f.signup.Status !== SIGNUP_STATUS.confirmed) return { error: TEXT.notActive };
    var now = nowLocal_();
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.withdrawn, 'Cancelled at': now });
    var filled = refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    return { f: f, late: cancelIsLate(f.slot, cutoffOf_(f.post), now), stillFull: filled >= (Number(f.slot.Needed) || 0) };
  });
  if (done.error) return { ok: false, error: done.error };
  revokeSignupTokens_(done.f.signup['Sign-up id']);
  clearServeCache_();
  if (!done.stillFull) sendCancelNotice_(done.f, done.late, false);
  return { ok: true, message: TEXT.withdrawn };
}

function apiRequestLeaderLink_(data) {
  return requestLeaderLink_(data && data.email);
}

// ---------- My sign-ups ----------

/** 'Sister' from 'Sister Example': the first word only (or a child's first name). */
function firstName_(su) {
  var child = String(su['Child first name'] || '').trim();
  if (child) return child;
  return String(su.Name || '').trim().split(/\s+/)[0] || '';
}

/**
 * My sign-ups (a "me" link). Only this address's sign-ups: upcoming (waiting or confirmed, today or
 * later, each with a fresh cancel link) and past (confirmed, date gone). For an approved
 * volunteer or a leader: the other volunteers' first names on the same post (confirmed only, no
 * emails), the private details while the post is on, and other ways to serve (fill levels only).
 */
function apiMe_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || row.kind !== 'me') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var s = settings_();
  var email = normEmail(row.subject);
  var d = volunteerData_();
  var today = todayLocal_();
  var vols = volunteersByEmail_(serviceTab_(TAB.volunteers).rows());
  var state = volunteerState(email, vols, leaderEmails_());
  var trusted = state === 'approved' || state === 'leader';
  var postsById = indexBy_(d.posts, 'Post id');
  var slotsById = indexBy_(d.slots, 'Slot id');
  var byPost = groupBy_(d.signups, 'Post id');
  var mine = d.signups.filter(function (su) {
    return normEmail(su.Email) === email && slotsById[su['Slot id']] && postsById[su['Post id']];
  });
  var upcoming = [];
  var past = [];
  var issue = [];
  mine.forEach(function (su) {
    var sl = slotsById[su['Slot id']];
    var p = postsById[su['Post id']];
    var over = sl.Date < today || p.Status === POST_STATUS.past || p.Status === POST_STATUS.cancelled;
    var active = isActiveSignup_(su.Status);
    if (!over && !active) return;
    if (over && su.Status !== SIGNUP_STATUS.confirmed) return;
    var item = {
      title: p.Title,
      publicUrl: pageUrl_(s, 'post', { p: p['Public id'] }),
      date: sl.Date,
      start: sl.Start || '',
      end: sl.End || '',
      role: sl.Role,
      childName: su['Child first name'] || '',
      bringing: su.Bringing || '',
      status: su.Status,
      others: [],
    };
    if (trusted) {
      item.others = uniq_(
        (byPost[p['Post id']] || [])
          .filter(function (o) {
            return o.Status === SIGNUP_STATUS.confirmed && normEmail(o.Email) !== email;
          })
          .map(firstName_)
          .filter(String)
      );
      if (!over && su.Status === SIGNUP_STATUS.confirmed && p['Private details']) item.privateDetails = p['Private details'];
    }
    if (over) {
      past.push(item);
    } else {
      issue.push({ item: item, id: su['Sign-up id'], slot: sl });
      upcoming.push(item);
    }
  });
  // Fresh cancel links for what is still to come; they last a day (the emailed ones last longer).
  var now = nowLocal_();
  var dayLater = localMinusHours(now, -24);
  var raws = issueTokensMany_(
    issue.map(function (x) {
      var end = addDays(x.slot.Date, 1) + ' 23:59';
      return { kind: 'cancel', subject: x.id, expires: end < dayLater ? end : dayLater };
    })
  );
  issue.forEach(function (x, i) {
    x.item.cancelToken = raws[i];
  });
  var order = function (a, b) {
    return cmpLocal(a.date + ' ' + (a.start || '00:00'), b.date + ' ' + (b.start || '00:00')) || cmpLocal(a.title, b.title);
  };
  var minePosts = {};
  mine.forEach(function (su) {
    minePosts[su['Post id']] = true;
  });
  var otherWays = trusted ? otherWays_(s, d, Object.keys(minePosts)) : [];
  var vrow = vols[email];
  return { ok: true, name: vrow ? vrow.Name : '', upcoming: upcoming.sort(order), past: past.sort(order), otherWays: otherWays };
}

/** "Email me my link": the same answer always; sends only to an address with a sign-up, 3 a day. */
function apiRequestMeLink_(data) {
  var answer = { ok: true, message: TEXT.meLinkMessage };
  var raw = String((data && data.email) == null ? '' : data.email).trim();
  if (!isEmail(raw)) return answer;
  var email = normEmail(raw);
  var d = volunteerData_();
  var has = d.signups.some(function (su) {
    return normEmail(su.Email) === email;
  });
  if (!has) return answer;
  var tag = sha256Hex_('me:' + email).slice(0, 32);
  var today = todayLocal_();
  var count = systemTab_(SYS_TAB.log)
    .rows()
    .filter(function (r) {
      return r.What === 'me link requested' && String(r.Detail) === tag && String(r.At).slice(0, 10) === today;
    }).length;
  if (count >= LIMITS.meLinksPerAddressPerDay) return answer;
  log_('me link requested', tag);
  var s = settings_();
  var t = issueMeToken_(email, d.signups, indexBy_(d.slots, 'Slot id'));
  var m = tplMeLink_(s, pageUrl_(s, 'me', { t: t }));
  sendOrQueue_({ to: email, subject: m.subject, html: m.html, text: m.text, priority: 'normal' });
  return answer;
}
