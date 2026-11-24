/**
 * The Service Portal menu in the Service Sheet. Run everything signed in as the shared account,
 * which owns every file, form, script and trigger.
 */

var JOB_HANDLERS = ['gpTenMinute', 'gpHourly', 'gpDaily', 'gpOnRequestSubmit'];
var HUB_FOLDER_NAME = 'Hub files (copy to the hub)';

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Service Portal')
    .addItem('Set up', 'gpMenuSetUp')
    .addItem('Sync sharing', 'gpMenuSyncSharing')
    .addItem('Install triggers', 'gpMenuInstallTriggers')
    .addItem('Make hub files', 'gpMenuMakeHubFiles')
    .addItem('Send leader links now', 'gpMenuSendLeaderLinks')
    .addItem('Check health', 'gpMenuCheckHealth')
    .addToUi();
}

function ui_() {
  return SpreadsheetApp.getUi();
}

function tzMismatchLine_(s) {
  var scriptTz = Session.getScriptTimeZone();
  if (!s.time_zone || s.time_zone === scriptTz) return '';
  return (
    'The script time zone is ' + scriptTz + ' but Settings says ' + s.time_zone + '. ' +
    'Fix it: Extensions > Apps Script > Project Settings (gear) > Time zone > ' + s.time_zone + '.'
  );
}

function ensurePortalFolder_(serviceSs) {
  var p = props_();
  var id = p.getProperty('PORTAL_FOLDER_ID');
  var folder = null;
  if (id) {
    try {
      folder = DriveApp.getFolderById(id);
      if (folder.isTrashed()) folder = null;
    } catch (e) {
      folder = null;
    }
  }
  if (!folder) {
    folder = DriveApp.createFolder('Service Portal');
    p.setProperty('PORTAL_FOLDER_ID', folder.getId());
    DriveApp.getFileById(serviceSs.getId()).moveTo(folder);
  }
  return folder;
}

function ensureSystemSheet_(s, folder) {
  var p = props_();
  var id = p.getProperty('SYSTEM_ID');
  var sys = null;
  if (id) {
    try {
      sys = SpreadsheetApp.openById(id);
    } catch (e) {
      sys = null;
    }
  }
  if (!sys) {
    sys = SpreadsheetApp.create(s.ward_name + ' – Service System (private)');
    DriveApp.getFileById(sys.getId()).moveTo(folder);
    p.setProperty('SYSTEM_ID', sys.getId());
  }
  gpEnsureSystemTabs_(sys);
  GP_MEMO_.systemSs = sys;
  return sys;
}

/** Service Portal > Set up. Re-runnable: never duplicates a folder, form or file. */
function gpMenuSetUp() {
  gpBegin_();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  props_().setProperty('SERVICE_ID', ss.getId());
  gpEnsureTabs_(ss);
  var s = settings_();
  if (!s.ward_name || !s.time_zone || !s.contact_email) {
    ui_().alert('Fill in Settings (ward name, time zone, contact email) and the Leaders tab, then run Set up again.');
    return;
  }
  try {
    Utilities.formatDate(new Date(), s.time_zone, 'yyyy');
  } catch (e) {
    ui_().alert('The time_zone in Settings is not a time zone Google knows. Use a name like America/Denver, then run Set up again.');
    return;
  }
  var folder = ensurePortalFolder_(ss);
  ensureSystemSheet_(s, folder);
  var made = buildRequestForms_(s, serviceTab_(TAB.categories).rows());
  var lines = ['Set up is done.'];
  lines.push(made.length ? 'New request forms: ' + made.join(', ') + '.' : 'Request forms: already made.');
  var tz = tzMismatchLine_(s);
  if (tz) lines.push('Time zone: ' + tz);
  lines.push('Next: deploy the web app, paste its address into Settings web_app_url, then run Install triggers and Sync sharing.');
  ui_().alert(lines.join('\n\n'));
}

// ---------- sharing ----------

function listPermissions_(fileId) {
  var out = [];
  var token = null;
  do {
    var opts = { fields: 'nextPageToken,permissions(id,type,role,emailAddress)', pageSize: 100 };
    if (token) opts.pageToken = token;
    var res = Drive.Permissions.list(fileId, opts);
    (res.permissions || []).forEach(function (p) {
      out.push(p);
    });
    token = res.nextPageToken;
  } while (token);
  return out;
}

function removePermission_(fileId, permId) {
  if (typeof Drive.Permissions.remove === 'function') Drive.Permissions.remove(fileId, permId);
  else Drive.Permissions['delete'](fileId, permId);
}

/**
 * Makes a file's or folder's sharing match desired ({email: role}). Share emails are off. Link
 * sharing ("anyone") and domain sharing are removed. Per-address failures go into problems.
 */
function applySharing_(fileId, desired, owner, label, problems) {
  var perms = listPermissions_(fileId);
  var current = {};
  var ids = {};
  perms.forEach(function (p) {
    if ((p.type === 'user' || p.type === 'group') && p.emailAddress) {
      current[normEmail(p.emailAddress)] = p.role;
      ids[normEmail(p.emailAddress)] = p.id;
    } else if (p.role !== 'owner') {
      try {
        removePermission_(fileId, p.id);
      } catch (e) {
        problems.push(label + ': could not turn off ' + p.type + ' sharing (' + clip(e.message, 120) + ').');
      }
    }
  });
  var diff = sharingDiff(current, desired, owner);
  diff.add.forEach(function (a) {
    try {
      Drive.Permissions.create({ role: a.role, type: 'user', emailAddress: a.email }, fileId, { sendNotificationEmail: false });
    } catch (e) {
      problems.push(label + ': could not share with ' + a.email + ' (' + clip(e.message, 120) + ').');
    }
  });
  diff.change.forEach(function (c) {
    try {
      Drive.Permissions.update({ role: c.role }, fileId, ids[c.email]);
    } catch (e) {
      problems.push(label + ': could not change ' + c.email + ' (' + clip(e.message, 120) + ').');
    }
  });
  diff.remove.forEach(function (email) {
    try {
      removePermission_(fileId, ids[email]);
    } catch (e) {
      problems.push(label + ': could not remove ' + email + ' (' + clip(e.message, 120) + ').');
    }
  });
  return diff;
}

/** Script-written tabs: only the owner may edit (no warning-only). */
function protectScriptTabs_(ss) {
  var me = Session.getEffectiveUser();
  PROTECTED_TABS.forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var existing = sh.getProtections(SpreadsheetApp.ProtectionType.SHEET);
    var p = existing.length ? existing[0] : sh.protect();
    p.setDescription('Written by the Service Portal script. Do not type here.');
    p.setWarningOnly(false);
    p.addEditor(me);
    p.removeEditors(p.getEditors());
    if (p.canDomainEdit()) p.setDomainEdit(false);
  });
}

/** Service Portal > Sync sharing. */
function gpMenuSyncSharing() {
  gpBegin_();
  var owner = normEmail(Session.getEffectiveUser().getEmail());
  var leaders = leaders_();
  var problems = [];
  var summary = [];

  var sheetWant = {};
  leaders.forEach(function (l) {
    var e = normEmail(l.Email);
    if (isTicked(l.Bishopric)) sheetWant[e] = 'writer';
    else if (isTicked(l['Ward council']) && sheetWant[e] !== 'writer') sheetWant[e] = 'reader';
  });
  var d = applySharing_(serviceSs_().getId(), sheetWant, owner, 'Service Sheet', problems);
  summary.push('Service Sheet: ' + Object.keys(sheetWant).length + ' people (bishopric edit, ward council view); ' + d.add.length + ' added, ' + d.change.length + ' changed, ' + d.remove.length + ' removed.');

  var cats = indexBy_(serviceTab_(TAB.categories).rows(), 'Id');
  systemTab_(SYS_TAB.requestFiles)
    .rows()
    .forEach(function (f) {
      var cat = cats[f['Category id']];
      if (!cat || !f['Folder id']) return;
      var want = {};
      requestReaders(cat, leaders).forEach(function (e) {
        want[e] = 'writer';
      });
      applySharing_(f['Folder id'], want, owner, 'Requests – ' + cat.Name, problems);
      summary.push('Requests – ' + cat.Name + ': ' + Object.keys(want).length + ' people.');
    });

  applySharing_(systemSs_().getId(), {}, owner, 'System Sheet', problems);
  applySharing_(portalFolder_().getId(), {}, owner, 'Service Portal folder', problems);
  summary.push('System Sheet and Service Portal folder: only this account.');
  protectScriptTabs_(serviceSs_());
  summary.push('Protected tabs: ' + PROTECTED_TABS.join(', ') + '.');
  if (problems.length) {
    summary.push('');
    summary.push('Problems (a person without a Google account cannot be given a file; ask them to make a free Google account with that address, or change their email in Leaders):');
    summary = summary.concat(problems);
  }
  ui_().alert(summary.join('\n'));
  return problems;
}

// ---------- triggers ----------

/** Service Portal > Install triggers. Replaces this project's portal triggers. */
function gpMenuInstallTriggers() {
  gpBegin_();
  var s = settings_();
  var tz = s.time_zone || Session.getScriptTimeZone();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (JOB_HANDLERS.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('gpTenMinute').timeBased().everyMinutes(10).create();
  ScriptApp.newTrigger('gpHourly').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('gpDaily').timeBased().everyDays(1).atHour(2).inTimezone(tz).create();
  var forms = 0;
  systemTab_(SYS_TAB.requestFiles)
    .rows()
    .forEach(function (f) {
      if (!f['Form id']) return;
      ScriptApp.newTrigger('gpOnRequestSubmit').forForm(f['Form id']).onFormSubmit().create();
      forms++;
    });
  ui_().alert('Triggers installed: every 10 minutes, hourly, daily at 2 am, and ' + forms + ' request form trigger(s).');
}

// ---------- hub files ----------

/** Service Portal > Make hub files: the five pages and the sections snippet, ready to copy. */
function gpMenuMakeHubFiles() {
  gpBegin_();
  var s = settings_();
  if (!s.web_app_url) {
    ui_().alert('Deploy the web app first and paste its address into Settings web_app_url, then run Make hub files again.');
    return;
  }
  var portal = portalFolder_();
  var found = portal.getFoldersByName(HUB_FOLDER_NAME);
  var folder = found.hasNext() ? found.next() : portal.createFolder(HUB_FOLDER_NAME);
  var files = {};
  ['serve', 'post', 'help', 'confirm', 'leader'].forEach(function (name) {
    files[name + '.html'] = renderPage_(name, s, false);
  });
  files['hub-sections.html'] = renderHubSections_(s);
  Object.keys(files).forEach(function (name) {
    var old = folder.getFilesByName(name);
    while (old.hasNext()) old.next().setTrashed(true);
    folder.createFile(name, files[name], MimeType.HTML);
  });
  ui_().alert(
    'Hub files are ready in the folder "' + HUB_FOLDER_NAME + '": ' + folder.getUrl() + '\n\n' +
    'Download each file and give them to the hub owner to put next to the hub page (index.html). ' +
    'hub-sections.html says where its sections go.'
  );
}

// ---------- leader links ----------

function gpMenuSendLeaderLinks() {
  gpBegin_();
  var n = processLeaderLinkTicks_();
  ui_().alert(n ? 'Sent ' + n + ' leader link(s).' : 'No boxes are ticked. Tick "Send leader link" for each leader first.');
  return n;
}

// ---------- health ----------

function fetchOk_(url) {
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    return { code: res.getResponseCode(), text: res.getContentText() };
  } catch (e) {
    return { code: 0, text: String(e && e.message ? e.message : e) };
  }
}

/** Service Portal > Check health: one OK/PROBLEM line per piece. Returns the lines. */
function gpMenuCheckHealth() {
  gpBegin_();
  var lines = [];
  var add = function (ok, text) {
    lines.push((ok ? 'OK ' : 'PROBLEM ') + text);
  };
  var s = settings_();
  var missing = ['ward_name', 'time_zone', 'contact_email', 'web_app_url'].filter(function (k) {
    return !s[k];
  });
  add(!missing.length, missing.length ? 'Settings: fill in ' + missing.join(', ') + '.' : 'Settings complete.');

  if (s.web_app_url) {
    var ping = fetchOk_(s.web_app_url + '?api=ping');
    var pingOk = false;
    try {
      pingOk = ping.code === 200 && JSON.parse(ping.text).ok === true;
    } catch (e) {
      pingOk = false;
    }
    add(pingOk, pingOk ? 'Web app answers.' : 'Web app does not answer (' + ping.code + '). Check the deployment: Execute as Me, Who has access Anyone.');
  } else {
    add(false, 'Web app: no web_app_url in Settings.');
  }

  if (s.hub_url) {
    var hubUrl = String(s.hub_url).replace(/\/+$/, '') + '/serve.html';
    var hub = fetchOk_(hubUrl);
    add(hub.code === 200, hub.code === 200 ? 'Hub serve.html reachable.' : 'Hub serve.html not reachable (' + hub.code + '): ' + hubUrl);
  } else {
    add(true, 'Hub: none set; members use the fallback pages (' + (s.web_app_url || 'web app') + '?page=serve).');
  }

  var have = {};
  ScriptApp.getProjectTriggers().forEach(function (t) {
    have[t.getHandlerFunction()] = (have[t.getHandlerFunction()] || 0) + 1;
  });
  var files = [];
  var systemOk = true;
  try {
    files = systemTab_(SYS_TAB.requestFiles).rows();
  } catch (e) {
    systemOk = false;
  }
  var formCount = files.filter(function (f) {
    return f['Form id'];
  }).length;
  var trigOk = have.gpTenMinute && have.gpHourly && have.gpDaily && (have.gpOnRequestSubmit || 0) >= formCount;
  add(
    !!trigOk,
    'Triggers: gpTenMinute ' + (have.gpTenMinute || 0) + ', gpHourly ' + (have.gpHourly || 0) + ', gpDaily ' + (have.gpDaily || 0) +
      ', gpOnRequestSubmit ' + (have.gpOnRequestSubmit || 0) + ' of ' + formCount + (trigOk ? '.' : '. Run Install triggers.')
  );
  add(systemOk, systemOk ? 'System Sheet present.' : 'System Sheet missing. Run Set up.');

  var reqCats = serviceTab_(TAB.categories)
    .rows()
    .filter(function (c) {
      return c.Kind === CATEGORY_KIND.request && !isTicked(c.Archived);
    });
  add(formCount >= reqCats.length, 'Request forms: ' + formCount + ' of ' + reqCats.length + (formCount >= reqCats.length ? '.' : '. Run Set up.'));

  var quota = mailQuota_();
  add(quota > s.email_reserve, 'Email left today: ' + quota + ' (reserve ' + s.email_reserve + ').');

  var outbox = systemOk ? systemTab_(SYS_TAB.outbox).rows() : [];
  var queued = outbox.filter(function (m) {
    return m.Status === 'Queued';
  }).length;
  var failed = outbox.filter(function (m) {
    return m.Status === 'Failed';
  }).length;
  add(!failed, 'Outbox: ' + queued + ' waiting, ' + failed + ' failed.');

  var tz = tzMismatchLine_(s);
  var sheetTz = serviceSs_().getSpreadsheetTimeZone();
  var sheetTzOk = !s.time_zone || sheetTz === s.time_zone;
  add(
    !tz && sheetTzOk,
    tz || (sheetTzOk ? 'Time zone matches (' + (s.time_zone || Session.getScriptTimeZone()) + ').' : 'The Service Sheet time zone is ' + sheetTz + '; set File > Settings > Time zone to ' + s.time_zone + '.')
  );
  ui_().alert(lines.join('\n'));
  return lines;
}
