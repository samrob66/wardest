// Volunteer sign-ups routes, mounted at '/' from app.ts:
//   /w/:wardId/vol/*   leader pages (Google session; every handler checks volAccess first)
//   /v/:publicId       the public post page and its sign-up form (no auth)
//   /vol/*             volunteer pages (verify, cancel, withdraw, My sign-ups, Discord)
// GET never changes data: every emailed link opens a page whose button POSTs.
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv, Env, SessionUser } from './types';
import { requireAuth } from './lib/auth';
import { sendDiscordDm } from './lib/discord';
import { canEditPost, canManageEditorList, canManageOrg, canViewPost } from './lib/volAccess';
import { addEditor, listEditors, removeEditor } from './lib/volEditors';
import { deliver, type OutgoingMessage } from './lib/volMessages';
import {
  VolInputError, addDate, addRole, copyDate, copyPost, createPost, deleteDate, deletePost, deleteRole, getPost,
  getPostByPublicId, listPostSignups, listPublicBringing, resetFullIfShort, updateDate, updatePost, updateRole,
  type PostFull, type PostInput, type RoleInput,
} from './lib/volPosts';
import { isValidDate, isValidTime } from './lib/wardTime';
import { getWardById, getWardSpaces, listWardMembers, wardRole, type WardRow, type SpaceFull } from './lib/wards';
import { notFoundPage } from './views/notfound';
import {
  renderEditorsCard, renderPostDeleteConfirm, renderPostManage, renderPostNew, type NewPostValues,
} from './views/volLeader';
import { renderPublicPost, type SignupFormValues } from './views/volPublic';

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

// ---------------------------------------------------------------- shared helpers

// Hand messages to deliver() after the response (waitUntil); falls back to awaiting when
// there's no execution context (e.g. app.request in tests).
export async function sendLater(c: Context<AppEnv>, msgs: OutgoingMessage[]): Promise<void> {
  if (!msgs.length) return;
  const p = deliver(c.env, msgs);
  try {
    c.executionCtx.waitUntil(p);
  } catch {
    await p;
  }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function intOr(v: unknown, fallback: number): number {
  const s = str(v).trim();
  if (!/^-?\d+$/.test(s)) return fallback;
  return Number(s);
}

function postInputFrom(b: Record<string, unknown>): PostInput {
  return {
    title: str(b.title),
    public_note: str(b.public_note),
    private_details: str(b.private_details),
    cancel_cutoff_hours: intOr(b.cancel_cutoff_hours, -1),
  };
}

function roleInputFrom(b: Record<string, unknown>): RoleInput {
  return {
    name: str(b.name),
    needed: intOr(b.needed, 0),
    start_time: str(b.start_time) || null,
    end_time: str(b.end_time) || null,
    note: str(b.note) || null,
    bring_prompt: str(b.bring_prompt) || null,
  };
}

type LeaderCtx = { user: SessionUser; ward: WardRow };

// Signed-in leader + ward from :wardId. Missing ward -> 404; not a member -> 403.
async function leaderCtx(c: Context<AppEnv>): Promise<LeaderCtx | Response> {
  const user = c.get('user')!;
  const wardId = c.req.param('wardId') ?? '';
  const ward = await getWardById(c.env, wardId);
  if (!ward) return c.html(notFoundPage(wardId), 404);
  if (!(await wardRole(c.env, ward.id, user.id))) return c.text('Forbidden', 403);
  return { user, ward };
}

type PostCtx = LeaderCtx & { post: PostFull };

// + the post from :postId, scoped to the ward (another ward's id -> 404), and the access check.
async function postCtx(c: Context<AppEnv>, need: 'view' | 'edit'): Promise<PostCtx | Response> {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const post = await getPost(c.env, lc.ward.id, c.req.param('postId') ?? '');
  if (!post) return c.html(notFoundPage('post'), 404);
  const ok = need === 'edit' ? await canEditPost(c.env, lc.user.id, post) : await canViewPost(c.env, lc.user.id, post);
  if (!ok) return c.text('Forbidden', 403);
  return { ...lc, post };
}

function managePath(wardId: string, postId: string): string {
  return `/w/${wardId}/vol/${postId}`;
}

function backWith(c: Context<AppEnv>, pc: PostCtx, err?: string): Response {
  const p = managePath(pc.ward.id, pc.post.id);
  return c.redirect(err ? `${p}?err=${encodeURIComponent(err)}` : `${p}?ok=1`, 302);
}

// Runs a post edit; a VolInputError becomes a friendly error on the manage page.
async function editAction(
  c: Context<AppEnv>,
  fn: (pc: PostCtx, body: Record<string, unknown>) => Promise<OutgoingMessage[] | void | Response>,
): Promise<Response> {
  const pc = await postCtx(c, 'edit');
  if (pc instanceof Response) return pc;
  const body = (await c.req.parseBody()) as Record<string, unknown>;
  try {
    const out = await fn(pc, body);
    if (out instanceof Response) return out;
    if (Array.isArray(out)) await sendLater(c, out);
  } catch (e) {
    if (e instanceof VolInputError) return backWith(c, pc, e.message);
    throw e;
  }
  return backWith(c, pc);
}

async function manageableOrgs(env: Env, wardId: string, userId: string): Promise<Array<{ id: string; name: string }>> {
  const out: Array<{ id: string; name: string }> = [];
  for (const s of await getWardSpaces(env, wardId)) {
    if (s.kind === 'org' && (await canManageOrg(env, wardId, s.id, userId))) out.push({ id: s.id, name: s.name });
  }
  return out;
}

// ---------------------------------------------------------------- leader: posts

volRoutes.get('/w/:wardId/vol/new', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const orgs = await manageableOrgs(c.env, lc.ward.id, lc.user.id);
  if (!orgs.length) return c.text('Forbidden', 403);
  return c.html(
    renderPostNew({ user: lc.user, wardId: lc.ward.id, wardName: lc.ward.name, orgs, values: { space_id: c.req.query('space') ?? '' } }),
  );
});

volRoutes.post('/w/:wardId/vol', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const b = (await c.req.parseBody()) as Record<string, unknown>;
  const spaceId = str(b.space_id);
  if (!(await canManageOrg(c.env, lc.ward.id, spaceId, lc.user.id))) return c.text('Forbidden', 403);
  const values: NewPostValues = {
    space_id: spaceId, title: str(b.title), public_note: str(b.public_note), private_details: str(b.private_details),
    cancel_cutoff_hours: str(b.cancel_cutoff_hours), first_date: str(b.first_date), start_time: str(b.start_time),
    role_name: str(b.role_name), role_needed: str(b.role_needed),
  };
  let postId: string | null = null;
  try {
    // Check the date and the optional first role before anything is written.
    if (!isValidDate(values.first_date ?? '')) throw new VolInputError('Pick a real date for the first date.');
    if (values.start_time && !isValidTime(values.start_time)) throw new VolInputError('Times must be HH:MM (24-hour).');
    const wantsRole = !!(values.role_name ?? '').trim();
    postId = await createPost(c.env, lc.ward.id, spaceId, lc.user.id, postInputFrom(b));
    const dateId = await addDate(c.env, lc.ward.id, postId, values.first_date!, values.start_time || null);
    if (wantsRole) {
      await addRole(c.env, lc.ward.id, dateId, {
        name: values.role_name!, needed: intOr(values.role_needed, 0), start_time: null, end_time: null, note: null, bring_prompt: null,
      });
    }
  } catch (e) {
    if (!(e instanceof VolInputError)) throw e;
    if (postId) await deletePost(c.env, lc.ward.id, postId);
    const orgs = await manageableOrgs(c.env, lc.ward.id, lc.user.id);
    return c.html(
      renderPostNew({ user: lc.user, wardId: lc.ward.id, wardName: lc.ward.name, orgs, values, error: e.message }),
      400,
    );
  }
  return c.redirect(managePath(lc.ward.id, postId!), 302);
});

volRoutes.get('/w/:wardId/vol/:postId', requireAuth(), async (c) => {
  const pc = await postCtx(c, 'view');
  if (pc instanceof Response) return pc;
  const canEdit = await canEditPost(c.env, pc.user.id, pc.post);
  const signups = await listPostSignups(c.env, pc.ward.id, pc.post.id);
  return c.html(
    renderPostManage({
      user: pc.user, post: pc.post, signups, canEdit, publicUrl: `${c.env.APP_URL}/v/${pc.post.public_id}`,
      notice: c.req.query('ok') ? 'Saved.' : undefined, error: c.req.query('err') || undefined,
    }),
  );
});

volRoutes.post('/w/:wardId/vol/:postId', requireAuth(), (c) =>
  editAction(c, async (pc, b) => {
    await updatePost(c.env, pc.ward.id, pc.post.id, postInputFrom(b));
    await resetFullIfShort(c.env, pc.ward.id, pc.post.id);
  }),
);

volRoutes.post('/w/:wardId/vol/:postId/date', requireAuth(), (c) =>
  editAction(c, async (pc, b) => {
    await addDate(c.env, pc.ward.id, pc.post.id, str(b.date), str(b.start_time) || null);
  }),
);

// A date or role id must belong to this post (and so this ward), else 404.
function dateOf(pc: PostCtx, dateId: string) {
  return pc.post.dates.find((d) => d.id === dateId) ?? null;
}
function roleOf(pc: PostCtx, roleId: string) {
  return pc.post.dates.flatMap((d) => d.roles).find((r) => r.id === roleId) ?? null;
}

volRoutes.post('/w/:wardId/vol/:postId/date/:dateId', requireAuth(), (c) =>
  editAction(c, async (pc, b) => {
    if (!dateOf(pc, c.req.param('dateId'))) return c.html(notFoundPage('date'), 404);
    return updateDate(c.env, pc.ward.id, c.req.param('dateId'), str(b.date), str(b.start_time) || null);
  }),
);

volRoutes.post('/w/:wardId/vol/:postId/date/:dateId/copy', requireAuth(), (c) =>
  editAction(c, async (pc, b) => {
    if (!dateOf(pc, c.req.param('dateId'))) return c.html(notFoundPage('date'), 404);
    await copyDate(c.env, pc.ward.id, c.req.param('dateId'), str(b.date));
  }),
);

volRoutes.post('/w/:wardId/vol/:postId/date/:dateId/delete', requireAuth(), (c) =>
  editAction(c, async (pc) => {
    if (!dateOf(pc, c.req.param('dateId'))) return c.html(notFoundPage('date'), 404);
    const msgs = await deleteDate(c.env, pc.ward.id, c.req.param('dateId'));
    await resetFullIfShort(c.env, pc.ward.id, pc.post.id);
    return msgs;
  }),
);

volRoutes.post('/w/:wardId/vol/:postId/date/:dateId/role', requireAuth(), (c) =>
  editAction(c, async (pc, b) => {
    if (!dateOf(pc, c.req.param('dateId'))) return c.html(notFoundPage('date'), 404);
    await addRole(c.env, pc.ward.id, c.req.param('dateId'), roleInputFrom(b));
  }),
);

volRoutes.post('/w/:wardId/vol/:postId/role/:roleId', requireAuth(), (c) =>
  editAction(c, async (pc, b) => {
    if (!roleOf(pc, c.req.param('roleId'))) return c.html(notFoundPage('role'), 404);
    return updateRole(c.env, pc.ward.id, c.req.param('roleId'), roleInputFrom(b));
  }),
);

volRoutes.post('/w/:wardId/vol/:postId/role/:roleId/delete', requireAuth(), (c) =>
  editAction(c, async (pc) => {
    if (!roleOf(pc, c.req.param('roleId'))) return c.html(notFoundPage('role'), 404);
    return deleteRole(c.env, pc.ward.id, c.req.param('roleId'));
  }),
);

volRoutes.get('/w/:wardId/vol/:postId/delete', requireAuth(), async (c) => {
  const pc = await postCtx(c, 'edit');
  if (pc instanceof Response) return pc;
  const confirmed = (await listPostSignups(c.env, pc.ward.id, pc.post.id)).filter((s) => s.status === 'confirmed').length;
  return c.html(renderPostDeleteConfirm({ user: pc.user, post: pc.post, confirmed }));
});

volRoutes.post('/w/:wardId/vol/:postId/delete', requireAuth(), async (c) => {
  const pc = await postCtx(c, 'edit');
  if (pc instanceof Response) return pc;
  await sendLater(c, await deletePost(c.env, pc.ward.id, pc.post.id));
  return c.redirect(`/w/${pc.ward.id}/space/${pc.post.space_id}?ok=1`, 302);
});

volRoutes.post('/w/:wardId/vol/:postId/copy', requireAuth(), async (c) => {
  const pc = await postCtx(c, 'view');
  if (pc instanceof Response) return pc;
  // Copying makes a new post for the same organization: needs the right to create there.
  if (!(await canManageOrg(c.env, pc.ward.id, pc.post.space_id, pc.user.id))) return c.text('Forbidden', 403);
  const b = (await c.req.parseBody()) as Record<string, unknown>;
  try {
    const id = await copyPost(c.env, pc.ward.id, pc.post.id, str(b.new_first_date), pc.user.id);
    return c.redirect(managePath(pc.ward.id, id), 302);
  } catch (e) {
    if (e instanceof VolInputError) return backWith(c, pc, e.message);
    throw e;
  }
});

// ---------------------------------------------------------------- public post page

function noindex(c: Context<AppEnv>): void {
  c.header('X-Robots-Tag', 'noindex');
}

async function renderPublic(
  c: Context<AppEnv>,
  post: PostFull,
  extra: { error?: string; values?: SignupFormValues } = {},
  status: 200 | 400 | 429 = 200,
): Promise<Response> {
  const bringing = await listPublicBringing(c.env, post.ward_id, post.id);
  noindex(c);
  return c.html(
    renderPublicPost({
      post, bringing, now: new Date(), siteKey: c.env.TURNSTILE_SITE_KEY ?? '',
      publicUrl: `${c.env.APP_URL}/v/${post.public_id}`, ...extra,
    }),
    status,
  );
}

volRoutes.get('/v/:publicId', async (c) => {
  const post = await getPostByPublicId(c.env, c.req.param('publicId'));
  if (!post) {
    noindex(c);
    return c.html(notFoundPage('volunteer post'), 404);
  }
  return renderPublic(c, post);
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
