// Child sign-ups (service spec §5, plan Review Focus 5): a parent signs up themself and their
// children for one role; each is one head; the same child again is "already signed up".
import { describe, it, expect } from 'vitest';
import { SELF } from 'cloudflare:test';
import { env, asUser, makeLeader, uniqueEmail, settle } from './helpers';
import { NOW, fixture, counts, signupRows } from './volFixtures';
import { submitSignup, normalizeChildName } from '../src/lib/volSignup';
import { VolInputError } from '../src/lib/volPosts';

async function parent(fxWard: string, name = 'Jane Doe') {
  const email = uniqueEmail('parent');
  await makeLeader(env, fxWard, { email, name }); // a ward member: approved at once
  return email.toLowerCase();
}

describe('child sign-ups', () => {
  it('a parent + "Ana" + "Ben" on one role -> 3 heads; " ana " again -> already signed up', async () => {
    const fx = await fixture({ audiences: 'brothers,sisters,youth' });
    const email = await parent(fx.wardId);
    const go = (child?: string | null) =>
      submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Jane Doe', email, bringing: null, now: NOW, child });
    expect((await go()).result).toBe('confirmed');
    expect((await go('Ana')).result).toBe('confirmed');
    expect((await go('Ben')).result).toBe('confirmed');
    expect((await counts(fx, fx.bigRoleId)).confirmed).toBe(3);
    const again = await go('  ana ');
    expect(again.result).toBe('already_signed');
    expect((await go()).result).toBe('already_signed');
    expect((await counts(fx, fx.bigRoleId)).confirmed).toBe(3);
    const rows = await signupRows(fx.wardId, fx.bigRoleId);
    expect(rows.map((r) => (r as unknown as { child_name: string }).child_name).sort()).toEqual(['', 'Ana', 'Ben']);
  });

  it('the confirmation names the child and goes to the parent', async () => {
    const fx = await fixture({ audiences: 'children' });
    const email = await parent(fx.wardId);
    const r = await submitSignup(env, {
      wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Jane Doe', email, bringing: null, now: NOW, child: 'Ana',
    });
    const conf = r.messages.find((m) => m.kind === 'vol_confirmed')!;
    expect(conf.to).toBe(email);
    expect(conf.html).toContain('Ana is signed up');
    expect(conf.html).toContain('Movers (for Ana)');
  });

  it('a post for brothers/sisters only ignores a submitted child name', async () => {
    const fx = await fixture({ audiences: 'brothers,sisters' });
    const email = await parent(fx.wardId);
    const r = await submitSignup(env, {
      wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Jane Doe', email, bringing: null, now: NOW, child: 'Ana',
    });
    expect(r.result).toBe('confirmed');
    const rows = await signupRows(fx.wardId, fx.bigRoleId);
    expect((rows[0] as unknown as { child_name: string }).child_name).toBe('');
    const conf = r.messages.find((m) => m.kind === 'vol_confirmed')!;
    expect(conf.html).not.toContain('Ana');
  });

  it('a child name must be 1–40 characters after trimming', async () => {
    expect(normalizeChildName('  Ana   Maria ')).toBe('Ana Maria');
    expect(normalizeChildName('   ')).toBeNull();
    expect(normalizeChildName('x'.repeat(41))).toBeNull();
    const fx = await fixture({ audiences: 'youth' });
    await expect(
      submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Jane', email: uniqueEmail('p'), bringing: null, now: NOW, child: ' ' }),
    ).rejects.toThrow(VolInputError);
  });

  it('the leader list shows "Ana (signed up by Jane Doe)"; the public page never shows it', async () => {
    const fx = await fixture({ audiences: 'brothers,youth' });
    const email = await parent(fx.wardId, 'Jane Doe');
    await submitSignup(env, { wardId: fx.wardId, postId: fx.postId, roleId: fx.bigRoleId, name: 'Jane Doe', email, bringing: null, now: NOW, child: 'Ana' });
    const html = await (
      await SELF.fetch(`http://localhost/w/${fx.wardId}/vol/${fx.postId}`, { headers: { cookie: await asUser(fx.eqPres) } })
    ).text();
    expect(html).toContain('Ana (signed up by Jane Doe)');
    const pub = await (await SELF.fetch(`http://localhost/v/${fx.publicId}`)).text();
    expect(pub).not.toContain('Ana');
    expect(pub).not.toContain('Jane Doe');
    // The form offers "Who is serving?" on a youth post.
    expect(pub).toContain('Who is serving?');
    expect(pub).toContain('name="child_name"');
  });

  it('the public form sends the child: who=child + child_name', async () => {
    const fx = await fixture({ audiences: 'children', date: '2099-12-06' });
    const email = await parent(fx.wardId, 'Jane Doe');
    const res = await SELF.fetch(`http://localhost/v/${fx.publicId}/signup`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'cf-connecting-ip': '203.0.113.77' },
      body: new URLSearchParams({
        role_id: fx.bigRoleId, name: 'Jane Doe', email, who: 'child', child_name: 'Ben', 'cf-turnstile-response': 'ok',
      }).toString(),
    });
    expect(res.status).toBe(200);
    // The sign-up itself runs after the response (waitUntil).
    await settle();
    const rows = await signupRows(fx.wardId, fx.bigRoleId);
    expect(rows.map((r) => (r as unknown as { child_name: string }).child_name)).toEqual(['Ben']);
    // On a brothers/sisters page there is no child choice.
    const plain = await fixture({ date: '2099-12-06' });
    expect(await (await SELF.fetch(`http://localhost/v/${plain.publicId}`)).text()).not.toContain('Who is serving?');
  });
});
