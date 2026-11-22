// Volunteer sign-ups routes, mounted at '/' from app.ts:
//   /w/:wardId/vol/*   leader pages (Google session; every handler checks volAccess first)
//   /v/:publicId       the public post page and its sign-up form (no auth)
//   /vol/*             volunteer pages (verify, cancel, withdraw, My sign-ups, Discord)
// GET never changes data: every emailed link opens a page whose button POSTs.
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv, Env, SessionUser } from './types';
import { requireAuth } from './lib/auth';
import { discordAuthorizeUrl, exchangeDiscordCode, sendDiscordDm } from './lib/discord';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { randomToken } from './lib/ids';
import { signToken, verifyToken } from './lib/session';
import {
  canApproveVolunteer, canEditPost, canManageEditorList, canManageOrg, canSeeWardVolunteers, canViewPost,
} from './lib/volAccess';
import { hitLimit } from './lib/volRate';
import {
  accessUrl, approveVolunteer, cancelSignup, declineVolunteer, getSignup, getVolunteer, getVolunteerByEmail,
  listMySignups, normalizeEmail, removeSignup, revokeApproval, signupDateOver, signupSummary, submitSignup,
  undoDecline, verifyAddress, withdrawOffer,
} from './lib/volSignup';
import {
  clearVolunteerSession, getVolunteerSession, readLinkToken, setVolunteerSession, type VolunteerSession,
} from './lib/volSession';
import { accessLink } from './lib/volEmails';
import { getWardByPrefix } from './lib/db';
import { renderDiscordCard, renderLinkSent, renderMine, renderMineSignedOut } from './views/volMine';
import { verifyTurnstile } from './lib/turnstile';
import { addEditor, listEditors, removeEditor } from './lib/volEditors';
import { deliver, type OutgoingMessage } from './lib/volMessages';
import {
  VolInputError, addDate, addRole, copyDate, copyPost, createPost, deleteDate, deletePost, deleteRole, getPost,
  getPostByPublicId, listPostSignups, listPublicBringing, listWardPosts, resetFullIfShort, updateDate, updatePost, updateRole,
  type PostFull, type PostInput, type PostSummary, type RoleInput,
} from './lib/volPosts';
import { isValidDate, isValidTime } from './lib/wardTime';
import { getWardById, getWardSpaces, listWardMembers, wardRole, type WardRow, type SpaceFull } from './lib/wards';
import { notFoundPage } from './views/notfound';
import {
  renderEditorsCard, renderPostDeleteConfirm, renderPostManage, renderPostNew, renderVolunteerSection, renderWardVolunteers,
  type NewPostValues, type WardVolunteerRow,
} from './views/volLeader';
import {
  renderConfirmAction, renderPublicNote, renderPublicPost, renderSignupResult, type SignupFormValues,
} from './views/volPublic';

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
  const now = new Date();
  if (space.kind === 'org' || space.kind === 'ward_council' || space.kind === 'bishopric') {
    const wardWide = space.kind !== 'org';
    const scope = wardWide ? {} : { spaceId: space.id };
    // Every row still passes the post-level check (fail closed; e.g. a shared org page).
    const visible = async (list: PostSummary[]) => {
      const out: PostSummary[] = [];
      for (const p of list) {
        if (await canViewPost(env, userId, { id: p.id, ward_id: ward.id, space_id: p.space_id, created_by_user_id: null })) out.push(p);
      }
      return out;
    };
    const open = await visible(await listWardPosts(env, ward.id, { ...scope, past: false, now }));
    const past = await visible(await listWardPosts(env, ward.id, { ...scope, past: true, now }));
    const manages = new Map<string, boolean>();
    for (const sid of new Set([...past.map((p) => p.space_id), ...(wardWide ? [] : [space.id])])) {
      manages.set(sid, await canManageOrg(env, ward.id, sid, userId));
    }
    html += renderVolunteerSection({
      wardId: ward.id,
      open,
      past,
      newPostSpaceId: !wardWide && manages.get(space.id) ? space.id : null,
      canCopy: (sid) => manages.get(sid) === true,
      showVolunteersLink: await canSeeWardVolunteers(env, ward.id, userId),
      wardWide,
    });
  }
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

function clientIp(c: Context<AppEnv>): string | null {
  return c.req.header('cf-connecting-ip') ?? null;
}

volRoutes.post('/v/:publicId/signup', async (c) => {
  const post = await getPostByPublicId(c.env, c.req.param('publicId'));
  if (!post) {
    noindex(c);
    return c.html(notFoundPage('volunteer post'), 404);
  }
  const b = (await c.req.parseBody()) as Record<string, unknown>;
  const values: SignupFormValues = { role_id: str(b.role_id), name: str(b.name), email: str(b.email), bringing: str(b.bringing) };
  const ip = clientIp(c);
  // 1. Bot check first (the form sends email to whatever address is typed in).
  if (!(await verifyTurnstile(c.env, str(b['cf-turnstile-response']), ip))) {
    return renderPublic(c, post, { error: "We couldn't complete the bot check. Please try again.", values }, 400);
  }
  const now = new Date();
  // 2. Per-IP cap.
  if (await hitLimit(c.env, post.ward_id, 'ip:' + (ip ?? 'unknown'), 20, 60, now)) {
    return renderPublic(c, post, { error: 'Too many sign-ups from here right now. Please try again later.', values }, 429);
  }
  let out;
  try {
    out = await submitSignup(c.env, {
      wardId: post.ward_id, postId: post.id, roleId: values.role_id ?? '', name: values.name ?? '', email: values.email ?? '',
      bringing: values.bringing || null, now,
    });
  } catch (e) {
    if (e instanceof VolInputError) return renderPublic(c, post, { error: e.message, values }, 400);
    throw e;
  }
  await sendLater(c, out.messages);
  noindex(c);
  return c.html(
    renderSignupResult({ result: out.result, postTitle: post.title, publicId: post.public_id, prefix: post.ward.prefix }),
    out.result === 'rate_limited' ? 429 : 200,
  );
});

// ---------------------------------------------------------------- confirm your address

volRoutes.get('/vol/verify/:token', (c) => {
  noindex(c);
  return c.html(
    renderConfirmAction({
      title: 'Confirm your email',
      prefix: null,
      intro: 'Press the button to confirm this is your email address. Then one of the ward’s leaders will confirm you.',
      action: `/vol/verify/${encodeURIComponent(c.req.param('token'))}`,
      button: 'Confirm my address',
    }),
  );
});

volRoutes.post('/vol/verify/:token', async (c) => {
  noindex(c);
  const out = await verifyAddress(c.env, c.req.param('token'), new Date());
  await sendLater(c, out.messages);
  if (out.result === 'invalid') {
    return c.html(
      renderPublicNote({ title: 'Link expired', prefix: null, message: 'This link has expired or was already used. If you signed up, try signing up again.' }),
      400,
    );
  }
  const approved = out.messages.some((m) => m.kind === 'vol_approved');
  return c.html(
    renderPublicNote({
      title: 'Address confirmed',
      prefix: null,
      ok: true,
      message: approved
        ? "Thanks — your address is confirmed and you're all set. We've emailed you the details."
        : 'Thanks — your address is confirmed. A leader will confirm you shortly, and we’ll email you when they do.',
    }),
  );
});

// ---------------------------------------------------------------- cancel / withdraw (emailed links)

// Resolves an emailed cancel/withdraw link: valid token of the right type, the sign-up exists
// in the token's ward, and its date isn't over. Anything else -> null (404).
async function linkedSignup(c: Context<AppEnv>, typ: 'vcan' | 'vwd') {
  const now = new Date();
  const t = await readLinkToken(c.env, typ, c.req.param('token') ?? '', now);
  if (!t) return null;
  const ward = await getWardById(c.env, t.wardId);
  if (!ward || ward.status !== 'active') return null;
  const sum = await signupSummary(c.env, t.wardId, t.id);
  if (!sum || (await signupDateOver(c.env, sum.signup, now))) return null;
  return { wardId: t.wardId, ...sum };
}

function linkNotFound(c: Context<AppEnv>): Response {
  noindex(c);
  return c.html(notFoundPage('sign-up link'), 404);
}

volRoutes.get('/vol/cancel/:token', async (c) => {
  const s = await linkedSignup(c, 'vcan');
  if (!s) return linkNotFound(c);
  noindex(c);
  if (s.signup.status !== 'waiting' && s.signup.status !== 'confirmed') {
    return c.html(renderPublicNote({ title: 'Already cancelled', prefix: s.prefix, message: 'This sign-up is no longer active. Nothing more to do.' }));
  }
  return c.html(
    renderConfirmAction({
      title: 'Cancel your sign-up?',
      prefix: s.prefix,
      intro: `${s.orgName}: ${s.title} — ${s.roleName}, ${s.when}. If you can't come, cancelling lets the organizers know.`,
      action: `/vol/cancel/${encodeURIComponent(c.req.param('token'))}`,
      button: 'Cancel my sign-up',
      danger: true,
    }),
  );
});

volRoutes.post('/vol/cancel/:token', async (c) => {
  const s = await linkedSignup(c, 'vcan');
  if (!s) return linkNotFound(c);
  const out = await cancelSignup(c.env, s.wardId, s.signup.id, new Date());
  await sendLater(c, out.messages);
  noindex(c);
  return c.html(
    renderPublicNote({
      title: 'Cancelled',
      prefix: s.prefix,
      ok: true,
      message: out.result === 'cancelled' ? 'Your sign-up is cancelled. Thank you for letting them know.' : 'This sign-up was already cancelled.',
    }),
  );
});

volRoutes.get('/vol/withdraw/:token', async (c) => {
  const s = await linkedSignup(c, 'vwd');
  if (!s) return linkNotFound(c);
  noindex(c);
  if (s.signup.status !== 'confirmed' || !s.signup.over_limit) {
    return c.html(renderPublicNote({ title: 'Nothing to withdraw', prefix: s.prefix, message: 'This offer is no longer active. Nothing more to do.' }));
  }
  return c.html(
    renderConfirmAction({
      title: 'Withdraw your offer?',
      prefix: s.prefix,
      intro: `${s.orgName}: ${s.title} — ${s.roleName}, ${s.when}. This role was already full when your sign-up counted. You're welcome to come anyway, or you can withdraw.`,
      action: `/vol/withdraw/${encodeURIComponent(c.req.param('token'))}`,
      button: 'Withdraw my offer',
    }),
  );
});

volRoutes.post('/vol/withdraw/:token', async (c) => {
  const s = await linkedSignup(c, 'vwd');
  if (!s) return linkNotFound(c);
  const out = await withdrawOffer(c.env, s.wardId, s.signup.id, new Date());
  await sendLater(c, out.messages);
  noindex(c);
  return c.html(
    renderPublicNote({
      title: 'Withdrawn',
      prefix: s.prefix,
      ok: out.result === 'withdrawn',
      message: out.result === 'withdrawn' ? 'Your offer is withdrawn. Thank you for offering!' : 'This offer is no longer active.',
    }),
  );
});

// A leader takes a volunteer off a role.
volRoutes.post('/w/:wardId/vol/signup/:signupId/remove', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const s = await getSignup(c.env, lc.ward.id, c.req.param('signupId'));
  if (!s) return c.html(notFoundPage('sign-up'), 404);
  const post = await getPost(c.env, lc.ward.id, s.post_id);
  if (!post) return c.html(notFoundPage('post'), 404);
  if (!(await canEditPost(c.env, lc.user.id, post))) return c.text('Forbidden', 403);
  await sendLater(c, (await removeSignup(c.env, lc.ward.id, s.id, lc.user.id, new Date())).messages);
  return c.redirect(`${managePath(lc.ward.id, post.id)}?ok=1`, 302);
});

// ---------------------------------------------------------------- My sign-ups (volunteer session)

// Opening an emailed access link sets the volunteer cookie (it changes no data).
volRoutes.get('/vol/access/:token', async (c) => {
  noindex(c);
  const t = await readLinkToken(c.env, 'vacc', c.req.param('token'));
  const v = t ? await getVolunteer(c.env, t.wardId, t.id) : null;
  const ward = v ? await getWardById(c.env, v.ward_id) : null;
  if (!t || !v || !ward || ward.status !== 'active' || !v.email_verified_at || v.approval === 'declined') {
    return c.html(
      renderPublicNote({ title: 'Link expired', prefix: ward?.prefix ?? null, message: 'This link has expired. You can ask for a new one on the My sign-ups page.' }),
      400,
    );
  }
  await setVolunteerSession(c, v.id, ward.id);
  return c.redirect(`/vol/${ward.prefix}/me`, 302);
});

async function wardByPrefix(c: Context<AppEnv>) {
  return getWardByPrefix(c.env, (c.req.param('prefix') ?? '').toLowerCase());
}

volRoutes.get('/vol/:prefix/me', async (c) => {
  noindex(c);
  const ward = await wardByPrefix(c);
  if (!ward) return c.html(notFoundPage('ward'), 404);
  const sess = await getVolunteerSession(c);
  if (!sess || sess.ward.id !== ward.id) {
    return c.html(renderMineSignedOut({ prefix: ward.prefix, wardName: ward.name, siteKey: c.env.TURNSTILE_SITE_KEY ?? '' }));
  }
  const now = new Date();
  const approved = sess.volunteer.approval === 'approved';
  const signups = await listMySignups(c.env, ward.id, sess.volunteer.id, approved, now);
  const mine = new Set(signups.filter((s) => s.upcoming).map((s) => s.publicId));
  const others = approved
    ? (await listWardPosts(c.env, ward.id, { past: false, now })).filter((p) => !mine.has(p.public_id))
    : [];
  return c.html(
    renderMine({
      prefix: ward.prefix, wardName: ward.name, name: sess.volunteer.name, email: sess.volunteer.email, approved,
      signups, others, discordHtml: await discordCard(c, sess), notice: noticeFor(c.req.query('n')),
    }),
  );
});

function noticeFor(n: string | undefined): string | undefined {
  return (
    {
      cancelled: 'Cancelled. Thank you for letting them know.',
      discord: 'Discord connected.',
      discord_off: 'Discord disconnected.',
    } as Record<string, string>
  )[n ?? ''];
}

// "Connect Discord" on My sign-ups: approved volunteers only (spec §6.9).
async function discordCard(c: Context<AppEnv>, s: VolunteerSession): Promise<string> {
  if (s.volunteer.approval !== 'approved' || !(c.env.DISCORD_CLIENT_ID ?? '').trim()) return '';
  return renderDiscordCard({ connected: !!s.volunteer.discord_user_id });
}

volRoutes.post('/vol/:prefix/me/link', async (c) => {
  noindex(c);
  const ward = await wardByPrefix(c);
  if (!ward) return c.html(notFoundPage('ward'), 404);
  const b = (await c.req.parseBody()) as Record<string, unknown>;
  const siteKey = c.env.TURNSTILE_SITE_KEY ?? '';
  const ip = clientIp(c);
  if (!(await verifyTurnstile(c.env, str(b['cf-turnstile-response']), ip))) {
    return c.html(
      renderMineSignedOut({ prefix: ward.prefix, wardName: ward.name, siteKey, error: "We couldn't complete the bot check. Please try again." }),
      400,
    );
  }
  const now = new Date();
  const email = normalizeEmail(str(b.email));
  if (email) {
    const overIp = await hitLimit(c.env, ward.id, 'ip:' + (ip ?? 'unknown'), 20, 60, now);
    const overAddr = await hitLimit(c.env, ward.id, 'access:' + email, 3, 1440, now);
    const v = await getVolunteerByEmail(c.env, ward.id, email);
    if (!overIp && !overAddr && v && v.email_verified_at && v.approval !== 'declined') {
      await sendLater(c, [accessLink({ to: v.email, wardName: ward.name, accessUrl: await accessUrl(c.env, ward.id, v.id, now) })]);
    }
  }
  // Always the same answer, so the form can't be used to learn who has signed up.
  return c.html(renderLinkSent({ prefix: ward.prefix, wardName: ward.name }));
});

volRoutes.post('/vol/:prefix/me/cancel/:signupId', async (c) => {
  const ward = await wardByPrefix(c);
  const sess = await getVolunteerSession(c);
  if (!ward || !sess || sess.ward.id !== ward.id) return c.html(notFoundPage('sign-up'), 404);
  const s = await getSignup(c.env, ward.id, c.req.param('signupId'));
  const now = new Date();
  if (!s || s.volunteer_id !== sess.volunteer.id || (await signupDateOver(c.env, s, now))) {
    return c.html(notFoundPage('sign-up'), 404);
  }
  await sendLater(c, (await cancelSignup(c.env, ward.id, s.id, now)).messages);
  return c.redirect(`/vol/${ward.prefix}/me?n=cancelled`, 302);
});

volRoutes.post('/vol/:prefix/me/signout', (c) => {
  clearVolunteerSession(c);
  return c.redirect(`/vol/${encodeURIComponent(c.req.param('prefix'))}/me`, 302);
});

// ---------------------------------------------------------------- Discord connect

const DC_COOKIE = 'wardest_vol_dc';

interface DcState {
  typ: 'vdc';
  state: string;
  vid: string;
  wid: string;
  exp: number;
}

volRoutes.get('/vol/discord/connect', async (c) => {
  const sess = await getVolunteerSession(c);
  if (!sess) return c.text('Please open My sign-ups from your email link first.', 403);
  if (sess.volunteer.approval !== 'approved') return c.text('Discord can be connected once a leader has confirmed you.', 403);
  if (!(c.env.DISCORD_CLIENT_ID ?? '').trim()) return c.text('Discord is not set up for Wardest yet.', 503);
  const state = randomToken(16);
  const exp = Math.floor(Date.now() / 1000) + 600;
  const tok = await signToken(
    { typ: 'vdc', state, vid: sess.volunteer.id, wid: sess.ward.id, exp } satisfies DcState,
    c.env.SESSION_SECRET,
  );
  setCookie(c, DC_COOKIE, tok, {
    httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Lax', path: '/vol', maxAge: 600,
  });
  return c.redirect(discordAuthorizeUrl(c.env, state), 302);
});

volRoutes.get('/vol/discord/callback', async (c) => {
  noindex(c);
  const raw = getCookie(c, DC_COOKIE);
  deleteCookie(c, DC_COOKIE, { path: '/vol' });
  const sess = await getVolunteerSession(c);
  const st = raw ? await verifyToken<DcState>(raw, c.env.SESSION_SECRET) : null;
  const state = c.req.query('state') ?? '';
  const code = c.req.query('code') ?? '';
  if (
    !sess || !st || st.typ !== 'vdc' || st.exp < Math.floor(Date.now() / 1000) || !state || st.state !== state ||
    st.vid !== sess.volunteer.id || st.wid !== sess.ward.id || sess.volunteer.approval !== 'approved' || !code
  ) {
    return c.html(renderPublicNote({ title: 'Discord not connected', prefix: sess?.ward.prefix ?? null, message: 'That didn’t work. Please try Connect Discord again from My sign-ups.' }), 400);
  }
  const discordId = await exchangeDiscordCode(c.env, code);
  if (!discordId) {
    return c.html(renderPublicNote({ title: 'Discord not connected', prefix: sess.ward.prefix, message: 'Discord didn’t confirm your account. Please try again.' }), 502);
  }
  await c.env.DB.prepare(`UPDATE volunteers SET discord_user_id = ? WHERE id = ? AND ward_id = ?`)
    .bind(discordId, sess.volunteer.id, sess.ward.id)
    .run();
  return c.redirect(`/vol/${sess.ward.prefix}/me?n=discord`, 302);
});

volRoutes.post('/vol/discord/disconnect', async (c) => {
  const sess = await getVolunteerSession(c);
  if (!sess) return c.text('Forbidden', 403);
  await c.env.DB.prepare(`UPDATE volunteers SET discord_user_id = NULL WHERE id = ? AND ward_id = ?`)
    .bind(sess.volunteer.id, sess.ward.id)
    .run();
  return c.redirect(`/vol/${sess.ward.prefix}/me?n=discord_off`, 302);
});

// ---------------------------------------------------------------- approvals

// Back to the page the leader came from (same ward only), else the ward page.
function backTo(c: Context<AppEnv>, wardId: string, notice = 'ok=1'): Response {
  const ref = c.req.header('referer');
  let path = `/w/${wardId}`;
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.pathname.startsWith(`/w/${wardId}/`)) path = u.pathname;
    } catch {
      // ignore
    }
  }
  return c.redirect(`${path}?${notice}`, 302);
}

volRoutes.post('/w/:wardId/vol/volunteer/:volunteerId/approve', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const vid = c.req.param('volunteerId');
  if (!(await canApproveVolunteer(c.env, lc.ward.id, vid, lc.user.id))) return c.text('Forbidden', 403);
  await sendLater(c, (await approveVolunteer(c.env, lc.ward.id, vid, lc.user.id, new Date())).messages);
  return backTo(c, lc.ward.id);
});

volRoutes.post('/w/:wardId/vol/volunteer/:volunteerId/decline', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const vid = c.req.param('volunteerId');
  if (!(await canApproveVolunteer(c.env, lc.ward.id, vid, lc.user.id))) return c.text('Forbidden', 403);
  await sendLater(c, (await declineVolunteer(c.env, lc.ward.id, vid, lc.user.id, new Date())).messages);
  return backTo(c, lc.ward.id);
});

volRoutes.post('/w/:wardId/vol/volunteer/:volunteerId/undo-decline', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  if (!(await canSeeWardVolunteers(c.env, lc.ward.id, lc.user.id))) return c.text('Forbidden', 403);
  await undoDecline(c.env, lc.ward.id, c.req.param('volunteerId'), lc.user.id);
  return backTo(c, lc.ward.id);
});

volRoutes.post('/w/:wardId/vol/volunteer/:volunteerId/revoke', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  if (!(await canSeeWardVolunteers(c.env, lc.ward.id, lc.user.id))) return c.text('Forbidden', 403);
  const out = await revokeApproval(c.env, lc.ward.id, c.req.param('volunteerId'), lc.user.id, new Date());
  await sendLater(c, out.messages);
  return backTo(c, lc.ward.id);
});

volRoutes.get('/w/:wardId/volunteers', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  if (!(await canSeeWardVolunteers(c.env, lc.ward.id, lc.user.id))) return c.text('Forbidden', 403);
  const rows = await c.env.DB.prepare(
    `SELECT v.id, v.name, v.email, v.approval, v.email_verified_at, v.decided_at,
            (SELECT COUNT(*) FROM vol_signups s WHERE s.volunteer_id = v.id AND s.ward_id = v.ward_id
               AND s.status IN ('waiting','confirmed')) AS active
       FROM volunteers v WHERE v.ward_id = ? ORDER BY v.name COLLATE NOCASE, v.email`,
  )
    .bind(lc.ward.id)
    .all<WardVolunteerRow>();
  return c.html(
    renderWardVolunteers({
      user: lc.user, wardId: lc.ward.id, wardName: lc.ward.name, volunteers: rows.results ?? [],
      notice: c.req.query('ok') ? 'Saved.' : undefined,
    }),
  );
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
