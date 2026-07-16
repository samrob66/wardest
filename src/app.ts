import { Hono } from 'hono';
import type { Context, MiddlewareHandler } from 'hono';
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
  spaceRole,
  listWardMembers,
  setWardMemberRole,
  getSpaceById,
} from './lib/wards';
import {
  createSolution,
  updateSolution,
  getSolution,
  listAllSolutions,
  listPublishedSolutions,
  submitSolution,
  setSolutionStatus,
  type SolutionInput,
} from './lib/solutions';
import {
  upsertImplementation,
  getWardImplementation,
  getSpaceImplementation,
  wardImplementationMap,
  setImplementationVisibility,
  listImplGrants,
  setImplGrants,
  type ImplStatus,
} from './lib/implementations';
import { canViewImplementation, canEditImplementation } from './lib/visibility';
import {
  createUrlDeliverable,
  listDeliverables,
  listPublications,
  publishToSpace,
  unpublishFromSpace,
  getDeliverable,
} from './lib/deliverables';
import {
  renderOperatorSolutions,
  renderSolutionForm,
  renderCatalog,
  renderSolutionDetail,
  renderSuggestForm,
} from './views/catalog';
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
  const members = isSuper ? await listWardMembers(c.env, ward.id) : [];
  const notice = c.req.query('joined')
    ? `Welcome to ${ward.name}!`
    : c.req.query('ok')
      ? 'Saved.'
      : undefined;
  const error = c.req.query('err') || undefined;
  return c.html(
    renderWardPage({ user, ward, role, joins, spaces, invites, members, appUrl: c.env.APP_URL, notice, error }),
  );
});

appSite.post('/w/:wardId/members/:userId/role', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const ward = await getWardById(c.env, c.req.param('wardId'));
  if (!ward) return c.text('Not found', 404);
  if ((await wardRole(c.env, ward.id, user.id)) !== 'superadmin') return c.text('Forbidden', 403);
  const body = await c.req.parseBody();
  const newRole: 'superadmin' | 'member' = body.role === 'superadmin' ? 'superadmin' : 'member';
  const err = await setWardMemberRole(c.env, ward.id, c.req.param('userId'), newRole);
  return c.redirect(`/w/${ward.id}${err ? `?err=${encodeURIComponent(err)}` : '?ok=1'}`, 302);
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

// ===== Phase 2: solutions catalog + implementation tracker =====

// Default publish target for a deliverable, by the solution's category (a UI pre-selection):
// Bishopric group (bishopric/exec sec/ward clerk) -> Bishopric portal; org solutions -> their
// implementing space; Activities Committee / Ward Mission -> their own space.
function defaultPublishTargetId(
  category: string,
  spaces: { id: string; name: string; kind: string }[],
  implSpaceId: string | null,
): string | null {
  if (category === 'org_presidencies') return implSpaceId;
  if (category === 'bishopric' || category === 'exec_secretary' || category === 'ward_clerk') {
    return spaces.find((s) => s.kind === 'bishopric')?.id ?? null;
  }
  if (category === 'activities_committee') return spaces.find((s) => s.name === 'Activities Committee')?.id ?? null;
  if (category === 'ward_mission') return spaces.find((s) => s.name === 'Ward Mission')?.id ?? null;
  return null;
}

function parseSolution(body: Record<string, string | File>): SolutionInput {
  return {
    category: String(body.category ?? 'exec_secretary'),
    title: String(body.title ?? '').trim(),
    summary: String(body.summary ?? '').trim() || null,
    body: String(body.body ?? '').trim() || null,
    videoUrl: String(body.video_url ?? '').trim() || null,
    templateType: String(body.template_type ?? '').trim() || null,
    templateValue: String(body.template_value ?? '').trim() || null,
    implementationScope: body.implementation_scope === 'per_space' ? 'per_space' : 'ward_singleton',
    status: body.status === 'published' ? 'published' : 'draft',
  };
}

// Operator authoring
appSite.get('/operator/solutions', operatorOnly, async (c) =>
  c.html(renderOperatorSolutions(c.get('user')!, await listAllSolutions(c.env))),
);
appSite.get('/operator/solutions/new', operatorOnly, (c) => c.html(renderSolutionForm(c.get('user')!, {})));
appSite.post('/operator/solutions', operatorOnly, async (c) => {
  const input = parseSolution(await c.req.parseBody());
  if (!input.title) return c.html(renderSolutionForm(c.get('user')!, { error: 'Title is required.' }));
  await createSolution(c.env, input);
  return c.redirect('/operator/solutions', 302);
});
appSite.get('/operator/solutions/:id', operatorOnly, async (c) => {
  const s = await getSolution(c.env, c.req.param('id'));
  if (!s) return c.html(notFoundPage(c.req.param('id')), 404);
  return c.html(renderSolutionForm(c.get('user')!, { solution: s }));
});
appSite.post('/operator/solutions/:id', operatorOnly, async (c) => {
  const s = await getSolution(c.env, c.req.param('id'));
  if (!s) return c.text('Not found', 404);
  const input = parseSolution(await c.req.parseBody());
  if (!input.title) return c.html(renderSolutionForm(c.get('user')!, { solution: s, error: 'Title is required.' }));
  await updateSolution(c.env, s.id, input);
  return c.redirect('/operator/solutions', 302);
});

appSite.post('/operator/solutions/:id/approve', operatorOnly, async (c) => {
  await setSolutionStatus(c.env, c.req.param('id'), 'published');
  return c.redirect('/operator/solutions', 302);
});
appSite.post('/operator/solutions/:id/reject', operatorOnly, async (c) => {
  await setSolutionStatus(c.env, c.req.param('id'), 'rejected');
  return c.redirect('/operator/solutions', 302);
});

// Load ward + solution context for tracker routes (or a Response on failure).
async function loadSolutionCtx(c: Context<AppEnv>) {
  const user = c.get('user')!;
  const wardId = c.req.param('wardId') ?? '';
  const ward = await getWardById(c.env, wardId);
  if (!ward) return c.html(notFoundPage(wardId), 404);
  const role = await wardRole(c.env, ward.id, user.id);
  if (!role) return c.text('Forbidden', 403);
  const solution = await getSolution(c.env, c.req.param('solutionId') ?? '');
  if (!solution || solution.status !== 'published') return c.html(notFoundPage('solution'), 404);
  const spaceId = c.req.query('space') ?? null;
  return { user, ward, role, solution, spaceId };
}

appSite.get('/w/:wardId/catalog', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const ward = await getWardById(c.env, c.req.param('wardId'));
  if (!ward) return c.html(notFoundPage(c.req.param('wardId')), 404);
  if (!(await wardRole(c.env, ward.id, user.id))) return c.text('Forbidden', 403);
  const solutions = await listPublishedSolutions(c.env);
  const implMap = await wardImplementationMap(c.env, ward.id);
  // Hide restricted ward-level entries the viewer can't see (superadmin still sees all).
  for (const [sid, impl] of [...implMap]) {
    if (!(await canViewImplementation(c.env, user.id, impl))) implMap.delete(sid);
  }
  return c.html(renderCatalog(user, ward, solutions, implMap));
});

appSite.get('/w/:wardId/suggest', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const ward = await getWardById(c.env, c.req.param('wardId'));
  if (!ward) return c.html(notFoundPage(c.req.param('wardId')), 404);
  if (!(await wardRole(c.env, ward.id, user.id))) return c.text('Forbidden', 403);
  return c.html(renderSuggestForm(user, ward));
});

appSite.post('/w/:wardId/suggest', requireAuth(), async (c) => {
  const user = c.get('user')!;
  const ward = await getWardById(c.env, c.req.param('wardId'));
  if (!ward) return c.text('Not found', 404);
  if (!(await wardRole(c.env, ward.id, user.id))) return c.text('Forbidden', 403);
  const body = await c.req.parseBody();
  const title = String(body.title ?? '').trim();
  const category = String(body.category ?? 'exec_secretary');
  if (!title) return c.html(renderSuggestForm(user, ward, 'Title is required.'));
  await submitSolution(c.env, {
    category,
    title,
    summary: String(body.summary ?? '').trim() || null,
    body: String(body.body ?? '').trim() || null,
    userId: user.id,
    wardId: ward.id,
  });
  return c.redirect(`/w/${ward.id}/catalog`, 302);
});

appSite.get('/w/:wardId/s/:solutionId', requireAuth(), async (c) => {
  const ctx = await loadSolutionCtx(c);
  if (ctx instanceof Response) return ctx;
  const { user, ward, role, solution, spaceId } = ctx;
  const spaces = await getWardSpaces(c.env, ward.id);
  const perSpace = solution.implementation_scope === 'per_space';
  let impl = null;
  let canView = true;
  let canEdit = true;
  if (!perSpace) {
    impl = await getWardImplementation(c.env, ward.id, solution.id);
    if (impl) {
      canView = await canViewImplementation(c.env, user.id, impl);
      canEdit = await canEditImplementation(c.env, user.id, impl);
    }
  } else if (spaceId) {
    const sr = await spaceRole(c.env, spaceId, user.id);
    if (!sr && role !== 'superadmin')
      return c.text("You're not a member of that organization.", 403);
    impl = await getSpaceImplementation(c.env, solution.id, spaceId);
    canEdit = impl ? await canEditImplementation(c.env, user.id, impl) : true;
  }
  const deliverables = impl && canView ? await listDeliverables(c.env, impl.id) : [];
  const publications = impl && canView ? await listPublications(c.env, impl.id) : [];
  const grants = impl && canEdit ? await listImplGrants(c.env, impl.id) : [];

  // Spaces this user may publish to: Public requires superadmin; others require space ownership.
  const publishTargets: typeof spaces = [];
  if (canEdit) {
    const isSuper = role === 'superadmin';
    for (const s of spaces) {
      if (s.kind === 'public') {
        if (isSuper) publishTargets.push(s);
      } else if (isSuper || (await spaceRole(c.env, s.id, user.id)) === 'owner') {
        publishTargets.push(s);
      }
    }
  }
  const defaultTargetId = defaultPublishTargetId(solution.category, spaces, impl?.space_id ?? null);
  const notice = c.req.query('ok') ? 'Saved.' : undefined;
  return c.html(
    renderSolutionDetail({
      user, ward, solution, spaces, spaceId, impl, deliverables, publications,
      publishTargets, defaultTargetId, canView, canEdit, grants, notice,
    }),
  );
});

appSite.post('/w/:wardId/s/:solutionId/track', requireAuth(), async (c) => {
  const ctx = await loadSolutionCtx(c);
  if (ctx instanceof Response) return ctx;
  const { user, ward, role, solution, spaceId } = ctx;
  const perSpace = solution.implementation_scope === 'per_space';
  if (perSpace) {
    const sr = spaceId ? await spaceRole(c.env, spaceId, user.id) : null;
    if (!spaceId || (!sr && role !== 'superadmin')) return c.text('Forbidden', 403);
  }
  const body = await c.req.parseBody();
  const raw = String(body.status ?? 'not_started');
  const status: ImplStatus =
    raw === 'in_progress' ? 'in_progress' : raw === 'implemented' ? 'implemented' : 'not_started';
  const notes = String(body.notes ?? '').trim() || null;
  await upsertImplementation(c.env, {
    wardId: ward.id,
    solutionId: solution.id,
    spaceId: perSpace ? spaceId : null,
    status,
    ownerUserId: user.id,
    notes,
  });
  const qs = perSpace && spaceId ? `?space=${encodeURIComponent(spaceId)}&ok=1` : '?ok=1';
  return c.redirect(`/w/${ward.id}/s/${solution.id}${qs}`, 302);
});

appSite.post('/w/:wardId/s/:solutionId/deliverable', requireAuth(), async (c) => {
  const ctx = await loadSolutionCtx(c);
  if (ctx instanceof Response) return ctx;
  const { user, ward, role, solution, spaceId } = ctx;
  const perSpace = solution.implementation_scope === 'per_space';
  let impl;
  if (perSpace) {
    const sr = spaceId ? await spaceRole(c.env, spaceId, user.id) : null;
    if (!spaceId || (!sr && role !== 'superadmin')) return c.text('Forbidden', 403);
    impl = await getSpaceImplementation(c.env, solution.id, spaceId);
  } else {
    impl = await getWardImplementation(c.env, ward.id, solution.id);
  }
  if (!impl) return c.text('Set a status first.', 400);
  const body = await c.req.parseBody();
  const title = String(body.title ?? '').trim();
  const url = String(body.url ?? '').trim();
  if (title && url) {
    await createUrlDeliverable(c.env, {
      wardId: ward.id,
      implementationId: impl.id,
      prefix: ward.prefix,
      title,
      url,
      createdBy: user.id,
    });
  }
  const qs = perSpace && spaceId ? `?space=${encodeURIComponent(spaceId)}&ok=1` : '?ok=1';
  return c.redirect(`/w/${ward.id}/s/${solution.id}${qs}`, 302);
});

appSite.post('/w/:wardId/s/:solutionId/visibility', requireAuth(), async (c) => {
  const ctx = await loadSolutionCtx(c);
  if (ctx instanceof Response) return ctx;
  const { user, ward, solution, spaceId } = ctx;
  const perSpace = solution.implementation_scope === 'per_space';
  const impl = perSpace
    ? spaceId
      ? await getSpaceImplementation(c.env, solution.id, spaceId)
      : null
    : await getWardImplementation(c.env, ward.id, solution.id);
  if (!impl) return c.text('No implementation to configure.', 400);
  if (!(await canEditImplementation(c.env, user.id, impl))) return c.text('Forbidden', 403);

  const body = await c.req.parseBody();
  const vis: 'ward' | 'restricted' = body.visibility === 'restricted' ? 'restricted' : 'ward';
  const raw = body['grant[]'];
  const grantIds = (Array.isArray(raw) ? raw : raw != null ? [raw] : []).map(String);
  const wardSpaces = await getWardSpaces(c.env, ward.id);
  const validIds = grantIds.filter((id) => wardSpaces.some((s) => s.id === id));

  await setImplementationVisibility(c.env, impl.id, vis);
  await setImplGrants(c.env, impl.id, ward.id, vis === 'restricted' ? validIds : []);
  const qs = perSpace && spaceId ? `?space=${encodeURIComponent(spaceId)}&ok=1` : '?ok=1';
  return c.redirect(`/w/${ward.id}/s/${solution.id}${qs}`, 302);
});

// Resolve + authorize a publish/unpublish request. Publishing to Public requires superadmin;
// to any other space requires that space's ownership (or superadmin). Returns a Response on failure.
async function resolvePublishCtx(c: Context<AppEnv>) {
  const user = c.get('user')!;
  const ward = await getWardById(c.env, c.req.param('wardId') ?? '');
  if (!ward) return c.text('Not found', 404);
  const role = await wardRole(c.env, ward.id, user.id);
  if (!role) return c.text('Forbidden', 403);
  const deliverable = await getDeliverable(c.env, c.req.param('deliverableId') ?? '');
  if (!deliverable || deliverable.ward_id !== ward.id) return c.text('Not found', 404);
  const spaceId = String((await c.req.parseBody()).space_id ?? '');
  const space = await getSpaceById(c.env, spaceId);
  if (!space || space.ward_id !== ward.id) return c.text('Invalid space', 400);
  const isSuper = role === 'superadmin';
  const allowed =
    space.kind === 'public' ? isSuper : isSuper || (await spaceRole(c.env, space.id, user.id)) === 'owner';
  if (!allowed) return c.text('Forbidden', 403);
  return { ward, deliverable, space };
}

appSite.post('/w/:wardId/deliverable/:deliverableId/publish', requireAuth(), async (c) => {
  const r = await resolvePublishCtx(c);
  if (r instanceof Response) return r;
  await publishToSpace(c.env, r.ward.id, r.deliverable.id, r.space.id);
  return c.redirect(c.req.header('referer') ?? `/w/${r.ward.id}/catalog`, 302);
});

appSite.post('/w/:wardId/deliverable/:deliverableId/unpublish', requireAuth(), async (c) => {
  const r = await resolvePublishCtx(c);
  if (r instanceof Response) return r;
  await unpublishFromSpace(c.env, r.deliverable.id, r.space.id);
  return c.redirect(c.req.header('referer') ?? `/w/${r.ward.id}/catalog`, 302);
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
