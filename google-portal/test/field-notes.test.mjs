// 2.5.3 (decision 27): notes on every Settings key and every row-1 header, from FIELD_NOTES.
import { describe, it, expect } from 'vitest';
import { loadPortal, setSetting } from './harness.mjs';

const sys = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));
const text = (lines) => [].concat(lines).join('\n');

/** A portal after a full Set up (System Sheet, request forms and sheets). */
function afterSetUp() {
  const gp = loadPortal({ seed: true });
  gp.fakes.props.delete('SYSTEM_ID');
  gp.gpMenuSetUp();
  return gp;
}

describe('the FIELD_NOTES table', () => {
  const gp = loadPortal();
  const N = gp.FIELD_NOTES;
  const ok = (lines) => {
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines.length).toBeLessThanOrEqual(4);
    for (const l of lines) expect(String(l).trim()).not.toBe('');
  };

  it('has a note for every Settings key and every header of every tab', () => {
    for (const [key] of gp.SETTINGS_ROWS) ok(N.settings[key]);
    for (const [tab, headers] of Object.entries(gp.SERVICE_HEADERS)) for (const h of headers) ok(N.tabs[tab]?.[h]);
    for (const [tab, headers] of Object.entries(gp.SYSTEM_HEADERS)) for (const h of headers) ok(N.system[tab]?.[h]);
    for (const h of gp.REQUEST_HEADERS) ok(N.requestSheet[h]);
  });

  it('has no entry for a key or header that does not exist (no stale notes)', () => {
    expect(Object.keys(N.settings).sort()).toEqual(gp.SETTINGS_ROWS.map((r) => r[0]).sort());
    for (const [tab, t] of Object.entries(N.tabs)) expect(Object.keys(t).sort()).toEqual([...gp.SERVICE_HEADERS[tab]].sort());
    for (const [tab, t] of Object.entries(N.system)) expect(Object.keys(t).sort()).toEqual([...gp.SYSTEM_HEADERS[tab]].sort());
    expect(Object.keys(N.requestSheet).sort()).toEqual([...gp.REQUEST_HEADERS].sort());
  });

  it('uses only invented addresses and hosts', () => {
    const all = JSON.stringify(N);
    for (const m of all.match(/[^\s"'<>(),;]+@[^\s"'<>(),;]+/g) || []) expect(m).toMatch(/@[a-z0-9.-]*example\.test$/);
    for (const m of all.match(/https?:\/\/[^/\s"']+/g) || []) expect(m).toMatch(/(example\.test|zippa\.run|script\.google\.com|docs\.google\.com)$/);
    expect(all).not.toMatch(/mapleton|m44/i);
  });
});

describe('Set up writes the notes', () => {
  it('on every Settings key in column A and every row-1 header of the Service Sheet', () => {
    const gp = afterSetUp();
    const ss = gp.fakes.spreadsheet;
    const settings = ss.getSheetByName('Settings');
    const keys = settings.getRange(2, 1, settings.getLastRow() - 1, 1).getValues().map((r) => r[0]);
    keys.forEach((k, i) => expect(settings.getRange(i + 2, 1).getNote()).toBe(text(gp.FIELD_NOTES.settings[k])));
    expect(settings.getRange(2, 2).getNote()).toBe(''); // values and help carry no notes
    for (const [tab, headers] of Object.entries(gp.SERVICE_HEADERS)) {
      const sh = ss.getSheetByName(tab);
      headers.forEach((h, i) => expect(sh.getRange(1, i + 1).getNote()).toBe(text(gp.FIELD_NOTES.tabs[tab][h])));
      if (headers.length && tab !== 'Settings') expect(sh.getRange(2, 1).getNote()).toBe(''); // data cells: none
    }
    expect(ss.getSheetByName('Read me').notes.size).toBe(0);
  });

  it('on the System Sheet headers and each request sheet\'s headers', () => {
    const gp = afterSetUp();
    for (const [tab, headers] of Object.entries(gp.SYSTEM_HEADERS)) {
      const sh = sys(gp).getSheetByName(tab);
      headers.forEach((h, i) => expect(sh.getRange(1, i + 1).getNote()).toBe(text(gp.FIELD_NOTES.system[tab][h])));
    }
    const files = sys(gp).rowsOf('Request files');
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      const sh = gp.fakes.spreadsheets.get(f['Sheet id']).getSheetByName('Requests');
      const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
      headers.forEach((h, i) => expect(sh.getRange(1, i + 1).getNote()).toBe(text(gp.FIELD_NOTES.requestSheet[h])));
    }
  });

  it('a second Set up gives the same notes, one call per run of cells', () => {
    const gp = afterSetUp();
    const ss = gp.fakes.spreadsheet;
    const snap = () => ss.sheets.map((sh) => [sh.getName(), [...sh.notes.entries()].sort()]);
    const before = JSON.stringify(snap());
    const leaders = ss.getSheetByName('Leaders');
    leaders.noteCalls.length = 0;
    gp.gpMenuSetUp();
    expect(JSON.stringify(snap())).toBe(before);
    expect(leaders.noteCalls).toEqual([{ r: 1, c: 1, nr: 1, nc: gp.SERVICE_HEADERS.Leaders.length }]);
  });

  it('never touches a data cell\'s note, or a header the table does not know', () => {
    const gp = afterSetUp();
    const leaders = gp.fakes.spreadsheet.getSheetByName('Leaders');
    leaders.getRange(2, 2).setNote('Moved in May; ask before changing.');
    const extra = gp.SERVICE_HEADERS.Leaders.length + 1;
    leaders.getRange(1, extra).setValues([['My own column']]);
    leaders.getRange(1, extra).setNote('Sister Example\'s column');
    const settings = gp.fakes.spreadsheet.getSheetByName('Settings');
    settings.getRange(3, 2).setNote('Ask the bishop first.');
    gp.gpMenuSetUp();
    expect(leaders.getRange(2, 2).getNote()).toBe('Moved in May; ask before changing.');
    expect(leaders.getRange(1, extra).getNote()).toBe("Sister Example's column");
    expect(settings.getRange(3, 2).getNote()).toBe('Ask the bishop first.');
  });

  it('an older install gets the notes from the GP_VERSION upgrade', () => {
    const gp = loadPortal({ seed: true });
    const leaders = gp.fakes.spreadsheet.getSheetByName('Leaders');
    leaders.notes.clear();
    gp.fakes.props.set('SCHEMA_VERSION', 'phase-2.5.2');
    gp.ensureUpgraded_();
    expect(gp.GP_VERSION >= 'phase-2.5.3').toBe(true); // later phases bump it again
    expect(leaders.getRange(1, 2).getNote()).toBe(text(gp.FIELD_NOTES.tabs.Leaders.Email));
  });

  it('a request sheet made by the monthly move carries the notes', () => {
    const gp = afterSetUp();
    const f = sys(gp).rowsOf('Request files')[0];
    gp.fakes.setNow('2027-01-01 03:00');
    gp.gpBegin_();
    gp.gpDaily();
    const g = sys(gp).rowsOf('Request files').find((x) => x['Category id'] === f['Category id']);
    expect(g.Month).toBe('2027-01');
    expect(g['Sheet id']).not.toBe(f['Sheet id']);
    const sh = gp.fakes.spreadsheets.get(g['Sheet id']).getSheetByName('Requests');
    expect(sh.getRange(1, 1).getNote()).toBe(text(gp.FIELD_NOTES.requestSheet['Request id']));
  });

  it('setSetting is unaffected (a value change keeps the key\'s note)', () => {
    const gp = afterSetUp();
    setSetting(gp, 'ward_name', 'Riverbend 1st Ward (example)');
    const settings = gp.fakes.spreadsheet.getSheetByName('Settings');
    expect(settings.getRange(2, 1).getNote()).toBe(text(gp.FIELD_NOTES.settings.ward_name));
  });
});
