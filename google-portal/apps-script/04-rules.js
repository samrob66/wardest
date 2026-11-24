/**
 * Volunteer rules. Pure: plain objects in (keyed as in the tabs), plain objects out.
 */

function str_(v) {
  return String(v == null ? '' : v).trim();
}

function audiencesOf_(v) {
  var list = Array.isArray(v) ? v : splitList(v);
  return AUDIENCES.filter(function (a) {
    return list.indexOf(a) >= 0;
  });
}

function isWholeIn_(v, lo, hi) {
  if (v === '' || v === null || v === undefined || typeof v === 'boolean') return false;
  var n = Number(v);
  return isFinite(n) && Math.floor(n) === n && n >= lo && n <= hi;
}

/**
 * Checks a post typed on the leader page.
 * input: {postId?, organization, category, title, audiences[], publicNote, privateDetails,
 *         cutoffHours, slots: [{slotId?, date, start, end, role, needed, roleNote, bringingPrompt}]}
 * ctx:   {allowedOrgs[], categoryIds[], todayLocal, publish, requireCategory?, keepDates?: {slotId: date}}
 *        requireCategory: a new post must have a category (old posts without one stay editable).
 *        keepDates lists existing slots: one whose date is unchanged may be in the past when a
 *        running post (a meal train under way) is saved again.
 */
function validatePost(input, ctx) {
  input = input || {};
  var errors = {};
  var title = str_(input.title);
  if (!title || title.length > 100) errors.title = 'Type a title (up to 100 characters).';
  var organization = str_(input.organization);
  if ((ctx.allowedOrgs || []).indexOf(organization) < 0) errors.organization = 'Pick an organization you lead.';
  var category = str_(input.category);
  if (!category && ctx.requireCategory) errors.category = TEXT.pickCategory;
  else if (category && (ctx.categoryIds || []).indexOf(category) < 0) errors.category = 'Pick a category from the list.';
  var rawAud = Array.isArray(input.audiences) ? input.audiences.map(str_) : splitList(input.audiences);
  var audiences = audiencesOf_(rawAud);
  if (!rawAud.length) errors.audiences = 'Pick at least one audience';
  else if (audiences.length !== rawAud.length) errors.audiences = 'Pick audiences from the list.';
  var publicNote = String(input.publicNote == null ? '' : input.publicNote).trim();
  if (publicNote.length > 2000) errors.publicNote = 'Keep the public note under 2,000 characters.';
  var privateDetails = String(input.privateDetails == null ? '' : input.privateDetails).trim();
  if (privateDetails.length > 1000) errors.privateDetails = 'Keep the private details under 1,000 characters.';
  var cutoff = input.cutoffHours;
  if (cutoff === null || cutoff === undefined || str_(cutoff) === '') cutoff = '';
  else if (!isWholeIn_(cutoff, 0, 168)) errors.cutoffHours = 'Use a whole number of hours from 0 to 168.';
  else cutoff = Number(cutoff);

  var inSlots = Array.isArray(input.slots) ? input.slots : [];
  if (!inSlots.length) errors.slots = 'Add at least one date.';
  if (inSlots.length > 100) errors.slots = 'Use at most 100 dates and roles.';
  var keep = ctx.keepDates || {};
  var slots = inSlots.slice(0, 100).map(function (s, i) {
    s = s || {};
    var k = 'slots[' + i + '].';
    var date = str_(s.date);
    var slotId = str_(s.slotId);
    if (!isDateStr(date)) errors[k + 'date'] = 'Pick a date.';
    else if (ctx.publish && date < ctx.todayLocal && !(slotId && keep[slotId] === date)) {
      errors[k + 'date'] = 'This date has passed.';
    }
    var start = str_(s.start);
    var end = str_(s.end);
    if (start) {
      start = normTime(start);
      if (!start) errors[k + 'start'] = 'Use a time like 18:30.';
    }
    if (end) {
      end = normTime(end);
      if (!end) errors[k + 'end'] = 'Use a time like 18:30.';
    }
    if (start && end && end <= start) errors[k + 'end'] = 'End after the start.';
    var role = str_(s.role);
    if (!role || role.length > 60) errors[k + 'role'] = 'Type the role (up to 60 characters).';
    if (!isWholeIn_(s.needed, 1, 200)) errors[k + 'needed'] = 'Use a whole number from 1 to 200.';
    var roleNote = str_(s.roleNote);
    if (roleNote.length > 300) errors[k + 'roleNote'] = 'Keep the note under 300 characters.';
    var bringingPrompt = str_(s.bringingPrompt);
    if (bringingPrompt.length > 100) errors[k + 'bringingPrompt'] = 'Keep the question under 100 characters.';
    return {
      slotId: slotId,
      date: date,
      start: start,
      end: end,
      role: role,
      needed: Number(s.needed),
      roleNote: roleNote,
      bringingPrompt: bringingPrompt,
    };
  });

  if (Object.keys(errors).length) return { ok: false, errors: errors };
  return {
    ok: true,
    post: {
      postId: str_(input.postId),
      organization: organization,
      category: category,
      title: title,
      audiences: audiences,
      publicNote: publicNote,
      privateDetails: privateDetails,
      cutoffHours: cutoff,
    },
    slots: slots,
  };
}

/** {slotId: {filled, waiting}}: filled = Confirmed; waiting = phase 2 waiting statuses. */
function countsBySlot(signups) {
  var out = {};
  (signups || []).forEach(function (s) {
    var id = s['Slot id'];
    if (!out[id]) out[id] = { filled: 0, waiting: 0 };
    if (s.Status === SIGNUP_STATUS.confirmed) out[id].filled++;
    else if (s.Status === SIGNUP_STATUS.waitingEmail || s.Status === SIGNUP_STATUS.waitingApproval) out[id].waiting++;
  });
  return out;
}

function filledOf_(counts, slotId) {
  return (counts && counts[slotId] && counts[slotId].filled) || 0;
}

/** Local date-time the slot starts ('00:00' when it has no start time). */
function slotStart(slot) {
  return slot.Date + ' ' + (slot.Start || '00:00');
}

function slotOrder_(a, b) {
  return cmpLocal(slotStart(a), slotStart(b));
}

/** Card data for the serve page: counts only for slots today or later. */
function postSummary(post, slots, counts, todayLocal) {
  var upcoming = slots
    .filter(function (s) {
      return s.Date >= todayLocal;
    })
    .sort(slotOrder_);
  var needed = 0;
  var filled = 0;
  var full = upcoming.length > 0;
  upcoming.forEach(function (s) {
    var n = Number(s.Needed) || 0;
    var f = filledOf_(counts, s['Slot id']);
    needed += n;
    filled += Math.min(f, n);
    if (f < n) full = false;
  });
  return {
    publicId: post['Public id'],
    title: post.Title,
    organization: post.Organization,
    category: post.Category,
    audiences: audiencesOf_(post.Audiences),
    publicNote: post['Public note'],
    firstDate: upcoming.length ? upcoming[0].Date : '',
    lastDate: upcoming.length ? upcoming[upcoming.length - 1].Date : '',
    needed: needed,
    filled: filled,
    full: full,
    status: post.Status,
  };
}

/** The public post: titles, notes, dates, roles and counts. Nothing else. */
function publicPost(post, slots, counts, todayLocal) {
  return {
    publicId: post['Public id'],
    title: post.Title,
    organization: post.Organization,
    audiences: audiencesOf_(post.Audiences),
    publicNote: post['Public note'],
    cutoffHours: post['Cancel cutoff hours'] === '' ? '' : Number(post['Cancel cutoff hours']),
    status: post.Status,
    slots: slots
      .slice()
      .sort(slotOrder_)
      .map(function (s) {
        var needed = Number(s.Needed) || 0;
        var filled = filledOf_(counts, s['Slot id']);
        return {
          slotId: s['Slot id'],
          date: s.Date,
          start: s.Start,
          end: s.End,
          role: s.Role,
          needed: needed,
          filled: filled,
          roleNote: s['Role note'] || '',
          bringingPrompt: s['Bringing prompt'] || '',
          full: filled >= needed,
          past: s.Date < todayLocal,
        };
      }),
  };
}

/** A child's first name as compared for duplicates ('' = the parent). */
function childKey_(v) {
  return str_(v).toLowerCase();
}

function isActiveSignup_(status) {
  return ACTIVE_SIGNUP_STATUSES.indexOf(status) >= 0;
}

function isWaitingSignup_(status) {
  return status === SIGNUP_STATUS.waitingEmail || status === SIGNUP_STATUS.waitingApproval;
}

/**
 * Can this person sign up for this slot now?
 * a: {post, slot, counts, existing, email, childName?, state?, todayLocal, nowLocal}.
 * A slot with a start time closes at its start; one without stays open all of its day.
 * Duplicates are per (address, role, child first name) among active sign-ups (Waiting-*,
 * Confirmed). A full role refuses a sign-up that would count at once (state approved or leader;
 * no state = counts at once); one that must wait for an email click or an approval may wait.
 */
function checkSignup(a) {
  var post = a.post;
  var slot = a.slot;
  if (!post || post.Status !== POST_STATUS.open) return { ok: false, error: TEXT.notOpen };
  if (!slot || slot['Post id'] !== post['Post id']) return { ok: false, error: TEXT.roleNotFound };
  var passed = slot.Start ? slotStart(slot) < a.nowLocal : slot.Date < a.nowLocal.slice(0, 10);
  if (passed) return { ok: false, error: TEXT.datePassed };
  var email = normEmail(a.email);
  var child = childKey_(a.childName);
  var dup = (a.existing || []).some(function (s) {
    return (
      s['Slot id'] === slot['Slot id'] &&
      isActiveSignup_(s.Status) &&
      normEmail(s.Email) === email &&
      childKey_(s['Child first name']) === child
    );
  });
  if (dup) return { ok: false, error: TEXT.alreadySignedUp };
  var countsNow = !a.state || a.state === 'approved' || a.state === 'leader';
  if (countsNow && filledOf_(a.counts, slot['Slot id']) >= (Number(slot.Needed) || 0)) return { ok: false, error: TEXT.roleFull };
  return { ok: true };
}

/** True when the role already has its number before this sign-up counts (over-filling). */
function overLimitOnConfirm(slot, counts) {
  return filledOf_(counts, slot['Slot id']) >= (Number(slot.Needed) || 0);
}

// ---------- volunteers: approval states ----------

/** {normalized email: Volunteers row}. */
function volunteersByEmail_(rows) {
  var out = {};
  (rows || []).forEach(function (v) {
    var e = normEmail(v.Email);
    if (e) out[e] = v;
  });
  return out;
}

/**
 * 'leader' (on the Leaders tab: skips approval) | 'approved' | 'pending-confirmed' (clicked the
 * confirm link, waits for a leader) | 'pending-new' (has not clicked it) | 'new' (never seen) |
 * 'blocked' (Declined or Revoked). volunteersByEmail is keyed by normalized email; a status
 * nobody knows counts as Pending.
 */
function volunteerState(email, volunteersByEmail, leaderEmails) {
  var e = normEmail(email);
  var leaders = (leaderEmails || []).map(normEmail);
  if (e && leaders.indexOf(e) >= 0) return 'leader';
  var v = volunteersByEmail ? volunteersByEmail[e] : null;
  if (!v) return 'new';
  var st = str_(v.Status);
  if (st === VOLUNTEER_STATUS.approved) return 'approved';
  if (st === VOLUNTEER_STATUS.declined || st === VOLUNTEER_STATUS.revoked) return 'blocked';
  return str_(v['Email confirmed at']) ? 'pending-confirmed' : 'pending-new';
}

/** The status a new sign-up gets; null = blocked (nothing is stored). */
function signupStatusFor(state) {
  if (state === 'leader' || state === 'approved') return SIGNUP_STATUS.confirmed;
  if (state === 'pending-confirmed') return SIGNUP_STATUS.waitingApproval;
  if (state === 'pending-new' || state === 'new') return SIGNUP_STATUS.waitingEmail;
  return null;
}

/**
 * May this leader approve or decline this volunteer? The bishopric always; otherwise only a
 * leader who edits the organization of the volunteer's first post (coordinators don't approve).
 */
function canApprove(access, leaderEmail, volunteer, firstPost) {
  if (!access || !volunteer) return false;
  if (access.isBishopric) return true;
  if (!firstPost) return false;
  return (access.editOrgs || []).indexOf(firstPost.Organization) >= 0;
}

/**
 * Who may approve volunteers whose first post is this one: Leaders with Org editor or Ward
 * council ticked in its organization, plus every Bishopric leader. Normalized, de-duplicated.
 */
function approversFor(post, leaders) {
  var org = post ? str_(post.Organization) : '';
  var out = [];
  (leaders || []).forEach(function (l) {
    if (!isEmail(l.Email)) return;
    var mine = !!org && str_(l.Organization) === org && (isTicked(l['Org editor']) || isTicked(l['Ward council']));
    if (isTicked(l.Bishopric) || mine) out.push(normEmail(l.Email));
  });
  return uniq_(out);
}

/** True once now is at or past (slot start − cutoff hours). */
function cancelIsLate(slot, cutoffHours, nowLocal) {
  var h = Number(cutoffHours) || 0;
  return nowLocal >= localMinusHours(slotStart(slot), h);
}

/**
 * Sign-up ids whose day-before reminder is due now. Every Confirmed sign-up gets one unless its
 * post is Past or Cancelled: Close and Draft only stop new sign-ups.
 */
function remindersDue(signups, slotsById, postsById, nowLocal, reminderHour) {
  var today = nowLocal.slice(0, 10);
  var tomorrow = addDays(today, 1);
  if (Number(nowLocal.slice(11, 13)) < Number(reminderHour)) return [];
  return signups
    .filter(function (s) {
      if (s.Status !== SIGNUP_STATUS.confirmed || s['Reminded at']) return false;
      var slot = slotsById[s['Slot id']];
      var post = postsById[s['Post id']];
      if (!slot || !post) return false;
      if (post.Status === POST_STATUS.past || post.Status === POST_STATUS.cancelled) return false;
      return slot.Date === tomorrow;
    })
    .map(function (s) {
      return s['Sign-up id'];
    });
}

/** Open or Closed posts whose every slot date is before today. */
function postsToMarkPast(posts, slotsByPost, todayLocal) {
  return posts
    .filter(function (p) {
      if (p.Status !== POST_STATUS.open && p.Status !== POST_STATUS.closed) return false;
      var slots = slotsByPost[p['Post id']] || [];
      return (
        slots.length > 0 &&
        slots.every(function (s) {
          return s.Date < todayLocal;
        })
      );
    })
    .map(function (p) {
      return p['Post id'];
    });
}

/**
 * What a leader may do, from the Leaders tab's role boxes and the Categories tab.
 * Base rights (no category): Bishopric: every organization. Ward council: see every post's
 * names; edit and create for their own organization. Org editor: see, edit and create for their
 * own organization only.
 * Creating in an opportunity category (service spec section 3; catOrgs[id] = the organizations a
 * new post in it may belong to):
 *   - the bishopric always (any organization);
 *   - its Coordinators (the category's owning organizations; any organization when it has none);
 *   - a category WITH coordinators: only those, the bishopric, and Ward council leaders when
 *     "Any ward council may create" is ticked;
 *   - a category WITHOUT coordinators: leaders (Org editor / Ward council) of its owning
 *     organizations, anyone with base rights when it has no owning organization, and Ward
 *     council leaders when "Any ward council may create" is ticked.
 * Coordinators also see and edit every post of their categories, of any organization. The
 * Coordinator box alone gives nothing: a category must list them.
 * categories: Categories rows (optional; without them only the base rights apply).
 */
function leaderAccess(leader, organizations, categories) {
  var orgs = (organizations || []).slice();
  var bishopric = isTicked(leader.Bishopric);
  var wardCouncil = isTicked(leader['Ward council']);
  var orgEditor = isTicked(leader['Org editor']);
  var own = str_(leader.Organization);
  var ownList = orgs.indexOf(own) >= 0 ? [own] : [];
  var edit = bishopric ? orgs : wardCouncil || orgEditor ? ownList : [];
  var me = normEmail(leader.Email);
  var coordinated = [];
  var catOrgs = {};
  var catIds = [];
  (categories || []).forEach(function (c) {
    var id = str_(c.Id);
    if (!id || c.Kind !== CATEGORY_KIND.opportunity || isTicked(c.Archived)) return;
    catIds.push(id);
    var coords = splitList(c.Coordinators).filter(isEmail).map(normEmail);
    var owners = splitList(c['Owning organizations']).filter(function (o) {
      return orgs.indexOf(o) >= 0;
    });
    var isCoord = !!me && coords.indexOf(me) >= 0;
    var wcFlag = wardCouncil && isTicked(c['Any ward council may create']);
    if (isCoord) coordinated.push(id);
    var allowed;
    if (bishopric) allowed = orgs.slice();
    else if (isCoord) allowed = owners.length ? owners : orgs.slice();
    else if (coords.length) allowed = wcFlag ? (owners.length ? owners : ownList.slice()) : [];
    else if (owners.length) {
      allowed = owners.filter(function (o) {
        return edit.indexOf(o) >= 0 || wcFlag;
      });
    } else allowed = uniq_(edit.concat(wcFlag ? ownList : []));
    if (allowed.length) catOrgs[id] = allowed;
  });
  var create = edit.slice();
  Object.keys(catOrgs).forEach(function (id) {
    create = create.concat(catOrgs[id]);
  });
  return {
    isBishopric: bishopric,
    seeAllNames: bishopric || wardCouncil,
    editOrgs: edit.slice(),
    createOrgs: uniq_(create),
    baseCreateOrgs: edit.slice(),
    categories: coordinated,
    catOrgs: catOrgs,
    catIds: catIds,
  };
}

/** Organizations a new post may belong to: the base ones without a category, else the category's rule. */
function allowedOrgsFor_(access, category) {
  var cat = str_(category);
  if (!cat) return (access.baseCreateOrgs || access.createOrgs || []).slice();
  return ((access.catOrgs && access.catOrgs[cat]) || []).slice();
}

function coordinates_(access, post) {
  return !!post.Category && (access.categories || []).indexOf(String(post.Category)) >= 0;
}

function canSeePost(access, post) {
  return !!(access.seeAllNames || access.editOrgs.indexOf(post.Organization) >= 0 || coordinates_(access, post));
}

/**
 * Who may edit a post: its creator; the bishopric; its category's coordinators (any
 * organization); otherwise whoever may create a post in its category for its organization (the
 * base organization rights when it has no category, or a category the Categories tab no longer
 * lists).
 */
function canEditPost(access, leaderEmail, post) {
  var me = normEmail(leaderEmail);
  if (me && normEmail(post['Created by']) === me) return true;
  if (access.isBishopric || coordinates_(access, post)) return true;
  var cat = str_(post.Category);
  if (cat && (access.catIds || []).indexOf(cat) >= 0) return allowedOrgsFor_(access, cat).indexOf(post.Organization) >= 0;
  return access.editOrgs.indexOf(post.Organization) >= 0;
}

/**
 * Who hears about a cancellation: the post's creator (while still on the Leaders tab) and the
 * Leaders with Org editor ticked in the post's organization. Normalized and de-duplicated.
 */
function noticeRecipients(post, leaders) {
  var onTab = {};
  leaders.forEach(function (l) {
    onTab[normEmail(l.Email)] = true;
  });
  var out = [];
  var creator = normEmail(post['Created by']);
  if (creator && onTab[creator]) out.push(creator);
  leaders.forEach(function (l) {
    if (isTicked(l['Org editor']) && str_(l.Organization) === post.Organization && isEmail(l.Email)) {
      out.push(normEmail(l.Email));
    }
  });
  return uniq_(out);
}

/**
 * The spec section 7.3 limits. counts: {addressToday, totalToday, postMinute, leaderLinksToday}
 * (counts before this attempt); limits: {perAddress, perDay, perPostMinute, leaderLinks}.
 * Returns null, or the name of the first limit reached.
 */
function rateCheck(counts, limits) {
  var c = counts || {};
  if ((c.addressToday || 0) >= limits.perAddress) return 'perAddress';
  if ((c.totalToday || 0) >= limits.perDay) return 'perDay';
  if ((c.postMinute || 0) >= limits.perPostMinute) return 'perPostMinute';
  if ((c.leaderLinksToday || 0) >= limits.leaderLinks) return 'leaderLinks';
  return null;
}

// ---------- timed rules: nudges, lapses, warnings, Needs help soon ----------

function keySent_(sentKeys, key) {
  if (!sentKeys) return false;
  if (Array.isArray(sentKeys)) return sentKeys.indexOf(key) >= 0;
  return !!sentKeys[key];
}

/**
 * [{postId, date, key}]: a post date with a Waiting-approval sign-up whose role starts within the
 * next 48 hours (and hasn't started). One per post and date; key 'postId|date' is skipped once it
 * is in sentKeys.
 */
function nudgesDue(signups, slotsById, postsById, nowLocal, sentKeys) {
  var limit = localMinusHours(nowLocal, -NUDGE_HOURS);
  var seen = {};
  var out = [];
  (signups || []).forEach(function (s) {
    if (s.Status !== SIGNUP_STATUS.waitingApproval) return;
    var slot = slotsById[s['Slot id']];
    var post = postsById[s['Post id']];
    if (!slot || !post) return;
    if (post.Status === POST_STATUS.past || post.Status === POST_STATUS.cancelled) return;
    var start = slotStart(slot);
    if (start < nowLocal || start > limit) return;
    var key = post['Post id'] + '|' + slot.Date;
    if (seen[key] || keySent_(sentKeys, key)) return;
    seen[key] = true;
    out.push({ postId: post['Post id'], date: slot.Date, key: key });
  });
  return out;
}

/** Sign-up ids still waiting (email or approval) whose date has passed, or whose role is gone. */
function lapsesDue(signups, slotsById, todayLocal) {
  return (signups || [])
    .filter(function (s) {
      if (!isWaitingSignup_(s.Status)) return false;
      var slot = slotsById[s['Slot id']];
      return !slot || slot.Date < todayLocal;
    })
    .map(function (s) {
      return s['Sign-up id'];
    });
}

/** A category's warning lead time in hours: blank → 48; 0 or not a number → off (0); at most 336. */
function warnHours_(category) {
  var v = category ? category['Warn hours'] : '';
  if (v === '' || v === null || v === undefined) return DEFAULT_WARN_HOURS;
  var n = Number(v);
  if (!isFinite(n) || n <= 0) return 0;
  return Math.min(336, Math.floor(n));
}

/**
 * [{postId, date, key, short: [{slotId, role, start, filled, needed}]}]: for each Open post date
 * (its earliest start) within its category's Warn hours and not yet started, when any role on it
 * is short. Once per post and date (key 'postId|date' in sentKeys).
 */
function warningsDue(posts, slotsByPost, counts, categoriesById, nowLocal, sentKeys) {
  var out = [];
  (posts || []).forEach(function (p) {
    if (p.Status !== POST_STATUS.open) return;
    var cat = categoriesById[p.Category];
    var hours = warnHours_(cat);
    if (!cat || !hours) return;
    var limit = localMinusHours(nowLocal, -hours);
    var byDate = {};
    (slotsByPost[p['Post id']] || []).forEach(function (sl) {
      (byDate[sl.Date] = byDate[sl.Date] || []).push(sl);
    });
    Object.keys(byDate)
      .sort()
      .forEach(function (date) {
        var slots = byDate[date].slice().sort(slotOrder_);
        var start = slotStart(slots[0]);
        if (start < nowLocal || start > limit) return;
        var key = p['Post id'] + '|' + date;
        if (keySent_(sentKeys, key)) return;
        var short = [];
        slots.forEach(function (sl) {
          var needed = Number(sl.Needed) || 0;
          var filled = filledOf_(counts, sl['Slot id']);
          if (filled < needed) short.push({ slotId: sl['Slot id'], role: sl.Role, start: sl.Start || '', filled: filled, needed: needed });
        });
        if (short.length) out.push({ postId: p['Post id'], date: date, key: key, short: short });
      });
  });
  return out;
}

/**
 * Short roles of Open posts dated today through the next 14 days, by date and time:
 * [{postId, publicId, title, organization, category, date, start, end, role, filled, needed}].
 */
function needsHelpSoon(posts, slotsByPost, counts, todayLocal) {
  var last = addDays(todayLocal, NEEDS_HELP_DAYS);
  var rows = [];
  (posts || []).forEach(function (p) {
    if (p.Status !== POST_STATUS.open) return;
    (slotsByPost[p['Post id']] || []).forEach(function (sl) {
      if (sl.Date < todayLocal || sl.Date > last) return;
      var needed = Number(sl.Needed) || 0;
      var filled = filledOf_(counts, sl['Slot id']);
      if (filled >= needed) return;
      rows.push({
        postId: p['Post id'],
        publicId: p['Public id'],
        title: p.Title,
        organization: p.Organization,
        category: p.Category,
        date: sl.Date,
        start: sl.Start || '',
        end: sl.End || '',
        role: sl.Role,
        filled: filled,
        needed: needed,
      });
    });
  });
  return rows.sort(function (a, b) {
    return cmpLocal(a.date + ' ' + (a.start || '00:00'), b.date + ' ' + (b.start || '00:00')) || cmpLocal(a.title, b.title);
  });
}
