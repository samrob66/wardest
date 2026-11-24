import { describe, it, expect } from 'vitest';
import { loadPortal, setSetting } from './harness.mjs';

const SERVICE_HEADERS = {
  Settings: ['Key', 'Value', 'Help'],
  Leaders: ['Name', 'Email', 'Calling', 'Organization', 'Bishopric', 'Ward council', 'Org editor', 'Coordinator', 'Send leader link', 'Link sent'],
  Categories: ['Id', 'Name', 'Icon', 'Kind', 'Owning organizations', 'Default audiences', 'Coordinators', 'Any ward council may create', 'Confidential', 'Warn hours', 'Also warn', 'Discord', 'Archived', 'Notify', 'On Help page'],
  Posts: ['Post id', 'Public id', 'Organization', 'Category', 'Title', 'Audiences', 'Public note', 'Private details', 'Cancel cutoff hours', 'Status', 'Created by', 'Created at', 'Last changed by', 'Last changed at'],
  Slots: ['Slot id', 'Post id', 'Date', 'Start', 'End', 'Role', 'Needed', 'Role note', 'Bringing prompt', 'Filled', 'Waiting'],
  'Sign-ups': ['Sign-up id', 'Post id', 'Slot id', 'Email', 'Name', 'Child first name', 'Bringing', 'Status', 'Signed up at', 'Reminded at', 'Details sent at', 'Over limit', 'Removed by', 'Cancelled at'],
  Volunteers: ['Email', 'Name', 'Status', 'Decided by', 'Decided at', 'First post'],
};
const SYSTEM_HEADERS = {
  Tokens: ['Hash', 'Kind', 'Subject', 'Expires', 'Created'],
  Outbox: ['Id', 'Queued at', 'To', 'Subject', 'Html', 'Text', 'Priority', 'Status', 'Error'],
  Log: ['At', 'What', 'Detail'],
  'Request files': ['Category id', 'Folder id', 'Form id', 'Sheet id', 'Month'],
};

const headerRow = (ss, name) => ss.getSheetByName(name).raw()[0];

describe('gpEnsureTabs_', () => {
  it('makes every tab with the exact headers, idempotently', () => {
    const gp = loadPortal();
    const ss = gp.fakes.spreadsheet;
    gp.gpEnsureTabs_(ss);
    for (const [name, headers] of Object.entries(SERVICE_HEADERS)) expect(headerRow(ss, name)).toEqual(headers);
    expect(ss.getSheetByName('Read me')).not.toBeNull();
    expect(ss.getSheetByName('Needs help soon')).not.toBeNull();
    expect(ss.getSheetByName('Posts').frozen).toBe(1);
    const before = ss.sheets.map((s) => [s.name, JSON.stringify(s.raw())]);
    gp.gpEnsureTabs_(ss);
    expect(ss.sheets.map((s) => [s.name, JSON.stringify(s.raw())])).toEqual(before);

    gp.gpEnsureSystemTabs_(gp.fakes.system);
    for (const [name, headers] of Object.entries(SYSTEM_HEADERS)) expect(headerRow(gp.fakes.system, name)).toEqual(headers);
  });

  it('writes the Read me with the footer, the Gemini rule and the contact', () => {
    const gp = loadPortal({ seed: true });
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    const text = gp.fakes.spreadsheet.getSheetByName('Read me').raw().flat().join('\n');
    expect(text).toContain(gp.PAGE_FOOTER);
    expect(text).toContain('Do not ask Gemini to read, summarize or draft from the Service Sheet, the request sheets or request notices.');
    expect(text).toContain('help@riverbend.example');
  });

  it('appends a missing header at the end and keeps a user column', () => {
    const gp = loadPortal();
    const ss = gp.fakes.spreadsheet;
    const sh = ss.insertSheet('Slots');
    sh.getRange(1, 1, 1, 4).setValues([['Slot id', 'Post id', 'My notes', 'Date']]);
    gp.gpEnsureTabs_(ss);
    const head = headerRow(ss, 'Slots');
    expect(head.slice(0, 4)).toEqual(['Slot id', 'Post id', 'My notes', 'Date']);
    expect(head).toContain('Bringing prompt');
    expect(head.indexOf('Start')).toBeGreaterThan(3);
  });

  it('sets plain-text format on date and time columns and checkboxes on role columns', () => {
    const gp = loadPortal();
    const ss = gp.fakes.spreadsheet;
    gp.gpEnsureTabs_(ss);
    const slots = ss.getSheetByName('Slots');
    const dateCol = headerRow(ss, 'Slots').indexOf('Date') + 1;
    expect(slots.formats.get(`2,${dateCol}`)).toBe('@');
    const leaders = ss.getSheetByName('Leaders');
    const bCol = headerRow(ss, 'Leaders').indexOf('Bishopric') + 1;
    expect(leaders.validations.get(`2,${bCol}`)).toBe('checkbox');
  });

  it('seeds Categories once and never re-seeds after a user deletes a row', () => {
    const gp = loadPortal();
    const ss = gp.fakes.spreadsheet;
    gp.gpEnsureTabs_(ss);
    const cats = gp.serviceTab_('Categories').rows();
    expect(cats.map((c) => c.Id)).toEqual([
      'moving', 'christmas', 'other', 'christmas-giving', 'meals', 'moving-help', 'service-project', 'activity', 'temple', 'youth', 'children', 'other-service',
    ]);
    const christmas = cats.find((c) => c.Id === 'christmas');
    expect(christmas.Kind).toBe('Request');
    expect(christmas.Confidential).toBe(true);
    expect(cats.find((c) => c.Id === 'moving')['Owning organizations']).toBe('Elders Quorum, Relief Society');
    const t = gp.serviceTab_('Categories');
    t.remove(t.find('Id', 'activity'));
    gp.gpEnsureTabs_(ss);
    expect(gp.serviceTab_('Categories').rows().map((c) => c.Id)).not.toContain('activity');
    expect(gp.serviceTab_('Categories').rows()).toHaveLength(11);
  });
});

describe('table_', () => {
  it('stores formula-looking text with a leading apostrophe', () => {
    const gp = loadPortal({ seed: true });
    gp.serviceTab_('Posts').append({ 'Post id': 'p1', Title: '=HYPERLINK("x")' });
    const raw = gp.fakes.spreadsheet.getSheetByName('Posts').raw();
    const col = raw[0].indexOf('Title');
    expect(raw[1][col]).toBe('\'=HYPERLINK("x")');
    expect(gp.serviceTab_('Posts').find('Post id', 'p1').Title).toBe('=HYPERLINK("x")');
  });

  it('finds columns by name after a user inserts a column in the middle', () => {
    const gp = loadPortal({ seed: true });
    const sh = gp.fakes.spreadsheet.getSheetByName('Slots');
    gp.serviceTab_('Slots').append({ 'Slot id': 's1', 'Post id': 'p1', Date: '2026-12-03', Role: 'Cook', Needed: 2 });
    // The user inserts a column C ("Notes") by hand.
    sh.data = sh.data.map((row, i) => [...row.slice(0, 2), i === 0 ? 'Notes' : 'hand note', ...row.slice(2)]);
    const t = gp.serviceTab_('Slots');
    const row = t.find('Slot id', 's1');
    expect(row.Role).toBe('Cook');
    expect(row.Date).toBe('2026-12-03');
    t.update(row, { Filled: 1 });
    expect(gp.serviceTab_('Slots').find('Slot id', 's1').Filled).toBe(1);
    expect(sh.raw()[1][2]).toBe('hand note');
  });

  it('normalizes a Date cell in a date column back to text', () => {
    const gp = loadPortal({ seed: true });
    const sh = gp.fakes.spreadsheet.getSheetByName('Slots');
    sh.data.push(['s9', 'p9', new Date(2026, 11, 3), new Date(1899, 11, 30, 0, 30), new Date(1899, 11, 30, 23, 30), 'Greeter', 1]);
    const row = gp.serviceTab_('Slots').find('Slot id', 's9');
    expect(row.Date).toBe('2026-12-03');
    expect(row.Start).toBe('00:30');
    expect(row.End).toBe('23:30');
  });

  it('keeps dates as text when written (plain-text columns)', () => {
    const gp = loadPortal({ seed: true });
    gp.serviceTab_('Slots').append({ 'Slot id': 's2', Date: '2026-12-03', Start: '08:00' });
    const sh = gp.fakes.spreadsheet.getSheetByName('Slots');
    const head = sh.raw()[0];
    expect(sh.raw()[1][head.indexOf('Date')]).toBe('2026-12-03');
    expect(sh.raw()[1][head.indexOf('Start')]).toBe('08:00');
  });

  it('appends after checkbox rows on Leaders, not after row 1000', () => {
    const gp = loadPortal({ seed: true });
    const rows = gp.serviceTab_('Leaders').rows();
    expect(rows.length).toBe(7);
    expect(rows[0]._row).toBe(2);
    expect(Object.keys(rows[0])).not.toContain('_row');
    expect(rows[0].Bishopric).toBe(true);
    expect(rows[5].Bishopric).toBe(false);
  });

  it('removes rows and refuses unknown columns', () => {
    const gp = loadPortal({ seed: true });
    const t = gp.serviceTab_('Posts');
    t.append({ 'Post id': 'a' });
    t.append({ 'Post id': 'b' });
    t.append({ 'Post id': 'c' });
    t.removeMany([t.find('Post id', 'a'), t.find('Post id', 'c')]);
    expect(gp.serviceTab_('Posts').rows().map((r) => r['Post id'])).toEqual(['b']);
    expect(() => t.append({ Nope: 1 })).toThrow(/Nope/);
  });
});

describe('settings_', () => {
  it('returns defaults for blank values and organizations as an array', () => {
    const gp = loadPortal({ seed: true });
    setSetting(gp, 'reminder_hour', '');
    setSetting(gp, 'email_reserve', '');
    const s = gp.settings_();
    expect(s.ward_name).toBe('Riverbend 1st Ward (example)');
    expect(s.reminder_hour).toBe(18);
    expect(s.default_cancel_cutoff_hours).toBe(24);
    expect(s.email_reserve).toBe(30);
    expect(s.signup_limit_per_day).toBe(40);
    expect(Array.isArray(s.organizations)).toBe(true);
    expect(s.organizations).toContain('Relief Society');
    expect(s.organizations).toHaveLength(10);
    expect(s.discord).toBe(false);
    setSetting(gp, 'reminder_hour', 19);
    expect(gp.settings_().reminder_hour).toBe(19);
  });
});
