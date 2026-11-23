// Named sections on a space's portal (spec §8), e.g. M44's "Ward Links" and "Interviews".
// Published deliverables with no section fall under the default "Links" section (last; left out
// when empty). Deleting a section returns its cards to the default (ON DELETE SET NULL).
// Route handlers check who may arrange the portal first (the public space's managers).
import type { Env, PortalCard, PortalSection } from '../types';
import { newId } from './ids';

export const DEFAULT_SECTION_TITLE = 'Links';

export interface SectionRow {
  id: string;
  ward_id: string;
  space_id: string;
  title: string;
  position: number;
}

function cleanTitle(raw: string): string | null {
  const t = String(raw ?? '').replace(/\s+/g, ' ').trim();
  return t.length >= 1 && t.length <= 60 ? t : null;
}

export async function listSections(env: Env, wardId: string, spaceId: string): Promise<SectionRow[]> {
  const res = await env.DB.prepare(
    `SELECT id, ward_id, space_id, title, position FROM portal_sections WHERE ward_id = ? AND space_id = ? ORDER BY position, created_at, id`,
  )
    .bind(wardId, spaceId)
    .all<SectionRow>();
  return res.results ?? [];
}

async function section(env: Env, wardId: string, spaceId: string, id: string): Promise<SectionRow | null> {
  return env.DB.prepare(`SELECT id, ward_id, space_id, title, position FROM portal_sections WHERE id = ? AND ward_id = ? AND space_id = ?`)
    .bind(id, wardId, spaceId)
    .first<SectionRow>();
}

export async function createSection(env: Env, wardId: string, spaceId: string, rawTitle: string): Promise<string> {
  const title = cleanTitle(rawTitle);
  if (!title) throw new Error('Section titles are 1–60 characters.');
  const pos = await env.DB.prepare(`SELECT COALESCE(MAX(position), -1) + 1 AS p FROM portal_sections WHERE ward_id = ? AND space_id = ?`)
    .bind(wardId, spaceId)
    .first<{ p: number }>();
  const id = newId('psec');
  await env.DB.prepare(`INSERT INTO portal_sections (id, ward_id, space_id, title, position) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, wardId, spaceId, title, pos?.p ?? 0)
    .run();
  return id;
}

export async function renameSection(env: Env, wardId: string, spaceId: string, id: string, rawTitle: string): Promise<void> {
  const title = cleanTitle(rawTitle);
  if (!title) throw new Error('Section titles are 1–60 characters.');
  await env.DB.prepare(`UPDATE portal_sections SET title = ? WHERE id = ? AND ward_id = ? AND space_id = ?`).bind(title, id, wardId, spaceId).run();
}

// Swaps the section with its neighbour (positions are renumbered 0..n-1 first).
export async function moveSection(env: Env, wardId: string, spaceId: string, id: string, dir: 'up' | 'down'): Promise<void> {
  const list = await listSections(env, wardId, spaceId);
  const i = list.findIndex((s) => s.id === id);
  const j = dir === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j]!, list[i]!];
  await env.DB.batch(
    list.map((s, k) => env.DB.prepare(`UPDATE portal_sections SET position = ? WHERE id = ? AND ward_id = ?`).bind(k, s.id, wardId)),
  );
}

export async function deleteSection(env: Env, wardId: string, spaceId: string, id: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`UPDATE deliverable_spaces SET section_id = NULL WHERE section_id = ? AND ward_id = ?`).bind(id, wardId),
    env.DB.prepare(`DELETE FROM portal_sections WHERE id = ? AND ward_id = ? AND space_id = ?`).bind(id, wardId, spaceId),
  ]);
}

// Puts a card published to this space under a section of the same space ('' = the default).
// Returns false (and changes nothing) for a section of another space or ward.
export async function setCardSection(env: Env, wardId: string, spaceId: string, deliverableId: string, sectionId: string): Promise<boolean> {
  if (sectionId && !(await section(env, wardId, spaceId, sectionId))) return false;
  await env.DB.prepare(`UPDATE deliverable_spaces SET section_id = ? WHERE deliverable_id = ? AND space_id = ? AND ward_id = ?`)
    .bind(sectionId || null, deliverableId, spaceId, wardId)
    .run();
  return true;
}

// The portal's cards, grouped: the space's sections by position, then the default "Links"
// section for unsectioned cards (left out when empty; a section left empty is left out too).
export async function getPortalSections(env: Env, wardId: string, spaceId: string): Promise<PortalSection[]> {
  const res = await env.DB.prepare(
    `SELECT d.id AS id, d.title AS title, d.description AS description, d.type AS type, d.url AS url, d.short_url AS short_url,
            ds.section_id AS section_id
       FROM deliverable_spaces ds JOIN deliverables d ON d.id = ds.deliverable_id
      WHERE ds.space_id = ? AND ds.ward_id = ? AND ds.include_in_portal = 1
      ORDER BY ds.position ASC, d.title ASC`,
  )
    .bind(spaceId, wardId)
    .all<{ id: string; title: string; description: string | null; type: string; url: string | null; short_url: string | null; section_id: string | null }>();
  const cards = (res.results ?? []).map((r) => ({
    card: {
      title: r.title, description: r.description, type: r.type, destination: r.url ?? `${env.APP_URL}/f/${r.id}`, short_url: r.short_url,
      deliverable_id: r.id, section_id: r.section_id,
    } satisfies PortalCard,
    section: r.section_id,
  }));
  const sections = await listSections(env, wardId, spaceId);
  const known = new Set(sections.map((s) => s.id));
  const out: PortalSection[] = [];
  for (const s of sections) {
    const list = cards.filter((c) => c.section === s.id).map((c) => c.card);
    if (list.length) out.push({ id: s.id, title: s.title, cards: list });
  }
  const rest = cards.filter((c) => !c.section || !known.has(c.section)).map((c) => c.card);
  if (rest.length) out.push({ id: null, title: DEFAULT_SECTION_TITLE, cards: rest });
  return out;
}
