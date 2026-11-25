// 2.3: new request forms copy a branded template form (decision 20). FormApp can't set a form's
// theme, but a Drive copy of a themed form keeps it.
import { describe, it, expect } from 'vitest';
import { loadPortal, setSetting } from './harness.mjs';

const sys = (gp) => gp.fakes.spreadsheets.get(gp.fakes.props.get('SYSTEM_ID'));
const filesOf = (gp) => sys(gp).rowsOf('Request files');

/** A branded form in the shared account's Drive, with questions of its own. */
function withTemplate(gp) {
  const t = gp.FormApp.create('Riverbend brand template');
  t.theme = 'riverbend-green';
  t.addTextItem().setTitle('Template question');
  t.addParagraphTextItem().setTitle('Another template question');
  return t;
}

function setUpWith(templateUrl) {
  const gp = loadPortal({ seed: true });
  const t = withTemplate(gp);
  setSetting(gp, 'form_template_url', typeof templateUrl === 'function' ? templateUrl(t) : templateUrl);
  gp.fakes.props.delete('SYSTEM_ID');
  gp.gpBegin_();
  gp.gpMenuSetUp();
  return { gp, t };
}

describe('form_template_url', () => {
  it('new request forms are copies of the template: themed, no leftover items, exactly the portal questions', () => {
    const { gp, t } = setUpWith((tpl) => `https://docs.google.com/forms/d/${tpl.getId()}/edit`);
    const files = filesOf(gp);
    expect(files).toHaveLength(4);
    const copies = gp.fakes.drive.copies.filter((c) => c.from === t.getId());
    expect(copies.map((c) => c.to).sort()).toEqual(files.map((f) => f['Form id']).sort());
    const moving = gp.fakes.forms.get(files.find((f) => f['Category id'] === 'moving')['Form id']);
    expect(moving.theme).toBe('riverbend-green');
    expect(moving.items.map((i) => i.title)).toEqual(['Name', 'Phone or email', 'Moving in or out', 'Date', 'Note']);
    expect(moving.title).toBe('Moving help — Riverbend 1st Ward (example)');
    expect(moving.description).toContain('see this request.');
    expect(moving.collectEmail).toBe(false);
    expect(moving.confirmation).toBe('Thank you. A leader will contact you.');
    expect(moving.requireLogin).toBe(false);
    expect(moving.limitOne).toBe(false);
    // Copies live in the Service Portal folder; the template is untouched.
    const portal = gp.fakes.props.get('PORTAL_FOLDER_ID');
    expect(gp.fakes.drive.files.get(moving.getId()).parents).toEqual([portal]);
    expect(t.items.map((i) => i.title)).toEqual(['Template question', 'Another template question']);
    expect(gp.fakes.alerts.at(-1)).not.toContain('template');
  });

  it('accepts a bare form id too', () => {
    const { gp, t } = setUpWith((tpl) => tpl.getId());
    expect(gp.fakes.drive.copies.filter((c) => c.from === t.getId())).toHaveLength(4);
  });

  it('a published viewform link is refused with a clear message, and plain forms are made', () => {
    const { gp } = setUpWith('https://docs.google.com/forms/d/e/1FAIpQLSexampleexampleexample/viewform');
    expect(gp.fakes.drive.copies).toEqual([]);
    expect(filesOf(gp)).toHaveLength(4);
    expect(gp.fakes.alerts.at(-1)).toContain("paste the form's edit link (from the form editor's address bar), not its viewform link");
    expect(gp.gpMenuCheckHealth().find((l) => l.includes('form_template_url'))).toMatch(/^PROBLEM .*viewform/);
  });

  it('an unreadable template falls back to a plain form and Set up reports it, without stopping', () => {
    const { gp } = setUpWith('https://docs.google.com/forms/d/missingtemplate123/edit');
    expect(gp.fakes.drive.copies).toEqual([]);
    expect(filesOf(gp)).toHaveLength(4);
    for (const f of filesOf(gp)) expect(gp.fakes.forms.get(f['Form id']).items.length).toBeGreaterThan(2);
    const alert = gp.fakes.alerts.at(-1);
    expect(alert).toContain('Set up is done.');
    expect(alert).toContain('Could not copy the form template');
  });

  it('something that is not a form link is reported', () => {
    const { gp } = setUpWith('https://example.test/not-a-form');
    expect(gp.fakes.drive.copies).toEqual([]);
    expect(gp.fakes.alerts.at(-1)).toContain('form_template_url');
  });

  it('existing forms are never re-created or re-copied', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpBegin_();
    gp.gpMenuSetUp();
    const before = filesOf(gp).map((f) => f['Form id']);
    const t = withTemplate(gp);
    setSetting(gp, 'form_template_url', `https://docs.google.com/forms/d/${t.getId()}/edit`);
    gp.gpMenuSetUp();
    expect(filesOf(gp).map((f) => f['Form id'])).toEqual(before);
    expect(gp.fakes.drive.copies).toEqual([]);
  });

  it('blank: forms are made as before, with no copy', () => {
    const gp = loadPortal({ seed: true });
    gp.fakes.props.delete('SYSTEM_ID');
    gp.gpBegin_();
    gp.gpMenuSetUp();
    expect(gp.fakes.drive.copies).toEqual([]);
    expect(gp.gpMenuCheckHealth().filter((l) => l.includes('form_template_url'))).toEqual([]);
  });

  it('formTemplateId_ reads the id from an edit link, a bare id, or explains why not', () => {
    const gp = loadPortal();
    expect(JSON.parse(JSON.stringify(gp.formTemplateId_('https://docs.google.com/forms/d/AbC_123-xyz/edit')))).toEqual({ id: 'AbC_123-xyz' });
    expect(JSON.parse(JSON.stringify(gp.formTemplateId_('https://docs.google.com/forms/d/AbC_123-xyz/edit#responses')))).toEqual({ id: 'AbC_123-xyz' });
    expect(JSON.parse(JSON.stringify(gp.formTemplateId_('1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789')))).toEqual({ id: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789' });
    expect(gp.formTemplateId_('https://docs.google.com/forms/d/e/1FAIpQL/viewform').error).toMatch(/viewform/);
    expect(gp.formTemplateId_('https://forms.gle/abc123').error).toMatch(/edit link/);
    expect(gp.formTemplateId_('')).toEqual(null);
  });
});
