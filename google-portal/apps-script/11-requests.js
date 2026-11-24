/**
 * Requests: one Google Form per request category, a private folder per category shared only
 * with its readers, and a month sheet in that folder. A form-submit trigger copies each answer
 * into the sheet, deletes it from the form and sends notices that say nothing about the
 * request. The daily job stamps Closed on, removes rows 30 days after closing and, on the 1st,
 * moves to a new month sheet and permanently deletes the old file (version history included).
 */

var REQ_Q = {
  name: 'Name',
  contact: 'Phone or email',
  moving: 'Moving in or out',
  date: 'Date',
  forWhom: 'For',
  offer: 'What would you like to give?',
  note: 'Note',
};

/** Question title → request sheet column, with the longest answer kept. */
var REQ_MAP = [
  ['Name', 'Name', 80],
  ['Phone or email', 'Phone or email', 100],
  ['Moving in or out', 'Moving', 20],
  ['Date', 'Moving date', 10],
  ['For', 'For', 20],
  ['What would you like to give?', 'Offer', 300],
  ['Note', 'Note', 200],
];

/** The giving offer form's own words (decision 16). */
var GIVING_TEXT = {
  intro:
    'Thank you for offering to help with Christmas gifts. Only the bishopric and the Christmas gift coordinators see this. A coordinator will contact you. Nothing is emailed back to you.',
  confirmation: 'Thank you. A coordinator will contact you.',
  offerLabel: 'Offer to give at Christmas',
  offerHelp: 'Up to 300 characters. For example: how many families or children you can help, and the kinds of gifts.',
};

function portalFolder_() {
  var id = props_().getProperty('PORTAL_FOLDER_ID');
  if (!id) throw new Error('Service Portal folder not found. Run Service Portal > Set up.');
  return DriveApp.getFolderById(id);
}

function joinNames_(list) {
  if (list.length <= 1) return list.join('');
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

function requestFormDescription_(s, c) {
  if (c.Id === GIVING_ID) {
    return [GIVING_TEXT.intro, '', FORM_FOOTER + (s.contact_email ? '\nContact: ' + s.contact_email : '')].join('\n');
  }
  var who = isTicked(c.Confidential)
    ? 'Only ' + (CONFIDENTIAL_WHO[c.Id] || CONFIDENTIAL_WHO_DEFAULT) + ' see this request.'
    : splitList(c['Owning organizations']).length
    ? 'Only the bishopric, the ' + joinNames_(splitList(c['Owning organizations'])) + ' leaders and the people they name see this request.'
    : 'Only the bishopric and the people it names see this request.';
  return [
    who,
    'Nothing is emailed back to you; a leader will contact you.',
    '',
    FORM_FOOTER + (s.contact_email ? '\nContact: ' + s.contact_email : ''),
  ].join('\n');
}

function addRequestQuestions_(form, c) {
  var short = function (n) {
    return FormApp.createTextValidation().setHelpText('Up to ' + n + ' characters.').requireTextLengthLessThanOrEqualTo(n).build();
  };
  form.addTextItem().setTitle(REQ_Q.name).setRequired(true).setValidation(short(80));
  form.addTextItem().setTitle(REQ_Q.contact).setRequired(true).setValidation(short(100));
  if (c.Id === 'moving') {
    form.addMultipleChoiceItem().setTitle(REQ_Q.moving).setChoiceValues(['Moving in', 'Moving out']).setRequired(true);
    form.addDateItem().setTitle(REQ_Q.date).setRequired(false);
  }
  if (c.Id === 'christmas') {
    form.addMultipleChoiceItem().setTitle(REQ_Q.forWhom).setChoiceValues(['My family', 'Another family']).setRequired(true);
  }
  if (c.Id === GIVING_ID) {
    form
      .addParagraphTextItem()
      .setTitle(REQ_Q.offer)
      .setRequired(true)
      .setHelpText(GIVING_TEXT.offerHelp)
      .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(300).build());
  }
  form
    .addParagraphTextItem()
    .setTitle(REQ_Q.note)
    .setRequired(false)
    .setHelpText(
      c.Id === GIVING_ID
        ? 'Optional, up to 200 characters, e.g. when you can deliver.'
        : 'Optional, up to 200 characters. Please leave out health or money details; a leader will ask what they need.'
    )
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(200).build());
}

function requestFormConfirmation_(c) {
  return c.Id === GIVING_ID ? GIVING_TEXT.confirmation : 'Thank you. A leader will contact you.';
}

/**
 * The request tab of a request sheet, with any header this version needs added at the end (a
 * sheet made before a header existed, e.g. Offer, keeps working).
 */
function requestTable_(ss, row) {
  var t = tabOf_(ss, REQUEST_TAB);
  var missing = Object.keys(row || {}).filter(function (k) {
    return t.headers.indexOf(k) < 0;
  });
  if (!missing.length) return t;
  ensureTab_(ss, REQUEST_TAB, uniq_(t.headers.filter(String).concat(REQUEST_HEADERS)));
  return tabOf_(ss, REQUEST_TAB);
}

/** Adds any request-sheet column this version needs (e.g. Make opportunity) to an older sheet. */
function ensureRequestColumns_(ss) {
  var t = tabOf_(ss, REQUEST_TAB);
  var missing = REQUEST_HEADERS.filter(function (h) {
    return t.headers.indexOf(h) < 0;
  });
  if (missing.length) ensureTab_(ss, REQUEST_TAB, uniq_(t.headers.filter(String).concat(REQUEST_HEADERS)));
}

// ---------- turning a request into a draft opportunity (2.2, decision 19) ----------

/** The request kind's Opportunity category row, when it names a live Opportunity category. */
function draftCategoryFor_(kind, catsById) {
  var id = String(kind['Opportunity category'] == null ? '' : kind['Opportunity category']).trim();
  var oc = id ? catsById[id] : null;
  if (!oc || oc.Kind !== CATEGORY_KIND.opportunity || isTicked(oc.Archived)) return null;
  return oc;
}

/**
 * The Posts and Slots rows for a draft made from request row r of request kind `kind` into
 * opportunity category oc. Public fields come only from the category: nothing from the request
 * but (when Copy contact is ticked) its name and contact in Private details, and its Moving date.
 */
function draftFromRequest_(s, kind, oc, r, todayLocal, nowLocal) {
  var org = splitList(oc['Owning organizations'])[0] || splitList(kind['Owning organizations'])[0] || 'Bishopric';
  var audiences = audiencesOf_(oc['Default audiences']);
  if (!audiences.length) audiences = org === 'Relief Society' ? ['Sisters'] : org === 'Elders Quorum' ? ['Brothers'] : AUDIENCES.slice();
  var date = isDateStr(r['Moving date']) && r['Moving date'] >= todayLocal ? r['Moving date'] : addDays(todayLocal, 7);
  var privateDetails = isTicked(r['Copy contact to private details'])
    ? 'Requested by ' + String(r.Name == null ? '' : r.Name).trim() + ', ' + String(r['Phone or email'] == null ? '' : r['Phone or email']).trim()
    : '';
  var postId = newId_('p');
  return {
    post: {
      'Post id': postId,
      'Public id': newId_(''),
      Organization: org,
      Category: String(oc.Id),
      Title: oc.Name,
      Audiences: audiences.join(', '),
      'Public note': '',
      'Private details': privateDetails,
      'Cancel cutoff hours': s.default_cancel_cutoff_hours,
      Status: POST_STATUS.draft,
      'Created by': 'request ' + r['Request id'],
      'Created at': nowLocal,
      'Last changed by': 'From a request',
      'Last changed at': nowLocal,
    },
    slot: { 'Slot id': newId_('t'), 'Post id': postId, Date: date, Start: '', End: '', Role: 'Help', Needed: 1, 'Role note': '', 'Bringing prompt': '', Filled: 0, Waiting: 0 },
  };
}

/**
 * Hourly job part: every request row with Make opportunity ticked and Posted as blank (or "Not
 * made: ...") becomes a Draft opportunity (never Open). Each request sheet is read without the
 * lock; only a sheet with a ticked row takes the script lock and is read again before anything is
 * written. Posted as is written and the box unticked, so a row is made once: a draft already made
 * for that request id (this run's included) is found by its Created by instead of made again, and
 * a row typed by hand without a Request id first gets one. A sheet without the 2.2 columns has
 * nothing ticked (Set up adds them). Notices go out after the lock, only to people who can edit
 * the draft, and say nothing about the request. A file that fails is reported at the end; the
 * others still run.
 */
function makeDraftsFromRequests_() {
  var s = settings_();
  var today = todayLocal_();
  var categories = serviceTab_(TAB.categories).rows();
  var catsById = indexBy_(categories, 'Id');
  var made = [];
  var errors = [];
  var isMarked = function (r) {
    return isTicked(r['Make opportunity']);
  };
  systemTab_(SYS_TAB.requestFiles)
    .rows()
    .forEach(function (f) {
      var kind = catsById[f['Category id']];
      if (!f['Sheet id'] || !kind) return;
      try {
        var ss = SpreadsheetApp.openById(f['Sheet id']);
        var peek = tabOf_(ss, REQUEST_TAB);
        if (peek.headers.indexOf('Make opportunity') < 0 || !peek.rows().some(isMarked)) return;
        withLock_(function () {
          var t = tabOf_(ss, REQUEST_TAB);
          var ticked = t.rows().filter(isMarked);
          if (!ticked.length) return;
          var now = nowLocal_();
          var postsT = serviceTab_(TAB.posts);
          var byCreator = indexBy_(postsT.rows(), 'Created by');
          ticked.forEach(function (r) {
            // Already made: just untick. A "Not made: ..." row may be ticked again once fixed.
            var postedAs = String(r['Posted as'] == null ? '' : r['Posted as']).trim();
            if (postedAs && postedAs.indexOf('Not made') !== 0) {
              t.update(r, { 'Make opportunity': false });
              return;
            }
            var oc = draftCategoryFor_(kind, catsById);
            if (!oc) {
              var set = String(kind['Opportunity category'] == null ? '' : kind['Opportunity category']).trim();
              t.update(r, {
                'Posted as':
                  'Not made: set Opportunity category for ' + kind.Name + ' to the Id of an Opportunity row in Categories (now: ' + (set || 'blank') + ')',
                'Make opportunity': false,
              });
              return;
            }
            // A row typed by hand may have no Request id: give it one, so it never matches another.
            if (!String(r['Request id'] == null ? '' : r['Request id']).trim()) t.update(r, { 'Request id': newId_('r') });
            var key = 'request ' + String(r['Request id']).trim();
            var post = byCreator[key];
            if (!post) {
              var d = draftFromRequest_(s, kind, oc, r, today, now);
              postsT.append(d.post);
              serviceTab_(TAB.slots).append(d.slot);
              post = d.post;
              byCreator[key] = post;
              made.push({ kind: kind, post: post });
            }
            t.update(r, {
              'Posted as': 'Draft made ' + today + ' — finish and publish it on the leader page (' + post.Title + ', ' + post['Post id'] + ')',
              'Make opportunity': false,
            });
          });
        });
      } catch (err) {
        var msg = clip(err && err.message ? err.message : err, 200);
        log_('draft from request error', f['Category id'] + ' | ' + msg);
        errors.push(f['Category id'] + ': ' + msg);
      }
    });
  if (made.length) {
    var leaders = leaders_();
    made.forEach(function (m) {
      draftNoticeRecipients_(m.kind, m.post, leaders, s.organizations, categories).forEach(function (to) {
        var t = tplDraftFromRequest_(s, m.kind.Name);
        sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'normal' });
      });
    });
  }
  if (errors.length) throw new Error(errors.join(' ; '));
  return made.length;
}

/** The request kind's Notify people who can edit the draft, else the post's notice recipients. */
function draftNoticeRecipients_(kind, post, leaders, organizations, categories) {
  var byEmail = {};
  leaders.forEach(function (l) {
    if (isEmail(l.Email)) byEmail[normEmail(l.Email)] = l;
  });
  var to = requestNotifyList(kind, leaders).to.filter(function (e) {
    var l = byEmail[e];
    return !!l && canEditPost(leaderAccess(l, organizations, categories), e, post);
  });
  return to.length ? to : noticeRecipients(post, leaders);
}

/**
 * Lines naming each request form that is not on the Help page, and always the Christmas giving
 * form, with its link and where it shows (decisions 16 and 17).
 */
function privateFormLines_() {
  var files = indexBy_(systemTab_(SYS_TAB.requestFiles).rows(), 'Category id');
  var out = [];
  serviceTab_(TAB.categories)
    .rows()
    .forEach(function (c) {
      if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived)) return;
      var giving = c.Id === GIVING_ID;
      if (!giving && isTicked(c['On Help page'])) return;
      var f = files[c.Id];
      if (!f || !f['Form id']) return;
      var where = !giving
        ? '(not on the Help page; share privately)'
        : isTicked(c['On Serve page'])
        ? '(on the Service Opportunities page; you can also share the link)'
        : '(not on any public page; share privately)';
      try {
        out.push(c.Name + ' ' + where + ': ' + FormApp.openById(f['Form id']).getPublishedUrl());
      } catch (e) {
        out.push(c.Name + ': could not open its form (' + clip(e && e.message ? e.message : e, 120) + ').');
      }
    });
  return out;
}

/** A new month sheet for a category in its folder. Returns the Spreadsheet. */
function newRequestSheet_(folder, categoryName, month, headers) {
  var ss = SpreadsheetApp.create('Requests – ' + categoryName + ' – ' + month);
  var first = ss.getSheets()[0];
  first.setName(REQUEST_TAB);
  var sh = ensureTab_(ss, REQUEST_TAB, headers || REQUEST_HEADERS);
  var t = table_(sh);
  var rowsBelow = sh.getMaxRows() - 1;
  if (rowsBelow > 0) {
    var rule = SpreadsheetApp.newDataValidation().requireValueInList(REQUEST_STATUS, true).setAllowInvalid(false).build();
    sh.getRange(2, t.headers.indexOf('Status') + 1, rowsBelow, 1).setDataValidation(rule);
  }
  DriveApp.getFileById(ss.getId()).moveTo(folder);
  return ss;
}

function requestFormTitle_(s, c) {
  return c.Name + ' — ' + s.ward_name;
}

/**
 * A form made earlier gets the current title and description (so a ward that set up on older
 * wording gets the new one by running Set up again). Returns true when something changed.
 */
function refreshRequestForm_(s, c, formId) {
  var form = FormApp.openById(formId);
  var changed = false;
  var title = requestFormTitle_(s, c);
  if (form.getTitle() !== title) {
    form.setTitle(title);
    changed = true;
  }
  var description = requestFormDescription_(s, c);
  if (form.getDescription() !== description) {
    form.setDescription(description);
    changed = true;
  }
  return changed;
}

/**
 * One form, folder and month sheet per request category that has no form yet; forms already
 * made get their title and description refreshed. Re-runnable. Names of refreshed forms go into
 * refreshed and problems into problems (both optional).
 */
function buildRequestForms_(s, categories, refreshed, problems) {
  var portal = portalFolder_();
  var filesT = systemTab_(SYS_TAB.requestFiles);
  var have = indexBy_(filesT.rows(), 'Category id');
  var month = todayLocal_().slice(0, 7);
  var made = [];
  categories.forEach(function (c) {
    if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived) || !c.Id) return;
    var rec = have[c.Id];
    if (rec && rec['Form id']) {
      try {
        if (refreshRequestForm_(s, c, rec['Form id']) && refreshed) refreshed.push(c.Name);
      } catch (e) {
        if (problems) problems.push('Could not open the ' + c.Name + ' form to refresh its wording (' + clip(e && e.message ? e.message : e, 120) + ').');
      }
      try {
        if (rec['Sheet id']) ensureRequestColumns_(SpreadsheetApp.openById(rec['Sheet id']));
      } catch (e) {
        if (problems) problems.push('Could not open the ' + c.Name + ' request sheet to add its new columns (' + clip(e && e.message ? e.message : e, 120) + ').');
      }
      return;
    }
    var folderName = 'Requests – ' + c.Name;
    var existing = portal.getFoldersByName(folderName);
    var folder = existing.hasNext() ? existing.next() : portal.createFolder(folderName);
    var ss = newRequestSheet_(folder, c.Name, month);
    var form = FormApp.create(requestFormTitle_(s, c));
    form
      .setDescription(requestFormDescription_(s, c))
      .setCollectEmail(false)
      .setAllowResponseEdits(false)
      .setShowLinkToRespondAgain(false)
      .setPublishingSummary(false)
      .setConfirmationMessage(requestFormConfirmation_(c));
    addRequestQuestions_(form, c);
    if (typeof form.setPublished === 'function') form.setPublished(true);
    form.setAcceptingResponses(true);
    DriveApp.getFileById(form.getId()).moveTo(portal);
    var row = { 'Category id': c.Id, 'Folder id': folder.getId(), 'Form id': form.getId(), 'Sheet id': ss.getId(), Month: month };
    if (rec) filesT.update(rec, row);
    else filesT.append(row);
    made.push(c.Name);
  });
  try {
    cache_().remove('help');
    cache_().remove(GIVING_URL_CACHE_KEY);
  } catch (e) {
    // the help cache expires on its own
  }
  return made;
}

/** Email every administrator once (high priority). */
function alertAdmins_(lines) {
  var s = settings_();
  var t = tplAdminAlert_(s, lines);
  var admins = adminEmails(leaders_());
  if (!admins.length) log_('admin alert with no administrators', lines.join(' / '));
  admins.forEach(function (to) {
    sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
  });
}

/** Removes every answer string from a message, so logs never carry request text. */
function scrub_(msg, answers) {
  var out = String(msg == null ? '' : msg);
  Object.keys(answers).forEach(function (k) {
    var v = String(answers[k] == null ? '' : answers[k]);
    if (v.length >= 2) out = out.split(v).join('…');
  });
  return clip(out, 300);
}

/** A real form-submit event carries functions; JSON from a web visitor can't. */
function isFormEvent_(e) {
  return !!(
    e &&
    e.source &&
    e.response &&
    typeof e.source.getId === 'function' &&
    typeof e.source.deleteResponse === 'function' &&
    typeof e.response.getItemResponses === 'function' &&
    typeof e.response.getId === 'function'
  );
}

/** What an administrator must do, by the step that failed. */
var REQ_STEP_HELP = {
  read: 'It is kept in the form’s Responses tab; copy it into the request sheet by hand, then delete it from the form.',
  file: 'It is kept in the form’s Responses tab; copy it into the request sheet by hand, then delete it from the form.',
  unform: 'It was filed in the request sheet but is still in the form’s Responses tab; delete it there.',
  notify: 'It was filed in the request sheet, but not every leader was told. Ask them to check their Requests folder.',
};

/** Form-submit trigger (one per request form). */
function gpOnRequestSubmit(e) {
  if (!isFormEvent_(e)) return;
  gpBegin_();
  var answers = {};
  var catId = '?';
  var catName = 'request';
  var step = 'read';
  try {
    e.response.getItemResponses().forEach(function (ir) {
      var v = ir.getResponse();
      answers[ir.getItem().getTitle()] = Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v);
    });
    var formId = e.source.getId();
    step = 'file';
    // Under the lock, so the monthly rotation can't switch sheets between finding and appending.
    var filed = withLock_(function () {
      var file = systemTab_(SYS_TAB.requestFiles).find('Form id', formId);
      if (!file) throw new Error('no Request files row for this form');
      catId = file['Category id'];
      var cat = serviceTab_(TAB.categories).find('Id', catId);
      if (!cat) throw new Error('category missing from the Categories tab');
      catName = cat.Name;
      var row = { 'Request id': newId_(cat.Id === GIVING_ID ? 'o' : 'r'), Received: nowLocal_(), Kind: cat.Name, Status: 'New' };
      REQ_MAP.forEach(function (m) {
        if (m[0] in answers) row[m[1]] = clip(answers[m[0]].trim(), m[2]);
      });
      requestTable_(SpreadsheetApp.openById(file['Sheet id']), row).append(row);
      return { file: file, cat: cat };
    });
    step = 'unform';
    e.source.deleteResponse(e.response.getId());
    step = 'notify';
    var s = settings_();
    var t = tplRequestNotice_(s, filed.cat.Name, DriveApp.getFolderById(filed.file['Folder id']).getUrl());
    var notify = requestNotifyList(filed.cat, leaders_());
    if (notify.dropped.length) log_('request notice dropped', catId + ' | not readers of this kind or not addresses: ' + notify.dropped.join(', '));
    notify.to.forEach(function (to) {
      sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
    });
  } catch (err) {
    var msg = scrub_(err && err.message ? err.message : err, answers);
    log_('request error', catId + ' | ' + step + ' | ' + msg);
    alertCapped_('request-error', ['A ' + catName + ' request ran into a problem. ' + REQ_STEP_HELP[step], 'Problem: ' + msg], 3);
  }
}

/**
 * Daily: stamp Closed on, purge after 30 days, rotate on a new month. Each file is handled under
 * the script lock, so a request can't be filed into a sheet that is being replaced. Old files
 * that could only be trashed are reported in one admin alert. Returns problem lines (the daily
 * job reports them).
 */
function dailyRequests_() {
  var today = todayLocal_();
  var filesT = systemTab_(SYS_TAB.requestFiles);
  var cats = indexBy_(serviceTab_(TAB.categories).rows(), 'Id');
  var problems = [];
  var trashed = [];
  filesT.rows().forEach(function (f) {
    if (!f['Sheet id']) return;
    try {
      withLock_(function () {
        var ss = SpreadsheetApp.openById(f['Sheet id']);
        var t = tabOf_(ss, REQUEST_TAB);
        var rows = t.rows();
        stampClosed(rows, today).forEach(function (x) {
          t.update(x.row, { 'Closed on': x.closedOn });
        });
        t.removeMany(rowsToPurge(rows, today));
        if (needsRotation(f.Month, today)) rotateRequestFile_(f, filesT, t, cats[f['Category id']], today, trashed);
      });
    } catch (err) {
      var msg = clip(err && err.message ? err.message : err, 300);
      log_('request daily error', f['Category id'] + ' | ' + msg);
      problems.push('Requests (' + f['Category id'] + '): ' + msg);
    }
  });
  if (trashed.length) alertAdmins_(trashed);
  return problems;
}

function rotateRequestFile_(f, filesT, oldTable, cat, today, trashed) {
  var month = today.slice(0, 7);
  var name = cat ? cat.Name : f['Category id'];
  var headers = uniq_(oldTable.headers.filter(String).concat(REQUEST_HEADERS));
  var folder = DriveApp.getFolderById(f['Folder id']);
  var fresh = newRequestSheet_(folder, name, month, headers);
  var carry = oldTable.rows();
  table_(fresh.getSheetByName(REQUEST_TAB)).appendMany(carry);
  var oldId = f['Sheet id'];
  filesT.update(f, { 'Sheet id': fresh.getId(), Month: month });
  try {
    if (typeof Drive.Files.remove === 'function') Drive.Files.remove(oldId);
    else Drive.Files['delete'](oldId);
    log_('request file rotated', f['Category id'] + ' | ' + month + ' | carried ' + carry.length);
  } catch (err) {
    DriveApp.getFileById(oldId).setTrashed(true);
    var line = 'The old ' + name + ' request sheet could not be permanently deleted, so it was moved to the Trash. Empty it from Drive > Trash (it holds closed requests).';
    log_('request file delete failed', f['Category id'] + ' | ' + clip(err && err.message ? err.message : err, 200));
    trashed.push(line);
  }
}
