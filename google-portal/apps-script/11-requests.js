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
  note: 'Note',
};

/** Question title → request sheet column, with the longest answer kept. */
var REQ_MAP = [
  ['Name', 'Name', 80],
  ['Phone or email', 'Phone or email', 100],
  ['Moving in or out', 'Moving', 20],
  ['Date', 'Moving date', 10],
  ['For', 'For', 20],
  ['Note', 'Note', 200],
];

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
  var who = isTicked(c.Confidential)
    ? 'Only the bishop and the people he names see this request.'
    : 'Only the ' + (joinNames_(splitList(c['Owning organizations'])) || 'bishopric') + ' leaders see this request.';
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
  form
    .addParagraphTextItem()
    .setTitle(REQ_Q.note)
    .setRequired(false)
    .setHelpText('Optional, up to 200 characters. Please leave out health or money details; a leader will ask what they need.')
    .setValidation(FormApp.createParagraphTextValidation().requireTextLengthLessThanOrEqualTo(200).build());
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

/** One form, folder and month sheet per request category that has no form yet. Re-runnable. */
function buildRequestForms_(s, categories) {
  var portal = portalFolder_();
  var filesT = systemTab_(SYS_TAB.requestFiles);
  var have = indexBy_(filesT.rows(), 'Category id');
  var month = todayLocal_().slice(0, 7);
  var made = [];
  categories.forEach(function (c) {
    if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived) || !c.Id) return;
    var rec = have[c.Id];
    if (rec && rec['Form id']) return;
    var folderName = 'Requests – ' + c.Name;
    var existing = portal.getFoldersByName(folderName);
    var folder = existing.hasNext() ? existing.next() : portal.createFolder(folderName);
    var ss = newRequestSheet_(folder, c.Name, month);
    var form = FormApp.create(c.Name + ' — ' + s.ward_name);
    form
      .setDescription(requestFormDescription_(s, c))
      .setCollectEmail(false)
      .setAllowResponseEdits(false)
      .setShowLinkToRespondAgain(false)
      .setPublishingSummary(false)
      .setConfirmationMessage('Thank you. A leader will contact you.');
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

/** Form-submit trigger (one per request form). */
function gpOnRequestSubmit(e) {
  gpBegin_();
  var answers = {};
  var catId = '?';
  var catName = 'request';
  try {
    e.response.getItemResponses().forEach(function (ir) {
      var v = ir.getResponse();
      answers[ir.getItem().getTitle()] = Array.isArray(v) ? v.join(', ') : String(v == null ? '' : v);
    });
    var formId = e.source.getId();
    var file = systemTab_(SYS_TAB.requestFiles).find('Form id', formId);
    if (!file) throw new Error('no Request files row for this form');
    catId = file['Category id'];
    var cat = serviceTab_(TAB.categories).find('Id', catId);
    if (!cat) throw new Error('category missing from the Categories tab');
    catName = cat.Name;
    var row = { 'Request id': newId_('r'), Received: nowLocal_(), Kind: cat.Name, Status: 'New' };
    REQ_MAP.forEach(function (m) {
      if (m[0] in answers) row[m[1]] = clip(answers[m[0]].trim(), m[2]);
    });
    tabOf_(SpreadsheetApp.openById(file['Sheet id']), REQUEST_TAB).append(row);
    e.source.deleteResponse(e.response.getId());
    var s = settings_();
    var t = tplRequestNotice_(s, cat.Name, DriveApp.getFolderById(file['Folder id']).getUrl());
    requestReaders(cat, leaders_()).forEach(function (to) {
      sendOrQueue_({ to: to, subject: t.subject, html: t.html, text: t.text, priority: 'high' });
    });
  } catch (err) {
    var msg = scrub_(err && err.message ? err.message : err, answers);
    log_('request error', catId + ' | ' + msg);
    alertAdmins_([
      'A ' + catName + ' request could not be filed. It is kept in the form’s Responses tab; copy it into the request sheet by hand.',
      'Problem: ' + msg,
    ]);
  }
}

/**
 * Daily: stamp Closed on, purge after 30 days, rotate on a new month. Old files that could only be
 * trashed are reported in one admin alert. Returns problem lines (the daily job reports them).
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
      var ss = SpreadsheetApp.openById(f['Sheet id']);
      var t = tabOf_(ss, REQUEST_TAB);
      var rows = t.rows();
      stampClosed(rows, today).forEach(function (x) {
        t.update(x.row, { 'Closed on': x.closedOn });
      });
      t.removeMany(rowsToPurge(rows, today));
      if (needsRotation(f.Month, today)) rotateRequestFile_(f, filesT, t, cats[f['Category id']], today, trashed);
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
