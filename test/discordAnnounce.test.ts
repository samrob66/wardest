import { describe, it, expect, vi } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, sentFetches, mockFetch, makeWard, makeLeader, uniqueEmail } from './helpers';
import { futureDate, catId } from './volFixtures';
import { setWebhook } from '../src/lib/serviceAdmin';
import { getPost } from '../src/lib/volPosts';
import { postDiscordWebhook } from '../src/lib/discord';

const HOOK = 'https://discord.com/api/webhooks/987654321/HookSecretTokenZZ9_-abcd';

function form(data: Record<string, string>): string {
  return new URLSearchParams(data).toString();
}

async function setup(withHook = true) {
  const w = await makeWard(env);
  const eqPres = await makeLeader(env, w.wardId, { email: uniqueEmail('eqp'), name: 'EQ Pres', spaces: [['elders-quorum', 'owner']] });
  const move = await catId(w.wardId, 'move');
  if (withHook) await setWebhook(env, w.wardId, move, HOOK);
  return { ...w, eqPres, move };
}

async function create(s: Awaited<ReturnType<typeof setup>>, extra: Record<string, string> = {}) {
  return SELF.fetch(`http://localhost/w/${s.wardId}/vol`, {
    method: 'POST',
    redirect: 'manual',
    headers: { cookie: await asUser(s.eqPres), 'content-type': 'application/x-www-form-urlencoded' },
    body: form({
      category_id: s.move, space_id: s.spaces['elders-quorum']!, audiences: 'brothers', title: 'Move the @everyone Smiths',
      cancel_cutoff_hours: '24', first_date: futureDate(15), start_time: '09:00', role_name: 'Movers', role_needed: '6', ...extra,
    }),
  });
}

function hookCalls() {
  return sentFetches().filter((f) => f.url.startsWith('https://discord.com/api/webhooks/'));
}

describe('Discord channel announcements', () => {
  it('creating with the box checked posts once, with the public link and no mentions', async () => {
    const s = await setup();
    const res = await create(s, { announce: '1' });
    expect(res.status).toBe(302);
    const calls = hookCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(HOOK);
    expect(calls[0]!.method).toBe('POST');
    const body = calls[0]!.body as { content: string; allowed_mentions: { parse: string[] } };
    expect(body.allowed_mentions.parse).toEqual([]);
    const postId = res.headers.get('location')!.split('/').pop()!.split('?')[0]!;
    const post = (await getPost(env, s.wardId, postId))!;
    expect(body.content).toContain(`http://localhost:8787/v/${post.public_id}`);
    expect(body.content).toContain('**Move the @everyone Smiths** — Elders Quorum');
    expect(body.content.length).toBeLessThanOrEqual(2000);
  });

  it('unchecked -> no fetch; the manage page button announces later', async () => {
    const s = await setup();
    const res = await create(s);
    expect(res.status).toBe(302);
    expect(hookCalls()).toHaveLength(0);
    const manage = res.headers.get('location')!;
    const html = await (await SELF.fetch(`http://localhost${manage}`, { headers: { cookie: await asUser(s.eqPres) } })).text();
    expect(html).toContain('Announce in Discord');
    expect(html).not.toContain('HookSecretToken');
    const a = await SELF.fetch(`http://localhost${manage}/announce`, {
      method: 'POST', redirect: 'manual', headers: { cookie: await asUser(s.eqPres) },
    });
    expect(a.status).toBe(302);
    expect(hookCalls()).toHaveLength(1);
    // Someone who can't edit the post can't announce it.
    const teacher = await makeLeader(env, s.wardId, { email: uniqueEmail('t'), spaces: [['elders-quorum', 'member']] });
    const t = await SELF.fetch(`http://localhost${manage}/announce`, { method: 'POST', redirect: 'manual', headers: { cookie: await asUser(teacher) } });
    expect(t.status).toBe(403);
    expect(hookCalls()).toHaveLength(1);
  });

  it('a webhook that fails or throws: the post still exists, a soft notice, and the URL is never logged or shown', async () => {
    for (const mode of ['500', 'throw'] as const) {
      const s = await setup();
      mockFetch((f) => {
        if (!f.url.startsWith('https://discord.com/api/webhooks/')) return undefined;
        if (mode === 'throw') throw new Error(`network down for ${f.url}`);
        return new Response('nope', { status: 500 });
      });
      const logs: string[] = [];
      const spies = (['log', 'error', 'warn', 'info'] as const).map((k) =>
        vi.spyOn(console, k).mockImplementation((...a: unknown[]) => void logs.push(a.map(String).join(' '))),
      );
      try {
        const res = await create(s, { announce: '1' });
        expect(res.status).toBe(302);
        const loc = res.headers.get('location')!;
        const postId = loc.split('/').pop()!.split('?')[0]!;
        expect(await getPost(env, s.wardId, postId)).not.toBeNull();
        const html = await (await SELF.fetch(`http://localhost${loc}`, { headers: { cookie: await asUser(s.eqPres) } })).text();
        expect(html).toContain('Discord didn’t take the announcement');
        expect(html).not.toContain('HookSecretToken');
        expect(logs.some((l) => l.includes(`[discord] webhook error for category=${s.move}`))).toBe(true);
        for (const l of logs) expect(l, mode).not.toContain('HookSecretToken');
      } finally {
        spies.forEach((sp) => sp.mockRestore());
      }
    }
  });

  it('no box when the category has no webhook', async () => {
    const s = await setup(false);
    const html = await (
      await SELF.fetch(`http://localhost/w/${s.wardId}/vol/new?category=${s.move}`, { headers: { cookie: await asUser(s.eqPres) } })
    ).text();
    expect(html).not.toContain('Announce in Discord');
    const s2 = await setup(true);
    const html2 = await (
      await SELF.fetch(`http://localhost/w/${s2.wardId}/vol/new?category=${s2.move}`, { headers: { cookie: await asUser(s2.eqPres) } })
    ).text();
    expect(html2).toMatch(/name="announce" value="1" checked/);
    // And checking a box anyway sends nothing when there's no webhook.
    await create(s, { announce: '1' });
    expect(hookCalls()).toHaveLength(0);
  });

  it('postDiscordWebhook refuses a non-Discord URL without fetching', async () => {
    expect(await postDiscordWebhook('https://evil.example/api/webhooks/1/x', 'hi')).toBe('error');
    expect(sentFetches()).toHaveLength(0);
  });
});
