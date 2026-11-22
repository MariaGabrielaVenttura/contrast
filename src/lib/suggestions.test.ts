import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/scenarios';
import { acceptance, acceptanceText, foundCount, whySuggested } from './suggestions';

const D = SCENARIOS.D;
const A = SCENARIOS.A;
const defaultsD = { d_purity: 25, d_impurity: 20, d_gmp: 15, d_price: 15, d_leadtime: 10, d_inspection: 15 };

describe('why suggested', () => {
  it('counts found values from the scenario cells (not hardcoded)', () => {
    expect(foundCount(D, 'd_purity')).toEqual({ found: 3, total: 3 });
    expect(foundCount(D, 'd_inspection')).toEqual({ found: 2, total: 3 });
    expect(foundCount(SCENARIOS.B, 'b_churn')).toEqual({ found: 1, total: 2 });
    expect(whySuggested(D, 'd_purity')).toBe('Found in 3 of 3 documents');
    expect(whySuggested(D, 'd_inspection')).toBe('Found in 2 of 3 documents · the missing one is flagged as a gap');
  });
  it('pluralizes when more than one document is missing the value', () => {
    const synthetic = {
      ...D,
      cells: {
        ...D.cells,
        'd_purity|helix': { extraction: 'not_found' as const, searchNote: 'x' },
        'd_purity|norden': { extraction: 'not_found' as const, searchNote: 'x' },
      },
    };
    expect(whySuggested(synthetic, 'd_purity')).toBe('Found in 1 of 3 documents · the missing ones are flagged as gaps');
  });
  it('every criterion, suggestions included, has a reason', () => {
    for (const s of Object.values(SCENARIOS)) for (const c of s.criteria) expect(c.suggestionReason.length, c.id).toBeGreaterThan(10);
  });
});

describe('suggestion acceptance', () => {
  it('default setup: kept 6 of 6, 0 weights changed, 0 added', () => {
    const a = acceptance(D, { criteria: Object.keys(defaultsD), weights: defaultsD });
    expect(a).toEqual({ kept: 6, suggested: 6, weightsChanged: 0, added: 0 });
    expect(acceptanceText(a)).toBe('You kept 6 of 6 suggested criteria · 0 weights changed · 0 added');
  });
  it('removing one, changing one weight and adding one suggestion', () => {
    const a = acceptance(A, {
      criteria: ['a_cost', 'a_golive', 'a_scope', 'a_migration', 'a_sla', 'a_refs'],
      weights: { a_cost: 30, a_golive: 20, a_scope: 20, a_migration: 15, a_sla: 10, a_refs: 5 },
    });
    expect(a).toEqual({ kept: 5, suggested: 6, weightsChanged: 1, added: 1 });
    expect(acceptanceText(a)).toBe('You kept 5 of 6 suggested criteria · 1 weight changed · 1 added');
  });
  it('removed criteria never count as weight changes; reordering changes nothing', () => {
    const a = acceptance(D, {
      criteria: ['d_inspection', 'd_purity', 'd_impurity', 'd_gmp', 'd_price'],
      weights: { d_inspection: 15, d_purity: 35, d_impurity: 20, d_gmp: 15, d_price: 15 },
    });
    expect(a).toEqual({ kept: 5, suggested: 6, weightsChanged: 1, added: 0 });
  });
  it('Distribute evenly on 6 defaults changes every weight', () => {
    const w = { d_purity: 17, d_impurity: 17, d_gmp: 17, d_price: 17, d_leadtime: 16, d_inspection: 16 };
    expect(acceptance(D, { criteria: Object.keys(w), weights: w }).weightsChanged).toBe(6);
  });
});
