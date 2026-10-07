import type { Env } from '../types';

// A portal's own address: the public portal lives at /p/<prefix>; every other portal is
// the authed space page.
export function portalUrl(
  appUrl: string,
  ward: { id: string; prefix: string },
  space: { id: string; kind: string },
): string {
  return space.kind === 'public'
    ? `${appUrl}/p/${ward.prefix}`
    : `${appUrl}/w/${ward.id}/space/${space.id}`;
}

// Set (or clear, with null) the short link a leader pasted for a portal — e.g. a zippa.run
// link they pointed at portalUrl(). Callers normalize + validate first.
export async function setSpaceShareUrl(env: Env, spaceId: string, shareUrl: string | null): Promise<void> {
  await env.DB.prepare(`UPDATE spaces SET share_url = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(shareUrl, spaceId)
    .run();
}
