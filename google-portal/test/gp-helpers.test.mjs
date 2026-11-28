// 2.5: the shared helpers the v4 pages use (icons, status chips, dates, the scheduler's date maths).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { GP_DIR } from '../build.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));

class FakeNode {
  constructor(tag, ns) {
    this.tagName = tag;
    this.ns = ns || '';
    this.attrs = {};
    this.children = [];
    this.className = '';
    this.text = '';
  }
  appendChild(c) {
    this.children.push(c);
    return c;
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  getAttribute(k) {
    return k in this.attrs ? this.attrs[k] : null;
  }
  addEventListener() {}
  set textContent(v) {
    this.children = [];
    this.text = String(v);
  }
  get textContent() {
    return this.text + this.children.map((c) => c.textContent).join('');
  }
  all() {
    return this.children.flatMap((c) => [c, ...c.all()]);
  }
}

function loadGP(withNS = true) {
  const document = {
    createElement: (t) => new FakeNode(t),
    createTextNode: (t) => {
      const n = new FakeNode('#text');
      n.text = String(t);
      return n;
    },
  };
  if (withNS) document.createElementNS = (ns, t) => new FakeNode(t, ns);
  const ctx = vm.createContext({ window: {}, document, console });
  vm.runInContext(readFileSync(join(GP_DIR, 'pages', 'gp.js'), 'utf8'), ctx);
  return ctx.GP;
}

const cls = (n) => n.className || n.attrs.class || '';

describe('GP.icon', () => {
  const GP = loadGP();
  it('draws each icon the pages use as an SVG with the gp-ic class, hidden from screen readers', () => {
    for (const name of ['check', 'clock', 'mail', 'x', 'shield', 'cal', 'users', 'more', 'print', 'qr', 'plus', 'chevL', 'chevR', 'list', 'alert', 'copy', 'link', 'edit', 'lock', 'repeat', 'send', 'user']) {
      const svg = GP.icon(name);
      expect(svg.tagName).toBe('svg');
      expect(svg.ns).toBe('http://www.w3.org/2000/svg');
      expect(svg.attrs.class).toBe('gp-ic');
      expect(svg.attrs['aria-hidden']).toBe('true');
      expect(svg.attrs.viewBox).toBe('0 0 24 24');
      expect(svg.children.length).toBeGreaterThan(0);
    }
  });
  it('works without createElementNS (the plain fake DOMs) and with an unknown name', () => {
    const G2 = loadGP(false);
    expect(G2.icon('check').tagName).toBe('svg');
    expect(GP.icon('nope').children).toEqual([]);
  });
});

describe('GP.chip: a ringed icon and a coloured word', () => {
  const GP = loadGP();
  const table = [
    ['approved', 'Approved', 'gp-chip-ok'],
    ['leader', 'Leader', 'gp-chip-leader'],
    ['needs', 'Needs approval', 'gp-chip-wait'],
    ['email', 'Email not confirmed', 'gp-chip-email'],
    ['declined', 'Declined', 'gp-chip-bad'],
    ['revoked', 'Revoked', 'gp-chip-bad'],
    ['confirmed', 'Confirmed', 'gp-chip-ok'],
  ];
  for (const [kind, word, c] of table) {
    it(`${kind} reads "${word}" with an icon`, () => {
      const chip = GP.chip(kind);
      expect(chip.textContent).toBe(word);
      expect(chip.className).toBe('gp-chip ' + c);
      expect(chip.children[0].tagName).toBe('svg');
    });
  }
  it('an unknown kind is a neutral chip with the raw word, never a crash', () => {
    const chip = GP.chip('Something-new', 'Something-new');
    expect(chip.className).toBe('gp-chip gp-chip-neutral');
    expect(chip.textContent).toBe('Something-new');
    expect(GP.chip(undefined).className).toBe('gp-chip gp-chip-neutral');
    expect(GP.chip(undefined).textContent).toBe('Unknown');
  });
});

describe('GP.signupKind maps old and new answers', () => {
  const GP = loadGP();
  const k = (o) => GP.signupKind(o);
  it("today's sign-up statuses (2.3.3)", () => {
    expect(k({ status: 'Waiting-email' })).toBe('email');
    expect(k({ status: 'Waiting-approval' })).toBe('needs');
    expect(k({ status: 'Confirmed' })).toBe('confirmed');
  });
  it("today's volunteer statuses (the old volunteers action)", () => {
    expect(k({ status: 'Approved' })).toBe('approved');
    expect(k({ status: 'Declined' })).toBe('declined');
    expect(k({ status: 'Revoked' })).toBe('revoked');
    expect(k({ status: 'Pending', emailConfirmed: true })).toBe('needs');
    expect(k({ status: 'Pending', emailConfirmed: false })).toBe('email');
  });
  it('the 2.4 enum, in status (listVolunteers) or volunteerStatus (listPosts sign-ups)', () => {
    const e = { leader: 'leader', approved: 'approved', needs_approval: 'needs', email_not_confirmed: 'email', declined: 'declined', revoked: 'revoked' };
    for (const [from, to] of Object.entries(e)) {
      expect(k({ status: from })).toBe(to);
      expect(k({ status: 'Confirmed', volunteerStatus: from })).toBe(to);
    }
  });
  it('volunteerStatus wins over the sign-up status; a leader flag gives Leader', () => {
    expect(k({ status: 'Waiting-approval', volunteerStatus: 'needs_approval' })).toBe('needs');
    expect(k({ status: 'Confirmed', leader: true })).toBe('leader');
  });
  it('unknown or missing: empty kind, and statusChip shows the raw word', () => {
    expect(k({ status: 'Lapsed' })).toBe('');
    expect(k({})).toBe('');
    expect(k(null)).toBe('');
    expect(GP.statusChip({ status: 'Lapsed' }).textContent).toBe('Lapsed');
    expect(GP.statusChip({ status: 'Lapsed' }).className).toBe('gp-chip gp-chip-neutral');
    expect(GP.statusChip({ volunteerStatus: 'whatever', status: 'Confirmed' }).textContent).toBe('Confirmed');
    expect(GP.statusChip({ status: 'Waiting-approval' }).textContent).toBe('Needs approval');
  });
});

describe('dates', () => {
  const GP = loadGP();
  it('weekday, tile and long date', () => {
    expect(GP.weekday('2026-12-02')).toBe('Wed');
    expect(GP.fmtDate('2026-12-02')).toBe('Wed, Dec 2');
    expect(plain(GP.tile('2026-12-02'))).toEqual({ dow: 'WED', day: '2', mon: 'Dec' });
    expect(GP.tile('nope')).toBe(null);
    expect(GP.fmtLong('2026-12-02')).toBe('Wednesday, December 2');
    expect(GP.weekday('')).toBe('');
  });
  it('a month grid for the calendar: blanks before the 1st, then every day', () => {
    const m = plain(GP.monthDays('2026-12'));
    expect(m.title).toBe('December 2026');
    expect(m.lead).toBe(2); // Dec 1, 2026 is a Tuesday
    expect(m.days).toHaveLength(31);
    expect(m.days[0]).toBe('2026-12-01');
    expect(GP.addMonths('2026-12', 1)).toBe('2027-01');
    expect(GP.addMonths('2026-01', -1)).toBe('2025-12');
  });
});

describe('GP.sched: Every week', () => {
  const GP = loadGP();
  it('Mon/Wed/Fri from Fri Oct 30 to Mon Nov 9, 2026 (a month end and the DST change)', () => {
    const r = plain(GP.sched.weekly([1, 3, 5], '2026-10-30', '2026-11-09', []));
    expect(r.error).toBeUndefined();
    expect(r.dates).toEqual(['2026-10-30', '2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09']);
    expect(r.dates.map(GP.fmtDate)).toEqual(['Fri, Oct 30', 'Mon, Nov 2', 'Wed, Nov 4', 'Fri, Nov 6', 'Mon, Nov 9']);
  });
  it('skip removes that date only; all still lists it (for its switch)', () => {
    const r = plain(GP.sched.weekly([1, 3, 5], '2026-10-30', '2026-11-09', ['2026-11-04']));
    expect(r.dates).toEqual(['2026-10-30', '2026-11-02', '2026-11-06', '2026-11-09']);
    expect(r.all).toHaveLength(5);
  });
  it('Until before From: a clear error and no dates', () => {
    const r = plain(GP.sched.weekly([1], '2026-12-10', '2026-12-01', []));
    expect(r).toEqual({ dates: [], all: [], error: 'Until is before From.' });
  });
  it('more than 60 dates is refused with a message', () => {
    const r = plain(GP.sched.weekly([0, 1, 2, 3, 4, 5, 6], '2026-12-01', '2027-03-01', []));
    expect(r.dates).toEqual([]);
    expect(r.error).toBe('That is more than 60 dates; pick a shorter range.');
    expect(plain(GP.sched.weekly([0, 1, 2, 3, 4, 5, 6], '2026-12-01', '2027-01-29', [])).dates).toHaveLength(60);
  });
  it('no weekday or a missing date: an error, no dates', () => {
    expect(plain(GP.sched.weekly([], '2026-12-01', '2026-12-10', [])).error).toBe('Pick at least one day of the week.');
    expect(plain(GP.sched.weekly([1], '', '2026-12-10', [])).error).toBe('Pick a From and an Until date.');
  });
  it('byWeek groups dates Sunday to Saturday', () => {
    expect(plain(GP.sched.byWeek(['2026-10-30', '2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09']))).toEqual([['2026-10-30'], ['2026-11-02', '2026-11-04', '2026-11-06'], ['2026-11-09']]);
    expect(plain(GP.sched.byWeek(['2026-11-08', '2026-11-14', '2026-11-15']))).toEqual([['2026-11-08', '2026-11-14'], ['2026-11-15']]);
    expect(plain(GP.sched.byWeek([]))).toEqual([]);
  });
});
