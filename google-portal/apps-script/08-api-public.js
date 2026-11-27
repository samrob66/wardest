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
  var cats = indexBy_(serviceTab_(TAB.categories).rows(), 'Id');
  var posts = d.posts
    .filter(function (p) {
      return p.Status === POST_STATUS.open;
    })
    .map(function (p) {
      var sum = postSummary(p, slotsByPost[p['Post id']] || [], counts, today);
      // The category label and icon on each card (public: categories are not private).
      var c = cats[p.Category];
      sum.categoryName = c ? String(c.Name || '') : '';
      sum.categoryIcon = c ? String(c.Icon || '') : '';
      return sum;
    })
    .filter(function (sum) {
      return sum.firstDate;
    })
    .sort(function (a, b) {
      return cmpLocal(a.firstDate, b.firstDate) || cmpLocal(a.title, b.title);
    });
  var answer = { ok: true, ward: wardInfo_(s), posts: posts, offers: serveOffers_(), labels: { everyone: TEXT.everyone } };
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

/** Script cache key for the giving form's published link (cleared by buildRequestForms_). */
var GIVING_URL_CACHE_KEY = 'giving_url';

/**
 * The Christmas giving card for the Service Opportunities page (decision 17): the
 * christmas-giving row, not archived, with On Serve page ticked and a form. On Serve page means
 * nothing on any other row. A problem here never breaks the page; it just shows no card.
 */
function serveOffers_() {
  try {
    var c = serviceTab_(TAB.categories).find('Id', GIVING_ID);
    if (!c || c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived) || !isTicked(c['On Serve page'])) return [];
    var f = systemTab_(SYS_TAB.requestFiles).find('Category id', GIVING_ID);
    if (!f || !f['Form id']) return [];
    // The form's published link, cached like the Help page (Set up clears it), so a Serve
    // rebuild every minute doesn't open the form each time.
    var url = cache_().get(GIVING_URL_CACHE_KEY);
    if (!url) {
      url = FormApp.openById(f['Form id']).getPublishedUrl();
      try {
        cache_().put(GIVING_URL_CACHE_KEY, url, HELP_CACHE_SECONDS);
      } catch (e2) {
        // answer anyway
      }
    }
    return [{ id: GIVING_ID, label: GIVING_TEXT.offerLabel, icon: c.Icon, url: url }];
  } catch (e) {
    try {
      // At most one Log line an hour (Serve is rebuilt every minute).
      if (!cache_().get('serve_offer_logged')) {
        cache_().put('serve_offer_logged', '1', 3600);
        log_('serve offer missing', clip(e && e.message ? e.message : e, 200));
      }
    } catch (e2) {
      // nothing more to do
    }
    return [];
  }
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

/**
 * Request tiles: request categories with a form, not archived, with On Help page ticked. Never
 * the Christmas giving form (decision 17: it can only be offered on the Serve page).
 */
function apiHelp_() {
  var cached = cache_().get('help');
  if (cached) return JSON.parse(cached);
  var s = settings_();
  var files = indexBy_(systemTab_(SYS_TAB.requestFiles).rows(), 'Category id');
  var tiles = [];
  serviceTab_(TAB.categories)
    .rows()
    .forEach(function (c) {
      if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived) || !isTicked(c['On Help page'])) return;
      if (c.Id === GIVING_ID) return;
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

// ---------- abuse counters ----------
//
// Per post per minute: the script cache (lives 2 minutes), bumped by every attempt alike.
// Per address and per day: the System Sheet's Counters tab, one row per (key, day), so a count
// really lasts the whole day. Every attempt bumps them the same way, whatever the address turns
// out to be, so the answers never depend on who an address belongs to. Addresses are stored only
// as a salted hash.

function postMinuteKey_(postId, nowLocal) {
  return postId ? 'RP_' + nowLocal.slice(0, 10).replace(/-/g, '') + '_' + postId + '_' + nowLocal.slice(11).replace(':', '') : '';
}

function readCount_(key) {
  return key ? Number(cache_().get(key)) || 0 : 0;
}

function bumpCount_(key) {
  if (key) cache_().put(key, String(readCount_(key) + 1), 120);
}

/** An address as the counters and the Log keep it: a salted hash (salt: the System Sheet id). */
function addrTag_(email) {
  return sha256Hex_(String(props_().getProperty('SYSTEM_ID') || '') + '|' + normEmail(email)).slice(0, 32);
}

/** Today's day-long counters. Call inside the lock. */
function dayCounters_() {
  var t = systemTab_(SYS_TAB.counters);
  var today = todayLocal_();
  var map = {};
  t.rows().forEach(function (r) {
    if (r.Day === today) map[String(r.Key)] = r;
  });
  return {
    get: function (k) {
      return map[k] ? Number(map[k].Count) || 0 : 0;
    },
    bump: function (k) {
      if (map[k]) t.update(map[k], { Count: (Number(map[k].Count) || 0) + 1 });
      else map[k] = t.append({ Key: k, Day: today, Count: 1 });
    },
    countPrefix: function (prefix) {
      return Object.keys(map).filter(function (k) {
        return k.indexOf(prefix) === 0;
      }).length;
    },
  };
}

/** Removes counter rows from before today (gpDaily). */
function pruneCounters_() {
  withLock_(function () {
    var t = systemTab_(SYS_TAB.counters);
    var today = todayLocal_();
    t.removeMany(
      t.rows().filter(function (r) {
        return r.Day !== today;
      })
    );
  });
}

/** C0 and C1 control characters (CR and LF among them) and the Unicode line and paragraph separators. */
var CONTROL_CHARS_ = new RegExp(
  '[' + String.fromCharCode(0) + '-' + String.fromCharCode(0x1f) + String.fromCharCode(0x7f) + '-' + String.fromCharCode(0x9f) +
    String.fromCharCode(0x2028) + String.fromCharCode(0x2029) + ']',
  'g'
);

/** Control characters (CR, LF and the rest of C0/C1) become spaces; runs of space collapse. */
function cleanText_(v) {
  return String(v == null ? '' : v)
    .replace(CONTROL_CHARS_, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mailMsg_(to, t, priority) {
  return { to: to, subject: t.subject, html: t.html, text: t.text, priority: priority || 'normal' };
}

/**
 * Sends prepared emails after the sheet changes are committed. A failure is logged and never
 * changes the answer (the change itself already happened).
 */
function sendAll_(what, msgs) {
  (msgs || []).forEach(function (m) {
    try {
      sendOrQueue_(m);
    } catch (e) {
      try {
        log_('email not sent', what + ' | ' + clip(e && e.message ? e.message : e, 200));
      } catch (e2) {
        // nothing more to do
      }
    }
  });
}

/**
 * data: {publicId, slotId, name, email, bringing, childName}. Every accepted, duplicate, full or
 * blocked sign-up answers the same sentence; only the email differs. Limits: per address, the
 * number of different roles tried today (a parent's own and children's sign-ups for one role are
 * one); per post, attempts this minute; for the ward, sign-ups today.
 */
function apiSignup_(data) {
  data = data || {};
  var s = settings_();
  var name = cleanText_(data.name);
  var email = String(data.email == null ? '' : data.email).trim();
  var bringing = cleanText_(data.bringing);
  var childName = cleanText_(data.childName);
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
    var today = now.slice(0, 10);
    var post = findPublicPost_(d.posts, data.publicId);
    // A made-up post answers at once, the same for every address, and writes no counter.
    if (!post) return { error: TEXT.postNotFound };
    var slot = null;
    d.slots.forEach(function (sl) {
      if (sl['Slot id'] === String(data.slotId) && sl['Post id'] === post['Post id']) slot = sl;
    });
    // The limits come next and count every attempt on a real post alike, before anything about
    // the address: per address the different roles tried today, per post this minute, and the
    // ward's attempts today (key T).
    var dc = dayCounters_();
    var tag = addrTag_(email);
    var roleKey = 'R:' + tag + ':' + (slot ? slot['Slot id'] : '?');
    var minuteKey = postMinuteKey_(post['Post id'], now);
    var newRole = !dc.get(roleKey);
    var limit = rateCheck(
      { addressToday: newRole ? dc.countPrefix('R:' + tag + ':') : 0, totalToday: dc.get('T'), postMinute: readCount_(minuteKey) },
      { perAddress: LIMITS.signupEmailsPerAddressPerDay, perDay: s.signup_limit_per_day, perPostMinute: LIMITS.signupsPerPostPerMinute, leaderLinks: Infinity }
    );
    if (limit) {
      log_('sign-up limit', limit + ' | ' + post['Post id']);
      return { error: TEXT.rateLimited + contactSuffix_(s) };
    }
    dc.bump(roleKey);
    dc.bump('T');
    bumpCount_(minuteKey);
    if (childName && !allowsChildren_(post)) return { error: 'Please check the form.', fields: { childName: TEXT.noChildren } };
    var volsT = serviceTab_(TAB.volunteers);
    var byEmail = volunteersByEmail_(volsT.rows());
    var leaderList = leaders_();
    var state = volunteerState(email, byEmail, leaderEmails_(leaderList));
    var check = checkSignup({
      post: post,
      slot: slot,
      counts: countsBySlot(d.signups),
      existing: d.signups,
      email: email,
      childName: childName,
      state: state === 'blocked' ? 'new' : state,
      todayLocal: today,
      nowLocal: now,
    });
    // These answers don't depend on who the address belongs to.
    if (!check.ok && [TEXT.notOpen, TEXT.roleNotFound, TEXT.datePassed].indexOf(check.error) >= 0) return { error: check.error };
    // From here every outcome answers the same sentence; only the email differs.
    if (state === 'blocked') {
      // One "please contact" email a day per address, however often it tries.
      if (loggedToday_('blocked sign-up', tag)) return { msgs: [] };
      log_('blocked sign-up', tag);
      return { msgs: [mailMsg_(email, tplContactToSignUp_(s))] };
    }
    if (!check.ok && check.error === TEXT.roleFull) {
      var fullKey = 'F:' + tag + ':' + slot['Slot id'];
      if (dc.get(fullKey)) return { msgs: [] };
      dc.bump(fullKey);
      return { msgs: [mailMsg_(email, tplRoleFull_(s, post, slot))] };
    }
    if (!check.ok) {
      // A duplicate. When it is the address's own sign-up still waiting for its email click
      // (say the link expired), send a fresh confirm email within the limits.
      var own = d.signups.filter(function (su) {
        return (
          su['Slot id'] === slot['Slot id'] &&
          su.Status === SIGNUP_STATUS.waitingEmail &&
          normEmail(su.Email) === email &&
          childKey_(su['Child first name']) === childKey_(childName)
        );
      })[0];
      return { msgs: own ? confirmEmailLocked_(own, post, slot, dc, s, now) : [] };
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
    signup = serviceTab_(TAB.signups).append(signup);
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
    if (status === SIGNUP_STATUS.confirmed) {
      return { msgs: confirmationMsgs_([{ signup: signup, post: post, slot: slot, over: false }], d).concat(filledMsgsLocked_([post['Post id']], d)) };
    }
    if (status === SIGNUP_STATUS.waitingEmail) return { msgs: confirmEmailLocked_(signup, post, slot, dc, s, now) };
    var firstPost = indexBy_(d.posts, 'Post id')[vrow['First post']] || post;
    return { msgs: approverMsgs_(firstPost, vrow.Name || name, [{ post: post, slot: slot }]) };
  });
  if (done.error) {
    var refused = { ok: false, error: done.error };
    if (done.fields) refused.fields = done.fields;
    return refused;
  }
  clearServeCache_();
  sendAll_('sign-up', done.msgs);
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

/**
 * A confirm-your-address email for a Waiting-email sign-up, within the day's limits (3 per
 * address, Settings confirm_limit_per_day in all). A new link replaces the sign-up's older ones.
 * Call inside the lock. Returns the messages to send ([] past a limit).
 */
function confirmEmailLocked_(signup, post, slot, dc, s, now) {
  var ca = 'CA:' + addrTag_(signup.Email);
  if (dc.get(ca) >= LIMITS.confirmEmailsPerAddressPerDay || dc.get('CT') >= s.confirm_limit_per_day) {
    log_('confirm email limit', post['Post id']);
    return [];
  }
  dc.bump(ca);
  dc.bump('CT');
  revokeTokens_('confirm', signup['Sign-up id']);
  var ct = issueToken_('confirm', signup['Sign-up id'], localMinusHours(now, -CONFIRM_LINK_HOURS));
  return [mailMsg_(normEmail(signup.Email), tplConfirmAddress_(s, post, slot, signup, pageUrl_(s, 'confirm', { t: ct })))];
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

/** "Someone new is waiting": messages to the approvers of the volunteer's first post. */
function approverMsgs_(firstPost, name, items) {
  if (!items.length) return [];
  var t = tplWaitingNotice_(settings_(), name, items);
  return approversFor(firstPost, leaders_()).map(function (to) {
    return mailMsg_(to, t);
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
 * Call inside the lock: issues the links and builds the email for each newly counted sign-up:
 * the confirmation (private details, cancel link, My sign-ups link, other ways to serve) or, when
 * it is over the number, the withdraw email (its link ends when the role starts). One My sign-ups
 * link per address per batch (a new one replaces the old).
 */
function confirmationMsgs_(items, d) {
  var s = settings_();
  var slotsById = indexBy_(d.slots, 'Slot id');
  var meByEmail = {};
  return items.map(function (it) {
    var e = normEmail(it.signup.Email);
    if (!meByEmail[e]) meByEmail[e] = issueMeToken_(e, d.signups, slotsById);
    var meUrl = pageUrl_(s, 'me', { t: meByEmail[e] });
    var id = it.signup['Sign-up id'];
    var t;
    if (it.over) {
      var wt = issueToken_('withdraw', id, slotStart(it.slot));
      t = tplOverLimit_(s, it.post, it.slot, it.signup, { withdrawUrl: pageUrl_(s, 'confirm', { t: wt }), meUrl: meUrl, details: true });
    } else {
      var ct = issueToken_('cancel', id, addDays(it.slot.Date, 1) + ' 23:59');
      t = tplSignupConfirmed_(s, it.post, it.slot, it.signup, {
        cancelUrl: pageUrl_(s, 'confirm', { t: ct }),
        meUrl: meUrl,
        details: true,
        otherWays: otherWays_(s, d, it.post['Post id']),
      });
    }
    return mailMsg_(e, t);
  });
}

/**
 * Call inside the lock. "Fully filled": once per post (checked and logged here), when every role
 * dated today or later has its number. To the post's notice recipients and its category's
 * coordinators. Returns the messages.
 */
function filledMsgsLocked_(postIds, d) {
  var s = settings_();
  var today = todayLocal_();
  var counts = countsBySlot(d.signups);
  var postsById = indexBy_(d.posts, 'Post id');
  var slotsByPost = groupBy_(d.slots, 'Post id');
  var msgs = [];
  uniq_(postIds || []).forEach(function (id) {
    var post = postsById[id];
    if (!post || post.Status !== POST_STATUS.open) return;
    if (!postSummary(post, slotsByPost[id] || [], counts, today).full) return;
    if (loggedEver_('filled notice', id)) return;
    log_('filled notice', id);
    var t = tplFullyFilled_(s, post);
    uniq_(noticeRecipients(post, leaders_()).concat(categoryCoordinators_(post.Category))).forEach(function (to) {
      msgs.push(mailMsg_(to, t));
    });
  });
  return msgs;
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
    var firstPost = postsById[vrow['First post']] || f.post;
    var msgs = approverMsgs_(firstPost, vrow.Name || f.signup.Name, moved)
      .concat(confirmationMsgs_(confirmed, d))
      .concat(
        filledMsgsLocked_(
          confirmed.map(function (c) {
            return c.post['Post id'];
          }),
          d
        )
      );
    return { msgs: msgs, lapsedOwn: lapsedOwn };
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: TEXT.alreadyConfirmed };
  clearServeCache_();
  sendAll_('confirm', done.msgs);
  return { ok: true, message: done.lapsedOwn ? TEXT.confirmedPassed : TEXT.addressConfirmed };
}

/** The cancel notice to the post's leaders and its category's coordinators (urgent wording after the cutoff, unless still full). */
function cancelNoticeMsgs_(f, late, stillFull) {
  var t = tplCancelNotice_(settings_(), f.post, f.slot, f.signup, late, stillFull);
  return uniq_(noticeRecipients(f.post, leaders_()).concat(categoryCoordinators_(f.post.Category))).map(function (to) {
    return mailMsg_(to, t, 'high');
  });
}

function cutoffOf_(post) {
  return post['Cancel cutoff hours'] === '' ? settings_().default_cancel_cutoff_hours : post['Cancel cutoff hours'];
}

/**
 * Call inside the lock: cancels an active sign-up and its links. A waiting sign-up never counted,
 * so leaders hear nothing; a Confirmed one gives the cancel notice. {error} | {already} | {msgs}.
 */
function cancelSignupLocked_(f) {
  var waiting = isWaitingSignup_(f.signup.Status);
  if (f.signup.Status !== SIGNUP_STATUS.confirmed && !waiting) return { already: true };
  var now = nowLocal_();
  serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.cancelled, 'Cancelled at': now });
  var filled = refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
  revokeSignupTokens_(f.signup['Sign-up id']);
  if (waiting) return { msgs: [] };
  return { msgs: cancelNoticeMsgs_(f, cancelIsLate(f.slot, cutoffOf_(f.post), now), filled >= (Number(f.slot.Needed) || 0)) };
}

function cancelAnswer_(done) {
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: TEXT.alreadyCancelled };
  clearServeCache_();
  sendAll_('cancel', done.msgs);
  return { ok: true, message: TEXT.cancelled };
}

/** Cancel link (confirmation email, reminder). */
function apiCancel_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || row.kind !== 'cancel') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  return cancelAnswer_(
    withLock_(function () {
      var f = signupById_(row.subject);
      return f ? cancelSignupLocked_(f) : { error: TEXT.linkInvalid };
    })
  );
}

/** The My sign-ups link (t) and one of its own sign-ups (signupId), or an error answer. */
function mySignupLocked_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || row.kind !== 'me') return { error: TEXT.linkInvalid };
  if (row.expired) return { error: TEXT.linkExpired };
  var f = signupById_(data.signupId);
  if (!f || normEmail(f.signup.Email) !== normEmail(row.subject)) return { error: TEXT.notFound };
  return { f: f };
}

/** Cancel from My sign-ups: the "me" link plus the sign-up id, which must be that address's. */
function apiCancelMine_(data) {
  return cancelAnswer_(
    withLock_(function () {
      var x = mySignupLocked_(data);
      return x.error ? x : cancelSignupLocked_(x.f);
    })
  );
}

/** My sign-ups: "Send the confirm email again" for a sign-up still waiting for its email click. */
function apiResendConfirm_(data) {
  var done = withLock_(function () {
    var x = mySignupLocked_(data);
    if (x.error) return x;
    var f = x.f;
    var now = nowLocal_();
    var passed = f.slot.Start ? slotStart(f.slot) < now : f.slot.Date < now.slice(0, 10);
    if (f.signup.Status !== SIGNUP_STATUS.waitingEmail || passed) return { error: TEXT.notWaitingEmail };
    var msgs = confirmEmailLocked_(f.signup, f.post, f.slot, dayCounters_(), settings_(), now);
    return msgs.length ? { msgs: msgs } : { error: TEXT.resendLimit };
  });
  if (done.error) return { ok: false, error: done.error };
  sendAll_('resend confirm', done.msgs);
  return { ok: true, message: TEXT.resent };
}

/**
 * Withdraw link (over-limit email): the offer is withdrawn and, since the role still has its
 * number, nobody is told. If cancellations since then left it short, the leaders are told as
 * for a cancellation. Refused once the role has started.
 */
function apiWithdraw_(data) {
  var row = tokenRow_(data && data.t);
  if (!row || row.kind !== 'withdraw') return { ok: false, error: TEXT.linkInvalid };
  if (row.expired) return { ok: false, error: TEXT.linkExpired };
  var done = withLock_(function () {
    var f = signupById_(row.subject);
    if (!f) return { error: TEXT.linkInvalid };
    if (f.signup.Status !== SIGNUP_STATUS.confirmed) return { error: TEXT.notActive };
    var now = nowLocal_();
    if (now >= slotStart(f.slot)) return { error: TEXT.alreadyHappened };
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.withdrawn, 'Cancelled at': now });
    var filled = refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    revokeSignupTokens_(f.signup['Sign-up id']);
    var stillFull = filled >= (Number(f.slot.Needed) || 0);
    return { msgs: stillFull ? [] : cancelNoticeMsgs_(f, cancelIsLate(f.slot, cutoffOf_(f.post), now), false) };
  });
  if (done.error) return { ok: false, error: done.error };
  clearServeCache_();
  sendAll_('withdraw', done.msgs);
  return { ok: true, message: TEXT.withdrawn };
}

function apiRequestLeaderLink_(data) {
  return requestLeaderLink_(data && data.email);
}

// ---------- My sign-ups ----------

var NAME_TITLES = ['brother', 'sister', 'elder', 'bishop', 'president'];

/**
 * A first name to show other volunteers: a child's first name, else the first word of Name that
 * isn't a title (Brother, Sister, Elder, Bishop, President); "Sister Jones" → "Jones".
 */
function firstName_(su) {
  var child = String(su['Child first name'] || '').trim();
  if (child) return child;
  var words = String(su.Name || '').trim().split(/\s+/).filter(String);
  for (var i = 0; i < words.length; i++) {
    if (NAME_TITLES.indexOf(words[i].toLowerCase()) < 0) return words[i];
  }
  return words[0] || '';
}

/**
 * My sign-ups (a "me" link). Read-only. Only this address's sign-ups: upcoming (waiting or
 * confirmed, today or later; each cancelled with the me link and its id) and past (confirmed, date
 * gone). For an approved volunteer or a leader: the other volunteers' first names on the same post
 * (confirmed only, no emails), the private details while the post is on, and other ways to serve
 * (fill levels only).
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
      item.signupId = su['Sign-up id'];
      item.canResend = su.Status === SIGNUP_STATUS.waitingEmail;
      upcoming.push(item);
    }
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
  var msgs = withLock_(function () {
    var d = volunteerData_();
    var has = d.signups.some(function (su) {
      return normEmail(su.Email) === email;
    });
    if (!has) return [];
    var tag = addrTag_('me:' + email);
    var today = todayLocal_();
    var count = systemTab_(SYS_TAB.log)
      .rows()
      .filter(function (r) {
        return r.What === 'me link requested' && String(r.Detail) === tag && String(r.At).slice(0, 10) === today;
      }).length;
    if (count >= LIMITS.meLinksPerAddressPerDay) return [];
    log_('me link requested', tag);
    var s = settings_();
    var t = issueMeToken_(email, d.signups, indexBy_(d.slots, 'Slot id'));
    return [mailMsg_(email, tplMeLink_(s, pageUrl_(s, 'me', { t: t })))];
  });
  sendAll_('me link', msgs);
  return answer;
}
