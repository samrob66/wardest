// In-memory fakes of the Google Apps Script services the portal uses. Nothing here touches the
// network or a real Google account.
//
// Fidelity notes:
// - A Sheet is a 2D array. Like Sheets, a string written to a cell whose number format is not
//   '@' (plain text) is parsed: 'YYYY-MM-DD' / 'YYYY-MM-DD HH:mm' / 'YYYY-MM' become Dates,
//   'H:mm' becomes a Date on 1899-12-30, a plain number string becomes a number. A leading ' keeps
//   the string as text and is not returned by getValues (sheet.raw() shows what was stored).
// - insertCheckboxes() turns blank cells into false, so getLastRow() counts those rows (as Sheets).
// - Drive permissions are a map per file id: {email: {id, role, type, emailAddress}}; the owner is
//   OWNER_EMAIL with role 'owner'. Addresses listed in failPermissionFor throw on create (as an
//   address with no Google account does).
import { createHash, randomUUID } from 'node:crypto';

export const OWNER_EMAIL = 'ward.account@example.test';

// ---------- time-zone helpers ----------

function tzParts(ms, tz) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const p = {};
  for (const part of f.formatToParts(new Date(ms))) p[part.type] = part.value;
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, s: +p.second };
}

export function localToMs(local, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(local);
  if (!m) throw new Error('bad local date-time ' + local);
  const want = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  let guess = want;
  for (let i = 0; i < 3; i++) {
    const p = tzParts(guess, tz);
    const got = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s);
    guess += want - got;
  }
  return guess;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');

export function formatInTz(date, tz, fmt) {
  const p = tzParts(date.getTime(), tz);
  return fmt
    .replace('yyyy', pad(p.y, 4))
    .replace('MM', pad(p.mo))
    .replace('dd', pad(p.d))
    .replace('HH', pad(p.h))
    .replace('mm', pad(p.mi))
    .replace('ss', pad(p.s));
}

// ---------- recording builder (any call chains; build() returns the record) ----------

function recorder(kind, log = []) {
  const calls = [];
  const proxy = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'calls') return calls;
        if (prop === 'kind') return kind;
        if (prop === 'build') return () => ({ kind, calls: calls.slice() });
        if (typeof prop === 'symbol' || prop === 'then') return undefined;
        return (...args) => {
          calls.push([prop, ...args]);
          log.push([kind, prop, ...args]);
          return proxy;
        };
      },
    }
  );
  return proxy;
}

// ---------- Sheets ----------

const RE_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const RE_DT = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
const RE_MONTH = /^(\d{4})-(\d{2})$/;
const RE_TIME = /^(\d{1,2}):(\d{2})$/;
const RE_NUM = /^-?\d+(\.\d+)?$/;

function parseLikeSheets(v) {
  if (typeof v !== 'string') return v;
  if (v.startsWith("'")) return v;
  let m;
  if ((m = RE_DATE.exec(v))) return new Date(+m[1], +m[2] - 1, +m[3]);
  if ((m = RE_DT.exec(v))) return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if ((m = RE_MONTH.exec(v))) return new Date(+m[1], +m[2] - 1, 1);
  if ((m = RE_TIME.exec(v)) && +m[1] < 24 && +m[2] < 60) return new Date(1899, 11, 30, +m[1], +m[2]);
  if (RE_NUM.test(v)) return Number(v);
  return v;
}

class FakeRange {
  constructor(sheet, r, c, nr = 1, nc = 1) {
    if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error(`bad range ${r},${c},${nr},${nc}`);
    if (r + nr - 1 > sheet.getMaxRows()) {
      throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
    }
    Object.assign(this, { sheet, r, c, nr, nc });
  }
  getRow() {
    return this.r;
  }
  getColumn() {
    return this.c;
  }
  getNumRows() {
    return this.nr;
  }
  getNumColumns() {
    return this.nc;
  }
  getValues() {
    this.sheet.ss.counters.reads++;
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) {
        let v = this.sheet.cell(this.r + i, this.c + j);
        if (typeof v === 'string' && v.startsWith("'")) v = v.slice(1);
        if (v instanceof Date) v = new Date(v.getTime());
        row.push(v);
      }
      out.push(row);
    }
    return out;
  }
  getValue() {
    return this.getValues()[0][0];
  }
  setValues(values) {
    if (values.length !== this.nr || values.some((row) => row.length !== this.nc)) {
      throw new Error('The number of rows or columns in the data does not match the range.');
    }
    this.sheet.ss.counters.writes++;
    for (let i = 0; i < this.nr; i++) {
      for (let j = 0; j < this.nc; j++) this.sheet.write(this.r + i, this.c + j, values[i][j]);
    }
    return this;
  }
  setValue(v) {
    return this.setValues(Array.from({ length: this.nr }, () => Array(this.nc).fill(v)));
  }
  forEachCell(fn) {
    for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) fn(this.r + i, this.c + j);
  }
  setNumberFormat(fmt) {
    this.forEachCell((r, c) => this.sheet.formats.set(`${r},${c}`, fmt));
    return this;
  }
  setNumberFormats(fmts) {
    this.forEachCell((r, c) => this.sheet.formats.set(`${r},${c}`, fmts[r - this.r][c - this.c]));
    return this;
  }
  setDataValidation(rule) {
    this.forEachCell((r, c) => this.sheet.validations.set(`${r},${c}`, rule));
    return this;
  }
  insertCheckboxes() {
    this.forEachCell((r, c) => {
      this.sheet.validations.set(`${r},${c}`, 'checkbox');
      if (this.sheet.cell(r, c) === '') this.sheet.write(r, c, false);
    });
    return this;
  }
  setFontWeight() {
    return this;
  }
  setWrap() {
    return this;
  }
  setBackground() {
    return this;
  }
  clearContent() {
    this.forEachCell((r, c) => this.sheet.write(r, c, ''));
    return this;
  }
}

class FakeProtection {
  constructor(sheet) {
    this.sheet = sheet;
    this.description = '';
    this.warningOnly = false;
    this.editors = ['editor@example.test'];
    this.domainEdit = true;
  }
  setDescription(d) {
    this.description = d;
    return this;
  }
  setWarningOnly(w) {
    this.warningOnly = w;
    return this;
  }
  getEditors() {
    return this.editors.map((e) => ({ getEmail: () => e }));
  }
  addEditor(e) {
    const email = typeof e === 'string' ? e : e.getEmail();
    if (!this.editors.includes(email)) this.editors.push(email);
    return this;
  }
  removeEditors(list) {
    const drop = list.map((e) => (typeof e === 'string' ? e : e.getEmail()));
    this.editors = this.editors.filter((e) => !drop.includes(e) || e === OWNER_EMAIL);
    return this;
  }
  canDomainEdit() {
    return this.domainEdit;
  }
  setDomainEdit(v) {
    this.domainEdit = v;
    return this;
  }
  remove() {
    this.sheet.protections = this.sheet.protections.filter((p) => p !== this);
  }
}

export class FakeSheet {
  constructor(ss, name) {
    this.ss = ss;
    this.name = name;
    this.data = [];
    this.formats = new Map();
    this.validations = new Map();
    this.frozen = 0;
    this.maxRows = 1000;
    this.protections = [];
    this.hidden = false;
  }
  cell(r, c) {
    const row = this.data[r - 1];
    if (!row) return '';
    const v = row[c - 1];
    return v === undefined ? '' : v;
  }
  write(r, c, v) {
    while (this.data.length < r) this.data.push([]);
    const row = this.data[r - 1];
    while (row.length < c) row.push('');
    const fmt = this.formats.get(`${r},${c}`);
    row[c - 1] = fmt === '@' ? v : parseLikeSheets(v);
  }
  /** What is stored, leading apostrophes included. */
  raw() {
    return this.data.map((row) => row.slice());
  }
  getName() {
    return this.name;
  }
  setName(n) {
    this.name = n;
    return this;
  }
  getSheetId() {
    return this.ss.sheets.indexOf(this);
  }
  getParent() {
    return this.ss;
  }
  getLastRow() {
    for (let r = this.data.length; r >= 1; r--) {
      if (this.data[r - 1].some((v) => v !== '' && v !== undefined)) return r;
    }
    return 0;
  }
  getLastColumn() {
    let max = 0;
    this.data.forEach((row) => {
      for (let c = row.length; c >= 1; c--) {
        if (row[c - 1] !== '' && row[c - 1] !== undefined) {
          max = Math.max(max, c);
          break;
        }
      }
    });
    return max;
  }
  getMaxRows() {
    return Math.max(this.maxRows, this.data.length);
  }
  getMaxColumns() {
    return 26;
  }
  getRange(r, c, nr, nc) {
    return new FakeRange(this, r, c, nr, nc);
  }
  getDataRange() {
    return new FakeRange(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn()));
  }
  appendRow(values) {
    const r = this.getLastRow() + 1;
    if (r > this.maxRows) this.maxRows = r;
    values.forEach((v, j) => this.write(r, j + 1, v));
    this.ss.counters.writes++;
    return this;
  }
  deleteRow(r) {
    this.data.splice(r - 1, 1);
    this.ss.counters.deletes++;
    return this;
  }
  deleteRows(r, n) {
    this.data.splice(r - 1, n);
    this.ss.counters.deletes++;
    return this;
  }
  insertRowsAfter(after, n) {
    if (after < this.data.length) this.data.splice(after, 0, ...Array.from({ length: n }, () => []));
    this.maxRows = this.getMaxRows() + n;
    return this;
  }
  setFrozenRows(n) {
    this.frozen = n;
    return this;
  }
  getFrozenRows() {
    return this.frozen;
  }
  setColumnWidth() {
    return this;
  }
  autoResizeColumns() {
    return this;
  }
  protect() {
    const p = new FakeProtection(this);
    this.protections.push(p);
    return p;
  }
  getProtections() {
    return this.protections.slice();
  }
  hideSheet() {
    this.hidden = true;
    return this;
  }
  clear() {
    this.data = [];
    return this;
  }
  clearContents() {
    this.data = [];
    return this;
  }
  activate() {
    return this;
  }
}

export class FakeSpreadsheet {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.sheets = [];
    this.counters = { reads: 0, writes: 0, deletes: 0 };
    this.toasts = [];
  }
  getId() {
    return this.id;
  }
  getName() {
    return this.name;
  }
  rename(n) {
    this.name = n;
  }
  getUrl() {
    return `https://docs.example.test/spreadsheets/d/${this.id}/edit`;
  }
  getSheetByName(n) {
    return this.sheets.find((s) => s.name === n) || null;
  }
  getSheets() {
    return this.sheets.slice();
  }
  insertSheet(n) {
    if (this.getSheetByName(n)) throw new Error(`A sheet with the name "${n}" already exists.`);
    const s = new FakeSheet(this, n);
    this.sheets.push(s);
    return s;
  }
  deleteSheet(s) {
    this.sheets = this.sheets.filter((x) => x !== s);
  }
  getSpreadsheetTimeZone() {
    return this.tz || 'America/Denver';
  }
  toast(msg) {
    this.toasts.push(msg);
  }
  /** Test helper: the tab's values as objects keyed by header (raw, apostrophes kept). */
  rowsOf(name) {
    const sh = this.getSheetByName(name);
    if (!sh) return [];
    const [head = [], ...rest] = sh.raw();
    return rest
      .filter((row) => row.some((v) => v !== '' && v !== false))
      .map((row) => Object.fromEntries(head.map((h, i) => [h, row[i] === undefined ? '' : row[i]])));
  }
}

// ---------- Forms ----------

class FakeItem {
  constructor(form, type) {
    this.form = form;
    this.type = type;
    this.title = '';
    this.required = false;
    this.validation = null;
    this.choices = [];
    this.id = form.items.length + 1;
  }
  setTitle(t) {
    this.title = t;
    return this;
  }
  getTitle() {
    return this.title;
  }
  getId() {
    return this.id;
  }
  getType() {
    return this.type;
  }
  setRequired(b) {
    this.required = b;
    return this;
  }
  setValidation(v) {
    this.validation = v && v.build ? v.build() : v;
    return this;
  }
  setChoiceValues(v) {
    this.choices = v.slice();
    return this;
  }
  setHelpText(t) {
    this.help = t;
    return this;
  }
  setIncludesYear(b) {
    this.includesYear = b;
    return this;
  }
}

export class FakeForm {
  constructor(id, title) {
    this.id = id;
    this.title = title;
    this.items = [];
    this.description = '';
    this.collectEmail = null;
    this.confirmation = '';
    this.deletedResponses = [];
    this.accepting = true;
    this.published = true;
  }
  getId() {
    return this.id;
  }
  getTitle() {
    return this.title;
  }
  setTitle(t) {
    this.title = t;
    return this;
  }
  setDescription(d) {
    this.description = d;
    return this;
  }
  getDescription() {
    return this.description;
  }
  setCollectEmail(b) {
    this.collectEmail = b;
    return this;
  }
  setConfirmationMessage(m) {
    this.confirmation = m;
    return this;
  }
  setAllowResponseEdits(b) {
    this.allowEdits = b;
    return this;
  }
  setShowLinkToRespondAgain(b) {
    this.respondAgain = b;
    return this;
  }
  setPublishingSummary(b) {
    this.summary = b;
    return this;
  }
  setAcceptingResponses(b) {
    this.accepting = b;
    return this;
  }
  setPublished(b) {
    this.published = b;
    return this;
  }
  addTextItem() {
    const i = new FakeItem(this, 'TEXT');
    this.items.push(i);
    return i;
  }
  addParagraphTextItem() {
    const i = new FakeItem(this, 'PARAGRAPH_TEXT');
    this.items.push(i);
    return i;
  }
  addMultipleChoiceItem() {
    const i = new FakeItem(this, 'MULTIPLE_CHOICE');
    this.items.push(i);
    return i;
  }
  addDateItem() {
    const i = new FakeItem(this, 'DATE');
    this.items.push(i);
    return i;
  }
  getItems() {
    return this.items.slice();
  }
  getPublishedUrl() {
    return `https://docs.example.test/forms/d/e/pub-${this.id}/viewform`;
  }
  getEditUrl() {
    return `https://docs.example.test/forms/d/${this.id}/edit`;
  }
  deleteResponse(id) {
    this.deletedResponses.push(id);
    return this;
  }
  getResponses() {
    return [];
  }
}

/** A fake form-submit event: answers = {question title: answer}. */
export function formSubmitEvent(form, answers, responseId = 'resp-1') {
  const itemResponses = Object.entries(answers).map(([title, answer]) => ({
    getItem: () => ({ getTitle: () => title }),
    getResponse: () => answer,
  }));
  return {
    source: form,
    response: { getId: () => responseId, getItemResponses: () => itemResponses },
  };
}

// ---------- Drive ----------

class FakeFile {
  constructor(drive, id, name, mime, content = '') {
    Object.assign(this, { drive, id, name, mime, content, parents: [], trashed: false, owner: OWNER_EMAIL });
  }
  getOwner() {
    return this.owner ? { getEmail: () => this.owner } : null;
  }
  getId() {
    return this.id;
  }
  getName() {
    return this.name;
  }
  getUrl() {
    return `https://drive.example.test/file/${this.id}`;
  }
  getBlob() {
    return { getDataAsString: () => this.content };
  }
  moveTo(folder) {
    this.parents = [folder.id];
    return this;
  }
  setTrashed(b) {
    this.trashed = b;
    return this;
  }
  isTrashed() {
    return this.trashed;
  }
}

function iter(list) {
  let i = 0;
  return { hasNext: () => i < list.length, next: () => list[i++] };
}

class FakeFolder {
  constructor(drive, id, name, parent) {
    Object.assign(this, { drive, id, name, parent, trashed: false });
  }
  getId() {
    return this.id;
  }
  getName() {
    return this.name;
  }
  getUrl() {
    return `https://drive.example.test/drive/folders/${this.id}`;
  }
  createFolder(name) {
    return this.drive.newFolder(name, this.id);
  }
  createFile(name, content, mime) {
    const f = this.drive.newFile(name, mime, content);
    f.parents = [this.id];
    return f;
  }
  getFilesByName(name) {
    return iter([...this.drive.files.values()].filter((f) => f.name === name && f.parents.includes(this.id) && !f.trashed));
  }
  getFiles() {
    return iter([...this.drive.files.values()].filter((f) => f.parents.includes(this.id) && !f.trashed));
  }
  getFoldersByName(name) {
    return iter([...this.drive.folders.values()].filter((f) => f.name === name && f.parent === this.id && !f.trashed));
  }
  isTrashed() {
    return this.trashed;
  }
  setTrashed(b) {
    this.trashed = b;
    return this;
  }
}

// ---------- the whole set ----------

export function createFakes({ tz = 'America/Denver' } = {}) {
  let idSeq = 0;
  const nextId = (p) => `${p}${++idSeq}`;
  const state = {
    nowMs: localToMs('2026-12-01 10:00', tz),
    quota: 100,
    lockBusy: false,
    sendFails: 0,
    fetch: () => ({ code: 200, text: '{"ok":true}' }),
    driveRemoveFails: false,
    failPermissionFor: [],
    // A visitor calling through google.script.run: getUi() throws and nobody is signed in.
    webContext: false,
    activeUser: OWNER_EMAIL,
    // The account a menu item or job runs as (a person signed in to several accounts may differ).
    effectiveUser: OWNER_EMAIL,
  };

  const spreadsheets = new Map();
  const newSpreadsheet = (name) => {
    const id = nextId('ss');
    const ss = new FakeSpreadsheet(id, name);
    spreadsheets.set(id, ss);
    files.set(id, new FakeFile(drive, id, name, 'application/vnd.google-apps.spreadsheet'));
    return ss;
  };

  // Drive state
  const files = new Map();
  const folders = new Map();
  const permissions = new Map(); // fileId -> Map(email -> perm)
  const removedFiles = [];
  const drive = {
    files,
    folders,
    newFolder(name, parent = 'root') {
      const f = new FakeFolder(drive, nextId('fo'), name, parent);
      folders.set(f.id, f);
      return f;
    },
    newFile(name, mime, content) {
      const f = new FakeFile(drive, nextId('fi'), name, mime, content);
      files.set(f.id, f);
      return f;
    },
  };
  const root = new FakeFolder(drive, 'root', 'My Drive', null);
  folders.set('root', root);

  const service = newSpreadsheet('Service Sheet');
  service.sheets.push(new FakeSheet(service, 'Sheet1'));
  const system = newSpreadsheet('Riverbend 1st Ward (example) – Service System (private)');

  const forms = new Map();
  const mailSent = [];
  const alerts = [];
  const menus = [];
  const triggers = [];
  const fetches = [];
  const cache = new Map();
  const cacheLog = { gets: 0, puts: 0 };
  const props = new Map([['SYSTEM_ID', system.id], ['SERVICE_ID', service.id]]);

  const SpreadsheetApp = {
    getActiveSpreadsheet: () => service,
    getActive: () => service,
    openById(id) {
      const ss = spreadsheets.get(id);
      if (!ss || (files.get(id) && files.get(id).trashed)) throw new Error(`No spreadsheet with id ${id}`);
      return ss;
    },
    create: (name) => {
      const ss = newSpreadsheet(name);
      ss.sheets.push(new FakeSheet(ss, 'Sheet1'));
      return ss;
    },
    flush() {},
    getUi: () => {
      if (state.webContext) throw new Error('Cannot call SpreadsheetApp.getUi() from this context.');
      return {
      alert: (...a) => {
        alerts.push(a.length > 1 && typeof a[1] === 'string' ? a[0] + '\n' + a[1] : a[0]);
        return 'OK';
      },
      createMenu: (name) => {
        const m = { name, items: [] };
        menus.push(m);
        const api = {
          addItem: (label, fn) => {
            m.items.push([label, fn]);
            return api;
          },
          addSeparator: () => api,
          addToUi: () => undefined,
        };
        return api;
      },
      ButtonSet: { OK: 'OK', YES_NO: 'YES_NO' },
      Button: { OK: 'OK', YES: 'YES', NO: 'NO' },
      };
    },
    newDataValidation: () => recorder('validation'),
    ProtectionType: { SHEET: 'SHEET', RANGE: 'RANGE' },
  };

  const Utilities = {
    getUuid: () => randomUUID(),
    computeDigest: (_alg, s) => [...createHash('sha256').update(String(s), 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
    DigestAlgorithm: { SHA_256: 'SHA_256' },
    Charset: { UTF_8: 'UTF_8' },
    formatDate: (d, zone, fmt) => formatInTz(d, zone, fmt),
    sleep() {},
  };

  const LockService = {
    getScriptLock: () => ({
      tryLock: () => !state.lockBusy,
      waitLock: () => {
        if (state.lockBusy) throw new Error('Lock timeout');
      },
      releaseLock() {},
      hasLock: () => !state.lockBusy,
    }),
  };

  const CacheService = {
    getScriptCache: () => ({
      get: (k) => {
        cacheLog.gets++;
        const e = cache.get(k);
        if (!e || e.until <= state.nowMs) return null;
        return e.v;
      },
      put: (k, v, ttl = 600) => {
        cacheLog.puts++;
        if (String(v).length > 100000) throw new Error('Argument too large: value');
        cache.set(k, { v: String(v), until: state.nowMs + Math.min(ttl, 21600) * 1000 });
      },
      remove: (k) => cache.delete(k),
      removeAll: (ks) => ks.forEach((k) => cache.delete(k)),
    }),
  };

  const PropertiesService = {
    getScriptProperties: () => ({
      getProperty: (k) => (props.has(k) ? props.get(k) : null),
      setProperty(k, v) {
        props.set(k, String(v));
        return this;
      },
      deleteProperty(k) {
        props.delete(k);
        return this;
      },
      getProperties: () => Object.fromEntries(props),
    }),
  };

  const MailApp = {
    getRemainingDailyQuota: () => state.quota,
    sendEmail(opts) {
      if (typeof opts !== 'object') throw new Error('fake MailApp only takes the object form');
      if (state.sendFails > 0) {
        state.sendFails--;
        throw new Error('Service invoked too many times');
      }
      if (state.quota <= 0) throw new Error('Service invoked too many times for one day: email.');
      if (String(opts.to).split(',').length !== 1) throw new Error('fake: one recipient only');
      state.quota--;
      mailSent.push({ ...opts, at: state.nowMs });
    },
  };

  const FormApp = {
    create(title) {
      const f = new FakeForm(nextId('form'), title);
      forms.set(f.id, f);
      files.set(f.id, new FakeFile(drive, f.id, title, 'application/vnd.google-apps.form'));
      return f;
    },
    openById(id) {
      const f = forms.get(id);
      if (!f) throw new Error(`No form with id ${id}`);
      return f;
    },
    createTextValidation: () => recorder('textValidation'),
    createParagraphTextValidation: () => recorder('paragraphValidation'),
  };

  const DriveApp = {
    getRootFolder: () => root,
    createFolder: (name) => drive.newFolder(name, 'root'),
    getFolderById(id) {
      const f = folders.get(id);
      if (!f || f.trashed) throw new Error(`No folder with id ${id}`);
      return f;
    },
    getFileById(id) {
      const f = files.get(id);
      if (!f) throw new Error(`No file with id ${id}`);
      return f;
    },
  };

  let permSeq = 0;
  const permsOf = (fileId) => {
    if (!permissions.has(fileId)) {
      permissions.set(fileId, new Map([[OWNER_EMAIL, { id: 'p-owner', role: 'owner', type: 'user', emailAddress: OWNER_EMAIL }]]));
    }
    return permissions.get(fileId);
  };
  const Drive = {
    Files: {
      remove(id) {
        if (state.driveRemoveFails) throw new Error('Drive remove failed');
        removedFiles.push(id);
        files.delete(id);
        spreadsheets.delete(id);
      },
    },
    Permissions: {
      list: (fileId) => ({ permissions: [...permsOf(fileId).values()].map((p) => ({ ...p })) }),
      create(resource, fileId, opts) {
        if (state.failPermissionFor.includes(resource.emailAddress)) {
          throw new Error('Bad Request: no Google account for ' + resource.emailAddress);
        }
        const p = { id: `p${++permSeq}`, role: resource.role, type: resource.type, emailAddress: resource.emailAddress, opts };
        permsOf(fileId).set(resource.emailAddress, p);
        return p;
      },
      update(resource, fileId, permId) {
        for (const p of permsOf(fileId).values()) if (p.id === permId) p.role = resource.role;
        return {};
      },
      remove(fileId, permId) {
        const m = permsOf(fileId);
        for (const [k, p] of m) if (p.id === permId) m.delete(k);
      },
    },
  };

  const HtmlService = {
    createHtmlOutput: (html) => {
      const out = {
        html,
        title: '',
        metas: [],
        setTitle(t) {
          out.title = t;
          return out;
        },
        addMetaTag(n, c) {
          out.metas.push([n, c]);
          return out;
        },
        setXFrameOptionsMode() {
          return out;
        },
        getContent: () => html,
      };
      return out;
    },
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL', DEFAULT: 'DEFAULT' },
  };

  const ContentService = {
    createTextOutput: (text) => {
      const out = {
        text,
        mime: 'TEXT',
        setMimeType(m) {
          out.mime = m;
          return out;
        },
        getContent: () => text,
      };
      return out;
    },
    MimeType: { JSON: 'JSON', TEXT: 'TEXT' },
  };

  let trigSeq = 0;
  const makeTrigger = (handler, kind, detail) => {
    const t = { id: `t${++trigSeq}`, handler, kind, detail };
    t.getHandlerFunction = () => handler;
    t.getUniqueId = () => t.id;
    t.getEventType = () => kind;
    t.getTriggerSourceId = () => detail.formId || '';
    t.getTriggerSource = () => (kind === 'CLOCK' ? 'CLOCK' : 'FORMS');
    triggers.push(t);
    return t;
  };
  const ScriptApp = {
    getProjectTriggers: () => triggers.slice(),
    deleteTrigger(t) {
      const i = triggers.indexOf(t);
      if (i >= 0) triggers.splice(i, 1);
    },
    newTrigger(handler) {
      return {
        timeBased() {
          const detail = {};
          const b = {
            everyMinutes: (n) => ((detail.everyMinutes = n), b),
            everyHours: (n) => ((detail.everyHours = n), b),
            everyDays: (n) => ((detail.everyDays = n), b),
            atHour: (h) => ((detail.atHour = h), b),
            nearMinute: (m) => ((detail.nearMinute = m), b),
            inTimezone: (z) => ((detail.tz = z), b),
            create: () => makeTrigger(handler, 'CLOCK', detail),
          };
          return b;
        },
        forForm(formOrId) {
          const formId = typeof formOrId === 'string' ? formOrId : formOrId.getId();
          return { onFormSubmit: () => ({ create: () => makeTrigger(handler, 'ON_FORM_SUBMIT', { formId }) }) };
        },
      };
    },
    getService: () => ({ getUrl: () => 'https://script.example.test/macros/s/EXAMPLE/exec' }),
  };

  const Session = {
    getScriptTimeZone: () => state.scriptTz || tz,
    getEffectiveUser: () => ({ getEmail: () => state.effectiveUser }),
    getActiveUser: () => ({ getEmail: () => state.activeUser }),
  };

  const UrlFetchApp = {
    fetch(url, opts) {
      fetches.push([url, opts]);
      const r = state.fetch(url, opts);
      return { getResponseCode: () => r.code, getContentText: () => r.text };
    },
  };

  const Logger = { log() {} };

  const globals = {
    SpreadsheetApp,
    Utilities,
    LockService,
    CacheService,
    PropertiesService,
    MailApp,
    FormApp,
    DriveApp,
    Drive,
    HtmlService,
    ContentService,
    ScriptApp,
    Session,
    UrlFetchApp,
    Logger,
    MimeType: { HTML: 'text/html', PLAIN_TEXT: 'text/plain' },
  };

  const fakes = {
    tz,
    state,
    spreadsheet: service,
    system,
    spreadsheets,
    forms,
    drive: { files, folders, root, permissions, removed: removedFiles, permsOf },
    mail: { sent: mailSent },
    alerts,
    menus,
    triggers,
    fetches,
    cache,
    cacheLog,
    props,
    nowMs: () => state.nowMs,
    setNow(local) {
      state.nowMs = localToMs(local, tz);
    },
    setQuota(n) {
      state.quota = n;
    },
    lockBusy(b) {
      state.lockBusy = b;
    },
  };
  return { globals, fakes };
}
