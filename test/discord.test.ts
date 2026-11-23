import { describe, it, expect } from 'vitest';
import { env, sentFetches, mockFetch, jsonResponse } from './helpers';
import { sendDiscordDm } from '../src/lib/discord';
import { appSite } from '../src/app';

describe('sendDiscordDm', () => {
  it('opens a DM channel then posts the message, with the bot header', async () => {
    const r = await sendDiscordDm(env, '111222333', 'hello');
    expect(r).toBe('sent');
    const calls = sentFetches();
    expect(calls).toHaveLength(2);
    expect(calls[0]!.url).toBe('https://discord.com/api/v10/users/@me/channels');
    expect(calls[0]!.method).toBe('POST');
    expect(calls[0]!.body).toEqual({ recipient_id: '111222333' });
    expect(calls[0]!.headers.authorization).toBe('Bot test');
    expect(calls[1]!.url).toBe('https://discord.com/api/v10/channels/dm_channel_1/messages');
    expect(calls[1]!.body).toEqual({ content: 'hello' });
    expect(calls[1]!.headers.authorization).toBe('Bot test');
  });

  it('cuts text to 2000 characters', async () => {
    await sendDiscordDm(env, '1', 'x'.repeat(2500));
    const body = sentFetches()[1]!.body as { content: string };
    expect(body.content.length).toBe(2000);
  });

  it("50007 (can't message this user) -> 'no_dm'", async () => {
    mockFetch((f) =>
      f.url.endsWith('/messages') ? jsonResponse({ code: 50007, message: 'Cannot send messages to this user' }, 403) : undefined,
    );
    expect(await sendDiscordDm(env, '1', 'hi')).toBe('no_dm');
  });

  it('a 429 is an error, with no retry', async () => {
    mockFetch(() => jsonResponse({ message: 'rate limited', retry_after: 1 }, 429));
    expect(await sendDiscordDm(env, '1', 'hi')).toBe('error');
    expect(sentFetches()).toHaveLength(1);
  });

  it('no token -> error and zero fetches', async () => {
    expect(await sendDiscordDm({ ...env, DISCORD_BOT_TOKEN: '' }, '1', 'hi')).toBe('error');
    expect(sentFetches()).toHaveLength(0);
  });

  it('a network failure is an error, never a throw', async () => {
    mockFetch(() => {
      throw new Error('offline');
    });
    expect(await sendDiscordDm(env, '1', 'hi')).toBe('error');
  });
});

describe('/dev/discord-dm', () => {
  it('404 without DEV_LOGIN', async () => {
    const res = await appSite.request('http://localhost/dev/discord-dm?to=1', {}, env);
    expect(res.status).toBe(404);
    expect(sentFetches()).toHaveLength(0);
  });

  it('sends a test message with DEV_LOGIN=1', async () => {
    const res = await appSite.request('http://localhost/dev/discord-dm?to=111222333444', {}, { ...env, DEV_LOGIN: '1' });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('sent');
    expect((sentFetches()[1]!.body as { content: string }).content).toBe('WardForward test message');
  });
});
