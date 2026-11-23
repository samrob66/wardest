// Service routes, mounted at '/' from app.ts:
//   /w/:wardId/service/*   leader pages for service categories (Google session; every handler
//                          checks serviceAccess first, 403 otherwise)
// GET never changes data.
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv, SessionUser } from './types';
import { requireAuth } from './lib/auth';
import { getWardById, getWardSpaces, listWardMembers, wardRole, type WardRow } from './lib/wards';
import { notFoundPage } from './views/notfound';
import {
  canSeeRequestCategory, categoriesUserMayCreateIn, isBishopric, isCategoryManager,
} from './lib/serviceAccess';
import { getCategory, getCategoryRow, listCategories, type CategoryFull } from './lib/serviceCategories';
import {
  ServiceInputError, addDelegate, createCategory, delegateByEmail, eligibleOwnerSpace, getWarnPref, removeDelegate,
  setCategoryArchived, setWarnPref, setWebhook, updateCategory,
} from './lib/serviceAdmin';
import { renderCategoryPage, renderServiceHub } from './views/service';

export const serviceRoutes = new Hono<AppEnv>();

export function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

// Every value of a repeated form field (checkboxes, multi-selects).
export function all(b: Record<string, unknown>, name: string): string[] {
  const v = b[name] ?? b[`${name}[]`];
  return (Array.isArray(v) ? v : v != null ? [v] : []).map((x) => (typeof x === 'string' ? x : '')).filter(Boolean);
}

export type LeaderCtx = { user: SessionUser; ward: WardRow };

// Signed-in leader + ward from :wardId. Missing ward -> 404; not a member -> 403.
export async function leaderCtx(c: Context<AppEnv>): Promise<LeaderCtx | Response> {
  const user = c.get('user')!;
  const wardId = c.req.param('wardId') ?? '';
  const ward = await getWardById(c.env, wardId);
  if (!ward) return c.html(notFoundPage(wardId), 404);
  if (!(await wardRole(c.env, ward.id, user.id))) return c.text('Forbidden', 403);
  return { user, ward };
}

function back(c: Context<AppEnv>, path: string, err?: string): Response {
  return c.redirect(err ? `${path}?err=${encodeURIComponent(err)}` : `${path}?ok=1`, 302);
}

// Spaces this user may add a category to: ones they own; any eligible space for the Bishopric.
async function addableSpaces(c: Context<AppEnv>, lc: LeaderCtx): Promise<Array<{ id: string; name: string }>> {
  const bishopric = await isBishopric(c.env, lc.ward.id, lc.user.id);
  const out: Array<{ id: string; name: string }> = [];
  for (const s of await getWardSpaces(c.env, lc.ward.id)) {
    if (!['org', 'bishopric', 'ward_council'].includes(s.kind)) continue;
    if (bishopric || (await mayAddTo(c, lc, s.id))) out.push({ id: s.id, name: s.name });
  }
  return out;
}

async function mayAddTo(c: Context<AppEnv>, lc: LeaderCtx, spaceId: string): Promise<boolean> {
  if (!(await eligibleOwnerSpace(c.env, lc.ward.id, spaceId))) return false;
  if (await isBishopric(c.env, lc.ward.id, lc.user.id)) return true;
  const r = await c.env.DB.prepare(
    `SELECT 1 AS ok FROM space_memberships WHERE space_id = ? AND user_id = ? AND ward_id = ? AND role = 'owner'`,
  )
    .bind(spaceId, lc.user.id, lc.ward.id)
    .first();
  return r != null;
}

// ---------------------------------------------------------------- hub

serviceRoutes.get('/w/:wardId/service', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const cats = await listCategories(c.env, lc.ward.id, { includeArchived: true });
  const managed = [];
  let canSeeRequests = false;
  for (const cat of cats) {
    if (await isCategoryManager(c.env, lc.ward.id, cat.id, lc.user.id)) managed.push(cat);
    if (cat.kind === 'request' && !cat.archived && !canSeeRequests) {
      canSeeRequests = await canSeeRequestCategory(c.env, lc.ward.id, cat.id, lc.user.id);
    }
  }
  const creatable = await categoriesUserMayCreateIn(c.env, lc.ward.id, lc.user.id);
  return c.html(
    renderServiceHub({
      user: lc.user, wardId: lc.ward.id, wardName: lc.ward.name, canCreate: creatable.length > 0, managed, canSeeRequests,
      addSpaces: await addableSpaces(c, lc), notice: c.req.query('ok') ? 'Saved.' : undefined, error: c.req.query('err') || undefined,
    }),
  );
});

serviceRoutes.post('/w/:wardId/service/category', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const b = (await c.req.parseBody({ all: true })) as Record<string, unknown>;
  const spaceId = str(b.space_id);
  if (!(await mayAddTo(c, lc, spaceId))) return c.text('Forbidden', 403);
  try {
    const id = await createCategory(c.env, lc.ward.id, {
      kind: str(b.kind), name: str(b.name), icon: str(b.icon), spaceId, audiences: all(b, 'audiences'),
      confidential: str(b.confidential) === '1',
    });
    return back(c, `/w/${lc.ward.id}/service/category/${id}`);
  } catch (e) {
    if (e instanceof ServiceInputError) return back(c, `/w/${lc.ward.id}/service`, e.message);
    throw e;
  }
});

// ---------------------------------------------------------------- one category (managers)

type CatCtx = LeaderCtx & { cat: CategoryFull; path: string };

async function catCtx(c: Context<AppEnv>): Promise<CatCtx | Response> {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const id = c.req.param('categoryId') ?? '';
  if (!(await getCategoryRow(c.env, lc.ward.id, id))) return c.html(notFoundPage('category'), 404);
  if (!(await isCategoryManager(c.env, lc.ward.id, id, lc.user.id))) return c.text('Forbidden', 403);
  const cat = await getCategory(c.env, lc.ward.id, id);
  if (!cat) return c.html(notFoundPage('category'), 404);
  return { ...lc, cat, path: `/w/${lc.ward.id}/service/category/${cat.id}` };
}

// Runs a manager's change; a ServiceInputError becomes a friendly error on the category page.
async function catAction(
  c: Context<AppEnv>,
  fn: (cc: CatCtx, b: Record<string, unknown>) => Promise<void | Response>,
): Promise<Response> {
  const cc = await catCtx(c);
  if (cc instanceof Response) return cc;
  const b = (await c.req.parseBody({ all: true })) as Record<string, unknown>;
  try {
    const out = await fn(cc, b);
    if (out instanceof Response) return out;
  } catch (e) {
    if (e instanceof ServiceInputError) return back(c, cc.path, e.message);
    throw e;
  }
  return back(c, cc.path);
}

serviceRoutes.get('/w/:wardId/service/category/:categoryId', requireAuth(), async (c) => {
  const cc = await catCtx(c);
  if (cc instanceof Response) return cc;
  const members = (await listWardMembers(c.env, cc.ward.id)).map((m) => ({ user_id: m.user_id, email: m.email, name: m.name }));
  const onList = new Set(cc.cat.delegates.map((d) => d.user_id));
  return c.html(
    renderCategoryPage({
      user: cc.user, wardId: cc.ward.id, cat: cc.cat,
      candidates: members.filter((m) => !onList.has(m.user_id)),
      myPref: await getWarnPref(c.env, cc.ward.id, cc.cat.id, cc.user.id),
      wardMembers: members,
      opportunityCategories: await listCategories(c.env, cc.ward.id, { kind: 'opportunity' }),
      notice: c.req.query('ok') ? 'Saved.' : undefined, error: c.req.query('err') || undefined,
    }),
  );
});

serviceRoutes.post('/w/:wardId/service/category/:categoryId', requireAuth(), (c) =>
  catAction(c, async (cc, b) => {
    const op = str(b.op);
    if (op === 'archive' || op === 'unarchive') return setCategoryArchived(c.env, cc.ward.id, cc.cat.id, op === 'archive');
    await updateCategory(c.env, cc.ward.id, cc.cat.id, {
      name: str(b.name), icon: str(b.icon), audiences: all(b, 'audiences'), council_may_create: str(b.council_may_create) === '1',
      confidential: str(b.confidential) === '1', opportunity_category_id: str(b.opportunity_category_id),
    });
  }),
);

serviceRoutes.post('/w/:wardId/service/category/:categoryId/delegates', requireAuth(), (c) =>
  catAction(c, async (cc, b) => {
    const email = str(b.email).trim();
    if (email) {
      await delegateByEmail(c.env, { wardId: cc.ward.id, wardName: cc.ward.name, categoryId: cc.cat.id, email, byUserId: cc.user.id });
      return;
    }
    await addDelegate(c.env, cc.ward.id, cc.cat.id, str(b.user_id), cc.user.id);
  }),
);

serviceRoutes.post('/w/:wardId/service/category/:categoryId/delegates/:userId/remove', requireAuth(), (c) =>
  catAction(c, async (cc) => {
    await removeDelegate(c.env, cc.ward.id, cc.cat.id, c.req.param('userId'));
  }),
);

serviceRoutes.post('/w/:wardId/service/category/:categoryId/warnings', requireAuth(), (c) =>
  catAction(c, async (cc, b) => {
    await setWarnPref(c.env, cc.ward.id, cc.cat.id, cc.user.id, {
      warnMe: str(b.warn_me) === '1', hours: str(b.hours), others: all(b, 'others'),
    });
  }),
);

serviceRoutes.post('/w/:wardId/service/category/:categoryId/discord', requireAuth(), (c) =>
  catAction(c, async (cc, b) => {
    if (str(b.clear) === '1') return setWebhook(c.env, cc.ward.id, cc.cat.id, '');
    if (!str(b.webhook_url).trim()) throw new ServiceInputError('Paste the channel webhook link first.');
    await setWebhook(c.env, cc.ward.id, cc.cat.id, str(b.webhook_url));
  }),
);

export default serviceRoutes;
