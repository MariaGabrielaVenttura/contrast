import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/scenarios';
import type { CellKey, CellValue, CriterionDef, Scenario, ScenarioId } from '../data/types';
import { tippingSentence } from './messages';
import {
  adherenceTenths,
  analyze,
  buildInput,
  computeResults,
  distributeEvenly,
  findTippingPoint,
  largestRemainder,
  normalizeWeights,
  plausibleRange,
  scoreCriterion,
  type Analysis,
  type GapPolicy,
  type ScoringInput,
} from './scoring';

// Expected values below are literals copied from SPEC.md. Never edit them to make a test pass.

const num = (value: number): CellValue => ({ kind: 'number', value });
const qual = (score: number): CellValue => ({ kind: 'qualitative', score, text: 'Human-provided' });

function run(id: ScenarioId, overrides: Record<CellKey, CellValue | null> = {}, gapPolicy: GapPolicy = 'penalize'): Analysis {
  return analyze(buildInput(SCENARIOS[id], { overrides, gapPolicy }));
}

/** Adherence per document as displayed (one decimal). */
function adherence(a: Analysis): Record<string, number> {
  return Object.fromEntries(a.results.ranking.map((r) => [r.docId, r.adherenceTenths / 10]));
}
const order = (a: Analysis) => a.results.ranking.map((r) => r.docId);

function sentence(id: ScenarioId, a: Analysis, key: CellKey): string {
  const s: Scenario = SCENARIOS[id];
  const [criterionId, docId] = key.split('|');
  const def = s.criteria.find((c) => c.id === criterionId)!;
  const doc = s.documents.find((d) => d.id === docId)!;
  return tippingSentence(a.tipping[key], doc.defaultNickname, def);
}

describe('SPEC §Scenario A — IT Vendor Selection', () => {
  it('default: Alpha 86.9%, Gamma 80.3%, Beta 68.2%', () => {
    const a = run('A');
    expect(adherence(a)).toEqual({ alpha: 86.9, gamma: 80.3, beta: 68.2 });
    expect(order(a)).toEqual(['alpha', 'gamma', 'beta']);
    expect(a.results.isTie).toBe(false);
  });
  it('default robustness: Medium', () => {
    expect(run('A').robustness.level).toBe('Medium');
  });
  it('tipping point: Gamma senior consultants ≥ 40%', () => {
    const a = run('A');
    expect(a.tipping['a_senior|gamma']).toMatchObject({ kind: 'threshold', operator: '≥', threshold: 40 });
    expect(sentence('A', a, 'a_senior|gamma')).toBe(
      "If Vendor Gamma's share of senior consultants is ≥ 40%, Vendor Gamma would rank #1.",
    );
  });
  it('tipping point: Beta support SLA — "Even the best plausible value would not change the ranking."', () => {
    const a = run('A');
    expect(a.tipping['a_sla|beta']).toEqual({ kind: 'none' });
    expect(sentence('A', a, 'a_sla|beta')).toBe('Even the best plausible value would not change the ranking.');
  });
  it('with Gamma = 80%: Gamma 90.3%, Alpha 84.4%, Beta 66.5%; robustness High', () => {
    const a = run('A', { 'a_senior|gamma': num(80) });
    expect(adherence(a)).toEqual({ gamma: 90.3, alpha: 84.4, beta: 66.5 });
    expect(order(a)).toEqual(['gamma', 'alpha', 'beta']);
    expect(a.robustness.level).toBe('High');
  });
  it('neutral gap policy: Gamma 88.6%, Alpha 86.9%, Beta 75.7% (technical tie)', () => {
    const a = run('A', {}, 'neutral');
    expect(adherence(a)).toEqual({ gamma: 88.6, alpha: 86.9, beta: 75.7 });
    expect(order(a)).toEqual(['gamma', 'alpha', 'beta']);
    expect(a.results.isTie).toBe(true);
    expect(a.results.tiedDocIds).toEqual(['gamma', 'alpha']);
  });
});

describe('SPEC §Scenario B — Company Performance Comparison', () => {
  it('default: North 78.3%, South 70.5%', () => {
    const a = run('B');
    expect(adherence(a)).toEqual({ north: 78.3, south: 70.5 });
    expect(order(a)).toEqual(['north', 'south']);
  });
  it('default robustness: Low', () => {
    expect(run('B').robustness).toMatchObject({ level: 'Low', reason: { kind: 'decisive', gapKey: 'b_churn|south' } });
  });
  it('tipping point: South churn — "Any plausible value would make Company South #1. This gap is decisive."', () => {
    const a = run('B');
    expect(a.tipping['b_churn|south']).toEqual({ kind: 'decisive' });
    expect(sentence('B', a, 'b_churn|south')).toBe('Any plausible value would make Company South #1. This gap is decisive.');
  });
  it('with South churn = 6: South 90.5%, North 71.6%', () => {
    const a = run('B', { 'b_churn|south': num(6) });
    expect(adherence(a)).toEqual({ south: 90.5, north: 71.6 });
    expect(order(a)).toEqual(['south', 'north']);
  });
  it('with South churn = 6: robustness High (derived; not stated in SPEC)', () => {
    const a = run('B', { 'b_churn|south': num(6) });
    expect(a.tipping['b_netdebt|north']).toEqual({ kind: 'none' });
    expect(a.robustness.level).toBe('High');
  });
  it('neutral gap policy: South 90.5%, North 88.3% (technical tie)', () => {
    const a = run('B', {}, 'neutral');
    expect(adherence(a)).toEqual({ south: 90.5, north: 88.3 });
    expect(order(a)).toEqual(['south', 'north']);
    expect(a.results.isTie).toBe(true);
  });
});

describe('SPEC §Scenario C — Contract Risk Review', () => {
  it('default: RotaLog 82.1%, FastFreight 72.5%', () => {
    const a = run('C');
    expect(adherence(a)).toEqual({ rotalog: 82.1, fastfreight: 72.5 });
    expect(order(a)).toEqual(['rotalog', 'fastfreight']);
  });
  it('default robustness: Medium', () => {
    expect(run('C').robustness.level).toBe('Medium');
  });
  it('tipping point: FastFreight termination notice ≤ 62 days', () => {
    const a = run('C');
    expect(a.tipping['c_termination|fastfreight']).toMatchObject({ kind: 'threshold', operator: '≤', threshold: 62 });
    expect(sentence('C', a, 'c_termination|fastfreight')).toBe(
      "If FastFreight's termination notice is ≤ 62 days, FastFreight would rank #1.",
    );
    expect(a.tipping['c_penalty|rotalog']).toEqual({ kind: 'already_first' });
  });
  it('with FastFreight termination = 30: FastFreight 82.5%, RotaLog 77.1%', () => {
    const a = run('C', { 'c_termination|fastfreight': num(30) });
    expect(adherence(a)).toEqual({ fastfreight: 82.5, rotalog: 77.1 });
    expect(order(a)).toEqual(['fastfreight', 'rotalog']);
  });
  it("with FastFreight termination = 30: robustness Low (derived; RotaLog's missing penalty becomes decisive)", () => {
    const a = run('C', { 'c_termination|fastfreight': num(30) });
    expect(a.results.isTie).toBe(false);
    expect(a.tipping['c_penalty|rotalog']).toEqual({ kind: 'decisive' });
    expect(a.robustness).toMatchObject({ level: 'Low', reason: { kind: 'decisive', gapKey: 'c_penalty|rotalog' } });
  });
  it('neutral gap policy: RotaLog 97.1%, FastFreight 82.5%', () => {
    const a = run('C', {}, 'neutral');
    expect(adherence(a)).toEqual({ rotalog: 97.1, fastfreight: 82.5 });
    expect(order(a)).toEqual(['rotalog', 'fastfreight']);
    expect(a.results.isTie).toBe(false);
  });
});

describe('SPEC §Scenario D — Pharma Supplier Qualification', () => {
  it('default: Norden 89.8%, Helix 83.2%, Pacífico 81.6%', () => {
    const a = run('D');
    expect(adherence(a)).toEqual({ norden: 89.8, helix: 83.2, pacifico: 81.6 });
    expect(order(a)).toEqual(['norden', 'helix', 'pacifico']);
  });
  it('default robustness: Medium', () => {
    expect(run('D').robustness).toMatchObject({ level: 'Medium', reason: { kind: 'could_change', gapKey: 'd_inspection|pacifico' } });
  });
  it('tipping point: Pacífico inspection score ≥ 2.8', () => {
    const a = run('D');
    expect(a.tipping['d_inspection|pacifico']).toMatchObject({ kind: 'threshold', operator: '≥', threshold: 2.8 });
    expect(sentence('D', a, 'd_inspection|pacifico')).toBe(
      "If Pacífico Labs' inspection history score is ≥ 2.8, Pacífico Labs would rank #1.",
    );
  });
  it('with Pacífico = 5: Pacífico 96.6%, Norden 89.8%, Helix 83.2%; robustness High', () => {
    const a = run('D', { 'd_inspection|pacifico': qual(5) });
    expect(adherence(a)).toEqual({ pacifico: 96.6, norden: 89.8, helix: 83.2 });
    expect(order(a)).toEqual(['pacifico', 'norden', 'helix']);
    expect(a.robustness.level).toBe('High');
  });
  it('confirming both review items does not change the scores (acceptance 10)', () => {
    // Confirm keeps the extracted value, so overriding with the seed value is equivalent.
    const s = SCENARIOS.D;
    const seed = (k: CellKey) => (s.cells[k].extraction === 'found' ? (s.cells[k] as { value: CellValue }).value : null);
    const a = run('D', {
      'd_impurity|pacifico': seed('d_impurity|pacifico'),
      'd_leadtime|pacifico': seed('d_leadtime|pacifico'),
      'd_inspection|pacifico': qual(5),
    });
    expect(a.results.leaderId).toBe('pacifico');
    expect(a.results.byDoc.pacifico.adherenceTenths / 10).toBe(96.6);
  });
  it('neutral gap policy: Pacífico 95.1%, Norden 89.8%, Helix 83.2%', () => {
    const a = run('D', {}, 'neutral');
    expect(adherence(a)).toEqual({ pacifico: 95.1, norden: 89.8, helix: 83.2 });
    expect(order(a)).toEqual(['pacifico', 'norden', 'helix']);
  });
});

describe('scoring formulas', () => {
  const lower = SCENARIOS.A.criteria.find((c) => c.id === 'a_cost')!;
  const higher = SCENARIOS.A.criteria.find((c) => c.id === 'a_scope')!;
  const qualDef = SCENARIOS.A.criteria.find((c) => c.id === 'a_migration')!;
  const boolDef = SCENARIOS.A.criteria.find((c) => c.id === 'a_training')!;

  it('lower is better: best = 5, others 5 × best ÷ value; gaps score 0 and never count as best', () => {
    const s = scoreCriterion(lower, [num(1_200_000), num(980_000), null], 'penalize');
    expect(s[0]).toBeCloseTo((5 * 980_000) / 1_200_000, 10);
    expect(s[1]).toBe(5);
    expect(s[2]).toBe(0);
  });
  it('higher is better: best = 5, others 5 × value ÷ best', () => {
    const s = scoreCriterion(higher, [num(90), num(70), num(100)], 'penalize');
    expect(s).toEqual([4.5, 3.5, 5]);
  });
  it('higher is better with best = 0 scores 5, not NaN', () => {
    expect(scoreCriterion(higher, [num(0), num(0)], 'penalize')).toEqual([5, 5]);
  });
  it('qualitative passes the 0–5 score through', () => {
    expect(scoreCriterion(qualDef, [qual(4.5), qual(2.5), null], 'penalize')).toEqual([4.5, 2.5, 0]);
  });
  it('Yes = 5, No = 0', () => {
    expect(
      scoreCriterion(boolDef, [{ kind: 'boolean', value: true }, { kind: 'boolean', value: false }], 'penalize'),
    ).toEqual([5, 0]);
  });
  it('a row with no found values scores 0 everywhere', () => {
    expect(scoreCriterion(lower, [null, null], 'penalize')).toEqual([0, 0]);
  });
  it('neutral: a gap gets the mean of the non-gap scores; with no others it gets 0', () => {
    expect(scoreCriterion(higher, [num(90), num(70), null], 'neutral')[2]).toBeCloseTo((5 + (5 * 70) / 90) / 2, 10);
    expect(scoreCriterion(higher, [null, null], 'neutral')).toEqual([0, 0]);
  });
  it('excluding a document recomputes "best" among the remaining documents', () => {
    const r = computeResults(buildInput(SCENARIOS.D, { docIds: ['helix', 'pacifico'] }));
    expect(r.cellScores['d_purity|helix']).toBe(5);
  });
  it('unit conversion: Gamma go-live is stored as 6.0 months (from 26 weeks) and scores 5', () => {
    const seed = SCENARIOS.A.cells['a_golive|gamma'];
    expect(seed.extraction === 'found' && seed.value).toEqual(num(6));
    expect(seed.extraction === 'found' && seed.conversionNote).toContain('26 weeks');
    expect(computeResults(buildInput(SCENARIOS.A)).cellScores['a_golive|gamma']).toBe(5);
  });
});

describe('rounding and technical tie', () => {
  const def = SCENARIOS.D.criteria.find((c) => c.id === 'd_inspection')!;
  function twoDocs(x: number, y: number): ScoringInput {
    return {
      criteria: [{ def, weight: 100 }],
      docIds: ['x', 'y'],
      values: { 'd_inspection|x': qual(x), 'd_inspection|y': qual(y) },
      gapPolicy: 'penalize',
    };
  }
  it('rounds adherence half-up to one decimal', () => {
    expect(adherenceTenths(72.45)).toBe(725);
    expect(adherenceTenths(80.3125)).toBe(803);
    expect(adherenceTenths(88.6458)).toBe(886);
  });
  it('a difference of exactly 5.0 points is a technical tie', () => {
    const r = computeResults(twoDocs(4.25, 4)); // 85.0% vs 80.0%
    expect(r.isTie).toBe(true);
  });
  it('a difference of 5.1 points is a clear winner', () => {
    const r = computeResults(twoDocs(4.255, 4)); // 85.1% vs 80.0%
    expect(r.isTie).toBe(false);
  });
  it('equal totals share rank #1 and are tied', () => {
    const r = computeResults(twoDocs(4, 4));
    expect(r.ranking.map((x) => x.rank)).toEqual([1, 1]);
    expect(r.isTie).toBe(true);
  });
  it('totals use unrounded scores (Alpha 4.3458 / 5 → 86.9%)', () => {
    const r = computeResults(buildInput(SCENARIOS.A));
    expect(r.byDoc.alpha.total).toBeCloseTo(4.345833, 5);
    expect(r.byDoc.alpha.adherence).toBeCloseTo(86.91667, 4);
  });
});

describe('weights', () => {
  it('renormalizes remaining weights proportionally when a criterion is excluded', () => {
    const w = { a_cost: 25, a_golive: 20, a_scope: 20, a_migration: 15, a_sla: 10, a_senior: 10 };
    const n = normalizeWeights(w, ['a_golive', 'a_scope', 'a_migration', 'a_sla', 'a_senior'])!;
    expect(Object.values(n).reduce((a, b) => a + b, 0)).toBeCloseTo(100, 10);
    expect(n.a_golive).toBeCloseTo((20 / 75) * 100, 10);
    expect(n.a_sla).toBeCloseTo((10 / 75) * 100, 10);
  });
  it('returns null when the included weights sum to 0', () => {
    expect(normalizeWeights({ a: 0, b: 0 }, ['a', 'b'])).toBeNull();
  });
  it('largest remainder always sums to 100', () => {
    expect(largestRemainder([26.667, 26.667, 20, 13.333, 13.333])).toEqual([27, 27, 20, 13, 13]);
    expect(largestRemainder([1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it('distribute evenly: 6 → [17,17,17,17,16,16]; 7 → sums to 100', () => {
    expect(distributeEvenly(6)).toEqual([17, 17, 17, 17, 16, 16]);
    expect(distributeEvenly(7)).toEqual([15, 15, 14, 14, 14, 14, 14]);
  });
});

describe('tipping points', () => {
  function leaderWith(input: ScoringInput, key: CellKey, value: CellValue): string {
    const r = computeResults({ ...input, values: { ...input.values, [key]: value } });
    const [, docId] = key.split('|');
    const own = r.byDoc[docId].total;
    return r.ranking.every((o) => o.docId === docId || own > o.total) ? docId : r.leaderId;
  }

  it.each([
    { id: 'A' as ScenarioId, key: 'a_senior|gamma' as CellKey, t: 40, worse: 39, make: num },
    { id: 'C' as ScenarioId, key: 'c_termination|fastfreight' as CellKey, t: 62, worse: 63, make: num },
    { id: 'D' as ScenarioId, key: 'd_inspection|pacifico' as CellKey, t: 2.8, worse: 2.7, make: qual },
  ])('$key: the stated threshold flips the ranking and one step worse does not (conservative rounding)', ({ id, key, t, worse, make }) => {
    const input = buildInput(SCENARIOS[id]);
    const docId = key.split('|')[1];
    expect(findTippingPoint(input, key)).toMatchObject({ threshold: t });
    expect(leaderWith(input, key, make(t))).toBe(docId);
    expect(leaderWith(input, key, make(worse))).not.toBe(docId);
  });

  it('raw boundaries match the hand calculation (Gamma 39.625, FastFreight 62.77, Pacífico 2.734)', () => {
    const g = findTippingPoint(buildInput(SCENARIOS.A), 'a_senior|gamma');
    const f = findTippingPoint(buildInput(SCENARIOS.C), 'c_termination|fastfreight');
    const p = findTippingPoint(buildInput(SCENARIOS.D), 'd_inspection|pacifico');
    expect(g.kind === 'threshold' && g.rawBoundary).toBeCloseTo(39.625, 3);
    expect(f.kind === 'threshold' && f.rawBoundary).toBeCloseTo(62.769, 2);
    expect(p.kind === 'threshold' && p.rawBoundary).toBeCloseTo(2.7339, 3);
  });

  it('plausible range: single found value [0.5v, 1.5v]; percentages capped at 100; qualitative 0–5', () => {
    const churn = SCENARIOS.B.criteria.find((c) => c.id === 'b_churn')!;
    const purity = SCENARIOS.D.criteria.find((c) => c.id === 'd_purity')!;
    const insp = SCENARIOS.D.criteria.find((c) => c.id === 'd_inspection')!;
    const gmp = SCENARIOS.D.criteria.find((c) => c.id === 'd_gmp')!;
    expect(plausibleRange(churn, [9])).toEqual({ min: 4.5, max: 13.5 });
    expect(plausibleRange(purity, [99.6, 99.8])).toEqual({ min: 49.8, max: 100 });
    expect(plausibleRange(insp, [4, 5])).toEqual({ min: 0, max: 5 });
    expect(plausibleRange(gmp, [])).toBeNull();
  });

  it('gaps of the current #1 are reported as already first', () => {
    expect(run('B').tipping['b_netdebt|north']).toEqual({ kind: 'already_first' });
  });

  it('a gap on a weight-0 criterion can never change the ranking', () => {
    // Synthetic fixture (not a SPEC value): SLA weight moved to Senior consultants; Alpha stays #1.
    const input = buildInput(SCENARIOS.A, {
      weights: { a_cost: 25, a_golive: 20, a_scope: 20, a_migration: 15, a_sla: 0, a_senior: 20 },
    });
    expect(computeResults(input).leaderId).toBe('alpha');
    expect(findTippingPoint(input, 'a_sla|beta')).toEqual({ kind: 'none' });
  });

  it('Yes/No gap: tests both values', () => {
    const q = SCENARIOS.D.criteria.find((c) => c.id === 'd_inspection')!;
    const b: CriterionDef = SCENARIOS.D.criteria.find((c) => c.id === 'd_gmp')!;
    const input: ScoringInput = {
      criteria: [
        { def: q, weight: 50 },
        { def: b, weight: 50 },
      ],
      docIds: ['x', 'y'],
      values: {
        'd_inspection|x': qual(5),
        'd_inspection|y': qual(4),
        'd_gmp|x': null,
        'd_gmp|y': { kind: 'boolean', value: true },
      },
      gapPolicy: 'penalize',
    };
    expect(findTippingPoint(input, 'd_gmp|x')).toEqual({ kind: 'boolean', value: true });
  });
});

describe('drivers', () => {
  it('D: lead over #2 is 6.6 points; biggest advantage is Largest single impurity (7.5 points)', () => {
    const d = run('D').drivers!;
    expect(d.firstId).toBe('norden');
    expect(d.secondId).toBe('helix');
    expect(d.gapToSecondPoints).toBeCloseTo(6.6, 10);
    expect(d.top?.criterionId).toBe('d_impurity');
    expect(d.top?.points).toBeCloseTo(7.5, 10);
    expect(d.top?.secondIsGap).toBe(false);
  });
  it("A: biggest advantage is Senior consultants (10.0 points) and flags Gamma's missing value", () => {
    const d = run('A').drivers!;
    expect(d.gapToSecondPoints).toBeCloseTo(6.6, 10);
    expect(d.top?.criterionId).toBe('a_senior');
    expect(d.top?.points).toBeCloseTo(10, 10);
    expect(d.top?.secondIsGap).toBe(true);
  });
});
