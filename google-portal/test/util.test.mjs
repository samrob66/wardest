import { describe, it, expect } from 'vitest';
import { loadPortal } from './harness.mjs';

const gp = loadPortal();

describe('sanitizeCell', () => {
  it('neutralizes formula starters', () => {
    expect(gp.sanitizeCell('=IMPORTXML("x")')).toBe("'=IMPORTXML(\"x\")");
    expect(gp.sanitizeCell('+1-555')).toBe("'+1-555");
    expect(gp.sanitizeCell('-2')).toBe("'-2");
    expect(gp.sanitizeCell('@a')).toBe("'@a");
  });
  it('leaves plain text and non-strings alone', () => {
    expect(gp.sanitizeCell('Sister Example')).toBe('Sister Example');
    expect(gp.sanitizeCell(7)).toBe(7);
    expect(gp.sanitizeCell(true)).toBe(true);
    expect(gp.sanitizeCell('')).toBe('');
  });
});

describe('dates and times', () => {
  it('normalizes Date cells back to text', () => {
    expect(gp.normDate(new Date(2026, 11, 3))).toBe('2026-12-03');
    // Sheets returns a time-only cell as a Date on 1899-12-30.
    expect(gp.normTime(new Date(1899, 11, 30, 8, 0))).toBe('08:00');
    expect(gp.normTime(new Date(1899, 11, 30, 0, 30))).toBe('00:30');
    // Historical zone offsets can leave a few seconds over; round to the minute.
    expect(gp.normTime(new Date(1899, 11, 30, 7, 59, 56))).toBe('08:00');
    expect(gp.normLocalDT(new Date(2026, 11, 3, 23, 30))).toBe('2026-12-03 23:30');
    expect(gp.normMonth(new Date(2026, 10, 1))).toBe('2026-11');
  });
  it('validates text dates and times', () => {
    expect(gp.normDate('2026-02-30')).toBe('');
    expect(gp.normDate('2026-12-03')).toBe('2026-12-03');
    expect(gp.normDate(' 2026-12-03 ')).toBe('2026-12-03');
    expect(gp.normDate('')).toBe('');
    expect(gp.normTime('8:05')).toBe('08:05');
    expect(gp.normTime('24:00')).toBe('');
    expect(gp.isDateStr('2028-02-29')).toBe(true);
    expect(gp.isDateStr('2027-02-29')).toBe(false);
    expect(gp.isTimeStr('23:59')).toBe(true);
    expect(gp.isTimeStr('7:00')).toBe(false);
  });
  it('does calendar arithmetic', () => {
    expect(gp.addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(gp.addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(gp.weekday('2026-12-01')).toBe(2); // Tuesday
    expect(gp.localMinusHours('2026-12-03 00:30', 24)).toBe('2026-12-02 00:30');
    expect(gp.localMinusHours('2026-12-03 08:00', 9)).toBe('2026-12-02 23:00');
    expect(gp.cmpLocal('2026-12-02 23:00', '2026-12-03 00:00')).toBe(-1);
    expect(gp.cmpLocal('2026-12-03', '2026-12-03')).toBe(0);
    expect(gp.cmpLocal('2026-12-04', '2026-12-03')).toBe(1);
  });
});

describe('text helpers', () => {
  it('escapes HTML', () => {
    expect(gp.esc('<b>"&\'')).toBe('&lt;b&gt;&quot;&amp;&#39;');
    expect(gp.esc(null)).toBe('');
  });
  it('checks one email address', () => {
    expect(gp.isEmail('a@b.test')).toBe(true);
    expect(gp.isEmail('a@b')).toBe(false);
    expect(gp.isEmail('a@b.test, c@d.test')).toBe(false);
    expect(gp.isEmail('a@b.test;c@d.test')).toBe(false);
    expect(gp.normEmail('  Sister.Example@Example.TEST ')).toBe('sister.example@example.test');
  });
  it('clips and makes ids', () => {
    expect(gp.clip('abcdef', 3)).toBe('abc');
    const id = gp.newId_('p');
    expect(id).toMatch(/^p[a-z2-7]{10}$/);
    expect(gp.newId_('p')).not.toBe(id);
  });
});

describe('platform', () => {
  it('makes 64-hex tokens and SHA-256 hashes', () => {
    const t = gp.newToken_();
    expect(t).toMatch(/^[0-9a-f]{64}$/);
    expect(gp.newToken_()).not.toBe(t);
    expect(gp.sha256Hex_('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('reads the fake clock in the ward time zone', () => {
    gp.fakes.setNow('2026-07-04 23:30');
    expect(gp.nowLocal_()).toBe('2026-07-04 23:30');
    gp.fakes.setNow('2026-12-01 00:05');
    expect(gp.nowLocal_()).toBe('2026-12-01 00:05');
  });
  it('withLock_ answers busy when the lock is taken', () => {
    gp.fakes.lockBusy(true);
    expect(() => gp.withLock_(() => 1)).toThrow(/Busy/);
    gp.fakes.lockBusy(false);
    expect(gp.withLock_(() => 2)).toBe(2);
    // Nested use inside one execution does not deadlock.
    expect(gp.withLock_(() => gp.withLock_(() => 3))).toBe(3);
  });
});
