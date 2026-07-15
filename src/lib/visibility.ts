import type { Env } from '../types';

// Canonical visibility rules (SCHEMA.md §"App-layer rules"). Implement ONCE; route every
// content read through these. Fail closed. Superadmins manage structure but do NOT bypass
// content visibility. No transitive chaining (shares don't extend grants; shares of shares
// grant nothing). Used by Phase 2/3 content reads.

// Can `userId` view space `spaceId`'s content?
//   member of the space, OR the space is public, OR member of any space it's shared WITH.
export async function canViewSpaceContent(env: Env, userId: string, spaceId: string): Promise<boolean> {
  const row = await env.DB.prepare(
    `SELECT 1 AS ok FROM spaces WHERE id = ? AND kind = 'public'
     UNION ALL
     SELECT 1 FROM space_memberships WHERE space_id = ? AND user_id = ?
     UNION ALL
     SELECT 1 FROM space_shares ss
       JOIN space_memberships sm ON sm.space_id = ss.shared_with_space_id
      WHERE ss.space_id = ? AND sm.user_id = ?
     LIMIT 1`,
  )
    .bind(spaceId, spaceId, userId, spaceId, userId)
    .first<{ ok: number }>();
  return row != null;
}

export interface ImplementationVisibility {
  id: string;
  ward_id: string;
  space_id: string | null;
  visibility: string; // 'ward' | 'restricted'
  owner_user_id: string | null;
}

// Can `userId` view implementation `impl`?
//   'ward' -> any member of the ward.
//   'restricted' -> the owner, OR (implementing space visible via canViewSpaceContent),
//                   OR direct member of any space granted in implementation_visibility.
export async function canViewImplementation(
  env: Env,
  userId: string,
  impl: ImplementationVisibility,
): Promise<boolean> {
  if (impl.visibility === 'ward') {
    const m = await env.DB.prepare(
      `SELECT 1 AS ok FROM ward_memberships WHERE ward_id = ? AND user_id = ? LIMIT 1`,
    )
      .bind(impl.ward_id, userId)
      .first();
    return m != null;
  }
  // restricted
  if (impl.owner_user_id && impl.owner_user_id === userId) return true;
  if (impl.space_id && (await canViewSpaceContent(env, userId, impl.space_id))) return true;
  const granted = await env.DB.prepare(
    `SELECT 1 AS ok FROM implementation_visibility iv
       JOIN space_memberships sm ON sm.space_id = iv.space_id
      WHERE iv.implementation_id = ? AND sm.user_id = ? LIMIT 1`,
  )
    .bind(impl.id, userId)
    .first();
  return granted != null;
}
