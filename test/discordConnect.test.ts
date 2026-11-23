import { describe, it, expect, vi } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, makeLeader, uniqueEmail, sentFetches, mockFetch, jsonResponse } from './helpers';
import { fixture, tokenFrom, type Fx, futureDate } from './volFixtures';
import { submitSignup, verifyAddress } from '../src/lib/volSignup';
import { makeLinkToken } from '../src/lib/volSession';
import { deliver } from '../src/lib/volMessages';
import { discordAuthorizeUrl, exchangeDiscordCode } from '../src/lib/discord';
import * as E from '../src/lib/volEmails';

async function approvedVol(fx: Fx) {
  const email = uniqueEmail('dc');
  await makeLeader(env, fx.wardId, { email, name: 'Dee Cord' });
  await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Dee Cord', email, bringing: null, now: new Date() });
  return (await env.DB.prepare(`SELECT id FROM volunteers WHERE ward_id = ? AND email = ?`).bind(fx.wardId, email.toLowerCase()).first<{ id: string }>())!.id;
}

async function volCookie(fx: Fx, vid: string): Promise<string> {
  const tok = await makeLinkToken(env, { typ: 'vacc', wardId: fx.wardId, id: vid });
  const res = await SELF.fetch(`http://localhost/vol/access/${tok}`, { redirect: 'manual' });
  return (res.headers.get('set-cookie') ?? '').match(/wardest_vol=[^;]+/)![0];
}

async function startConnect(cookie: string) {
  const res = await SELF.fetch('http://localhost/vol/discord/connect', { redirect: 'manual', headers: { cookie } });
  return res;
}

function reminderFor(vid: string, wardId: string) {
  return E.reminder({
    to: 'dee@example.test', volunteerId: vid, wardId, name: 'Dee', post: { orgName: 'EQ', title: 'Move', publicUrl: 'http://x/v/1' },
    when: 'Sunday, Dec 6', roleName: 'Movers', bringing: null, privateDetails: 'Door code', otherNames: [],
    cancelUrl: 'http://x/c', mySignupsUrl: 'http://x/m',
  });
}

describe('discord oauth helpers', () => {
  it('builds the authorize URL and exchanges a code for the user id', async () => {
    const u = new URL(discordAuthorizeUrl(env, 'st8'));
    expect(u.origin + u.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(u.searchParams.get('client_id')).toBe('test-client');
    expect(u.searchParams.get('scope')).toBe('identify');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('redirect_uri')).toBe('http://localhost:8787/vol/discord/callback');
    expect(u.searchParams.get('state')).toBe('st8');
    expect(await exchangeDiscordCode(env, 'code1')).toBe('111222333444555666');
    const calls = sentFetches();
    expect(calls[0]!.url).toBe('https://discord.com/api/v10/oauth2/token');
    expect(calls[0]!.body).toMatchObject({ grant_type: 'authorization_code', code: 'code1', client_id: 'test-client', client_secret: 'test-secret' });
    expect(calls[1]!.url).toBe('https://discord.com/api/v10/users/@me');
    expect(calls[1]!.headers.authorization).toBe('Bearer tok');
  });
});

describe('Connect Discord', () => {
  it('a mismatched state -> 400 and nothing stored; a matching one stores the Discord id', async () => {
    const fx = await fixture({ date: futureDate() });
    const vid = await approvedVol(fx);
    const cookie = await volCookie(fx, vid);
    const start = await startConnect(cookie);
    expect(start.status).toBe(302);
    const loc = new URL(start.headers.get('location')!);
    expect(loc.hostname).toBe('discord.com');
    const state = loc.searchParams.get('state')!;
    const dc = (start.headers.get('set-cookie') ?? '').match(/wardest_vol_dc=[^;]+/)![0];
    const both = `${cookie}; ${dc}`;
    const bad = await SELF.fetch(`http://localhost/vol/discord/callback?code=c&state=wrong`, { redirect: 'manual', headers: { cookie: both } });
    expect(bad.status).toBe(400);
    let row = await env.DB.prepare(`SELECT discord_user_id FROM volunteers WHERE id = ?`).bind(vid).first<{ discord_user_id: string | null }>();
    expect(row!.discord_user_id).toBeNull();
    const ok = await SELF.fetch(`http://localhost/vol/discord/callback?code=c&state=${state}`, { redirect: 'manual', headers: { cookie: both } });
    expect(ok.status).toBe(302);
    expect(ok.headers.get('location')).toBe(`/vol/${fx.prefix}/me?n=discord`);
    row = await env.DB.prepare(`SELECT discord_user_id FROM volunteers WHERE id = ?`).bind(vid).first<{ discord_user_id: string | null }>();
    expect(row!.discord_user_id).toBe('111222333444555666');
    const page = await (await SELF.fetch(`http://localhost/vol/${fx.prefix}/me?n=discord`, { headers: { cookie } })).text();
    expect(page).toContain('Discord connected');
    expect(page).toContain('/vol/discord/disconnect');
    const off = await SELF.fetch('http://localhost/vol/discord/disconnect', { method: 'POST', redirect: 'manual', headers: { cookie } });
    expect(off.status).toBe(302);
    row = await env.DB.prepare(`SELECT discord_user_id FROM volunteers WHERE id = ?`).bind(vid).first<{ discord_user_id: string | null }>();
    expect(row!.discord_user_id).toBeNull();
  });

  it("another volunteer's state cookie can't be used", async () => {
    const fx = await fixture({ date: futureDate() });
    const a = await approvedVol(fx);
    const b = await approvedVol(fx);
    const ca = await volCookie(fx, a);
    const cb = await volCookie(fx, b);
    const start = await startConnect(ca);
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!;
    const dc = (start.headers.get('set-cookie') ?? '').match(/wardest_vol_dc=[^;]+/)![0];
    const res = await SELF.fetch(`http://localhost/vol/discord/callback?code=c&state=${state}`, { redirect: 'manual', headers: { cookie: `${cb}; ${dc}` } });
    expect(res.status).toBe(400);
  });

  it('a pending volunteer cannot start connect', async () => {
    const fx = await fixture({ date: futureDate() });
    const email = uniqueEmail('pend');
    const s = await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'P', email, bringing: null, now: new Date() });
    await verifyAddress(env, tokenFrom(s.messages[0], '/vol/verify/'), new Date());
    const vid = (await env.DB.prepare(`SELECT id FROM volunteers WHERE ward_id = ? AND email = ?`).bind(fx.wardId, email.toLowerCase()).first<{ id: string }>())!.id;
    const res = await startConnect(await volCookie(fx, vid));
    expect(res.status).toBe(403);
  });
});

describe('deliver with Discord', () => {
  it('a connected, approved volunteer gets the email and a DM', async () => {
    const fx = await fixture({ date: futureDate() });
    const vid = await approvedVol(fx);
    await env.DB.prepare(`UPDATE volunteers SET discord_user_id = '999888777666' WHERE id = ?`).bind(vid).run();
    await deliver(env, [reminderFor(vid, fx.wardId)]);
    const calls = sentFetches();
    expect(calls.filter((f) => f.url.startsWith('https://api.resend.com'))).toHaveLength(1);
    const dc = calls.filter((f) => f.url.startsWith('https://discord.com'));
    expect(dc.map((f) => f.url)).toEqual([
      'https://discord.com/api/v10/users/@me/channels',
      'https://discord.com/api/v10/channels/dm_channel_1/messages',
    ]);
    expect(dc[0]!.body).toEqual({ recipient_id: '999888777666' });
  });

  it('a connected but declined volunteer gets no DM', async () => {
    const fx = await fixture({ date: futureDate() });
    const vid = await approvedVol(fx);
    await env.DB.prepare(`UPDATE volunteers SET discord_user_id = '999888777666', approval = 'declined' WHERE id = ?`).bind(vid).run();
    await deliver(env, [reminderFor(vid, fx.wardId)]);
    expect(sentFetches().filter((f) => f.url.startsWith('https://discord.com'))).toHaveLength(0);
    expect(sentFetches().filter((f) => f.url.startsWith('https://api.resend.com'))).toHaveLength(1);
  });

  it('Discord 50007 -> the email still goes, nothing throws', async () => {
    const fx = await fixture({ date: futureDate() });
    const vid = await approvedVol(fx);
    await env.DB.prepare(`UPDATE volunteers SET discord_user_id = '999888777666' WHERE id = ?`).bind(vid).run();
    mockFetch((f) => (f.url.endsWith('/messages') ? jsonResponse({ code: 50007, message: 'Cannot send messages to this user' }, 403) : undefined));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await expect(deliver(env, [reminderFor(vid, fx.wardId)])).resolves.toBeUndefined();
    log.mockRestore();
    expect(sentFetches().filter((f) => f.url.startsWith('https://api.resend.com'))).toHaveLength(1);
  });

  it('messages without discordText never touch Discord', async () => {
    const fx = await fixture({ date: futureDate() });
    const vid = await approvedVol(fx);
    await env.DB.prepare(`UPDATE volunteers SET discord_user_id = '999888777666' WHERE id = ?`).bind(vid).run();
    await deliver(env, [E.declined({ to: 'x@example.test', name: 'X', wardName: 'W' })]);
    expect(sentFetches().filter((f) => f.url.startsWith('https://discord.com'))).toHaveLength(0);
  });
});
