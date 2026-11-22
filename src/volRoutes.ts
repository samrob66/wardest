// Volunteer sign-ups routes, mounted at '/' from app.ts:
//   /w/:wardId/vol/*   leader pages (Google session; every handler checks volAccess first)
//   /v/:publicId       the public post page and its sign-up form (no auth)
//   /vol/*             volunteer pages (verify, cancel, withdraw, My sign-ups, Discord)
// GET never changes data: every emailed link opens a page whose button POSTs.
import { Hono } from 'hono';
import type { AppEnv, Env } from './types';
import { requireAuth } from './lib/auth';
import { sendDiscordDm } from './lib/discord';
import { canManageEditorList } from './lib/volAccess';
import { addEditor, listEditors, removeEditor } from './lib/volEditors';
import { listWardMembers, type WardRow, type SpaceFull } from './lib/wards';
import { renderEditorsCard } from './views/volLeader';

export const volRoutes = new Hono<AppEnv>();

// ---------------------------------------------------------------- space-page sections

// The volunteer parts of a space page (rendered by app.ts beside blocks and tasks). The caller
// has already checked the viewer may see the space.
export async function spaceVolunteerSection(
  env: Env,
  ward: WardRow,
  space: SpaceFull,
  userId: string,
): Promise<string> {
  let html = '';
  if (space.kind === 'org') {
    const editors = await listEditors(env, ward.id, space.id);
    const canManage = await canManageEditorList(env, ward.id, space.id, userId);
    const onList = new Set(editors.map((e) => e.user_id));
    const candidates = canManage
      ? (await listWardMembers(env, ward.id)).filter((m) => !onList.has(m.user_id))
      : [];
    html += renderEditorsCard({ wardId: ward.id, spaceId: space.id, editors, canManage, candidates });
  }
  return html;
}

// ---------------------------------------------------------------- volunteer editors list

volRoutes.post('/w/:wardId/space/:spaceId/vol-editors', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const { wardId, spaceId } = c.req.param();
  if (!(await canManageEditorList(c.env, wardId, spaceId, user.id))) return c.text('Forbidden', 403);
  const target = String((await c.req.parseBody()).user_id ?? '');
  try {
    await addEditor(c.env, wardId, spaceId, target, user.id);
  } catch (e) {
    return c.redirect(`/w/${wardId}/space/${spaceId}?err=${encodeURIComponent((e as Error).message)}`, 302);
  }
  return c.redirect(`/w/${wardId}/space/${spaceId}?ok=1`, 302);
});

volRoutes.post('/w/:wardId/space/:spaceId/vol-editors/:userId/remove', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const { wardId, spaceId, userId } = c.req.param();
  if (!(await canManageEditorList(c.env, wardId, spaceId, user.id))) return c.text('Forbidden', 403);
  await removeEditor(c.env, wardId, spaceId, userId);
  return c.redirect(`/w/${wardId}/space/${spaceId}?ok=1`, 302);
});

// ---------------------------------------------------------------- dev only

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
