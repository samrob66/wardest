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
 * Who reads a request category's folder (and gets its notices): its Coordinators, plus (when
 * confidential) the whole bishopric, otherwise the Leaders whose Organization owns the category.
 * Normalized and de-duplicated.
 */
function requestReaders(category, leaders) {
  var out = splitList(category.Coordinators)
    .filter(isEmail)
    .map(normEmail);
  if (isTicked(category.Confidential)) return uniq_(out.concat(bishopricEmails(leaders)));
  var owners = splitList(category['Owning organizations']);
  leaders.forEach(function (l) {
    if (!isEmail(l.Email)) return;
    if (owners.indexOf(String(l.Organization == null ? '' : l.Organization).trim()) >= 0) out.push(normEmail(l.Email));
  });
  return uniq_(out);
}

/** Administrators for alert emails: Leaders whose Calling is Bishop or Executive Secretary. */
function adminEmails(leaders) {
  return uniq_(
    leaders
      .filter(function (l) {
        var c = String(l.Calling == null ? '' : l.Calling).trim().toLowerCase();
        return isEmail(l.Email) && (c === 'bishop' || c === 'executive secretary');
      })
      .map(function (l) {
        return normEmail(l.Email);
      })
  );
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
