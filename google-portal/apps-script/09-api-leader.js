/**
 * Leader API: what leader.html calls with a leader link (k). Every handler starts by checking
 * the link against the Leaders tab; what the leader may see and change comes from
 * leaderAccess() (role boxes plus the categories they coordinate). Emails of volunteers go only
 * to leaders who may edit the post, and to approvers on Waiting for approval.
 */

function relink_() {
  return { ok: false, error: TEXT.leaderRelink, relink: true };
}

/** {leader, email, access, s, categories} or null when the link is not valid now. */
function leaderCtx_(data) {
  var leader = leaderFromLink_(data && data.k);
  if (!leader) return null;
  var s = settings_();
  var categories = serviceTab_(TAB.categories).rows();
  return { leader: leader, email: normEmail(leader.Email), access: leaderAccess(leader, s.organizations, categories), s: s, categories: categories };
}

function opportunityCategories_() {
  return serviceTab_(TAB.categories)
    .rows()
    .filter(function (c) {
      return c.Kind === CATEGORY_KIND.opportunity && !isTicked(c.Archived) && c.Id;
    })
    .map(function (c) {
      return { id: String(c.Id), name: c.Name, icon: c.Icon, audiences: audiencesOf_(c['Default audiences']) };
    });
}

/** Categories this leader may create in (leaderAccess catOrgs). */
function creatableCategories_(access) {
  return opportunityCategories_().filter(function (c) {
    return access.catOrgs && access.catOrgs[c.id];
  });
}

function apiWhoami_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var a = lc.access;
  return {
    ok: true,
    leader: { name: lc.leader.Name, calling: lc.leader.Calling, organization: lc.leader.Organization },
    access: {
      isBishopric: a.isBishopric,
      isCouncil: a.seeAllNames,
      canApprove: a.isBishopric || a.editOrgs.length > 0,
      createOrgs: a.createOrgs,
      baseCreateOrgs: a.baseCreateOrgs,
      editOrgs: a.editOrgs,
      catOrgs: a.catOrgs,
      coordinates: a.categories,
    },
    organizations: lc.s.organizations,
    categories: creatableCategories_(a),
    defaults: { cutoffHours: lc.s.default_cancel_cutoff_hours },
  };
}

function slotOut_(sl, counts) {
  var c = (counts && counts[sl['Slot id']]) || { filled: 0, waiting: 0 };
  return {
    slotId: sl['Slot id'],
    date: sl.Date,
    start: sl.Start,
    end: sl.End,
    role: sl.Role,
    needed: Number(sl.Needed) || 0,
    filled: c.filled || 0,
    waiting: c.waiting || 0,
    roleNote: sl['Role note'] || '',
    bringingPrompt: sl['Bringing prompt'] || '',
  };
}

/** 'Ana (signed up by Sister Example)' for a child, else the name. */
function signupLabel_(su) {
  var child = String(su['Child first name'] || '').trim();
  return child ? child + ' (signed up by ' + su.Name + ')' : String(su.Name);
}

/** Posts the leader may see: current ones, or with {past: true} the Past and Cancelled ones. */
function apiListPosts_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var d = volunteerData_();
  var counts = countsBySlot(d.signups);
  var slotsByPost = groupBy_(d.slots, 'Post id');
  var signupsByPost = groupBy_(d.signups, 'Post id');
  var wantPast = !!(data && data.past);
  var posts = d.posts
    .filter(function (p) {
      var over = p.Status === POST_STATUS.past || p.Status === POST_STATUS.cancelled;
      if (over !== wantPast) return false;
      return canSeePost(lc.access, p) || canEditPost(lc.access, lc.email, p);
    })
    .map(function (p) {
      var canEdit = canEditPost(lc.access, lc.email, p);
      var slots = (slotsByPost[p['Post id']] || []).slice().sort(slotOrder_);
      return {
        postId: p['Post id'],
        publicId: p['Public id'],
        publicUrl: pageUrl_(lc.s, 'post', { p: p['Public id'] }),
        title: p.Title,
        organization: p.Organization,
        category: p.Category,
        audiences: audiencesOf_(p.Audiences),
        status: p.Status,
        hasPrivateDetails: !!p['Private details'],
        fromRequest: isFromRequest_(p),
        canEdit: canEdit,
        firstDate: slots.length ? slots[0].Date : '',
        slots: slots.map(function (sl) {
          return slotOut_(sl, counts);
        }),
        signups: (signupsByPost[p['Post id']] || [])
          .filter(function (su) {
            return isActiveSignup_(su.Status);
          })
          .map(function (su) {
            var o = {
              signupId: su['Sign-up id'],
              slotId: su['Slot id'],
              name: su.Name,
              childName: su['Child first name'] || '',
              label: signupLabel_(su),
              bringing: su.Bringing || '',
              status: su.Status,
              overLimit: isTicked(su['Over limit']),
            };
            if (canEdit) o.email = su.Email;
            return o;
          }),
      };
    })
    .sort(function (a, b) {
      return cmpLocal(a.firstDate, b.firstDate) || cmpLocal(a.title, b.title);
    });
  return { ok: true, posts: posts };
}

/** A draft the script made from a request (decision 19): Created by "request <id>". */
function isFromRequest_(p) {
  return /^request /.test(String(p['Created by'] == null ? '' : p['Created by']));
}

function postForEdit_(p, slots, counts) {
  return {
    postId: p['Post id'],
    publicId: p['Public id'],
    organization: p.Organization,
    category: p.Category,
    title: p.Title,
    audiences: audiencesOf_(p.Audiences),
    publicNote: p['Public note'],
    privateDetails: p['Private details'],
    cutoffHours: p['Cancel cutoff hours'],
    status: p.Status,
    fromRequest: isFromRequest_(p),
    slots: slots
      .slice()
      .sort(slotOrder_)
      .map(function (sl) {
        return slotOut_(sl, counts);
      }),
  };
}

function apiGetPost_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var d = volunteerData_();
  var p = indexBy_(d.posts, 'Post id')[String(data.postId)];
  if (!p || !canEditPost(lc.access, lc.email, p)) return { ok: false, error: TEXT.notAllowed };
  var slots = d.slots.filter(function (sl) {
    return sl['Post id'] === p['Post id'];
  });
  return { ok: true, post: postForEdit_(p, slots, countsBySlot(d.signups)) };
}

/**
 * data: {k, mode: 'draft'|'publish'|'close', post}. Writes Posts and Slots. (Through doPost the
 * envelope's own 'action' is 'savePost', so the choice travels as 'mode'; a direct call may pass
 * it as 'action'.) Slots are matched
 * by slotId; a removed slot with people signed up is refused, as is "needed" below the number
 * already signed up.
 */
function apiSavePost_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var action = data.mode || data.action;
  if (action !== 'draft' && action !== 'publish' && action !== 'close') return { ok: false, error: TEXT.badRequest };
  var input = data.post || {};
  var result = withLock_(function () {
    var d = volunteerData_();
    var postsT = serviceTab_(TAB.posts);
    var slotsT = serviceTab_(TAB.slots);
    var existing = input.postId ? indexBy_(d.posts, 'Post id')[String(input.postId)] : null;
    if (input.postId && !existing) return { ok: false, error: TEXT.postNotFound };
    if (existing && !canEditPost(lc.access, lc.email, existing)) return { ok: false, error: TEXT.notAllowed };
    if (existing && existing.Status === POST_STATUS.cancelled) return { ok: false, error: TEXT.postCancelled };
    var now = nowLocal_();
    var who = { 'Last changed by': lc.leader.Name, 'Last changed at': now };

    if (action === 'close') {
      if (!existing) return { ok: false, error: TEXT.postNotFound };
      postsT.update(existing, merge_({ Status: POST_STATUS.closed }, who));
      return { ok: true, postId: existing['Post id'], publicId: existing['Public id'] };
    }

    var oldSlots = existing
      ? d.slots.filter(function (sl) {
          return sl['Post id'] === existing['Post id'];
        })
      : [];
    var oldById = indexBy_(oldSlots, 'Slot id');
    var keepDates = {};
    oldSlots.forEach(function (sl) {
      keepDates[sl['Slot id']] = sl.Date;
    });
    // Organizations follow the category's rule (leaderAccess); an edit that keeps the category
    // may keep the post's organization.
    var cat = String(input.category == null ? '' : input.category).trim();
    var sameCat = !!existing && cat === String(existing.Category || '');
    var allowed = allowedOrgsFor_(lc.access, cat);
    if (sameCat) allowed = uniq_(allowed.concat([existing.Organization]));
    var catIds = opportunityCategories_().map(function (c) {
      return c.id;
    });
    if (existing && existing.Category && catIds.indexOf(existing.Category) < 0) catIds.push(existing.Category);
    var v = validatePost(input, {
      allowedOrgs: allowed,
      categoryIds: catIds,
      todayLocal: now.slice(0, 10),
      publish: action === 'publish',
      // A new post needs a category, and so does a post that has one (it can't be blanked);
      // only an old post saved without one may stay that way.
      requireCategory: !existing || !!String(existing.Category || '').trim(),
      keepDates: keepDates,
    });
    var errors = v.ok ? {} : v.errors;
    if (cat && !sameCat && !allowedOrgsFor_(lc.access, cat).length) errors.category = TEXT.categoryNotAllowed;
    if (Object.keys(errors).length) return { ok: false, error: 'Please fix the marked fields.', fields: errors };

    var counts = countsBySlot(d.signups);
    var fields = {};
    var kept = {};
    var moved = false;
    v.slots.forEach(function (sl, i) {
      if (!sl.slotId) return;
      if (!oldById[sl.slotId]) {
        fields['slots[' + i + '].date'] = 'This date was removed by someone else. Reload the page.';
        return;
      }
      kept[sl.slotId] = true;
      var f = filledOf_(counts, sl.slotId);
      if (sl.needed < f) fields['slots[' + i + '].needed'] = f + ' people are signed up; needed cannot be less.';
      // Moving a booked date or start time (confirmed or waiting) would leave people at the old time.
      var old = oldById[sl.slotId];
      if (bookedOf_(counts, sl.slotId) > 0 && (sl.date !== old.Date || sl.start !== String(old.Start || ''))) {
        fields['slots[' + i + '].date'] = TEXT.removeSignupsFirst;
        moved = true;
      }
    });
    if (Object.keys(fields).length) {
      return { ok: false, error: moved ? TEXT.removeSignupsFirst : 'Please fix the marked fields.', fields: fields };
    }
    var removed = oldSlots.filter(function (sl) {
      return !kept[sl['Slot id']];
    });
    var blocked = removed.some(function (sl) {
      return bookedOf_(counts, sl['Slot id']) > 0;
    });
    if (blocked) return { ok: false, error: TEXT.removeSignupsFirst, fields: { slots: TEXT.removeSignupsFirst } };

    var p = v.post;
    var row = {
      Organization: p.organization,
      Category: p.category,
      Title: p.title,
      Audiences: p.audiences.join(', '),
      'Public note': p.publicNote,
      'Private details': p.privateDetails,
      'Cancel cutoff hours': p.cutoffHours === '' ? lc.s.default_cancel_cutoff_hours : p.cutoffHours,
      Status: action === 'publish' ? POST_STATUS.open : POST_STATUS.draft,
    };
    var postId;
    var publicId;
    if (existing) {
      postId = existing['Post id'];
      publicId = existing['Public id'];
      postsT.update(existing, merge_(row, who));
    } else {
      postId = newId_('p');
      publicId = newId_('');
      postsT.append(merge_(merge_(row, who), { 'Post id': postId, 'Public id': publicId, 'Created by': lc.email, 'Created at': now }));
    }
    var adds = [];
    v.slots.forEach(function (sl) {
      var cols = {
        Date: sl.date,
        Start: sl.start,
        End: sl.end,
        Role: sl.role,
        Needed: sl.needed,
        'Role note': sl.roleNote,
        'Bringing prompt': sl.bringingPrompt,
      };
      if (sl.slotId) {
        var old = oldById[sl.slotId];
        var changes = {};
        Object.keys(cols).forEach(function (c) {
          if (String(old[c]) !== String(cols[c])) changes[c] = cols[c];
        });
        if (Object.keys(changes).length) slotsT.update(old, changes);
      } else {
        adds.push(merge_(cols, { 'Slot id': newId_('t'), 'Post id': postId, Filled: 0, Waiting: 0 }));
      }
    });
    slotsT.removeMany(removed);
    slotsT.appendMany(adds);
    return { ok: true, postId: postId, publicId: publicId };
  });
  if (!result.ok) return result;
  clearServeCache_();
  result.publicUrl = pageUrl_(lc.s, 'post', { p: result.publicId });
  return result;
}

/** Sign-ups holding (Confirmed) or waiting for (Waiting-*) a place in the slot. */
function bookedOf_(counts, slotId) {
  var c = (counts && counts[slotId]) || {};
  return (c.filled || 0) + (c.waiting || 0);
}

function merge_(a, b) {
  var o = {};
  Object.keys(a).forEach(function (k) {
    o[k] = a[k];
  });
  Object.keys(b).forEach(function (k) {
    o[k] = b[k];
  });
  return o;
}

/** {signup, post, slot, signups} for a sign-up the leader may edit, or an error answer. */
function editableSignup_(lc, signupId) {
  var d = volunteerData_();
  var su = indexBy_(d.signups, 'Sign-up id')[String(signupId)];
  if (!su) return { error: 'That sign-up was not found.' };
  var post = indexBy_(d.posts, 'Post id')[su['Post id']];
  var slot = indexBy_(d.slots, 'Slot id')[su['Slot id']];
  if (!post || !slot || !canEditPost(lc.access, lc.email, post)) return { error: TEXT.notAllowed };
  return { signup: su, post: post, slot: slot, signups: d.signups };
}

function apiRemoveSignup_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var done = withLock_(function () {
    var f = editableSignup_(lc, data.signupId);
    if (f.error) return f;
    if (!isActiveSignup_(f.signup.Status)) return { already: true };
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.removed, 'Removed by': lc.leader.Name });
    refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    revokeSignupTokens_(f.signup['Sign-up id']);
    f.msgs = [mailMsg_(normEmail(f.signup.Email), tplRemoved_(lc.s, f.post, f.slot))];
    return f;
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: 'Already removed.' };
  clearServeCache_();
  sendAll_('remove', done.msgs);
  return { ok: true, message: 'Removed. We emailed ' + done.signup.Name + '.' };
}

/**
 * Calls off a whole post (data.date blank) or one of its dates (data.date set). Every Confirmed
 * sign-up on it becomes Removed by the leader, loses its cancel link and gets one email per
 * address. A cancelled post gets status Cancelled (off serve, no reminders, can't be reopened);
 * a cancelled date's slots are deleted and the post stays as it was.
 */
function cancelPostOrDate_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var note = String(data.note == null ? '' : data.note).trim();
  if (note.length > 300) return { ok: false, error: 'Keep the note under 300 characters.', fields: { note: 'Keep the note under 300 characters.' } };
  var date = String(data.date == null ? '' : data.date).trim();
  if (date && !isDateStr(date)) return { ok: false, error: 'Pick a date.' };
  var done = withLock_(function () {
    var d = volunteerData_();
    var post = indexBy_(d.posts, 'Post id')[String(data.postId)];
    if (!post) return { error: TEXT.postNotFound };
    if (!canEditPost(lc.access, lc.email, post)) return { error: TEXT.notAllowed };
    if (post.Status === POST_STATUS.cancelled) return { error: TEXT.postCancelled };
    if (post.Status === POST_STATUS.past) return { error: 'This opportunity is already over.' };
    var postSlots = d.slots.filter(function (sl) {
      return sl['Post id'] === post['Post id'];
    });
    var slots = date
      ? postSlots.filter(function (sl) {
          return sl.Date === date;
        })
      : postSlots;
    if (date && !slots.length) return { error: 'That date is not on this opportunity.' };
    if (date && slots.length === postSlots.length) return { error: TEXT.onlyDate };
    var slotIds = slots.map(function (sl) {
      return sl['Slot id'];
    });
    var signupsT = serviceTab_(TAB.signups);
    var hit = d.signups.filter(function (su) {
      return su['Post id'] === post['Post id'] && su.Status === SIGNUP_STATUS.confirmed && slotIds.indexOf(su['Slot id']) >= 0;
    });
    // The slot rows may be deleted, so Removed by keeps who, and which date and role was called off.
    var allSlots = indexBy_(postSlots, 'Slot id');
    hit.forEach(function (su) {
      var sl = allSlots[su['Slot id']];
      var what = (date ? 'date' : 'opportunity') + ' cancelled: ' + (sl ? fmtDateShort_(sl.Date) + ', ' + sl.Role : 'unknown date');
      signupsT.update(su, { Status: SIGNUP_STATUS.removed, 'Removed by': lc.leader.Name + ' (' + what + ')' });
    });
    // Sign-ups still waiting (email or approval) on what is called off simply lapse; no email.
    d.signups.forEach(function (su) {
      if (su['Post id'] === post['Post id'] && isWaitingSignup_(su.Status) && slotIds.indexOf(su['Slot id']) >= 0) {
        signupsT.update(su, { Status: SIGNUP_STATUS.lapsed });
      }
    });
    var stamp = { 'Last changed by': lc.leader.Name, 'Last changed at': nowLocal_() };
    if (date) {
      serviceTab_(TAB.slots).removeMany(slots);
      serviceTab_(TAB.posts).update(post, stamp);
    } else {
      stamp.Status = POST_STATUS.cancelled;
      serviceTab_(TAB.posts).update(post, stamp);
    }
    hit.forEach(function (su) {
      revokeSignupTokens_(su['Sign-up id']);
    });
    return { post: post, slots: slots, hit: hit };
  });
  if (done.error) return { ok: false, error: done.error };
  clearServeCache_();
  var slotById = indexBy_(done.slots, 'Slot id');
  var byEmail = {};
  done.hit.forEach(function (su) {
    var e = normEmail(su.Email);
    (byEmail[e] = byEmail[e] || []).push(slotById[su['Slot id']]);
  });
  // High: it must not wait behind the reserve and arrive after the event.
  sendAll_(
    'cancel post',
    Object.keys(byEmail).map(function (to) {
      return mailMsg_(to, tplPostCancelled_(lc.s, done.post, byEmail[to], note, !date), 'high');
    })
  );
  var n = Object.keys(byEmail).length;
  return { ok: true, message: (date ? 'Date cancelled.' : 'Opportunity cancelled.') + (n ? ' We emailed ' + n + ' ' + (n === 1 ? 'person' : 'people') + '.' : '') };
}

/** data: {k, postId, note?}. */
function apiCancelPost_(data) {
  var d = {};
  Object.keys(data || {}).forEach(function (k) {
    d[k] = data[k];
  });
  d.date = '';
  return cancelPostOrDate_(d);
}

/** data: {k, postId, date, note?}. */
function apiCancelDate_(data) {
  if (!data || !data.date) return { ok: false, error: 'Pick a date.' };
  return cancelPostOrDate_(data);
}

function apiSignOutEverywhere_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  revokeTokens_('leader', lc.email);
  sendLeaderLink_(lc.leader);
  return { ok: true, message: TEXT.signOutDone };
}

// ---------- approvals ----------

/** The Volunteers row and first post for an address, with the data read once. */
function volunteerCtx_(email) {
  var d = volunteerData_();
  var volsT = serviceTab_(TAB.volunteers);
  var v = volunteersByEmail_(volsT.rows())[normEmail(email)] || null;
  var postsById = indexBy_(d.posts, 'Post id');
  return { d: d, volsT: volsT, v: v, firstPost: v ? postsById[v['First post']] || null : null, postsById: postsById };
}

/**
 * Volunteers this leader may approve: Pending, address confirmed, first post in an organization
 * the leader edits (or any, for the bishopric). Name, email, first post and waiting sign-ups.
 */
function apiWaiting_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var d = volunteerData_();
  var postsById = indexBy_(d.posts, 'Post id');
  var slotsById = indexBy_(d.slots, 'Slot id');
  var byEmail = groupBy_(
    d.signups.map(function (su) {
      return { e: normEmail(su.Email), su: su };
    }),
    'e'
  );
  var out = serviceTab_(TAB.volunteers)
    .rows()
    .filter(function (v) {
      return v.Status === VOLUNTEER_STATUS.pending && !!v['Email confirmed at'] && isEmail(v.Email);
    })
    .filter(function (v) {
      return canApprove(lc.access, lc.email, v, postsById[v['First post']] || null);
    })
    .map(function (v) {
      var first = postsById[v['First post']];
      return {
        email: normEmail(v.Email),
        name: v.Name,
        confirmedAt: v['Email confirmed at'],
        firstPost: first ? first.Title : '',
        firstPostOrganization: first ? first.Organization : '',
        signups: (byEmail[normEmail(v.Email)] || [])
          .map(function (x) {
            return x.su;
          })
          .filter(function (su) {
            return su.Status === SIGNUP_STATUS.waitingApproval;
          })
          .map(function (su) {
            var p = postsById[su['Post id']] || {};
            var sl = slotsById[su['Slot id']] || {};
            return { title: p.Title || '', organization: p.Organization || '', date: sl.Date || '', start: sl.Start || '', role: sl.Role || '', childName: su['Child first name'] || '' };
          }),
      };
    })
    .sort(function (a, b) {
      return cmpLocal(a.confirmedAt, b.confirmedAt);
    });
  return { ok: true, volunteers: out };
}

/**
 * data: {k, email, decision: 'approve'|'decline'}. Approve: the address is approved ward-wide and
 * each sign-up waiting for approval counts (confirmation, or the withdraw email when it is over
 * the number); one approved email. Decline: its waiting sign-ups lapse; one polite email. Both
 * record Decided by (the leader's name) and Decided at.
 */
function apiDecide_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var decision = data && data.decision;
  if (decision !== 'approve' && decision !== 'decline') return { ok: false, error: TEXT.badRequest };
  var done = withLock_(function () {
    var x = volunteerCtx_(data.email);
    if (!x.v) return { error: 'That volunteer was not found.' };
    if (!canApprove(lc.access, lc.email, x.v, x.firstPost)) return { error: TEXT.cannotApprove };
    if (x.v.Status !== VOLUNTEER_STATUS.pending || !x.v['Email confirmed at']) return { error: 'This person is not waiting for approval.' };
    var now = nowLocal_();
    var today = now.slice(0, 10);
    var email = normEmail(x.v.Email);
    var record = { 'Decided by': lc.leader.Name, 'Decided at': now };
    var signupsT = serviceTab_(TAB.signups);
    var slotsT = serviceTab_(TAB.slots);
    var slotsById = indexBy_(x.d.slots, 'Slot id');
    var mine = x.d.signups.filter(function (su) {
      return normEmail(su.Email) === email && isWaitingSignup_(su.Status);
    });
    var lapse = function (su) {
      signupsT.update(su, { Status: SIGNUP_STATUS.lapsed });
      if (slotsById[su['Slot id']]) refreshFilled_(slotsT, slotsById[su['Slot id']], x.d.signups);
    };
    if (decision === 'decline') {
      x.volsT.update(x.v, merge_({ Status: VOLUNTEER_STATUS.declined }, record));
      mine.forEach(lapse);
      return { v: x.v, decision: decision, msgs: [mailMsg_(email, tplContactToSignUp_(lc.s))] };
    }
    x.volsT.update(x.v, merge_({ Status: VOLUNTEER_STATUS.approved }, record));
    var live = [];
    mine.forEach(function (su) {
      var sl = slotsById[su['Slot id']];
      var p = x.postsById[su['Post id']];
      var over = !sl || !p || sl.Date < today || p.Status === POST_STATUS.cancelled || p.Status === POST_STATUS.past;
      if (over) lapse(su);
      else live.push(su);
    });
    var confirmed = confirmSignupsLocked_(live, x.d);
    var msgs = [mailMsg_(email, tplApproved_(lc.s, x.v))]
      .concat(confirmationMsgs_(confirmed, x.d))
      .concat(
        filledMsgsLocked_(
          confirmed.map(function (c) {
            return c.post['Post id'];
          }),
          x.d
        )
      );
    return { v: x.v, decision: decision, n: confirmed.length, msgs: msgs };
  });
  if (done.error) return { ok: false, error: done.error };
  clearServeCache_();
  sendAll_('decide', done.msgs);
  if (done.decision === 'decline') return { ok: true, message: 'Declined. We emailed ' + done.v.Name + '.' };
  var n = done.n;
  return { ok: true, message: 'Approved. ' + n + ' sign-up' + (n === 1 ? '' : 's') + ' now count' + (n === 1 ? 's' : '') + '. We emailed ' + done.v.Name + '.' };
}

/**
 * Bishopric only. data: {k, email, decision: 'undo'|'revoke'}. Undo a decline (or a revoke):
 * Pending again. Revoke an approval: Revoked, so new sign-ups are blocked; Confirmed sign-ups
 * stay and the answer says how many are still to come. Recorded like approvals.
 */
function apiBishopric_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  if (!lc.access.isBishopric) return { ok: false, error: TEXT.bishopricOnly };
  var decision = data && data.decision;
  if (decision !== 'undo' && decision !== 'revoke') return { ok: false, error: TEXT.badRequest };
  var done = withLock_(function () {
    var x = volunteerCtx_(data.email);
    if (!x.v) return { error: 'That volunteer was not found.' };
    var now = nowLocal_();
    var record = { 'Decided by': lc.leader.Name, 'Decided at': now };
    if (decision === 'undo') {
      if (x.v.Status !== VOLUNTEER_STATUS.declined && x.v.Status !== VOLUNTEER_STATUS.revoked) return { error: 'Only a decline or a revoke can be undone.' };
      x.volsT.update(x.v, merge_({ Status: VOLUNTEER_STATUS.pending }, record));
      return { message: 'Undone. ' + x.v.Name + ' is waiting again; their next sign-up comes to Waiting for approval.' };
    }
    if (x.v.Status !== VOLUNTEER_STATUS.approved) return { error: 'Only an approved volunteer can be revoked.' };
    x.volsT.update(x.v, merge_({ Status: VOLUNTEER_STATUS.revoked }, record));
    var today = now.slice(0, 10);
    var slotsById = indexBy_(x.d.slots, 'Slot id');
    var email = normEmail(x.v.Email);
    var n = x.d.signups.filter(function (su) {
      var sl = slotsById[su['Slot id']];
      return normEmail(su.Email) === email && su.Status === SIGNUP_STATUS.confirmed && sl && sl.Date >= today;
    }).length;
    return {
      message:
        "Revoked. They can't sign up again. " +
        (n ? n + ' upcoming sign-up' + (n === 1 ? ' stays' : 's stay') + '; remove ' + (n === 1 ? 'it' : 'them') + ' on My opportunities if needed.' : 'They have no upcoming sign-ups.'),
    };
  });
  if (done.error) return { ok: false, error: done.error };
  return { ok: true, message: done.message };
}

/** Bishopric only: every volunteer with status and who decided. */
function apiVolunteers_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  if (!lc.access.isBishopric) return { ok: false, error: TEXT.bishopricOnly };
  var postsById = indexBy_(serviceTab_(TAB.posts).rows(), 'Post id');
  var list = serviceTab_(TAB.volunteers)
    .rows()
    .filter(function (v) {
      return isEmail(v.Email);
    })
    .map(function (v) {
      var first = postsById[v['First post']];
      return {
        email: normEmail(v.Email),
        name: v.Name,
        status: v.Status || VOLUNTEER_STATUS.pending,
        decidedBy: v['Decided by'] || '',
        decidedAt: v['Decided at'] || '',
        emailConfirmed: !!v['Email confirmed at'],
        firstPost: first ? first.Title : '',
      };
    })
    .sort(function (a, b) {
      return cmpLocal(String(a.name).toLowerCase(), String(b.name).toLowerCase());
    });
  return { ok: true, volunteers: list };
}

/** Ward council and bishopric: short roles of open posts in the next 14 days. */
function apiNeedsHelp_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  if (!lc.access.seeAllNames) return { ok: false, error: TEXT.councilOnly };
  return { ok: true, rows: needsHelpRows_(lc.s) };
}

/** needsHelpSoon over the current tabs, each with its public link. */
function needsHelpRows_(s) {
  var d = volunteerData_();
  return needsHelpSoon(d.posts, groupBy_(d.slots, 'Post id'), countsBySlot(d.signups), todayLocal_()).map(function (r) {
    r.publicUrl = pageUrl_(s, 'post', { p: r.publicId });
    return r;
  });
}
