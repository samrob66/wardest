import type { Env } from '../types';
import { newId } from './ids';

export interface TaskRow {
  id: string;
  text: string;
  status: string;
  assignee_user_id: string | null;
  assignee_name: string | null;
  position: number;
}

export async function listOpenTasks(env: Env, spaceId: string): Promise<TaskRow[]> {
  const res = await env.DB.prepare(
    `SELECT t.id AS id, t.text AS text, t.status AS status, t.assignee_user_id AS assignee_user_id,
            COALESCE(u.name, u.email) AS assignee_name, t.position AS position
       FROM tasks t LEFT JOIN users u ON u.id = t.assignee_user_id
      WHERE t.space_id = ? AND t.archived = 0
      ORDER BY t.position ASC, t.created_at ASC`,
  )
    .bind(spaceId)
    .all<TaskRow>();
  return res.results ?? [];
}

export async function listArchivedTasks(env: Env, spaceId: string): Promise<TaskRow[]> {
  const res = await env.DB.prepare(
    `SELECT t.id AS id, t.text AS text, t.status AS status, t.assignee_user_id AS assignee_user_id,
            COALESCE(u.name, u.email) AS assignee_name, t.position AS position
       FROM tasks t LEFT JOIN users u ON u.id = t.assignee_user_id
      WHERE t.space_id = ? AND t.archived = 1
      ORDER BY t.completed_at DESC`,
  )
    .bind(spaceId)
    .all<TaskRow>();
  return res.results ?? [];
}

export async function getTask(
  env: Env,
  id: string,
): Promise<{ id: string; space_id: string } | null> {
  return env.DB.prepare(`SELECT id, space_id FROM tasks WHERE id = ?`)
    .bind(id)
    .first<{ id: string; space_id: string }>();
}

export async function createTask(
  env: Env,
  o: { wardId: string; spaceId: string; text: string; assigneeUserId: string | null; createdBy: string },
): Promise<void> {
  const pos = await env.DB.prepare(
    `SELECT COALESCE(MAX(position), -1) + 1 AS p FROM tasks WHERE space_id = ? AND archived = 0`,
  )
    .bind(o.spaceId)
    .first<{ p: number }>();
  await env.DB.prepare(
    `INSERT INTO tasks (id, ward_id, space_id, text, status, assignee_user_id, position, created_by_user_id)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`,
  )
    .bind(newId('tsk'), o.wardId, o.spaceId, o.text, o.assigneeUserId, pos?.p ?? 0, o.createdBy)
    .run();
}

// Completing a task self-archives it (stays viewable under "Archived").
export async function completeTask(env: Env, id: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE tasks SET status = 'done', archived = 1, completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(id)
    .run();
}

export async function reopenTask(env: Env, id: string): Promise<void> {
  await env.DB.prepare(
    `UPDATE tasks SET status = 'open', archived = 0, completed_at = NULL, updated_at = datetime('now') WHERE id = ?`,
  )
    .bind(id)
    .run();
}

export async function deleteTask(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM tasks WHERE id = ?`).bind(id).run();
}
