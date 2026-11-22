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
