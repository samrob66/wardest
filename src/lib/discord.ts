// Discord direct messages for volunteer confirmations and reminders (spec §6.9). One Discord
// application serves every ward; a ward's Discord admin adds the bot to their server once,
// and a volunteer connects their own account via OAuth (never by typing a username).
// Discord only lets a bot DM someone who shares a server with it, and members can turn DMs
// off; then we get 'no_dm' and email (which always goes) is the fallback.
import type { Env } from '../types';

const API = 'https://discord.com/api/v10';

export type DmResult = 'sent' | 'no_dm' | 'error';

async function discordError(res: Response): Promise<DmResult> {
  let code: number | undefined;
  try {
    code = ((await res.json()) as { code?: number }).code;
  } catch {
    code = undefined;
  }
  if (code === 50007) return 'no_dm'; // Cannot send messages to this user
  return 'error'; // includes 429: we don't retry here
}

export async function sendDiscordDm(env: Env, discordUserId: string, text: string): Promise<DmResult> {
  const token = (env.DISCORD_BOT_TOKEN ?? '').trim();
  if (!token || !discordUserId) return 'error';
  const headers = { Authorization: `Bot ${token}`, 'content-type': 'application/json' };
  try {
    const ch = await fetch(`${API}/users/@me/channels`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ recipient_id: discordUserId }),
    });
    if (!ch.ok) return discordError(ch);
    const channelId = ((await ch.json()) as { id?: string }).id;
    if (!channelId) return 'error';
    const msg = await fetch(`${API}/channels/${encodeURIComponent(channelId)}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: text.slice(0, 2000) }),
    });
    if (!msg.ok) return discordError(msg);
    return 'sent';
  } catch {
    return 'error';
  }
}

// ---------------------------------------------------------------- OAuth ("Connect Discord")
// scope=identify only: we learn the volunteer's own Discord user id, nothing else.

export function discordAuthorizeUrl(env: Env, state: string): string {
  const p = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID ?? '',
    response_type: 'code',
    scope: 'identify',
    redirect_uri: `${env.APP_URL}/vol/discord/callback`,
    state,
    prompt: 'consent',
  });
  return `https://discord.com/oauth2/authorize?${p.toString()}`;
}

// Authorization code -> the Discord user id (null on any failure).
export async function exchangeDiscordCode(env: Env, code: string): Promise<string | null> {
  const id = (env.DISCORD_CLIENT_ID ?? '').trim();
  const secret = (env.DISCORD_CLIENT_SECRET ?? '').trim();
  if (!id || !secret || !code) return null;
  try {
    const tok = await fetch(`${API}/oauth2/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: id,
        client_secret: secret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${env.APP_URL}/vol/discord/callback`,
      }).toString(),
    });
    if (!tok.ok) return null;
    const access = ((await tok.json()) as { access_token?: string }).access_token;
    if (!access) return null;
    const me = await fetch(`${API}/users/@me`, { headers: { Authorization: `Bearer ${access}` } });
    if (!me.ok) return null;
    const user = (await me.json()) as { id?: string };
    return user.id && /^\d{5,25}$/.test(user.id) ? user.id : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- channel webhooks (spec §9)
// A category's pasted Discord channel webhook. A secret: never logged (callers log the
// category id only). allowed_mentions.parse = [] so a title can't ping @everyone. 5 s timeout.

const WEBHOOK_URL = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+$/;

export async function postDiscordWebhook(url: string, content: string): Promise<'sent' | 'error'> {
  if (!WEBHOOK_URL.test(url)) return 'error';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, 2000), allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? 'sent' : 'error';
  } catch {
    return 'error';
  }
}
