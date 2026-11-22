import { describe, it, expect } from 'vitest';
import {
  localToUtc, wardToday, wardHour, addDays, dateOverAt, isValidTimezone, formatWhen, diffDays,
} from '../src/lib/wardTime';
import { env, makeWard } from './helpers';
import { setWardTimezone, getWardById } from '../src/lib/wards';

const DEN = 'America/Denver';

describe('wardTime', () => {
  it('localToUtc in Denver winter (UTC-7) and summer (UTC-6)', () => {
    expect(localToUtc('2026-12-06', '09:00', DEN).toISOString()).toBe('2026-12-06T16:00:00.000Z');
    expect(localToUtc('2026-07-04', '09:00', DEN).toISOString()).toBe('2026-07-04T15:00:00.000Z');
  });

  it('localToUtc across the 2026-11-01 fall-back and 2027-03-14 spring-forward', () => {
    // Ambiguous fall-back hour: the first occurrence (01:30 MDT).
    expect(localToUtc('2026-11-01', '01:30', DEN).toISOString()).toBe('2026-11-01T07:30:00.000Z');
    // The day after fall-back is UTC-7, the day before is UTC-6.
    expect(localToUtc('2026-10-31', '12:00', DEN).toISOString()).toBe('2026-10-31T18:00:00.000Z');
    expect(localToUtc('2026-11-02', '12:00', DEN).toISOString()).toBe('2026-11-02T19:00:00.000Z');
    // Spring forward: 02:30 doesn't exist; it lands one hour later on the clock (03:30 MDT).
    expect(localToUtc('2027-03-14', '02:30', DEN).toISOString()).toBe('2027-03-14T09:30:00.000Z');
    expect(localToUtc('2027-03-14', '01:59', DEN).toISOString()).toBe('2027-03-14T08:59:00.000Z');
    expect(localToUtc('2027-03-14', '03:00', DEN).toISOString()).toBe('2027-03-14T09:00:00.000Z');
    expect(localToUtc('2027-03-14', '05:00', DEN).toISOString()).toBe('2027-03-14T11:00:00.000Z');
    expect(localToUtc('2026-11-01', '00:30', DEN).toISOString()).toBe('2026-11-01T06:30:00.000Z');
    expect(localToUtc('2026-11-01', '02:30', DEN).toISOString()).toBe('2026-11-01T09:30:00.000Z');
    expect(localToUtc('2027-03-14', '12:00', DEN).toISOString()).toBe('2027-03-14T18:00:00.000Z');
    expect(localToUtc('2027-03-13', '12:00', DEN).toISOString()).toBe('2027-03-13T19:00:00.000Z');
  });

  it('wardToday and wardHour', () => {
    expect(wardToday(DEN, new Date('2026-12-07T05:30:00Z'))).toBe('2026-12-06');
    expect(wardToday(DEN, new Date('2026-12-07T07:30:00Z'))).toBe('2026-12-07');
    expect(wardHour(DEN, new Date('2026-12-05T16:00:00Z'))).toBe(9);
    expect(wardHour('America/New_York', new Date('2026-12-05T14:00:00Z'))).toBe(9);
    expect(wardHour(DEN, new Date('2026-12-05T07:00:00Z'))).toBe(0);
  });

  it('addDays / diffDays across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
    expect(addDays('2026-11-01', 14)).toBe('2026-11-15');
    expect(diffDays('2026-12-06', '2027-01-10')).toBe(35);
  });

  it('dateOverAt is midnight local on the following day', () => {
    expect(dateOverAt('2026-12-06', DEN).toISOString()).toBe('2026-12-07T07:00:00.000Z');
    expect(dateOverAt('2026-10-31', DEN).toISOString()).toBe('2026-11-01T06:00:00.000Z');
  });

  it('isValidTimezone', () => {
    expect(isValidTimezone('Mars/Base')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
    expect(isValidTimezone('America/Phoenix')).toBe(true);
  });

  it('formatWhen (2026-12-06 is a Sunday; the plan example said Saturday)', () => {
    expect(formatWhen('2026-12-06', '09:00')).toBe('Sunday, Dec 6 · 9:00 AM');
    expect(formatWhen('2026-12-06', '13:30')).toBe('Sunday, Dec 6 · 1:30 PM');
    expect(formatWhen('2026-12-06', '00:15')).toBe('Sunday, Dec 6 · 12:15 AM');
    expect(formatWhen('2026-12-06', null)).toBe('Sunday, Dec 6');
  });

  it('setWardTimezone rejects invalid zones and stores valid ones', async () => {
    const { wardId } = await makeWard(env);
    await expect(setWardTimezone(env, wardId, 'Mars/Base')).rejects.toThrow();
    await setWardTimezone(env, wardId, 'America/Phoenix');
    expect((await getWardById(env, wardId))!.timezone).toBe('America/Phoenix');
  });
});

describe('ward time-zone setting', () => {
  it('superadmin only; invalid zone is an error', async () => {
    const { SELF } = await import('cloudflare:test');
    const { makeLeader, asUser } = await import('./helpers');
    const { wardId } = await makeWard(env);
    const admin = await makeLeader(env, wardId, { email: `tz-admin-${wardId}@example.test`, wardRole: 'superadmin' });
    const member = await makeLeader(env, wardId, { email: `tz-member-${wardId}@example.test` });
    const post = async (uid: string, tz: string) =>
      SELF.fetch(`http://localhost/w/${wardId}/timezone`, {
        method: 'POST',
        redirect: 'manual',
        headers: { cookie: await asUser(uid), 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ timezone: tz }).toString(),
      });
    expect((await post(member, 'America/Chicago')).status).toBe(403);
    const bad = await post(admin, 'Mars/Base');
    expect(bad.status).toBe(302);
    expect(bad.headers.get('location')).toContain('err=');
    expect((await getWardById(env, wardId))!.timezone).toBe('America/Denver');
    expect((await post(admin, 'America/Chicago')).status).toBe(302);
    expect((await getWardById(env, wardId))!.timezone).toBe('America/Chicago');
    const page = await SELF.fetch(`http://localhost/w/${wardId}`, { headers: { cookie: await asUser(admin) } });
    const html = await page.text();
    expect(html).toContain('name="timezone"');
    const memberPage = await (await SELF.fetch(`http://localhost/w/${wardId}`, { headers: { cookie: await asUser(member) } })).text();
    expect(memberPage).not.toContain('name="timezone"');
  });
});
