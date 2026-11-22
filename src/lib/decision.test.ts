import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/scenarios';
import type { CellKey, CellValue, ScenarioId } from '../data/types';
import type { CellStatus } from './cells';
import { decisionLabel, decisionStatus, recommendationPrefix } from './decision';
import { analyze, buildInput } from './scoring';

/** Builds an analysis where `statuses` set gap cells to a status and `values` fill cells. */
function status(id: ScenarioId, statuses: Record<CellKey, CellStatus> = {}, values: Record<CellKey, CellValue> = {}) {
  const a = analyze(buildInput(SCENARIOS[id], { overrides: values }));
  return decisionStatus(a, (k) => statuses[k] ?? (a.input.values[k] === null ? 'not_found' : 'auto'));
}

describe('decision status', () => {
  it('D default: an undecided missing value could change #1 → provisional headline', () => {
    const s = status('D');
    expect(s).toEqual({ kind: 'needs_decision', keys: ['d_inspection|pacifico'] });
    expect(decisionLabel(s)).toBe('Needs a decision — 1 missing value could change #1');
    expect(recommendationPrefix(s)).toBe('Provisional recommendation');
  });

  it('D with an info request on Pacífico: "Provisional — 1 pending answer could change #1"', () => {
    const s = status('D', { 'd_inspection|pacifico': 'info_requested' });
    expect(decisionLabel(s)).toBe('Provisional — 1 pending answer could change #1');
    expect(recommendationPrefix(s)).toBe('Provisional recommendation');
  });

  it('D with the gap accepted as a risk: "Decided with 1 accepted risk"', () => {
    const s = status('D', { 'd_inspection|pacifico': 'accepted_gap' });
    expect(decisionLabel(s)).toBe('Decided with 1 accepted risk');
    expect(recommendationPrefix(s)).toBe('Recommended');
  });

  it('D after adding score 5: "Ready to decide"', () => {
    const s = status('D', {}, { 'd_inspection|pacifico': { kind: 'qualitative', score: 5, text: 'No observations' } });
    expect(s).toEqual({ kind: 'ready' });
    expect(decisionLabel(s)).toBe('Ready to decide');
  });

  it('A: gaps that cannot change #1 never count (Beta SLA requested, Gamma accepted → accepted risk only)', () => {
    const s = status('A', { 'a_sla|beta': 'info_requested', 'a_senior|gamma': 'accepted_gap' });
    expect(s).toEqual({ kind: 'accepted_risk', keys: ['a_senior|gamma'] });
  });

  it('A after Gamma = 80%: Beta SLA cannot change #1, so Ready to decide even while untouched', () => {
    expect(status('A', {}, { 'a_senior|gamma': { kind: 'number', value: 80 } })).toEqual({ kind: 'ready' });
  });

  it('B: a decisive gap with an open request is provisional', () => {
    expect(decisionLabel(status('B', { 'b_churn|south': 'info_requested' }))).toBe('Provisional — 1 pending answer could change #1');
  });

  it("C after FastFreight = 30 days: RotaLog's untouched penalty gap needs a decision", () => {
    const s = status('C', {}, { 'c_termination|fastfreight': { kind: 'number', value: 30 } });
    expect(s).toEqual({ kind: 'needs_decision', keys: ['c_penalty|rotalog'] });
  });

  it('precedence: undecided beats pending beats accepted', () => {
    // C default: FastFreight termination is the only changer (RotaLog is #1).
    expect(status('C', { 'c_termination|fastfreight': 'not_found' }).kind).toBe('needs_decision');
    expect(status('C', { 'c_termination|fastfreight': 'info_requested' }).kind).toBe('provisional');
    expect(status('C', { 'c_termination|fastfreight': 'accepted_gap' }).kind).toBe('accepted_risk');
  });

  it('technical tie takes priority: "Too close to call: review the drivers before deciding"', () => {
    // SPEC neutral-policy result for A is a technical tie (Gamma 88.6% vs Alpha 86.9%).
    const a = analyze(buildInput(SCENARIOS.A, { gapPolicy: 'neutral' }));
    expect(a.results.isTie).toBe(true);
    const s = decisionStatus(a, () => 'auto');
    expect(s).toEqual({ kind: 'too_close' });
    expect(decisionLabel(s)).toBe('Too close to call: review the drivers before deciding');
  });

  it('a tie with no open gaps shows "Too close to call", not "Ready to decide"', () => {
    // Synthetic input (not a SPEC value): Pacífico's inspection filled with score 3 → Pacífico 90.6% vs Norden 89.8%.
    const a = analyze(buildInput(SCENARIOS.D, { overrides: { 'd_inspection|pacifico': { kind: 'qualitative', score: 3, text: 'x' } } }));
    expect(a.gaps).toEqual([]);
    expect(a.results.isTie).toBe(true);
    expect(a.results.ranking.map((r) => [r.docId, r.adherenceTenths])).toEqual([
      ['pacifico', 906],
      ['norden', 898],
      ['helix', 832],
    ]);
    expect(decisionStatus(a, () => 'auto').kind).toBe('too_close');
  });

  it('a tie also takes priority over open-gap statuses', () => {
    // Synthetic weights (not SPEC values) that put all three D documents within 5.0 points while Pacífico's gap is open.
    const weights = { d_purity: 25, d_impurity: 10, d_gmp: 15, d_price: 25, d_leadtime: 10, d_inspection: 15 };
    const a = analyze(buildInput(SCENARIOS.D, { weights }));
    expect(a.results.isTie).toBe(true);
    expect(decisionStatus(a, (k) => (a.input.values[k] === null ? 'not_found' : 'auto')).kind).toBe('too_close');
  });

  it('pluralizes', () => {
    expect(decisionLabel({ kind: 'provisional', keys: ['a|b', 'c|d'] })).toBe('Provisional — 2 pending answers could change #1');
    expect(decisionLabel({ kind: 'accepted_risk', keys: ['a|b', 'c|d'] })).toBe('Decided with 2 accepted risks');
  });
});
