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
  if (!menuStart_()) return;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  props_().setProperty('SERVICE_ID', ss.getId());
  gpEnsureTabs_(ss);
  if (!props_().getProperty('PHASE2_AT')) props_().setProperty('PHASE2_AT', nowLocal_());
  var migrated = migratePhase1Volunteers_(true);
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
  props_().setProperty('SCHEMA_VERSION', GP_VERSION);
  var refreshed = [];
  var problems = [];
  var made = buildRequestForms_(s, serviceTab_(TAB.categories).rows(), refreshed, problems);
  var lines = ['Set up is done.'];
  if (migrated) lines.push('Volunteers from before phase 2 marked Approved: ' + migrated + '.');
  lines.push(made.length ? 'New request forms: ' + made.join(', ') + '.' : 'Request forms: already made.');
  if (refreshed.length) lines.push('Updated the wording of: ' + refreshed.join(', ') + '.');
  lines = lines.concat(privateFormLines_());
  if (problems.length) lines.push('Problems: ' + problems.join(' '));
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
  if (!menuStart_()) return;
  var owner = normEmail(Session.getEffectiveUser().getEmail());
  var leaders = leaders_();
  var problems = [];
  var summary = [];

  // Decision 14: the whole bishopric (Bishopric ticked) edits the Service Sheet. Its editors can
  // also edit the bound script, which can open every request sheet; the bishopric reads the
  // confidential requests anyway. Other ward council members view it.
  var sheetWant = {};
  leaders.forEach(function (l) {
    if (isTicked(l.Bishopric) || isTicked(l['Ward council'])) sheetWant[normEmail(l.Email)] = 'reader';
  });
  bishopricEmails(leaders).forEach(function (e) {
    sheetWant[e] = 'writer';
  });
  var d = applySharing_(serviceSs_().getId(), sheetWant, owner, 'Service Sheet', problems);
  summary.push(
    'Service Sheet: ' + Object.keys(sheetWant).length + ' people (the bishopric edits; other ward council members view); ' +
      d.add.length + ' added, ' + d.change.length + ' changed, ' + d.remove.length + ' removed.'
  );

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
      var notify = requestNotifyList(cat, leaders);
      if (notify.dropped.length) {
        problems.push(
          cat.Name + ' Notify: these get no request email, because they cannot open its folder or are not email addresses: ' +
            notify.dropped.join(', ') + '. Fix Notify in Categories (blank = everyone who can open the folder).'
        );
      }
    });

  problems = problems.concat(notifyBishopProblems_(serviceTab_(TAB.categories).rows(), leaders));
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

/**
 * One line per request kind (not archived) whose Notify names Bishop while no Leaders row has
 * Calling Bishop (any case): the bishop would get no request email. (An empty Coordinators list
 * behind Notify Coordinators is intended and not reported.)
 */
function notifyBishopProblems_(categories, leaders) {
  var haveBishop = leaders.some(function (l) {
    return String(l.Calling == null ? '' : l.Calling).trim().toLowerCase() === 'bishop';
  });
  if (haveBishop) return [];
  var out = [];
  categories.forEach(function (c) {
    if (c.Kind !== CATEGORY_KIND.request || isTicked(c.Archived)) return;
    var says = splitList(c.Notify).some(function (e) {
      return String(e).trim().toLowerCase() === 'bishop';
    });
    if (says) {
      out.push(
        c.Name + ' Notify says Bishop, but no Leaders row has Calling Bishop, so the bishop gets no request email. ' +
          "Type Bishop in the bishop's Calling in Leaders, or change Notify in Categories."
      );
    }
  });
  return out;
}

// ---------- triggers ----------

/** Service Portal > Install triggers. Replaces this project's portal triggers. */
function gpMenuInstallTriggers() {
  if (!menuStart_()) return;
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
  props_().setProperty('INSTALLED_AT', nowLocal_());
  ui_().alert('Triggers installed: every 10 minutes, hourly, daily at 2 am, and ' + forms + ' request form trigger(s).');
}

// ---------- hub files ----------

/** Service Portal > Make hub files: every page and the sections snippet, ready to copy. */
function gpMenuMakeHubFiles() {
  if (!menuStart_()) return;
  var s = settings_();
  if (!s.web_app_url) {
    ui_().alert('Deploy the web app first and paste its address into Settings web_app_url, then run Make hub files again.');
    return;
  }
  var portal = portalFolder_();
  var found = portal.getFoldersByName(HUB_FOLDER_NAME);
  var folder = found.hasNext() ? found.next() : portal.createFolder(HUB_FOLDER_NAME);
  var files = {};
  Object.keys(PAGE_TITLES).forEach(function (name) {
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
  if (!menuStart_()) return;
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
  if (!menuStart_()) return;
  var lines = healthLines_({ job: false });
  ui_().alert(lines.join('\n'));
  return lines;
}

/**
 * The health checks, one 'OK …' or 'PROBLEM …' line each, with counts only (no volunteer or
 * request data). opts.job: run from the daily job, which also checks the jobs run as the Service
 * Sheet's owner; from the menu (owner only) it names the account the listed triggers belong to.
 */
/** "Approver x is not on the Leaders tab" for each configured approver that isn't (decision 24). */
function approverProblems_(categories, s, leaders) {
  var onTab = {};
  leaders.forEach(function (l) {
    if (isEmail(l.Email)) onTab[normEmail(l.Email)] = true;
  });
  var listed = splitList(s.default_approvers);
  categories.forEach(function (c) {
    if (c.Kind === CATEGORY_KIND.opportunity && !isTicked(c.Archived)) listed = listed.concat(splitList(c.Approvers));
  });
  return uniq_(listed.map(normEmail))
    .filter(function (e) {
      return !onTab[e];
    })
    .map(function (e) {
      return 'Approver ' + clip(e, 80) + ' is not on the Leaders tab, so they get no approval emails. Add a Leaders row for them, or remove them from Approvers / default_approvers.';
    });
}

function healthLines_(opts) {
  opts = opts || {};
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
    var pingBuild = '';
    try {
      var pong = JSON.parse(ping.text);
      pingOk = ping.code === 200 && pong.ok === true;
      pingBuild = String(pong.build || '');
    } catch (e) {
      pingOk = false;
    }
    add(pingOk, pingOk ? 'Web app answers.' : 'Web app does not answer (' + ping.code + '). Check the deployment: Execute as Me, Who has access Anyone.');
    // The web app runs its deployed version; this check runs the code last saved. They differ
    // until someone makes a New version of the deployment.
    if (pingOk) {
      var current = pingBuild === GP_BUILD;
      add(current, current ? 'Web app runs the saved script (build ' + GP_BUILD + ').' : 'The web app is an older version: Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy.');
    }
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
  // getProjectTriggers lists only the running account's triggers: say whose they are.
  var me = normEmail(Session.getEffectiveUser().getEmail());
  if (opts.job) {
    var ownerUser = null;
    try {
      ownerUser = DriveApp.getFileById(serviceSs_().getId()).getOwner();
    } catch (e) {
      ownerUser = null;
    }
    var sheetOwner = ownerUser ? normEmail(ownerUser.getEmail()) : '';
    var sameOwner = !sheetOwner || sheetOwner === me;
    add(
      sameOwner,
      sameOwner
        ? 'Timed jobs run as the Service Sheet owner.'
        : 'Timed jobs run as ' + me + ', not as the Service Sheet owner ' + sheetOwner + '. Sign in as ' + sheetOwner +
            " and run Install triggers, then remove the other account's triggers (Extensions > Apps Script > Triggers, signed in as that account)."
    );
  } else {
    var kinds = ScriptApp.getProjectTriggers().map(function (t) {
      var src = '';
      try {
        src = String(t.getTriggerSource());
      } catch (e) {
        src = '';
      }
      return t.getHandlerFunction() + (src ? ' (' + src + ')' : '');
    });
    add(
      true,
      'Triggers belong to ' + me + ' (this account): ' + (kinds.length ? kinds.join(', ') : 'none') +
        '. Triggers another account made never show here; if one is missing above, run Install triggers signed in as this account.'
    );
  }
  // Each job stamps LAST_RAN_<job> when it finishes; a job that stops (or whose runs are
  // refused) shows up here even though its trigger is still listed.
  var now = nowLocal_();
  var installed = props_().getProperty('INSTALLED_AT') || '';
  Object.keys(JOB_MAX_MINUTES).forEach(function (job) {
    var max = JOB_MAX_MINUTES[job];
    var last = props_().getProperty('LAST_RAN_' + job) || '';
    if (last) {
      var age = minutesBetween_(last, now);
      add(age <= max, job + ' last ran ' + last + (age <= max ? '.' : ', more than ' + max + ' minutes ago. Open Extensions > Apps Script > Executions to see why.'));
    } else if (installed && minutesBetween_(installed, now) <= max) {
      add(true, job + ' has not run yet (triggers installed ' + installed + ').');
    } else {
      add(false, job + ' has not run' + (installed ? ' since the triggers were installed at ' + installed : '') + '. Run Install triggers signed in as this account, then open Extensions > Apps Script > Executions.');
    }
  });
  add(systemOk, systemOk ? 'System Sheet present.' : 'System Sheet missing. Run Set up.');

  var reqCats = serviceTab_(TAB.categories)
    .rows()
    .filter(function (c) {
      return c.Kind === CATEGORY_KIND.request && !isTicked(c.Archived);
    });
  add(formCount >= reqCats.length, 'Request forms: ' + formCount + ' of ' + reqCats.length + (formCount >= reqCats.length ? '.' : '. Run Set up.'));
  notifyBishopProblems_(reqCats, leaders_()).forEach(function (line) {
    add(false, line);
  });
  // Approvers (2.4): an address that isn't on the Leaders tab gets no approval email.
  approverProblems_(serviceTab_(TAB.categories).rows(), s, leaders_()).forEach(function (line) {
    add(false, line);
  });
  // Test mode (2.3.1): always a PROBLEM while on, so it can't be forgotten at go-live.
  var testMail = testMailList_(s.test_mail_only);
  if (testMail.on) {
    if (!testMail.catchAll) add(false, 'Test mode: test_mail_only has no valid address, so no email is sent at all. Fix it, or empty it to send email normally.');
    else add(false, 'Test mode: email to anyone not in test_mail_only goes to ' + testMail.catchAll + '.');
    testMail.bad.forEach(function (b) {
      add(false, 'test_mail_only: "' + clip(b, 60) + '" is not an email address, so every email goes to ' + (testMail.catchAll || 'nobody') + '. Fix or remove it.');
    });
  }
  // The ward's look (2.3): a bad value is ignored on the pages; say so here.
  themeOf_(s).problems.forEach(function (line) {
    add(false, line);
  });
  var tpl = formTemplateId_(s.form_template_url);
  if (tpl && tpl.error) add(false, tpl.error);

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
  return lines;
}

// ---------- upgrade from phase 1 ----------

/**
 * Phase 1 had no approval step: a leader removed anyone they didn't recognize. Every non-leader
 * address holding a Confirmed sign-up is marked Approved (Decided by "Phase 1 sign-up") when
 *   - it has no Volunteers row and that sign-up was taken by phase 1 code: before the phase 2
 *     web app first answered (PHASE2_WEB_AT, set by dispatch_; unset = the old web app is still
 *     the live one). That covers the old web app serving between pasting the script and making
 *     its new version, and leaves alone a former leader who signed up later (leaders get no row);
 *   - or its only row is Pending with no Decided by, and the Confirmed sign-up was taken by phase
 *     1 code (the same cutoff, PHASE2_WEB_AT): someone phase 1 (or the old web app in the gap)
 *     had accepted who then signed up again through phase 2. A Pending row with a Decided by is a
 *     bishopric undo, never touched.
 * Phase 2 never confirms a Pending address, so nothing else matches. Runs at every Set up
 * (force) and once, lazily, from ensureUpgraded_. Returns how many rows it added or changed.
 */
function migratePhase1Volunteers_(force) {
  var p = props_();
  if (!force && p.getProperty('VOLUNTEERS_MIGRATED')) return 0;
  var webCut = p.getProperty('PHASE2_WEB_AT') || '';
  // Phase 1 code took every sign-up up to this moment (now, while the old web app is still live).
  var cut = webCut || nowLocal_();
  var n = withLock_(function () {
    var volsT = serviceTab_(TAB.volunteers);
    var have = volunteersByEmail_(volsT.rows());
    var leaders = leaderEmails_();
    var now = nowLocal_();
    var add = [];
    var done = {};
    var changed = 0;
    serviceTab_(TAB.signups)
      .rows()
      .sort(function (a, b) {
        return cmpLocal(a['Signed up at'], b['Signed up at']);
      })
      .forEach(function (su) {
        var e = normEmail(su.Email);
        if (su.Status !== SIGNUP_STATUS.confirmed || !isEmail(e) || done[e] || leaders.indexOf(e) >= 0) return;
        var v = have[e];
        var record = { Status: VOLUNTEER_STATUS.approved, 'Decided by': 'Phase 1 sign-up', 'Decided at': now };
        if (!v) {
          if (cmpLocal(su['Signed up at'], cut) > 0) return;
          done[e] = true;
          add.push(merge_({ Email: e, Name: su.Name, 'First post': su['Post id'] }, record));
        } else if (v.Status === VOLUNTEER_STATUS.pending && !String(v['Decided by'] || '').trim() && cmpLocal(su['Signed up at'], cut) <= 0) {
          done[e] = true;
          volsT.update(v, record);
          changed++;
        }
      });
    volsT.appendMany(add);
    return add.length + changed;
  });
  p.setProperty('VOLUNTEERS_MIGRATED', nowLocal_());
  return n;
}

/**
 * Brings a sheet set up by an earlier version up to this one before any job or web call uses it:
 * adds missing tabs, columns and Settings rows (gpEnsureTabs_, the System Sheet's tabs), records
 * when phase 2 began, and runs the phase 1 volunteer migration once. Does nothing until Set up has
 * made the portal's tabs (no Posts tab), and nothing more once SCHEMA_VERSION is this version.
 */
function ensureUpgraded_() {
  var p = props_();
  if (p.getProperty('SCHEMA_VERSION') === GP_VERSION) return;
  var ss = serviceSs_();
  if (!ss.getSheetByName(TAB.posts)) return;
  withLock_(function () {
    if (p.getProperty('SCHEMA_VERSION') === GP_VERSION) return;
    gpEnsureTabs_(ss);
    if (p.getProperty('SYSTEM_ID')) gpEnsureSystemTabs_(systemSs_());
    if (!p.getProperty('PHASE2_AT')) p.setProperty('PHASE2_AT', nowLocal_());
    migratePhase1Volunteers_(false);
    p.setProperty('SCHEMA_VERSION', GP_VERSION);
    log_('upgraded', GP_VERSION);
  });
}
