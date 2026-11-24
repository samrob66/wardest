import { describe, it, expect } from 'vitest';
import { loadPortal, setSetting } from './harness.mjs';

const tokens = (gp) => gp.fakes.system.rowsOf('Tokens');
const leaderRow = (gp, email) => gp.serviceTab_('Leaders').find('Email', email);
const linkFrom = (text) => /#k=([0-9a-f]{64})/.exec(text)[1];

describe('tokens', () => {
  it('stores only the hash', () => {
    const gp = loadPortal({ seed: true });
    const raw = gp.issueToken_('cancel', 'su1', '2026-12-04 23:59');
    expect(raw).toMatch(/^[0-9a-f]{64}$/);
    const stored = tokens(gp);
    expect(stored).toHaveLength(1);
    expect(stored[0].Hash).toBe(gp.sha256Hex_(raw));
    expect(JSON.stringify(gp.fakes.system.sheets.map((sh) => sh.raw()))).not.toContain(raw);
    expect({ ...gp.readToken_(raw, 'cancel') }).toEqual({ subject: 'su1', expires: '2026-12-04 23:59' });
  });

  it('expires, checks the kind, and rejects junk', () => {
    const gp = loadPortal({ seed: true });
    const raw = gp.issueToken_('cancel', 'su1', '2026-12-04 23:59');
    expect(gp.readToken_(raw, 'leader')).toBeNull();
    expect(gp.readToken_('nope', 'cancel')).toBeNull();
    expect(gp.readToken_('', 'cancel')).toBeNull();
    gp.fakes.setNow('2026-12-04 23:58');
    expect(gp.readToken_(raw, 'cancel')).not.toBeNull();
    gp.fakes.setNow('2026-12-04 23:59');
    expect(gp.readToken_(raw, 'cancel')).toBeNull();
  });

  it('revokes by kind and subject', () => {
    const gp = loadPortal({ seed: true });
    const a = gp.issueToken_('cancel', 'su1', '2026-12-04 23:59');
    const b = gp.issueToken_('cancel', 'su2', '2026-12-04 23:59');
    gp.revokeTokens_('cancel', 'su1');
    expect(gp.readToken_(a, 'cancel')).toBeNull();
    expect(gp.readToken_(b, 'cancel')).not.toBeNull();
  });
});

describe('leader links', () => {
  it('a link works for a leader on the Leaders tab only', () => {
    const gp = loadPortal({ seed: true });
    expect(gp.sendLeaderLink_(leaderRow(gp, 'sister.example@example.test'))).toBe('sent');
    const mail = gp.fakes.mail.sent.at(-1);
    expect(mail.to).toBe('sister.example@example.test');
    const k = linkFrom(mail.body);
    expect(gp.leaderFromLink_(k).Name).toBe('Sister Example');
    // Expires after 90 days.
    gp.fakes.setNow('2027-03-01 10:01');
    expect(gp.leaderFromLink_(k)).toBeNull();
  });

  it('removing the row or changing the email ends the link at once', () => {
    const gp = loadPortal({ seed: true });
    gp.sendLeaderLink_(leaderRow(gp, 'sister.example@example.test'));
    gp.sendLeaderLink_(leaderRow(gp, 'brother.sample@example.test'));
    const [k1, k2] = gp.fakes.mail.sent.map((m) => linkFrom(m.body));
    const t = gp.serviceTab_('Leaders');
    t.update(t.find('Email', 'brother.sample@example.test'), { Email: 'brother.sample2@example.test' });
    t.remove(t.find('Email', 'sister.example@example.test'));
    gp.gpBegin_();
    expect(gp.leaderFromLink_(k1)).toBeNull();
    expect(gp.leaderFromLink_(k2)).toBeNull();
  });

  it('a new link replaces the old one', () => {
    const gp = loadPortal({ seed: true });
    gp.sendLeaderLink_(leaderRow(gp, 'sister.example@example.test'));
    gp.sendLeaderLink_(leaderRow(gp, 'sister.example@example.test'));
    const [k1, k2] = gp.fakes.mail.sent.map((m) => linkFrom(m.body));
    expect(gp.leaderFromLink_(k1)).toBeNull();
    expect(gp.leaderFromLink_(k2).Name).toBe('Sister Example');
  });

  it('processes Send leader link ticks', () => {
    const gp = loadPortal({ seed: true });
    const t = gp.serviceTab_('Leaders');
    t.update(t.find('Email', 'sister.helper@example.test'), { 'Send leader link': true });
    gp.fakes.setNow('2026-12-01 10:20');
    gp.processLeaderLinkTicks_();
    const row = gp.serviceTab_('Leaders').find('Email', 'sister.helper@example.test');
    expect(row['Send leader link']).toBe(false);
    expect(row['Link sent']).toBe('2026-12-01 10:20');
    expect(gp.fakes.mail.sent.map((m) => m.to)).toEqual(['sister.helper@example.test']);
    gp.processLeaderLinkTicks_();
    expect(gp.fakes.mail.sent).toHaveLength(1);
  });

  it('requestLeaderLink_ answers the same for unknown addresses and limits to 3 a day', () => {
    const gp = loadPortal({ seed: true });
    const known = gp.requestLeaderLink_('Sister.Example@example.test ');
    const unknown = gp.requestLeaderLink_('stranger@example.test');
    expect({ ...unknown }).toEqual({ ...known });
    expect(known.message).toBe("If that address is on the ward's leader list, a link is on its way.");
    expect(gp.fakes.mail.sent.map((m) => m.to)).toEqual(['sister.example@example.test']);
    gp.requestLeaderLink_('sister.example@example.test');
    gp.requestLeaderLink_('sister.example@example.test');
    expect(gp.fakes.mail.sent).toHaveLength(3);
    expect({ ...gp.requestLeaderLink_('sister.example@example.test') }).toEqual({ ...known });
    expect(gp.fakes.mail.sent).toHaveLength(3);
    gp.fakes.setNow('2026-12-02 08:00');
    gp.requestLeaderLink_('sister.example@example.test');
    expect(gp.fakes.mail.sent).toHaveLength(4);
  });
});

describe('pageUrl_', () => {
  it('uses the hub when set, else the web app', () => {
    const gp = loadPortal({ seed: true });
    expect(gp.pageUrl_(gp.settings_(), 'post', { p: 'abc' })).toBe('https://script.example.test/macros/s/EXAMPLE/exec?page=post#p=abc');
    setSetting(gp, 'hub_url', 'https://example.github.io/rb1links/');
    expect(gp.pageUrl_(gp.settings_(), 'leader', { k: 'x y' })).toBe('https://example.github.io/rb1links/leader.html#k=x%20y');
    setSetting(gp, 'hub_url', 'https://example.github.io/rb1links');
    expect(gp.pageUrl_(gp.settings_(), 'serve', {})).toBe('https://example.github.io/rb1links/serve.html');
  });
});
