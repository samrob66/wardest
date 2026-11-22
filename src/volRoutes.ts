// Volunteer sign-ups routes, mounted at '/' from app.ts:
//   /w/:wardId/vol/*   leader pages (Google session; every handler checks volAccess first)
//   /v/:publicId       the public post page and its sign-up form (no auth)
//   /vol/*             volunteer pages (verify, cancel, withdraw, My sign-ups, Discord)
// GET never changes data: every emailed link opens a page whose button POSTs.
import { Hono } from 'hono';
import type { AppEnv } from './types';
import { sendDiscordDm } from './lib/discord';

export const volRoutes = new Hono<AppEnv>();

// DEV ONLY (DEV_LOGIN=1): proves the Worker can DM a Discord user who shares a server with
// the bot. 404 in production.
volRoutes.get('/dev/discord-dm', async (c) => {
  if (c.env.DEV_LOGIN !== '1') return c.notFound();
  const to = (c.req.query('to') ?? '').trim();
  if (!/^\d{5,25}$/.test(to)) return c.text('dev discord-dm: ?to=<discord user id> required', 400);
  const result = await sendDiscordDm(c.env, to, 'Wardest test message');
  return c.text(`discord dm result: ${result}`);
});

export default volRoutes;
