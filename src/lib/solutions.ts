import type { Env } from '../types';
import { newId } from './ids';

export const CATEGORIES: { key: string; label: string }[] = [
  { key: 'exec_secretary', label: 'Executive Secretary' },
  { key: 'ward_clerk', label: 'Ward Clerk' },
  { key: 'bishopric', label: 'Bishopric' },
  { key: 'org_presidencies', label: 'Org Presidencies' },
  { key: 'activities_committee', label: 'Activities Committee' },
  { key: 'ward_mission', label: 'Ward Mission' },
];

export function categoryLabel(key: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label ?? key;
}

export const TEMPLATE_TYPES = ['google_copy', 'file', 'ai_prompt', 'link', 'other'] as const;

export interface Solution {
  id: string;
  category: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string | null;
  video_url: string | null;
  template_type: string | null;
  template_value: string | null;
  implementation_scope: string;
  status: string;
  position: number;
  setup_step: number | null; // Start here order (1-99); null = not in the track
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'solution'
  );
}

async function uniqueSlug(env: Env, base: string): Promise<string> {
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await env.DB.prepare(`SELECT 1 AS x FROM solutions WHERE slug = ?`).bind(slug).first();
    if (!hit) return slug;
    slug = `${base}-${i}`;
  }
}

export interface SolutionInput {
  category: string;
  title: string;
  summary: string | null;
  body: string | null;
  videoUrl: string | null;
  templateType: string | null;
  templateValue: string | null;
  implementationScope: 'ward_singleton' | 'per_space';
  status: 'draft' | 'published';
  setupStep: number | null;
}

export const SETUP_STEP_ERROR = 'Setup step must be a whole number from 1 to 99, or blank.';

// The operator form's Setup step field: blank -> null (not in the track), a whole number 1-99
// -> that number, anything else -> an error (nothing is saved).
export function parseSetupStep(raw: unknown): { ok: true; value: number | null } | { ok: false; error: string } {
  const t = typeof raw === 'string' ? raw.trim() : raw == null ? '' : null;
  if (t === '') return { ok: true, value: null };
  if (t === null || !/^[0-9]{1,2}$/.test(t)) return { ok: false, error: SETUP_STEP_ERROR };
  const n = Number(t);
  if (n < 1 || n > 99) return { ok: false, error: SETUP_STEP_ERROR };
  return { ok: true, value: n };
}

export async function createSolution(env: Env, input: SolutionInput): Promise<string> {
  const id = newId('sol');
  const slug = await uniqueSlug(env, slugify(input.title));
  await env.DB.prepare(
    `INSERT INTO solutions
       (id, category, title, slug, summary, body, video_url, template_type, template_value,
        implementation_scope, status, setup_step)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.category,
      input.title,
      slug,
      input.summary,
      input.body,
      input.videoUrl,
      input.templateType,
      input.templateValue,
      input.implementationScope,
      input.status,
      input.setupStep,
    )
    .run();
  return id;
}

export async function updateSolution(env: Env, id: string, input: SolutionInput): Promise<void> {
  await env.DB.prepare(
    `UPDATE solutions SET category = ?, title = ?, summary = ?, body = ?, video_url = ?,
       template_type = ?, template_value = ?, implementation_scope = ?, status = ?,
       setup_step = ?, updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(
      input.category,
      input.title,
      input.summary,
      input.body,
      input.videoUrl,
      input.templateType,
      input.templateValue,
      input.implementationScope,
      input.status,
      input.setupStep,
      id,
    )
    .run();
}

export async function getSolution(env: Env, id: string): Promise<Solution | null> {
  return env.DB.prepare(`SELECT * FROM solutions WHERE id = ?`).bind(id).first<Solution>();
}

export async function listAllSolutions(env: Env): Promise<Solution[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM solutions ORDER BY category ASC, position ASC, title ASC`,
  ).all<Solution>();
  return res.results ?? [];
}

// A ward member proposes a new solution (enters the review queue).
export async function submitSolution(
  env: Env,
  o: { category: string; title: string; summary: string | null; body: string | null; userId: string; wardId: string },
): Promise<string> {
  const id = newId('sol');
  const slug = await uniqueSlug(env, slugify(o.title));
  await env.DB.prepare(
    `INSERT INTO solutions
       (id, category, title, slug, summary, body, implementation_scope, status, submitted_by_user_id, submitted_by_ward_id)
     VALUES (?, ?, ?, ?, ?, ?, 'ward_singleton', 'submitted', ?, ?)`,
  )
    .bind(id, o.category, o.title, slug, o.summary, o.body, o.userId, o.wardId)
    .run();
  return id;
}

export async function setSolutionStatus(
  env: Env,
  id: string,
  status: 'published' | 'rejected' | 'draft',
): Promise<void> {
  await env.DB.prepare(`UPDATE solutions SET status = ?, updated_at = datetime('now') WHERE id = ?`)
    .bind(status, id)
    .run();
}

export async function listSubmittedSolutions(env: Env): Promise<Solution[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM solutions WHERE status = 'submitted' ORDER BY created_at ASC`,
  ).all<Solution>();
  return res.results ?? [];
}

export async function listPublishedSolutions(env: Env): Promise<Solution[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM solutions WHERE status = 'published' ORDER BY category ASC, position ASC, title ASC`,
  ).all<Solution>();
  return res.results ?? [];
}
