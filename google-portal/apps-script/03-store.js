/**
 * Tables: header-mapped access to a sheet. Columns are always found by header name, never by
 * position, so a column someone inserts by hand doesn't break anything. Every write goes through
 * here: strings are passed through sanitizeCell (formula injection) and date, time and free-text
 * cells get the plain-text format '@' first so Sheets never turns them into Dates or numbers.
 */

function colType_(header) {
  if (DATE_COLS.indexOf(header) >= 0) return 'date';
  if (TIME_COLS.indexOf(header) >= 0) return 'time';
  if (LOCAL_DT_COLS.indexOf(header) >= 0) return 'localdt';
  if (MONTH_COLS.indexOf(header) >= 0) return 'month';
  if (TEXT_COLS.indexOf(header) >= 0) return 'text';
  return '';
}

function normCell_(type, v) {
  if (type === 'date') return normDate(v);
  if (type === 'time') return normTime(v);
  if (type === 'localdt') return normLocalDT(v);
  if (type === 'month') return normMonth(v);
  if (type === 'text' && isDateObj_(v)) return normLocalDT(v);
  return v;
}

function isBlankCell_(v) {
  return v === '' || v === false || v === null || v === undefined;
}

/**
 * table_(sheet) → {headers, rows(), find(col, value), append(obj), appendMany(objs),
 * update(rowObj, changes), remove(rowObj), removeMany(rowObjs)}.
 * Row objects are keyed by header text and carry a hidden (non-enumerable) _row.
 */
function table_(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = lastCol
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
        return String(h).trim();
      })
    : [];
  var idx = {};
  headers.forEach(function (h, i) {
    if (h && !(h in idx)) idx[h] = i;
  });
  var hasCheckboxes = headers.some(function (h) {
    return CHECKBOX_COLS.indexOf(h) >= 0;
  });

  function colOf(name) {
    if (!(name in idx)) {
      throw new Error('Missing column "' + name + '" in tab ' + sheet.getName() + '. Run Service Portal > Set up.');
    }
    return idx[name] + 1;
  }

  function readValues() {
    var n = sheet.getLastRow();
    if (n < 2 || !lastCol) return [];
    return sheet.getRange(2, 1, n - 1, lastCol).getValues();
  }

  function toObj(values, rowNum) {
    var o = {};
    headers.forEach(function (h, i) {
      if (h && idx[h] === i) o[h] = normCell_(colType_(h), values[i]);
    });
    Object.defineProperty(o, '_row', { value: rowNum, enumerable: false, writable: true });
    return o;
  }

  function rows() {
    var out = [];
    readValues().forEach(function (values, i) {
      if (values.every(isBlankCell_)) return;
      out.push(toObj(values, i + 2));
    });
    return out;
  }

  function lastDataRow() {
    if (!hasCheckboxes) return Math.max(1, sheet.getLastRow());
    var values = readValues();
    for (var i = values.length - 1; i >= 0; i--) {
      if (!values[i].every(isBlankCell_)) return i + 2;
    }
    return 1;
  }

  function rowValues(obj) {
    Object.keys(obj).forEach(colOf);
    return headers.map(function (h, i) {
      var box = CHECKBOX_COLS.indexOf(h) >= 0;
      if (!h || idx[h] !== i || !(h in obj)) return box ? false : '';
      var v = obj[h];
      if (box) return isTicked(v);
      return sanitizeCell(v === null || v === undefined ? '' : v);
    });
  }

  function textFormat(rowNum, count) {
    headers.forEach(function (h, i) {
      if (h && idx[h] === i && colType_(h)) sheet.getRange(rowNum, i + 1, count, 1).setNumberFormat('@');
    });
  }

  function appendMany(objs) {
    if (!objs.length) return [];
    return withLock_(function () {
      var values = objs.map(rowValues);
      var first = lastDataRow() + 1;
      var needed = first + values.length - 1;
      var max = sheet.getMaxRows();
      if (needed > max) sheet.insertRowsAfter(max, needed - max + 50);
      textFormat(first, values.length);
      sheet.getRange(first, 1, values.length, headers.length).setValues(values);
      return objs.map(function (obj, i) {
        var o = {};
        headers.forEach(function (h, j) {
          if (h && idx[h] === j) o[h] = h in obj ? obj[h] : '';
        });
        Object.defineProperty(o, '_row', { value: first + i, enumerable: false, writable: true });
        return o;
      });
    });
  }

  function update(rowObj, changes) {
    Object.keys(changes).forEach(function (k) {
      var c = colOf(k);
      var v = changes[k];
      if (colType_(k)) sheet.getRange(rowObj._row, c).setNumberFormat('@');
      sheet.getRange(rowObj._row, c).setValue(sanitizeCell(v === null || v === undefined ? '' : v));
      rowObj[k] = v;
    });
  }

  /** Deletes rows bottom-up, in contiguous runs. */
  function removeMany(rowObjs) {
    var nums = rowObjs
      .map(function (r) {
        return r._row;
      })
      .sort(function (a, b) {
        return b - a;
      });
    var i = 0;
    while (i < nums.length) {
      var end = nums[i];
      var start = end;
      while (i + 1 < nums.length && nums[i + 1] === start - 1) {
        i++;
        start = nums[i];
      }
      if (start === end) sheet.deleteRow(end);
      else sheet.deleteRows(start, end - start + 1);
      i++;
    }
  }

  return {
    sheet: sheet,
    headers: headers,
    rows: rows,
    find: function (col, value) {
      colOf(col);
      var all = rows();
      for (var i = 0; i < all.length; i++) if (String(all[i][col]) === String(value)) return all[i];
      return null;
    },
    append: function (obj) {
      return appendMany([obj])[0];
    },
    appendMany: appendMany,
    update: update,
    remove: function (rowObj) {
      removeMany([rowObj]);
    },
    removeMany: removeMany,
  };
}

// ---------- the two spreadsheets ----------

function serviceSs_() {
  if (!GP_MEMO_.serviceSs) {
    var ss = null;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      ss = null;
    }
    if (!ss) {
      var id = props_().getProperty('SERVICE_ID');
      if (!id) throw new Error('Service Sheet not found. Open the Service Sheet and run Service Portal > Set up.');
      ss = SpreadsheetApp.openById(id);
    }
    GP_MEMO_.serviceSs = ss;
  }
  return GP_MEMO_.serviceSs;
}

function systemSs_() {
  if (!GP_MEMO_.systemSs) {
    var id = props_().getProperty('SYSTEM_ID');
    if (!id) throw new Error('System Sheet not found. Run Service Portal > Set up.');
    GP_MEMO_.systemSs = SpreadsheetApp.openById(id);
  }
  return GP_MEMO_.systemSs;
}

function tabOf_(ss, name) {
  var sh = ss.getSheetByName(name);
  if (!sh) throw new Error('Tab "' + name + '" is missing. Run Service Portal > Set up.');
  return table_(sh);
}

function serviceTab_(name) {
  return tabOf_(serviceSs_(), name);
}

function systemTab_(name) {
  return tabOf_(systemSs_(), name);
}

// ---------- layout ----------

/** Creates the tab if missing and appends any missing header at the end (never reorders). */
function ensureTab_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (!headers.length) return sh;
  var lastCol = sh.getLastColumn();
  var have = lastCol
    ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
        return String(h).trim();
      })
    : [];
  var missing = headers.filter(function (h) {
    return have.indexOf(h) < 0;
  });
  if (missing.length) {
    sh.getRange(1, have.length + 1, 1, missing.length).setValues([missing]);
    sh.getRange(1, 1, 1, have.length + missing.length).setFontWeight('bold');
  }
  if (sh.getFrozenRows() !== 1) sh.setFrozenRows(1);
  var all = have.concat(missing);
  var rowsBelow = sh.getMaxRows() - 1;
  if (rowsBelow > 0) {
    all.forEach(function (h, i) {
      if (colType_(h)) sh.getRange(2, i + 1, rowsBelow, 1).setNumberFormat('@');
      if (CHECKBOX_COLS.indexOf(h) >= 0 && missing.indexOf(h) >= 0) {
        sh.getRange(2, i + 1, rowsBelow, 1).insertCheckboxes();
      }
    });
  }
  return sh;
}

/** Service Sheet: every tab, headers, formats, checkboxes, dropdowns, Settings rows, Read me. */
function gpEnsureTabs_(ss) {
  Object.keys(SERVICE_HEADERS).forEach(function (name) {
    ensureTab_(ss, name, SERVICE_HEADERS[name]);
  });
  ensureSettingsRows_(ss);
  GP_MEMO_.settings = null;
  seedCategories_(ss);
  seedGiving_(ss);
  seedNotify_(ss);
  seedHelpPage_(ss);
  addDropdowns_(ss);
  writeReadMe_(ss);
}

function gpEnsureSystemTabs_(ss) {
  Object.keys(SYSTEM_HEADERS).forEach(function (name) {
    ensureTab_(ss, name, SYSTEM_HEADERS[name]);
  });
}

function ensureSettingsRows_(ss) {
  var t = table_(ss.getSheetByName(TAB.settings));
  var have = {};
  t.rows().forEach(function (r) {
    have[String(r.Key).trim()] = true;
  });
  var add = SETTINGS_ROWS.filter(function (row) {
    return !have[row[0]];
  }).map(function (row) {
    return { Key: row[0], Value: row[1], Help: row[2] };
  });
  t.appendMany(add);
}

/** Seeds the default categories once: only while the tab has never been seeded. */
function seedCategories_(ss) {
  var p = props_();
  if (p.getProperty('CATEGORIES_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  if (!t.rows().length) t.appendMany(DEFAULT_CATEGORIES);
  p.setProperty('CATEGORIES_SEEDED', 'yes');
}

/**
 * Once per project (1.1, decision 15): on a sheet seeded before the Notify column existed, the
 * `other` row gets Notify = Bishop when its cell is blank. A value someone typed is kept, and a
 * cell cleared later stays clear.
 */
function seedNotify_(ss) {
  var p = props_();
  if (p.getProperty('NOTIFY_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  var other = t.find('Id', 'other');
  if (other && String(other.Notify == null ? '' : other.Notify).trim() === '') t.update(other, { Notify: 'Bishop' });
  p.setProperty('NOTIFY_SEEDED', 'yes');
}

/**
 * Once per project (decision 16): a Categories tab seeded before the giving form existed gets
 * the christmas-giving row, unless a row with that Id is already there. Never re-added after
 * someone deletes it.
 */
function seedGiving_(ss) {
  var p = props_();
  if (p.getProperty('GIVING_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  if (!t.find('Id', GIVING_ID)) t.append(GIVING_CATEGORY);
  p.setProperty('GIVING_SEEDED', 'yes');
}

/**
 * Once per project: when the On Help page column first appears, every row but the giving form's
 * is ticked, so the request kinds already on the Help page stay there. Later unticks are kept.
 */
function seedHelpPage_(ss) {
  var p = props_();
  if (p.getProperty('HELP_PAGE_SEEDED')) return;
  var t = table_(ss.getSheetByName(TAB.categories));
  t.rows().forEach(function (c) {
    if (c.Id !== GIVING_ID && !isTicked(c['On Help page'])) t.update(c, { 'On Help page': true });
  });
  p.setProperty('HELP_PAGE_SEEDED', 'yes');
}

function addDropdowns_(ss) {
  var leaders = ss.getSheetByName(TAB.leaders);
  var orgs = settingsFrom_(ss).organizations;
  var lt = table_(leaders);
  var rowsBelow = leaders.getMaxRows() - 1;
  if (orgs.length && rowsBelow > 0) {
    var orgRule = SpreadsheetApp.newDataValidation().requireValueInList(orgs, true).setAllowInvalid(false).build();
    leaders.getRange(2, lt.headers.indexOf('Organization') + 1, rowsBelow, 1).setDataValidation(orgRule);
  }
  var cats = ss.getSheetByName(TAB.categories);
  var ct = table_(cats);
  var catRows = cats.getMaxRows() - 1;
  if (catRows > 0) {
    var kindRule = SpreadsheetApp.newDataValidation()
      .requireValueInList([CATEGORY_KIND.opportunity, CATEGORY_KIND.request], true)
      .setAllowInvalid(false)
      .build();
    cats.getRange(2, ct.headers.indexOf('Kind') + 1, catRows, 1).setDataValidation(kindRule);
  }
}

function readMeLines_(s) {
  return [
    'Service Portal: read me',
    'Ward: ' + (s.ward_name || '(fill in Settings)'),
    '',
    'What each tab is for',
    'Who may edit: the bishopric (every Leaders row with Bishopric ticked) edits this sheet. Other leaders view it and ask the Executive Secretary for changes to Settings, Leaders or Categories. (Editors of this sheet can also change its script, which can open every request sheet, so tick Bishopric only for the bishop, both counselors, the Executive Secretary and the Ward Clerk.)',
    'Settings: ward name, time zone, contact email, web addresses and limits.',
    'Leaders: who gets a leader link and which files. Tick the role boxes (Bishopric: the bishop, both counselors, the Executive Secretary and the Ward Clerk); tick "Send leader link" to email a link. Then run Service Portal > Sync sharing.',
    'Categories: kinds of opportunities and requests, their owners and coordinators. Confidential kinds: Christmas and Other requests go only to the bishopric and that kind\'s Coordinators (people listed there need no Leaders row).',
    'Notify (Categories): who gets the "new request" email. Blank: everyone who can open that kind\'s folder. Otherwise names separated by commas: Bishop (the Leaders row whose Calling is Bishop) or email addresses. Only people who can open the folder are emailed. Coordinators means the people in that row\'s Coordinators.',
    'On Help page (Categories): ticked request kinds show on the public Request Help page. The Christmas giving offers form is never shown there.',
    'On Serve page (Categories): only for the christmas-giving row (ignored on every other row). Ticked: the Service Opportunities page shows an "Offer to give at Christmas" card linking to its form. Unticked: share its link privately (Set up shows it). Either way only the bishopric and its Coordinators see the answers.',
    'Posts, Slots, Sign-ups: written only by the script from the leader page and the public pages. Do not type in them.',
    'Volunteers, Needs help soon: for phase 2; the script fills them.',
    '',
    PAGE_FOOTER,
    '',
    GEMINI_RULE,
    '',
    'Requests are not in this sheet. Each kind of request has its own folder and sheet, shared only with its leaders.',
    'Contact: ' + (s.contact_email || '(fill in contact_email in Settings)'),
  ];
}

function writeReadMe_(ss) {
  var sh = ss.getSheetByName(TAB.readMe);
  var lines = readMeLines_(settingsFrom_(ss));
  var old = sh.getLastRow();
  if (old > lines.length) sh.getRange(lines.length + 1, 1, old - lines.length, 1).clearContent();
  sh.getRange(1, 1, lines.length, 1).setNumberFormat('@');
  sh.getRange(1, 1, lines.length, 1).setValues(
    lines.map(function (l) {
      return [sanitizeCell(l)];
    })
  );
  sh.getRange(1, 1).setFontWeight('bold');
}

// ---------- Settings ----------

function settingsFrom_(ss) {
  var sh = ss.getSheetByName(TAB.settings);
  var raw = {};
  if (sh) {
    table_(sh)
      .rows()
      .forEach(function (r) {
        raw[String(r.Key).trim()] = r.Value;
      });
  }
  var s = {};
  SETTINGS_ROWS.forEach(function (row) {
    var key = row[0];
    var v = raw[key];
    var blank = v === undefined || v === null || String(v).trim() === '';
    if (NUMBER_SETTINGS.indexOf(key) >= 0) {
      var n = blank ? NaN : Number(v);
      s[key] = isFinite(n) ? n : Number(row[1]);
    } else if (key === 'organizations') {
      s[key] = splitList(blank ? row[1] : v);
    } else if (key === 'discord') {
      s[key] = blank ? false : isTicked(v);
    } else {
      s[key] = blank ? String(row[1]) : String(v).trim();
    }
  });
  return s;
}

/** Settings as typed values with defaults. Memoized per execution (gpBegin_ clears it). */
function settings_() {
  if (!GP_MEMO_.settings) GP_MEMO_.settings = settingsFrom_(serviceSs_());
  return GP_MEMO_.settings;
}
