// The service permission cast (plan Task 3): one ward with its default categories, the people
// who hold each role, and one request per request category. Invented people only.
import { env, makeWard, makeLeader, uniqueEmail } from './helpers';
import { newId } from '../src/lib/ids';
import { listCategories, type CategoryRow } from '../src/lib/serviceCategories';

export interface ServiceCast {
  wardId: string;
  prefix: string;
  spaces: Record<string, string>;
  cat: Record<string, CategoryRow>;
  bishop: string; counselor: string; exec: string; rsPres: string; rsSecretary: string; eqPres: string;
  wcMember: string; mealDelegate: string; christmasDelegate: string; plainMember: string; stranger: string;
  emails: Record<string, string>;
  requests: Record<string, string>; // category slug -> request id
}

export async function addDelegate(wardId: string, categoryId: string, userId: string, by?: string): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO service_delegates (id, ward_id, category_id, user_id, added_by_user_id) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(newId('sdel'), wardId, categoryId, userId, by ?? null)
    .run();
}

export async function insertRequest(
  wardId: string,
  categoryId: string,
  o: { status?: string; name?: string; email?: string; note?: string | null; closedAt?: string | null; createdAt?: string } = {},
): Promise<string> {
  const id = newId('sreq');
  await env.DB.prepare(
    `INSERT INTO service_requests (id, ward_id, category_id, name, email, note, status, closed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id, wardId, categoryId, o.name ?? 'Rhea Requester', (o.email ?? uniqueEmail('req')).toLowerCase(), o.note ?? null,
      o.status ?? 'new', o.closedAt ?? null, o.createdAt ?? new Date().toISOString(),
    )
    .run();
  return id;
}

export async function makeServiceCast(): Promise<ServiceCast> {
  const w = await makeWard(env);
  const other = await makeWard(env);
  const emails: Record<string, string> = {};
  const mk = async (
    key: string,
    o: { wardRole?: 'superadmin' | 'member'; spaces?: Array<[string, 'owner' | 'member']> } = {},
    ward = w.wardId,
  ) => {
    emails[key] = uniqueEmail(key).toLowerCase();
    return makeLeader(env, ward, { email: emails[key]!, name: key, ...o });
  };
  const bishop = await mk('bishop', { spaces: [['bishopric', 'owner']] });
  const counselor = await mk('counselor', { spaces: [['bishopric', 'member'], ['ward-council', 'member']] });
  const exec = await mk('exec', { wardRole: 'superadmin' });
  const rsPres = await mk('rsPres', { spaces: [['relief-society', 'owner'], ['ward-council', 'member']] });
  const rsSecretary = await mk('rsSecretary', { spaces: [['relief-society', 'member']] });
  const eqPres = await mk('eqPres', { spaces: [['elders-quorum', 'owner'], ['ward-council', 'member']] });
  const wcMember = await mk('wcMember', { spaces: [['ward-council', 'member']] });
  const mealDelegate = await mk('mealDelegate');
  const christmasDelegate = await mk('christmasDelegate');
  const plainMember = await mk('plainMember');
  const stranger = await mk('stranger', { wardRole: 'superadmin', spaces: [['relief-society', 'owner'], ['bishopric', 'owner']] }, other.wardId);
  const all = await listCategories(env, w.wardId, { includeArchived: true });
  const cat = Object.fromEntries(all.map((c) => [c.slug, c]));
  await addDelegate(w.wardId, cat['req-christmas']!.id, christmasDelegate, bishop);
  const requests: Record<string, string> = {};
  for (const slug of ['req-moving', 'req-christmas', 'req-other']) requests[slug] = await insertRequest(w.wardId, cat[slug]!.id);
  return {
    wardId: w.wardId, prefix: w.prefix, spaces: w.spaces, cat, bishop, counselor, exec, rsPres, rsSecretary, eqPres, wcMember,
    mealDelegate, christmasDelegate, plainMember, stranger, emails, requests,
  };
}

// A post row straight into the DB (no messages), in a category and space.
export async function insertPost(
  wardId: string,
  o: { spaceId: string; categoryId: string | null; createdBy?: string | null; title?: string; audiences?: string },
): Promise<string> {
  const id = newId('vp');
  await env.DB.prepare(
    `INSERT INTO vol_posts (id, ward_id, space_id, category_id, audiences, public_id, title, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, wardId, o.spaceId, o.categoryId, o.audiences ?? 'brothers,sisters', newId('pub'), o.title ?? 'Post', o.createdBy ?? null)
    .run();
  return id;
}
