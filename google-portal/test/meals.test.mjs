// 2.6 (decision 28): meals for new parents and members in hardship (server half).
// Spec docs/superpowers/specs/2026-11-28-google-portal-meals-design.md; API contract 2-6-api-contract.md.
import { describe, it, expect } from 'vitest';
import { loadPortal } from './harness.mjs';

const plain = (x) => JSON.parse(JSON.stringify(x));
const cats = (gp) => gp.fakes.spreadsheet.rowsOf('Categories');

describe('task 1: Categories columns and the meals seeds', () => {
  it('Set up adds Picture and Sign-up notices to, and the three meals rows once', () => {
    const gp = loadPortal({ seed: true });
    const headers = gp.table_(gp.fakes.spreadsheet.getSheetByName('Categories')).headers;
    expect(headers.slice(-2)).toEqual(['Picture', 'Sign-up notices to']);
    const byId = Object.fromEntries(cats(gp).map((c) => [c.Id, c]));
    expect(byId['meal-request']).toMatchObject({
      Name: 'Meals',
      Kind: 'Request',
      'Owning organizations': 'Relief Society',
      Notify: 'Coordinators',
      'On Help page': true,
      Confidential: false,
      'Opportunity category': 'meals-new-moms, meals-hardship',
    });
    expect(byId['meals-new-moms']).toMatchObject({ Name: 'Meals for New Moms', Kind: 'Opportunity', 'Owning organizations': 'Relief Society', 'Default audiences': 'Sisters' });
    expect(byId['meals-hardship']).toMatchObject({ Name: 'Meals for Members in Hardship', Kind: 'Opportunity', 'Owning organizations': 'Relief Society', 'Default audiences': 'Sisters' });
    // The old meals opportunity row stays as it is.
    expect(byId.meals).toMatchObject({ Name: 'Meals', Kind: 'Opportunity' });
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    expect(cats(gp).filter((c) => c.Id.startsWith('meal'))).toHaveLength(4);
  });

  it('an older install gets the columns and rows from the GP_VERSION upgrade; a row Sam typed is kept; a deleted row is not re-added', () => {
    const gp = loadPortal({ seed: true });
    const t = gp.serviceTab_('Categories');
    // As before 2.6: no meals rows yet, but Sam typed his own meals-hardship row.
    for (const id of ['meal-request', 'meals-new-moms', 'meals-hardship']) t.remove(t.find('Id', id));
    t.append({ Id: 'meals-hardship', Name: 'Hardship meals (ours)', Kind: 'Opportunity', Coordinators: 'sister.meals@example.test' });
    gp.fakes.props.delete('MEALS_SEEDED');
    gp.fakes.props.set('SCHEMA_VERSION', 'phase-2.5.3');
    gp.ensureUpgraded_();
    expect(gp.fakes.props.get('SCHEMA_VERSION')).toBe('phase-2.6');
    const mine = cats(gp).filter((c) => c.Id === 'meals-hardship');
    expect(mine).toHaveLength(1);
    expect(mine[0].Name).toBe('Hardship meals (ours)');
    expect(cats(gp).map((c) => c.Id)).toEqual(expect.arrayContaining(['meal-request', 'meals-new-moms']));
    // Deleted later: never re-added.
    t.remove(t.find('Id', 'meals-new-moms'));
    gp.gpEnsureTabs_(gp.fakes.spreadsheet);
    expect(cats(gp).map((c) => c.Id)).not.toContain('meals-new-moms');
  });

  it('every new header has a note', () => {
    const gp = loadPortal();
    for (const h of ['Picture', 'Sign-up notices to']) expect(plain(gp.FIELD_NOTES.tabs.Categories[h]).length).toBeGreaterThanOrEqual(2);
  });
});
