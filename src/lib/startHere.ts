import type { Env } from '../types';
import { canViewImplementation } from './visibility';

// The Executive Secretary's Start here track (spec 2026-11-23-execsec-start-here-design.md §4-5):
// published solutions with a setup_step, in order, each with this ward's ward-level
// implementation status as the viewer may see it.

export type StepStatus = 'not_started' | 'in_progress' | 'implemented';

export interface StartHereRow {
  step: number;
  solutionId: string;
  title: string;
  summary: string | null;
  status: StepStatus | null; // null = hidden from this viewer
  ownerName: string | null; // null when hidden or no owner
  isNext: boolean;
}

export interface StartHere {
  rows: StartHereRow[];
  done: number;
  total: number;
  next: StartHereRow | null;
}

interface Joined {
  solution_id: string;
  title: string;
  summary: string | null;
  setup_step: number;
  impl_id: string | null;
  impl_ward_id: string | null;
  impl_space_id: string | null;
  impl_visibility: string | null;
  impl_status: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
}

// Two statements (one batch) however many steps there are: the steps joined to this ward's
// ward-level implementations and their owners' names, and the viewer's ward role. Visibility
// is canViewImplementation's rules: a superadmin sees everything (break-glass) and any member
// sees a 'ward' entry, both decided from the role already read; only a 'restricted' entry goes
// to canViewImplementation itself (owner, implementing space, grants).
export async function loadStartHere(env: Env, wardId: string, userId: string): Promise<StartHere> {
  const [steps, role] = await env.DB.batch([
    env.DB.prepare(
      `SELECT s.id AS solution_id, s.title, s.summary, s.setup_step,
              i.id AS impl_id, i.ward_id AS impl_ward_id, i.space_id AS impl_space_id,
              i.visibility AS impl_visibility, i.status AS impl_status, i.owner_user_id,
              u.name AS owner_name
         FROM solutions s
         LEFT JOIN implementations i
           ON i.solution_id = s.id AND i.ward_id = ? AND i.space_id IS NULL
         LEFT JOIN users u ON u.id = i.owner_user_id
        WHERE s.status = 'published' AND s.setup_step IS NOT NULL
        ORDER BY s.setup_step ASC, s.position ASC, s.title ASC, s.id ASC`,
    ).bind(wardId),
    env.DB.prepare(`SELECT role FROM ward_memberships WHERE ward_id = ? AND user_id = ?`).bind(wardId, userId),
  ]);
  const wardRole = ((role?.results ?? [])[0] as { role?: string } | undefined)?.role ?? null;

  const rows: StartHereRow[] = [];
  for (const r of (steps?.results ?? []) as Joined[]) {
    let visible = true;
    if (r.impl_id) {
      if (wardRole === 'superadmin') visible = true;
      else if (r.impl_visibility === 'ward') visible = wardRole !== null;
      else
        visible = await canViewImplementation(env, userId, {
          id: r.impl_id,
          ward_id: r.impl_ward_id ?? wardId,
          space_id: r.impl_space_id,
          visibility: r.impl_visibility ?? 'restricted',
          owner_user_id: r.owner_user_id,
        });
    }
    const status: StepStatus | null = !visible
      ? null
      : r.impl_status === 'implemented' || r.impl_status === 'in_progress'
        ? r.impl_status
        : 'not_started';
    rows.push({
      step: r.setup_step,
      solutionId: r.solution_id,
      title: r.title,
      summary: r.summary,
      status,
      ownerName: visible ? r.owner_name ?? null : null,
      isNext: false,
    });
  }
  const next = rows.find((r) => r.status !== null && r.status !== 'implemented') ?? null;
  if (next) next.isNext = true;
  return {
    rows,
    done: rows.filter((r) => r.status === 'implemented').length,
    total: rows.length,
    next,
  };
}
