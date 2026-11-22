// The permission test cast (plan Task 5): one ward, EQ = Elders Quorum space.
import { env, makeWard, makeLeader, uniqueEmail } from './helpers';
import type { PostRef } from '../src/lib/volAccess';
import { newId } from '../src/lib/ids';

export interface Cast {
  wardId: string;
  spaces: Record<string, string>;
  bishop: string; exec: string; eqPres: string; eqCounselor: string; eqTeacher: string;
  rsPres: string; wmLeader: string; stranger: string;
  emails: Record<string, string>;
  post: PostRef;
}

export async function makeCast(): Promise<Cast> {
  const { wardId, spaces } = await makeWard(env);
  const other = await makeWard(env);
  const emails: Record<string, string> = {};
  const mk = async (key: string, o: { wardRole?: 'superadmin' | 'member'; spaces?: Array<[string, 'owner' | 'member']> }, ward = wardId) => {
    emails[key] = uniqueEmail(key);
    return makeLeader(env, ward, { email: emails[key]!, name: key, ...o });
  };
  const bishop = await mk('bishop', { spaces: [['bishopric', 'member']] });
  const exec = await mk('exec', { wardRole: 'superadmin' });
  const eqPres = await mk('eqPres', { spaces: [['elders-quorum', 'owner']] });
  const eqCounselor = await mk('eqCounselor', { spaces: [['elders-quorum', 'member']] });
  const eqTeacher = await mk('eqTeacher', { spaces: [['elders-quorum', 'member']] });
  const rsPres = await mk('rsPres', { spaces: [['relief-society', 'owner'], ['ward-council', 'member']] });
  const wmLeader = await mk('wmLeader', { spaces: [['ward-mission', 'owner']] });
  const stranger = await mk('stranger', { spaces: [['elders-quorum', 'owner']] }, other.wardId);
  const postId = newId('vp');
  await env.DB.prepare(
    `INSERT INTO vol_posts (id, ward_id, space_id, public_id, title, created_by_user_id) VALUES (?, ?, ?, ?, 'Move', ?)`,
  )
    .bind(postId, wardId, spaces['elders-quorum'], newId('pub'), bishop)
    .run();
  return {
    wardId, spaces, bishop, exec, eqPres, eqCounselor, eqTeacher, rsPres, wmLeader, stranger, emails,
    post: { id: postId, ward_id: wardId, space_id: spaces['elders-quorum']!, created_by_user_id: bishop },
  };
}

