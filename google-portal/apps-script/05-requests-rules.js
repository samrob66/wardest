/**
 * Request and sharing rules. Pure: plain objects in, plain objects out.
 * (REQUEST_HEADERS and REQUEST_STATUS live in 00-config.js with the other headers.)
 */

/**
 * The bishopric: every Leaders row with Bishopric ticked (the bishop, both counselors, the
 * Executive Secretary and the Ward Clerk). The Calling text decides nothing. Normalized and
 * de-duplicated. (Decision 14: they edit the Service Sheet and read the confidential requests.)
 */
function bishopricEmails(leaders) {
  return uniq_(
    leaders
      .filter(function (l) {
        return isTicked(l.Bishopric) && isEmail(l.Email);
      })
      .map(function (l) {
        return normEmail(l.Email);
      })
  );
}

/**
 * Who reads a request category's folder: the whole bishopric and its Coordinators, plus (unless
 * confidential) the Leaders whose Organization owns the category. Decision 18: the bishopric
 * opens every request folder. Normalized and de-duplicated.
 */
function requestReaders(category, leaders) {
  var out = bishopricEmails(leaders).concat(
    splitList(category.Coordinators)
      .filter(isEmail)
      .map(normEmail)
  );
  if (isTicked(category.Confidential)) return uniq_(out);
  var owners = splitList(category['Owning organizations']);
  leaders.forEach(function (l) {
    if (!isEmail(l.Email)) return;
    if (owners.indexOf(String(l.Organization == null ? '' : l.Organization).trim()) >= 0) out.push(normEmail(l.Email));
  });
  return uniq_(out);
}

/** The owning organizations' leaders: Org editor or Ward council ticked, Organization listed. */
function ownerLeaderEmails_(category, leaders) {
  var owners = splitList(category['Owning organizations']);
  return leaders
    .filter(function (l) {
      return (
        isEmail(l.Email) &&
        (isTicked(l['Org editor']) || isTicked(l['Ward council'])) &&
        owners.indexOf(String(l.Organization == null ? '' : l.Organization).trim()) >= 0
      );
    })
    .map(function (l) {
      return normEmail(l.Email);
    });
}

/**
 * Who gets a request kind's "new request" notice: {to, dropped}. Blank Notify: every reader.
 * Otherwise Notify is a comma list where `Bishop` means the Leaders whose Calling is Bishop,
 * `Coordinators` means the category's Coordinators, `Owners` means the owning organizations'
 * leaders (Org editor or Ward council ticked), and anything else must be an email address. Only readers of the category's folder can get the
 * notice; everyone else, and anything that isn't an address, goes into dropped. If nobody is
 * left, every reader gets it (a notice holds no request details, and silence would lose it).
 */
function requestNotifyList(category, leaders) {
  var readers = requestReaders(category, leaders);
  var entries = splitList(category.Notify);
  if (!entries.length) return { to: readers, dropped: [] };
  var wanted = [];
  var junk = [];
  entries.forEach(function (entry) {
    if (String(entry).trim().toLowerCase() === 'bishop') {
      leaders.forEach(function (l) {
        var c = String(l.Calling == null ? '' : l.Calling).trim().toLowerCase();
        if (c === 'bishop' && isEmail(l.Email)) wanted.push(normEmail(l.Email));
      });
    } else if (String(entry).trim().toLowerCase() === 'owners') {
      wanted = wanted.concat(ownerLeaderEmails_(category, leaders));
    } else if (String(entry).trim().toLowerCase() === 'coordinators') {
      splitList(category.Coordinators).forEach(function (e) {
        if (isEmail(e)) wanted.push(normEmail(e));
      });
    } else if (isEmail(entry)) {
      wanted.push(normEmail(entry));
    } else {
      junk.push(String(entry).trim());
    }
  });
  var to = [];
  var notReaders = [];
  uniq_(wanted).forEach(function (e) {
    if (readers.indexOf(e) >= 0) to.push(e);
    else notReaders.push(e);
  });
  return { to: to.length ? to : readers, dropped: uniq_(notReaders.concat(junk)) };
}

/** The entries of Settings admin_alerts_to that are not email addresses (2.5.2, decision 26). */
function adminAlertsBad_(adminAlertsTo) {
  return splitList(adminAlertsTo).filter(function (e) {
    return !isEmail(e);
  });
}

/**
 * Administrators for alert emails (2.5.2, decision 26; Sam: "these kinds of emails should go to me
 * (the Exec Sec) and not to the Bishop"). Settings admin_alerts_to when it holds only valid
 * addresses; otherwise (blank, or any bad entry) the Leaders rows with Calling Executive
 * Secretary, or, when there are none, Calling Bishop, so alerts never go nowhere.
 */
function adminEmails(leaders, adminAlertsTo) {
  var listed = splitList(adminAlertsTo);
  if (listed.length && !adminAlertsBad_(adminAlertsTo).length) return uniq_(listed.map(normEmail));
  var byCalling = function (calling) {
    return uniq_(
      (leaders || [])
        .filter(function (l) {
          return isEmail(l.Email) && String(l.Calling == null ? '' : l.Calling).trim().toLowerCase() === calling;
        })
        .map(function (l) {
          return normEmail(l.Email);
        })
    );
  };
  var execSec = byCalling('executive secretary');
  return execSec.length ? execSec : byCalling('bishop');
}

function isClosedStatus_(status) {
  return status === 'Done' || status === 'Declined';
}

/** [{row, closedOn}]: Done/Declined rows without a Closed on get today; reopened rows lose it. */
function stampClosed(rows, todayLocal) {
  var out = [];
  rows.forEach(function (r) {
    var closed = isClosedStatus_(r.Status);
    if (closed && !r['Closed on']) out.push({ row: r, closedOn: todayLocal.slice(0, 10) });
    else if (!closed && r['Closed on']) out.push({ row: r, closedOn: '' });
  });
  return out;
}

/** Closed rows whose Closed on is 30 or more days ago. */
function rowsToPurge(rows, todayLocal) {
  var cutoff = addDays(todayLocal.slice(0, 10), -REQUEST_KEEP_DAYS);
  return rows.filter(function (r) {
    return isClosedStatus_(r.Status) && isDateStr(r['Closed on']) && r['Closed on'] <= cutoff;
  });
}

/** Everything the purge keeps. */
function rowsToCarry(rows, todayLocal) {
  var purge = rowsToPurge(rows, todayLocal);
  return rows.filter(function (r) {
    return purge.indexOf(r) < 0;
  });
}

/** True when the request sheet's month is not this month. */
function needsRotation(lastMonth, todayLocal) {
  return !!lastMonth && String(lastMonth) !== String(todayLocal).slice(0, 7);
}

/**
 * What to change so file access matches. current/desired: {email: role}. Never removes or
 * changes the owner.
 */
function sharingDiff(current, desired, ownerEmail) {
  var owner = normEmail(ownerEmail);
  var cur = {};
  Object.keys(current || {}).forEach(function (e) {
    cur[normEmail(e)] = current[e];
  });
  var want = {};
  Object.keys(desired || {}).forEach(function (e) {
    want[normEmail(e)] = desired[e];
  });
  var out = { add: [], change: [], remove: [] };
  Object.keys(want).forEach(function (e) {
    if (e === owner || cur[e] === 'owner') return;
    if (!(e in cur)) out.add.push({ email: e, role: want[e] });
    else if (cur[e] !== want[e]) out.change.push({ email: e, role: want[e] });
  });
  Object.keys(cur).forEach(function (e) {
    if (e === owner || cur[e] === 'owner') return;
    if (!(e in want)) out.remove.push(e);
  });
  return out;
}
