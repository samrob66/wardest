import { describe, it, expect, beforeAll } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, makeWard, makeLeader, uniqueEmail, asUser } from './helpers';
import {
  canViewPost, canEditPost, canManageOrg, canManageEditorList, canApproveVolunteer, isBishopric,
  canSeeWardVolunteers, type PostRef,
} from '../src/lib/volAccess';
import { addEditor, removeEditor, listEditors, listEditorUserIds } from '../src/lib/volEditors';
import { approverEmails } from '../src/lib/volMessages';
import { newId } from '../src/lib/ids';
import { makeCast, type Cast } from './cast';

describe('volAccess', () => {
  let c: Cast;
  beforeAll(async () => {
    c = await makeCast();
  });

  it('view/edit table for a post in EQ created by the bishop', async () => {
    const rows: Array<[string, boolean, boolean]> = [
      [c.bishop, true, true],
      [c.exec, true, true],
      [c.eqPres, true, true],
      [c.eqCounselor, true, false],
      [c.eqTeacher, true, false],
      [c.rsPres, true, false],
      [c.wmLeader, false, false],
      [c.stranger, false, false],
    ];
    for (const [uid, view, edit] of rows) {
      expect(await canViewPost(env, uid, c.post), `view ${uid}`).toBe(view);
      expect(await canEditPost(env, uid, c.post), `edit ${uid}`).toBe(edit);
    }
  });

  it('an added counselor can edit; removing them takes it away', async () => {
    await addEditor(env, c.wardId, c.spaces['elders-quorum']!, c.eqCounselor, c.eqPres);
    expect(await canEditPost(env, c.eqCounselor, c.post)).toBe(true);
    expect(await canManageOrg(env, c.wardId, c.spaces['elders-quorum']!, c.eqCounselor)).toBe(true);
    // Editors can't manage the list itself; owners and bishopric can.
    expect(await canManageEditorList(env, c.wardId, c.spaces['elders-quorum']!, c.eqCounselor)).toBe(false);
    expect(await canManageEditorList(env, c.wardId, c.spaces['elders-quorum']!, c.eqPres)).toBe(true);
    expect(await canManageEditorList(env, c.wardId, c.spaces['elders-quorum']!, c.bishop)).toBe(true);
    expect(await canManageEditorList(env, c.wardId, c.spaces['elders-quorum']!, c.rsPres)).toBe(false);
    await removeEditor(env, c.wardId, c.spaces['elders-quorum']!, c.eqCounselor);
    expect(await canEditPost(env, c.eqCounselor, c.post)).toBe(false);
  });

  it('approverEmails = creator + EQ owners + added editors, no duplicates', async () => {
    let emails = await approverEmails(env, c.wardId, c.post.id);
    expect(emails.sort()).toEqual([c.emails.bishop, c.emails.eqPres].map((e) => e!.toLowerCase()).sort());
    await addEditor(env, c.wardId, c.spaces['elders-quorum']!, c.eqCounselor, c.eqPres);
    await addEditor(env, c.wardId, c.spaces['elders-quorum']!, c.eqPres, c.eqPres); // owner added too: still once
    emails = await approverEmails(env, c.wardId, c.post.id);
    expect(emails.sort()).toEqual([c.emails.bishop, c.emails.eqPres, c.emails.eqCounselor].map((e) => e!.toLowerCase()).sort());
    const list = await listEditors(env, c.wardId, c.spaces['elders-quorum']!);
    expect(list[0]!.owner).toBe(true);
    expect(list.filter((e) => e.user_id === c.eqPres)).toHaveLength(1);
    expect((await listEditorUserIds(env, c.wardId, c.spaces['elders-quorum']!)).sort()).toEqual([c.eqPres, c.eqCounselor].sort());
    await removeEditor(env, c.wardId, c.spaces['elders-quorum']!, c.eqCounselor);
  });

  it('addEditor refuses someone who is not a member of the ward', async () => {
    await expect(addEditor(env, c.wardId, c.spaces['elders-quorum']!, c.stranger, c.eqPres)).rejects.toThrow();
  });

  it('a post whose ward differs from its space ward denies everyone', async () => {
    const other = await makeWard(env);
    const badId = newId('vp');
    // A post row in the other ward that points at this ward's EQ space.
    await env.DB.prepare(
      `INSERT INTO vol_posts (id, ward_id, space_id, public_id, title, created_by_user_id) VALUES (?, ?, ?, ?, 'X', ?)`,
    )
      .bind(badId, other.wardId, c.spaces['elders-quorum'], newId('pub'), c.bishop)
      .run();
    const bad: PostRef = { id: badId, ward_id: other.wardId, space_id: c.spaces['elders-quorum']!, created_by_user_id: c.bishop };
    for (const uid of [c.bishop, c.exec, c.eqPres, c.eqTeacher, c.rsPres]) {
      expect(await canViewPost(env, uid, bad)).toBe(false);
      expect(await canEditPost(env, uid, bad)).toBe(false);
    }
    // A forged ref (right ward, but the row says otherwise) is judged by the stored row.
    const forged: PostRef = { ...c.post, created_by_user_id: c.eqTeacher };
    expect(await canEditPost(env, c.eqTeacher, forged)).toBe(false);
  });

  it('canManageOrg rejects non-org spaces and other wards', async () => {
    expect(await canManageOrg(env, c.wardId, c.spaces['ward-council']!, c.bishop)).toBe(false);
    expect(await canManageOrg(env, c.wardId, c.spaces['relief-society']!, c.bishop)).toBe(true);
    expect(await canManageOrg(env, c.wardId, c.spaces['relief-society']!, c.eqPres)).toBe(false);
    expect(await canManageOrg(env, c.wardId, c.spaces['relief-society']!, c.stranger)).toBe(false);
    expect(await isBishopric(env, c.wardId, c.exec)).toBe(true);
    expect(await isBishopric(env, c.wardId, c.rsPres)).toBe(false);
    expect(await canSeeWardVolunteers(env, c.wardId, c.bishop)).toBe(true);
    expect(await canSeeWardVolunteers(env, c.wardId, c.eqPres)).toBe(false);
  });

  it('canApproveVolunteer: bishopric always; editors of a post the volunteer waits on', async () => {
    const volId = newId('vv');
    const dateId = newId('vd');
    const roleId = newId('vr');
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO volunteers (id, ward_id, email, name, approval) VALUES (?, ?, ?, 'V', 'pending')`).bind(volId, c.wardId, uniqueEmail('v')),
      env.DB.prepare(`INSERT INTO vol_dates (id, ward_id, post_id, date) VALUES (?, ?, ?, '2026-12-06')`).bind(dateId, c.wardId, c.post.id),
      env.DB.prepare(`INSERT INTO vol_roles (id, ward_id, post_id, date_id, name, needed) VALUES (?, ?, ?, ?, 'R', 2)`).bind(roleId, c.wardId, c.post.id, dateId),
    ]);
    expect(await canApproveVolunteer(env, c.wardId, volId, c.eqPres)).toBe(false); // no waiting sign-up yet
    expect(await canApproveVolunteer(env, c.wardId, volId, c.bishop)).toBe(true);
    await env.DB.prepare(`INSERT INTO vol_signups (id, ward_id, post_id, role_id, volunteer_id, status) VALUES (?, ?, ?, ?, ?, 'waiting')`)
      .bind(newId('vs'), c.wardId, c.post.id, roleId, volId)
      .run();
    expect(await canApproveVolunteer(env, c.wardId, volId, c.eqPres)).toBe(true);
    expect(await canApproveVolunteer(env, c.wardId, volId, c.eqTeacher)).toBe(false);
    expect(await canApproveVolunteer(env, c.wardId, volId, c.rsPres)).toBe(false);
    expect(await canApproveVolunteer(env, c.wardId, volId, c.stranger)).toBe(false);
    const other = await makeWard(env);
    expect(await canApproveVolunteer(env, other.wardId, volId, c.bishop)).toBe(false);
  });
});

// One or two space-page views per test: each view runs ~150 D1 queries (service-category
// permission checks), so one test doing all of them ran far longer than the rest.
describe('volunteer editors card', () => {
  let c: Cast;
  let base: string;
  beforeAll(async () => {
    c = await makeCast();
    base = `http://localhost/w/${c.wardId}/space/${c.spaces['elders-quorum']}`;
  });

  it('an owner sees the card with its manage form; a member sees the card without it', async () => {
    const page = await (await SELF.fetch(base, { headers: { cookie: await asUser(c.eqPres) } })).text();
    expect(page).toContain('Who can manage volunteer posts');
    expect(page).toContain(`${base.replace('http://localhost', '')}/vol-editors`);
    const teacherPage = await (await SELF.fetch(base, { headers: { cookie: await asUser(c.eqTeacher) } })).text();
    expect(teacherPage).toContain('Who can manage volunteer posts');
    expect(teacherPage).not.toContain('/vol-editors"');
  });

  it('owners and the bishopric manage the list; others get 403', async () => {
    const form = (uid: string) => new URLSearchParams({ user_id: uid }).toString();
    const post = async (as: string, path: string, body: string) =>
      SELF.fetch(base + path, {
        method: 'POST',
        redirect: 'manual',
        headers: { cookie: await asUser(as), 'content-type': 'application/x-www-form-urlencoded' },
        body,
      });
    expect((await post(c.eqTeacher, '/vol-editors', form(c.eqTeacher))).status).toBe(403);
    expect((await post(c.eqPres, '/vol-editors', form(c.eqCounselor))).status).toBe(302);
    expect(await listEditorUserIds(env, c.wardId, c.spaces['elders-quorum']!)).toContain(c.eqCounselor);
    expect((await post(c.eqCounselor, `/vol-editors/${c.eqCounselor}/remove`, '')).status).toBe(403);
    expect((await post(c.bishop, `/vol-editors/${c.eqCounselor}/remove`, '')).status).toBe(302);
    expect(await listEditorUserIds(env, c.wardId, c.spaces['elders-quorum']!)).not.toContain(c.eqCounselor);
  });

  it('non-org spaces have no card', async () => {
    const wc = await (await SELF.fetch(`http://localhost/w/${c.wardId}/space/${c.spaces['ward-council']}`, { headers: { cookie: await asUser(c.rsPres) } })).text();
    expect(wc).not.toContain('Who can manage volunteer posts');
  });
});
