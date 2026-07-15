import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv, PortalData } from './types';
import { normalizeSlug } from './lib/slug';
import { getWardByPrefix, getPublicSpace, getPortalCards, getPortalShortSlug } from './lib/db';
import { renderPortal } from './views/portal';
import { renderPortalPrint, isPrintSize, type PrintSize } from './views/portalprint';
import { notFoundPage } from './views/notfound';
import { loadUser, requireAuth, isOperator } from './lib/auth';
import { authRoutes } from './auth-routes';
import { getUserWards } from './lib/users';
import {
  PREFIX_RE,
  createWard,
  createWorkspaceRequest,
  getWardById,
  getWardByUnitNumber,
  getWorkspaceRequest,
  listPendingCreateRequests,
  listPendingJoinRequests,
  markRequest,
  prefixTaken,
  wardRole,
  addWardMembership,
  getWardSpaces,
} from './lib/wards';
import { getUserByEmail } from './lib/users';
import {
  upsertInvite,
  addInviteSpaceRole,
  listPendingInvites,
  getInviteByToken,
  acceptInvite,
  sendInviteEmail,
} from './lib/invites';
import {
  renderSignedOut,
  renderHome,
  renderRequestForm,
  renderRequestConfirmation,
  renderOperatorConsole,
  renderWardPage,
  renderInviteError,
} from './views/pages';

export const appSite = new Hono<AppEnv>();

// Populate c.get('user') for every request.
appSite.use('*', loadUser());

// --- Auth (Google OAuth + dev-login) ---
appSite.route('/auth', authRoutes);

// --- Operator guard (auth + allowlist) ---
const operatorOnly: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('user');
  if (!user) return c.redirect('/auth/login?returnTo=' + encodeURIComponent('/operator'), 302);
  if (!isOperator(c.env, user)) return c.text('Forbidden', 403);
  await next();
};

// --- Home ---
appSite.get('/', async (c) => {
  const user = c.get('user');
  if (!user) return c.html(renderSignedOut());
  const wards = await getUserWards(c.env, user.id);
  return c.html(renderHome(user, wards, isOperator(c.env, user)));
});

// --- Request a workspace ---
appSite.get('/request-workspace', requireAuth(), (c) => c.html(renderRequestForm(c.get('user')!)));

appSite.post('/request-workspace', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const body = await c.req.parseBody();
  const wardName = String(body.ward_name ?? '').trim();
  const unitNumber = String(body.unit_number ?? '').trim();
  const calling = String(body.calling ?? '').trim() || null;
  if (!wardName || !unitNumber) {
    return c.html(renderRequestForm(user, 'Ward name and unit number are required.'));
  }
  const existing = await getWardByUnitNumber(c.env, unitNumber);
  const kind = existing ? 'join' : 'create';
  await createWorkspaceRequest(c.env, {
    kind,
    wardName: existing ? null : wardName,
    unitNumber,
    targetWardId: existing ? existing.id : null,
    email: user.email,
    name: user.name,
    calling,
  });
  return c.html(renderRequestConfirmation(user, kind));
});

// --- Operator console ---
appSite.get('/operator', operatorOnly, async (c) => {
  const reqs = await listPendingCreateRequests(c.env);
  return c.html(renderOperatorConsole(c.get('user')!, reqs));
});

appSite.post('/operator/requests/:id/approve', operatorOnly, async (c) => {
  const user = c.get('user')!;
  const req = await getWorkspaceRequest(c.env, c.req.param('id'));
  const reload = async (msg: string) =>
    c.html(renderOperatorConsole(user, await listPendingCreateRequests(c.env), msg));
  if (!req || req.status !== 'pending' || req.kind !== 'create') return reload('Request not found or already handled.');

  const prefix = String((await c.req.parseBody()).prefix ?? '').trim().toLowerCase();
  if (!PREFIX_RE.test(prefix)) return reload('Prefix must be 2–12 lowercase letters/digits.');
  if (await prefixTaken(c.env, prefix)) return reload(`Prefix "${prefix}" is already taken.`);
  if (await getWardByUnitNumber(c.env, req.unit_number)) return reload('A ward with that unit number already exists.');

  const requester = await getUserByEmail(c.env, req.requester_email);
  if (!requester) return reload('Requester has no account yet — ask them to sign in first.');

  const wardId = await createWard(c.env, {
    name: req.ward_name ?? 'Ward',
    unitNumber: req.unit_number,
    prefix,
    creatorUserId: requester.id,
  });
  await markRequest(c.env, req.id, 'approved', user.id, wardId);
  return c.redirect('/operator', 302);
});

appSite.post('/operator/requests/:id/deny', operatorOnly, async (c) => {
  const req = await getWorkspaceRequest(c.env, c.req.param('id'));
  if (req && req.status === 'pending') await markRequest(c.env, req.id, 'denied', c.get('user')!.id);
  return c.redirect('/operator', 302);
});

// --- Ward page (members) ---
appSite.get('/w/:wardId', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const ward = await getWardById(c.env, c.req.param('wardId'));
  if (!ward) return c.html(notFoundPage(c.req.param('wardId')), 404);
  const role = await wardRole(c.env, ward.id, user.id);
  if (!role) return c.text('Forbidden', 403);
  const isSuper = role === 'superadmin';
  const joins = isSuper ? await listPendingJoinRequests(c.env, ward.id) : [];
  const spaces = isSuper ? await getWardSpaces(c.env, ward.id) : [];
  const invites = isSuper ? await listPendingInvites(c.env, ward.id) : [];
  const notice = c.req.query('joined') ? `Welcome to ${ward.name}!` : undefined;
  return c.html(
    renderWardPage({ user, ward, role, joins, spaces, invites, appUrl: c.env.APP_URL, notice }),
  );
});

appSite.post('/w/:wardId/invite', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const ward = await getWardById(c.env, c.req.param('wardId'));
  if (!ward) return c.text('Not found', 404);
  if ((await wardRole(c.env, ward.id, user.id)) !== 'superadmin') return c.text('Forbidden', 403);

  const body = await c.req.parseBody();
  const email = String(body.email ?? '').trim().toLowerCase();
  const calling = String(body.calling ?? '').trim() || null;
  const wardRoleSel: 'superadmin' | 'member' = body.ward_role === 'superadmin' ? 'superadmin' : 'member';
  const spaceRole: 'owner' | 'member' = body.space_role === 'owner' ? 'owner' : 'member';
  const spaceId = String(body.space_id ?? '');
  if (!email || !spaceId) return c.redirect(`/w/${ward.id}`, 302);

  const spaces = await getWardSpaces(c.env, ward.id);
  if (!spaces.some((s) => s.id === spaceId)) return c.text('Invalid space', 400);

  const { id: inviteId, token } = await upsertInvite(c.env, {
    wardId: ward.id,
    email,
    wardRole: wardRoleSel,
    calling,
    invitedBy: user.id,
  });
  await addInviteSpaceRole(c.env, inviteId, spaceId, spaceRole);
  await sendInviteEmail(c.env, {
    to: email,
    wardName: ward.name,
    acceptUrl: `${c.env.APP_URL}/invite/${token}`,
  });
  return c.redirect(`/w/${ward.id}`, 302);
});

// Invite acceptance — materializes ward + space memberships once the invited email signs in.
appSite.get('/invite/:token', async (c) => {
  const token = c.req.param('token');
  const invite = await getInviteByToken(c.env, token);
  const user = c.get('user');
  if (!invite) {
    return c.html(
      renderInviteError('This invitation is invalid or has expired.', { userEmail: user?.email ?? null }),
      404,
    );
  }
  if (!user) {
    return c.redirect(`/auth/login?returnTo=${encodeURIComponent('/invite/' + token)}`, 302);
  }
  if (user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return c.html(
      renderInviteError(
        `This invitation is for ${invite.email}, but you're signed in as ${user.email}.`,
        { userEmail: user.email, showSignOut: true },
      ),
      403,
    );
  }
  await acceptInvite(c.env, invite, user.id);
  return c.redirect(`/w/${invite.ward_id}?joined=1`, 302);
});

appSite.post('/w/:wardId/joins/:reqId/approve', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const ward = await getWardById(c.env, c.req.param('wardId'));
  if (!ward) return c.text('Not found', 404);
  if ((await wardRole(c.env, ward.id, user.id)) !== 'superadmin') return c.text('Forbidden', 403);
  const req = await getWorkspaceRequest(c.env, c.req.param('reqId'));
  if (req && req.status === 'pending' && req.kind === 'join' && req.target_ward_id === ward.id) {
    const requester = await getUserByEmail(c.env, req.requester_email);
    if (requester) await addWardMembership(c.env, ward.id, requester.id, 'member');
    await markRequest(c.env, req.id, 'approved', user.id, ward.id);
  }
  return c.redirect(`/w/${ward.id}`, 302);
});

// --- Public portal (no auth) ---
appSite.get('/p/:prefix', async (c) => {
  const prefix = normalizeSlug(c.req.param('prefix'));
  const data = await loadPortal(c, prefix);
  if (!data) return c.html(notFoundPage(prefix), 404);
  c.header('X-Robots-Tag', 'noindex');
  return c.html(renderPortal(data));
});

appSite.get('/p/:prefix/print', async (c) => {
  const prefix = normalizeSlug(c.req.param('prefix'));
  const raw = (c.req.query('size') ?? 'letter').toLowerCase();
  const size: PrintSize = isPrintSize(raw) ? raw : 'letter';
  const data = await loadPortal(c, prefix);
  if (!data) return c.html(notFoundPage(prefix), 404);
  c.header('X-Robots-Tag', 'noindex');
  return c.html(renderPortalPrint(data, size));
});

async function loadPortal(
  c: { env: AppEnv['Bindings'] },
  prefix: string,
): Promise<PortalData | null> {
  const ward = await getWardByPrefix(c.env, prefix);
  if (!ward) return null;
  const space = await getPublicSpace(c.env, ward.id);
  if (!space || space.portal_published === 0) return null;
  const [cards, portalSlug] = await Promise.all([
    getPortalCards(c.env, space.id),
    getPortalShortSlug(c.env, space.id),
  ]);
  return { wardName: ward.name, prefix: ward.prefix, portalTitle: space.portal_title, cards, portalSlug };
}

export default appSite;
