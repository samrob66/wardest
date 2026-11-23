import { describe, it, expect } from 'vitest';
import { env, makeWard } from './helpers';
import { newId } from '../src/lib/ids';

const VOL_TABLES = [
  'vol_posts', 'vol_dates', 'vol_roles', 'volunteers', 'vol_signups', 'vol_editors', 'vol_tokens', 'vol_rate_events',
];

describe('test harness', () => {
  it('uses the test bindings, never the local .dev.vars secrets', () => {
    expect(env.EMAIL_DELIVERY).toBe('');
    expect(env.DISCORD_BOT_TOKEN).toBe('test');
    expect(env.SESSION_SECRET).toBe('test-session-secret-0123456789abcdef');
  });

  it('intercepts outbound fetch', async () => {
    const { sentFetches } = await import('./helpers');
    const r = await fetch('https://discord.com/api/v10/users/@me/channels', { method: 'POST', body: '{"a":1}', headers: { 'content-type': 'application/json' } });
    expect(r.ok).toBe(true);
    expect(sentFetches()).toHaveLength(1);
    expect(sentFetches()[0]!.body).toEqual({ a: 1 });
  });
});

describe('volunteer schema', () => {
  it('every vol table carries ward_id', async () => {
    for (const t of VOL_TABLES) {
      const cols = (await env.DB.prepare(`PRAGMA table_info(${t})`).all<{ name: string }>()).results.map((c) => c.name);
      expect(cols, t).toContain('ward_id');
    }
  });

  it('wards default to America/Denver', async () => {
    const { wardId } = await makeWard(env);
    const row = await env.DB.prepare('SELECT timezone FROM wards WHERE id=?').bind(wardId).first<{ timezone: string }>();
    expect(row!.timezone).toBe('America/Denver');
  });

  it('one active sign-up per volunteer per role', async () => {
    const { wardId, spaces } = await makeWard(env);
    const postId = newId('vp');
    const dateId = newId('vd');
    const roleId = newId('vr');
    const volId = newId('vv');
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO vol_posts (id, ward_id, space_id, public_id, title) VALUES (?, ?, ?, ?, 'T')`)
        .bind(postId, wardId, spaces['elders-quorum'], newId('pub')),
      env.DB.prepare(`INSERT INTO vol_dates (id, ward_id, post_id, date) VALUES (?, ?, ?, '2026-12-06')`)
        .bind(dateId, wardId, postId),
      env.DB.prepare(`INSERT INTO vol_roles (id, ward_id, post_id, date_id, name, needed) VALUES (?, ?, ?, ?, 'Movers', 2)`)
        .bind(roleId, wardId, postId, dateId),
      env.DB.prepare(`INSERT INTO volunteers (id, ward_id, email, name) VALUES (?, ?, 'a@example.test', 'A')`)
        .bind(volId, wardId),
    ]);
    const ins = (status: string) =>
      env.DB.prepare(
        `INSERT INTO vol_signups (id, ward_id, post_id, role_id, volunteer_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(newId('vs'), wardId, postId, roleId, volId, status)
        .run();
    await ins('waiting');
    await expect(ins('waiting')).rejects.toThrow();
    await expect(ins('confirmed')).rejects.toThrow();
    // An ended sign-up doesn't block a new one.
    await env.DB.prepare(`UPDATE vol_signups SET status = 'cancelled' WHERE role_id = ?`).bind(roleId).run();
    await ins('waiting');
    await expect(ins('bogus')).rejects.toThrow();
  });
});
