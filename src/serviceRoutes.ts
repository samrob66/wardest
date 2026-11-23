// Service routes, mounted at '/' from app.ts:
//   /w/:wardId/service/*   leader pages for service categories (Google session; every handler
//                          checks serviceAccess first, 403 otherwise)
//   /serve/:prefix         the public Service Opportunities page (no auth, noindex, counts only)
//   /help/:prefix[/:slug]  the public Request Help or Service page and its forms; /help/verify/*
//   /w/:wardId/requests/*  the leaders' requests inbox (serviceAccess.canSeeRequest)
// GET never changes data.
import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppEnv, SessionUser } from './types';
import { requireAuth } from './lib/auth';
import { getWardById, getWardSpaces, listWardMembers, wardRole, type WardRow } from './lib/wards';
import { notFoundPage } from './views/notfound';
import {
  canCreateInCategory, canManageRequest, canSeeRequest, canSeeRequestCategory, categoriesUserMayCreateIn, isBishopric,
  isCategoryManager,
} from './lib/serviceAccess';
import {
  getCategory, getCategoryBySlug, getCategoryRow, listCategories, type CategoryFull, type CategoryRow,
} from './lib/serviceCategories';
import {
  RequestInputError, checkRequest, getRequest, listRequests, submitRequest, updateRequest, verifyRequest, whoSeesText,
  type CleanRequest, type RequestInput, type RequestRow,
} from './lib/serviceRequests';
import { deliver } from './lib/volMessages';
import { verifyTurnstile } from './lib/turnstile';
import { hitLimit } from './lib/volRate';
import { sha256Hex } from './lib/volSession';
import { renderHelpForm, renderHelpNote, renderHelpPage, renderHelpVerify, type HelpFormValues } from './views/help';
import { renderInbox, renderRequestPage } from './views/requests';
import {
  ServiceInputError, addDelegate, createCategory, delegateByEmail, eligibleOwnerSpace, getWarnPref, removeDelegate,
  setCategoryArchived, setWarnPref, setWebhook, updateCategory,
} from './lib/serviceAdmin';
import { renderCategoryPage, renderServiceHub } from './views/service';
import { listServePosts } from './lib/serve';
import { renderServePage } from './views/serve';

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

// ---------------------------------------------------------------- public pages

export function noindex(c: Context<AppEnv>): void {
  c.header('X-Robots-Tag', 'noindex');
}

export interface PublicWard {
  id: string;
  name: string;
  prefix: string;
  serve_short_url: string | null;
  help_short_url: string | null;
}

// An active ward by its public prefix (a suspended ward is not found, like its portal).
export async function publicWard(c: Context<AppEnv>): Promise<PublicWard | null> {
  const prefix = (c.req.param('prefix') ?? '').toLowerCase();
  if (!prefix || prefix.length > 40) return null;
  return c.env.DB.prepare(
    `SELECT id, name, prefix, serve_short_url, help_short_url FROM wards WHERE prefix = ? AND status = 'active'`,
  )
    .bind(prefix)
    .first<PublicWard>();
}

serviceRoutes.get('/serve/:prefix', async (c) => {
  noindex(c);
  const ward = await publicWard(c);
  if (!ward) return c.html(notFoundPage('ward'), 404);
  // The big button is for signed-in leaders who may create in some category; anonymous
  // visitors never see it.
  const user = c.get('user');
  const createHref = user && (await categoriesUserMayCreateIn(c.env, ward.id, user.id)).length ? `/w/${ward.id}/vol/new` : null;
  return c.html(
    renderServePage({
      wardName: ward.name,
      prefix: ward.prefix,
      sections: await listServePosts(c.env, ward.id, new Date()),
      shareUrl: ward.serve_short_url ?? `${c.env.APP_URL}/serve/${ward.prefix}`,
      createHref,
    }),
  );
});

// ---------------------------------------------------------------- public: Request Help or Service

function clientIp(c: Context<AppEnv>): string | null {
  return c.req.header('cf-connecting-ip') ?? null;
}

serviceRoutes.get('/help/:prefix', async (c) => {
  noindex(c);
  const ward = await publicWard(c);
  if (!ward) return c.html(notFoundPage('ward'), 404);
  return c.html(
    renderHelpPage({
      wardName: ward.name,
      prefix: ward.prefix,
      categories: await listCategories(c.env, ward.id, { kind: 'request' }),
      shareUrl: ward.help_short_url ?? `${c.env.APP_URL}/help/${ward.prefix}`,
    }),
  );
});

// The emailed confirm link (registered before /help/:prefix/:slug; 'verify' is a reserved prefix).
serviceRoutes.get('/help/verify/:token', (c) => {
  noindex(c);
  return c.html(renderHelpVerify({ action: `/help/verify/${encodeURIComponent(c.req.param('token'))}` }));
});

serviceRoutes.post('/help/verify/:token', async (c) => {
  noindex(c);
  const out = await verifyRequest(c.env, c.req.param('token'), new Date());
  await deliver(c.env, out.messages);
  if (out.result === 'invalid') {
    return c.html(
      renderHelpNote({ title: 'Link expired', prefix: null, message: 'This link has expired or was already used. If your request didn’t go through, please send it again.' }),
      400,
    );
  }
  return c.html(
    renderHelpNote({ title: 'Thank you', ok: true, prefix: out.prefix ?? null, message: 'Thank you, we’ve received your request. Someone will reach out to you soon.' }),
  );
});

async function helpCategory(c: Context<AppEnv>, ward: PublicWard): Promise<CategoryRow | null> {
  const slug = (c.req.param('slug') ?? '').toLowerCase();
  const cat = await getCategoryBySlug(c.env, ward.id, slug);
  return cat && cat.kind === 'request' && !cat.archived ? cat : null;
}

serviceRoutes.get('/help/:prefix/:slug', async (c) => {
  noindex(c);
  const ward = await publicWard(c);
  const cat = ward ? await helpCategory(c, ward) : null;
  if (!ward || !cat) return c.html(notFoundPage('request form'), 404);
  return c.html(
    renderHelpForm({
      wardName: ward.name, prefix: ward.prefix, category: cat, whoSees: await whoSeesText(c.env, ward.id, cat),
      siteKey: c.env.TURNSTILE_SITE_KEY ?? '',
    }),
  );
});

serviceRoutes.post('/help/:prefix/:slug', async (c) => {
  noindex(c);
  const ward = await publicWard(c);
  const cat = ward ? await helpCategory(c, ward) : null;
  if (!ward || !cat) return c.html(notFoundPage('request form'), 404);
  const b = (await c.req.parseBody()) as Record<string, unknown>;
  // Only the fields this form has; anything else posted is ignored.
  const values: HelpFormValues = {
    name: str(b.name), email: str(b.email), phone: str(b.phone), note: str(b.note),
    moving_dir: str(b.moving_dir), preferred_date: str(b.preferred_date), christmas_for: str(b.christmas_for),
  };
  const again = async (error: string, status: 400 | 429) =>
    c.html(
      renderHelpForm({
        wardName: ward.name, prefix: ward.prefix, category: cat, whoSees: await whoSeesText(c.env, ward.id, cat),
        siteKey: c.env.TURNSTILE_SITE_KEY ?? '', values, error,
      }),
      status,
    );
  const ip = clientIp(c);
  // 1. Bot check (the form emails whatever address is typed in).
  if (!(await verifyTurnstile(c.env, str(b['cf-turnstile-response']), ip))) {
    return again("We couldn't complete the bot check. Please try again.", 400);
  }
  const now = new Date();
  // 2. Per IP: 10 an hour (requests have their own buckets, apart from volunteer sign-ups).
  if (await hitLimit(c.env, ward.id, 'req:ip:' + (ip ?? 'unknown'), 10, 60, now)) {
    return again('Too many requests from here right now. Please try again later.', 429);
  }
  let clean: CleanRequest;
  try {
    clean = checkRequest(cat, values as RequestInput);
  } catch (e) {
    if (e instanceof RequestInputError) return again(e.message, 400);
    throw e;
  }
  // 3. Per address: 3 a day.
  if (await hitLimit(c.env, ward.id, 'req:email:' + (await sha256Hex(clean.email)), 3, 1440, now)) {
    return again('We’ve already received several requests from this email today. Please try again tomorrow, or speak with one of the ward’s leaders.', 429);
  }
  const out = await submitRequest(c.env, { wardId: ward.id, wardName: ward.name, category: cat, input: clean, now });
  await deliver(c.env, out.messages);
  return c.html(
    renderHelpNote({
      title: 'Check your email', ok: true, prefix: ward.prefix,
      message: 'Thanks! We’ve sent a link to the address you entered. Open it and press the button to confirm, and your request will reach the right people. If it doesn’t arrive in a few minutes, check your spam folder.',
    }),
  );
});

// ---------------------------------------------------------------- leaders: requests inbox

// Request categories this person may see (managers and delegates; confidential: see serviceAccess).
async function visibleRequestCategories(c: Context<AppEnv>, lc: LeaderCtx): Promise<CategoryRow[]> {
  const out: CategoryRow[] = [];
  for (const cat of await listCategories(c.env, lc.ward.id, { kind: 'request', includeArchived: true })) {
    if (await canSeeRequestCategory(c.env, lc.ward.id, cat.id, lc.user.id)) out.push(cat);
  }
  return out;
}

serviceRoutes.get('/w/:wardId/requests', requireAuth(), async (c) => {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const cats = await visibleRequestCategories(c, lc);
  if (!cats.length) return c.text('Forbidden', 403);
  const status = c.req.query('status') ?? '';
  return c.html(
    renderInbox({
      user: lc.user, wardId: lc.ward.id, wardName: lc.ward.name, status,
      rows: await listRequests(c.env, lc.ward.id, cats.map((x) => x.id), status),
    }),
  );
});

async function requestCtx(c: Context<AppEnv>): Promise<(LeaderCtx & { req: RequestRow }) | Response> {
  const lc = await leaderCtx(c);
  if (lc instanceof Response) return lc;
  const req = await getRequest(c.env, lc.ward.id, c.req.param('requestId') ?? '');
  if (!req || req.status === 'unverified') return c.html(notFoundPage('request'), 404);
  if (!(await canSeeRequest(c.env, lc.ward.id, req.id, lc.user.id))) return c.text('Forbidden', 403);
  return { ...lc, req };
}

serviceRoutes.get('/w/:wardId/requests/:requestId', requireAuth(), async (c) => {
  const rc = await requestCtx(c);
  if (rc instanceof Response) return rc;
  const cat = (await getCategory(c.env, rc.ward.id, rc.req.category_id))!;
  // "Turn into a service opportunity": non-confidential categories with a matching opportunity
  // category the leader may create in. Nothing from the request is copied (only the date).
  let turnIntoHref: string | null = null;
  if (!cat.confidential && cat.opportunity_category_id && (await canCreateInCategory(c.env, rc.ward.id, cat.opportunity_category_id, rc.user.id))) {
    turnIntoHref = `/w/${rc.ward.id}/vol/new?category=${cat.opportunity_category_id}${rc.req.preferred_date ? `&date=${rc.req.preferred_date}` : ''}`;
  }
  return c.html(
    renderRequestPage({
      user: rc.user, wardId: rc.ward.id, req: rc.req, categoryName: cat.name, categoryIcon: cat.icon, delegates: cat.delegates,
      turnIntoHref, notice: c.req.query('ok') ? 'Saved.' : undefined, error: c.req.query('err') || undefined,
    }),
  );
});

serviceRoutes.post('/w/:wardId/requests/:requestId', requireAuth(), async (c) => {
  const rc = await requestCtx(c);
  if (rc instanceof Response) return rc;
  if (!(await canManageRequest(c.env, rc.ward.id, rc.req.id, rc.user.id))) return c.text('Forbidden', 403);
  const b = (await c.req.parseBody()) as Record<string, unknown>;
  const path = `/w/${rc.ward.id}/requests/${rc.req.id}`;
  try {
    const out = await updateRequest(
      c.env, rc.ward.id, rc.req.id,
      { status: str(b.status), privateNote: str(b.private_note), assignedUserId: str(b.assigned_user_id), closingMessage: str(b.closing_message) },
      new Date(),
    );
    await deliver(c.env, out.messages);
  } catch (e) {
    if (e instanceof RequestInputError) return back(c, path, e.message);
    throw e;
  }
  return back(c, path);
});

export default serviceRoutes;
