/**
 * Leader API: what leader.html calls with a leader link (k). Every handler starts by checking
 * the link against the Leaders tab; what the leader may see and change comes from
 * leaderAccess(). Emails of volunteers go only to leaders who may edit the post.
 */

function relink_() {
  return { ok: false, error: TEXT.leaderRelink, relink: true };
}

/** {leader, email, access, s} or null when the link is not valid now. */
function leaderCtx_(data) {
  var leader = leaderFromLink_(data && data.k);
  if (!leader) return null;
  var s = settings_();
  return { leader: leader, email: normEmail(leader.Email), access: leaderAccess(leader, s.organizations), s: s };
}

function opportunityCategories_() {
  return serviceTab_(TAB.categories)
    .rows()
    .filter(function (c) {
      return c.Kind === CATEGORY_KIND.opportunity && !isTicked(c.Archived) && c.Id;
    })
    .map(function (c) {
      return { id: String(c.Id), name: c.Name, icon: c.Icon };
    });
}

function apiWhoami_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  return {
    ok: true,
    leader: { name: lc.leader.Name, calling: lc.leader.Calling, organization: lc.leader.Organization },
    access: { isBishopric: lc.access.isBishopric, createOrgs: lc.access.createOrgs, editOrgs: lc.access.editOrgs },
    organizations: lc.s.organizations,
    categories: opportunityCategories_(),
    defaults: { cutoffHours: lc.s.default_cancel_cutoff_hours },
  };
}

function slotOut_(sl, counts) {
  return {
    slotId: sl['Slot id'],
    date: sl.Date,
    start: sl.Start,
    end: sl.End,
    role: sl.Role,
    needed: Number(sl.Needed) || 0,
    filled: filledOf_(counts, sl['Slot id']),
    roleNote: sl['Role note'] || '',
    bringingPrompt: sl['Bringing prompt'] || '',
  };
}

/** Posts the leader may see (not Past, or only Past with {past: true}). */
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
      if ((p.Status === POST_STATUS.past) !== wantPast) return false;
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
        canEdit: canEdit,
        firstDate: slots.length ? slots[0].Date : '',
        slots: slots.map(function (sl) {
          return slotOut_(sl, counts);
        }),
        signups: (signupsByPost[p['Post id']] || [])
          .filter(function (su) {
            return su.Status === SIGNUP_STATUS.confirmed;
          })
          .map(function (su) {
            var o = {
              signupId: su['Sign-up id'],
              slotId: su['Slot id'],
              name: su.Name,
              childName: su['Child first name'] || '',
              bringing: su.Bringing || '',
              status: su.Status,
              detailsSent: !!su['Details sent at'],
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
 * data: {k, action: 'draft'|'publish'|'close', post}. Writes Posts and Slots. Slots are matched
 * by slotId; a removed slot with people signed up is refused, as is "needed" below the number
 * already signed up.
 */
function apiSavePost_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var action = data.action;
  if (action !== 'draft' && action !== 'publish' && action !== 'close') return { ok: false, error: TEXT.badRequest };
  var input = data.post || {};
  var result = withLock_(function () {
    var d = volunteerData_();
    var postsT = serviceTab_(TAB.posts);
    var slotsT = serviceTab_(TAB.slots);
    var existing = input.postId ? indexBy_(d.posts, 'Post id')[String(input.postId)] : null;
    if (input.postId && !existing) return { ok: false, error: TEXT.postNotFound };
    if (existing && !canEditPost(lc.access, lc.email, existing)) return { ok: false, error: TEXT.notAllowed };
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
    var allowed = existing ? uniq_(lc.access.editOrgs.concat([existing.Organization])) : lc.access.createOrgs;
    var catIds = opportunityCategories_().map(function (c) {
      return c.id;
    });
    if (existing && existing.Category && catIds.indexOf(existing.Category) < 0) catIds.push(existing.Category);
    var v = validatePost(input, {
      allowedOrgs: allowed,
      categoryIds: catIds,
      todayLocal: now.slice(0, 10),
      publish: action === 'publish',
      keepDates: keepDates,
    });
    if (!v.ok) return { ok: false, error: 'Please fix the marked fields.', fields: v.errors };

    var counts = countsBySlot(d.signups);
    var fields = {};
    var kept = {};
    v.slots.forEach(function (sl, i) {
      if (!sl.slotId) return;
      if (!oldById[sl.slotId]) {
        fields['slots[' + i + '].date'] = 'This date was removed by someone else. Reload the page.';
        return;
      }
      kept[sl.slotId] = true;
      var f = filledOf_(counts, sl.slotId);
      if (sl.needed < f) fields['slots[' + i + '].needed'] = f + ' people are signed up; needed cannot be less.';
    });
    if (Object.keys(fields).length) return { ok: false, error: 'Please fix the marked fields.', fields: fields };
    var removed = oldSlots.filter(function (sl) {
      return !kept[sl['Slot id']];
    });
    var blocked = removed.some(function (sl) {
      return filledOf_(counts, sl['Slot id']) > 0;
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
    if (f.signup.Status !== SIGNUP_STATUS.confirmed) return { already: true };
    serviceTab_(TAB.signups).update(f.signup, { Status: SIGNUP_STATUS.removed, 'Removed by': lc.leader.Name });
    refreshFilled_(serviceTab_(TAB.slots), f.slot, f.signups);
    return f;
  });
  if (done.error) return { ok: false, error: done.error };
  if (done.already) return { ok: true, message: 'Already removed.' };
  revokeTokens_('cancel', done.signup['Sign-up id']);
  clearServeCache_();
  var t = tplRemoved_(lc.s, done.post, done.slot);
  sendOrQueue_({ to: done.signup.Email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  return { ok: true, message: 'Removed. We emailed ' + done.signup.Name + '.' };
}

function apiSendDetails_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  var f = editableSignup_(lc, data.signupId);
  if (f.error) return { ok: false, error: f.error };
  if (f.signup.Status !== SIGNUP_STATUS.confirmed) return { ok: false, error: 'This person is no longer signed up.' };
  if (!f.post['Private details']) return { ok: false, error: 'This opportunity has no private details to send.' };
  var t = tplDetails_(lc.s, f.post, f.slot);
  var r = sendOrQueue_({ to: f.signup.Email, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
  if (r === 'refused') return { ok: false, error: 'That email address does not work.' };
  serviceTab_(TAB.signups).update(f.signup, { 'Details sent at': nowLocal_() });
  return { ok: true, message: r === 'sent' ? 'Details sent.' : 'Details will go out within 10 minutes.' };
}

function apiSignOutEverywhere_(data) {
  var lc = leaderCtx_(data);
  if (!lc) return relink_();
  revokeTokens_('leader', lc.email);
  sendLeaderLink_(lc.leader);
  return { ok: true, message: TEXT.signOutDone };
}
