import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/scenarios';
import { initialState, reducer, type Action } from './reducer';
import { deriveView } from './selectors';
import type { AppState } from './types';

const at = '2026-11-22T10:00:00.000Z';
let n = 0;
const id = () => `t${++n}`;

function apply(state: AppState, ...actions: Action[]): AppState {
  return actions.reduce(reducer, state);
}
const quick = (scenarioId: 'A' | 'B' | 'C' | 'D'): Action => ({ type: 'QUICK_START', scenarioId, at, id: id(), withWelcome: false });
const view = (s: AppState) => deriveView(SCENARIOS[s.activeScenarioId!], s.sessions[s.activeScenarioId!]!);

describe('reducer', () => {
  it('Quick demo loads D with defaults, runs the comparison and opens the welcome modal', () => {
    const s = apply(initialState, { type: 'QUICK_START', scenarioId: 'D', at, id: id(), withWelcome: true });
    expect(s.activeScenarioId).toBe('D');
    expect(s.ui.welcomeOpen).toBe(true);
    const d = s.sessions.D!;
    expect(d.hasRun).toBe(true);
    expect(d.stage).toBe('workspace');
    expect(d.audit[0]).toMatchObject({ action: 'comparison_run', actor: 'Contrast (simulated AI)' });
    expect(d.audit[0].summary).toBe('Extracted 17 of 18 values from 3 documents: 2 need review, 1 not found.');
    const v = view(s);
    expect(v.pendingReviewKeys).toHaveLength(2);
    expect(v.checklist.map((c) => c.done)).toEqual([true, false, false, false]);
  });

  it('Load sample scenario opens Setup step 1 without running', () => {
    const s = apply(initialState, { type: 'OPEN_SCENARIO', scenarioId: 'A' });
    expect(s.sessions.A).toMatchObject({ stage: 'setup', hasRun: false });
  });

  it('Run comparison is blocked unless weights total 100; criteria cannot drop below 3', () => {
    let s = apply(initialState, { type: 'OPEN_SCENARIO', scenarioId: 'A' }, { type: 'SET_WEIGHT', criterionId: 'a_cost', weight: 20 });
    s = apply(s, { type: 'RUN_COMPARISON', at, id: id() });
    expect(s.sessions.A!.hasRun).toBe(false);
    s = apply(
      s,
      { type: 'REMOVE_CRITERION', criterionId: 'a_cost' },
      { type: 'REMOVE_CRITERION', criterionId: 'a_golive' },
      { type: 'REMOVE_CRITERION', criterionId: 'a_scope' },
      { type: 'REMOVE_CRITERION', criterionId: 'a_migration' },
    );
    expect(s.sessions.A!.setup.criteria).toHaveLength(3);
  });

  it('review decisions persist across Edit setup → Run and criterion remove/re-add', () => {
    let s = apply(initialState, quick('D'), {
      type: 'REVIEW',
      key: 'd_impurity|pacifico',
      review: { type: 'confirm', at },
      id: id(),
    });
    s = apply(
      s,
      { type: 'SET_STAGE', stage: 'setup' },
      { type: 'SET_STAGE', stage: 'criteria' },
      { type: 'SET_WEIGHT', criterionId: 'd_purity', weight: 20 },
      { type: 'SET_WEIGHT', criterionId: 'd_leadtime', weight: 15 },
      { type: 'RUN_COMPARISON', at, id: id() },
    );
    expect(s.sessions.D!.reviews['d_impurity|pacifico']?.type).toBe('confirm');
    expect(s.sessions.D!.audit.at(-1)?.summary).toBe('Setup updated: Assay purity 25% → 20%; Lead time 10% → 15%.');
    expect(view(s).cells['d_impurity|pacifico'].status).toBe('human_verified');
  });

  it('switching scenario keeps progress per scenario', () => {
    let s = apply(initialState, quick('D'), {
      type: 'REVIEW',
      key: 'd_inspection|pacifico',
      review: { type: 'provide', value: { kind: 'qualitative', score: 5, text: 'No observations' }, sourceNote: 'QA email', at },
      id: id(),
    });
    s = apply(s, quick('A'));
    expect(s.activeScenarioId).toBe('A');
    s = apply(s, quick('D'));
    expect(s.sessions.D!.reviews['d_inspection|pacifico']?.type).toBe('provide');
    expect(view(s).analysis!.results.leaderId).toBe('pacifico');
  });

  it('Start over clears every scenario and returns to Start', () => {
    const s = apply(initialState, quick('D'), quick('A'), { type: 'RESET_ALL' });
    expect(s.activeScenarioId).toBeNull();
    expect(s.sessions).toEqual({});
  });

  it('report lock: pending count drops to 0 after both review items are resolved', () => {
    let s = apply(initialState, quick('D'));
    expect(view(s).pendingReviewKeys).toHaveLength(2);
    s = apply(
      s,
      { type: 'REVIEW', key: 'd_impurity|pacifico', review: { type: 'confirm', at }, id: id() },
      { type: 'REVIEW', key: 'd_leadtime|pacifico', review: { type: 'edit', value: { kind: 'number', value: 7 }, note: '', at }, id: id() },
    );
    expect(view(s).pendingReviewKeys).toHaveLength(0);
    expect(view(s).checklist[1].done).toBe(true);
  });

  it('info request sets Info requested, scores 0 and appears in open requests', () => {
    const s = apply(initialState, quick('A'), {
      type: 'REVIEW',
      key: 'a_sla|beta',
      review: { type: 'request_info', message: 'Hello', at },
      id: id(),
    });
    const v = view(s);
    expect(v.cells['a_sla|beta'].status).toBe('info_requested');
    expect(v.analysis!.results.cellScores['a_sla|beta']).toBe(0);
    expect(v.openRequestKeys).toEqual(['a_sla|beta']);
    expect(v.gapKeys).toContain('a_sla|beta');
  });

  it.each([
    ['add value', { type: 'provide', value: { kind: 'qualitative', score: 5, text: 'No observations' }, sourceNote: 'QA email', at }],
    ['request info', { type: 'request_info', message: 'Hello', at }],
    ['accept risk', { type: 'accept_gap', reason: 'Inspection history is checked during the audit', at }],
  ] as const)('checklist step 3 completes on %s', (_, review) => {
    const s = apply(initialState, quick('D'), { type: 'REVIEW', key: 'd_inspection|pacifico', review, id: id() });
    const step = view(s).checklist[2];
    expect(step.label).toBe("Decide what to do with Pacífico Labs' missing regulatory inspection history");
    expect(step.hint).toContain('watch it jump from 3rd to 1st');
    expect(step.done).toBe(true);
  });

  it('checklist step 3 is not done by actions on other gaps; label follows the nickname', () => {
    const s = apply(
      initialState,
      quick('A'),
      { type: 'REVIEW', key: 'a_sla|beta', review: { type: 'request_info', message: 'Hello', at }, id: id() },
      { type: 'SET_NICKNAME', docId: 'gamma', value: 'Gamma Ltd' },
    );
    expect(view(s).checklist[2]).toMatchObject({ done: false, label: "Decide what to do with Gamma Ltd's missing senior consultants on the team" });
  });

  it('accepting a risk records the reason; a simulated supplier reply fills the value and is logged', () => {
    let s = apply(initialState, quick('D'), {
      type: 'REVIEW',
      key: 'd_inspection|pacifico',
      review: { type: 'accept_gap', reason: 'Checked in the on-site audit', at },
      id: id(),
    });
    expect(s.sessions.D!.audit.at(-1)).toMatchObject({
      action: 'gap_accepted',
      summary: "Decided without Pacífico Labs' regulatory inspection history (accepted risk, scores 0). Reason: Checked in the on-site audit",
    });
    expect(s.sessions.D!.audit.at(-1)?.note).toBeUndefined();
    s = apply(
      s,
      { type: 'REVIEW', key: 'd_inspection|pacifico', review: { type: 'request_info', message: 'm', at }, id: id() },
      {
        type: 'REVIEW',
        key: 'd_inspection|pacifico',
        review: {
          type: 'provide',
          value: SCENARIOS.D.demo.suggestedValue,
          sourceNote: 'Supplier reply (simulated)',
          via: 'supplier_reply',
          at,
        },
        id: id(),
      },
    );
    expect(s.sessions.D!.audit.at(-1)).toMatchObject({
      actor: 'Supplier (simulated)',
      action: 'supplier_reply',
      summary: 'Supplier reply received for Pacífico Labs · Regulatory inspection history: score 5.0 (No observations in the last two inspections).',
    });
    expect(s.sessions.D!.audit.at(-1)?.note).toBeUndefined();
    expect(view(s).analysis!.results.byDoc.pacifico.adherenceTenths).toBe(966);
  });

  it('checklist steps 3 and 4 auto-check', () => {
    let s = apply(initialState, quick('C'), {
      type: 'REVIEW',
      key: 'c_termination|fastfreight',
      review: { type: 'provide', value: { kind: 'number', value: 30 }, sourceNote: 'Email', at },
      id: id(),
    });
    expect(view(s).checklist[2].done).toBe(true);
    expect(view(s).analysis!.results.leaderId).toBe('fastfreight');
    s = apply(s, { type: 'MARK_EXPORTED' });
    expect(view(s).checklist[3].done).toBe(true);
  });

  it('What-if stays separate: confirmed results unchanged; Reset clears; Apply writes integer weights summing to 100', () => {
    let s = apply(initialState, quick('A'), { type: 'SET_WHATIF', patch: { gapPolicy: 'neutral' } });
    let v = view(s);
    expect(v.analysis!.results.leaderId).toBe('alpha');
    expect(v.whatIf!.analysis!.results.leaderId).toBe('gamma');
    expect(v.whatIf!.modified).toBe(true);
    s = apply(s, { type: 'RESET_WHATIF' });
    expect(view(s).whatIf!.modified).toBe(false);

    s = apply(s, { type: 'SET_WHATIF', patch: { excludedCriteria: ['a_cost'] } });
    v = view(s);
    expect(v.whatIf!.effectiveWeights!.a_golive).toBeCloseTo((20 / 75) * 100, 10);
    s = apply(s, { type: 'APPLY_WHATIF', at, id: id() });
    const setup = s.sessions.A!.setup;
    expect(setup.criteria).not.toContain('a_cost');
    expect(Object.values(setup.weights).reduce((a, b) => a + b, 0)).toBe(100);
    expect(setup.weights).toEqual({ a_golive: 27, a_scope: 27, a_migration: 20, a_sla: 13, a_senior: 13 });
    expect(s.sessions.A!.whatIf).toBeNull();
    expect(s.sessions.A!.audit.at(-1)?.action).toBe('whatif_applied');
  });

  it('What-if keeps at least 2 documents and 3 criteria', () => {
    let s = apply(initialState, quick('B'), { type: 'SET_WHATIF', patch: { excludedDocs: ['north'] } });
    expect(s.sessions.B!.whatIf).toBeNull();
    s = apply(s, { type: 'SET_WHATIF', patch: { excludedCriteria: ['b_growth', 'b_ebitda', 'b_churn', 'b_nps'] } });
    expect(s.sessions.B!.whatIf).toBeNull();
  });

  it('adds a suggestion with weight 0 and Distribute evenly sums to 100', () => {
    let s = apply(initialState, { type: 'OPEN_SCENARIO', scenarioId: 'A' }, { type: 'ADD_CRITERION', criterionId: 'a_refs' });
    expect(s.sessions.A!.setup.weights.a_refs).toBe(0);
    s = apply(s, { type: 'DISTRIBUTE_EVENLY' });
    expect(Object.values(s.sessions.A!.setup.weights)).toEqual([15, 15, 14, 14, 14, 14, 14]);
  });
});

describe('What-if reproduces the SPEC neutral gap policy results', () => {
  const neutral = (id: 'A' | 'B' | 'C' | 'D') => {
    const s = apply(initialState, quick(id), { type: 'SET_WHATIF', patch: { gapPolicy: 'neutral' } });
    const v = view(s);
    return {
      after: Object.fromEntries(v.whatIf!.analysis!.results.ranking.map((r) => [r.docId, r.adherenceTenths / 10])),
      tie: v.whatIf!.analysis!.results.isTie,
      confirmedLeader: v.analysis!.results.leaderId,
    };
  };
  it('A: Gamma 88.6%, Alpha 86.9%, Beta 75.7% (technical tie); confirmed result unchanged', () => {
    expect(neutral('A')).toEqual({ after: { gamma: 88.6, alpha: 86.9, beta: 75.7 }, tie: true, confirmedLeader: 'alpha' });
  });
  it('B: South 90.5%, North 88.3% (technical tie)', () => {
    expect(neutral('B')).toMatchObject({ after: { south: 90.5, north: 88.3 }, tie: true });
  });
  it('C: RotaLog 97.1%, FastFreight 82.5%', () => {
    expect(neutral('C')).toMatchObject({ after: { rotalog: 97.1, fastfreight: 82.5 }, tie: false });
  });
  it('D: Pacífico 95.1%, Norden 89.8%, Helix 83.2%', () => {
    expect(neutral('D')).toMatchObject({ after: { pacifico: 95.1, norden: 89.8, helix: 83.2 } });
  });
  it('moving one weight updates the simulation only; Reset restores the confirmed setup', () => {
    let s = apply(initialState, quick('D'), { type: 'SET_WHATIF', patch: { weights: { ...defaultWeightsD, d_inspection: 60 } } });
    expect(view(s).whatIf!.modified).toBe(true);
    expect(view(s).analysis!.results.leaderId).toBe('norden');
    expect(s.sessions.D!.setup.weights.d_inspection).toBe(15);
    s = apply(s, { type: 'RESET_WHATIF' });
    expect(view(s).whatIf!.modified).toBe(false);
  });
});

const defaultWeightsD = { d_purity: 25, d_impurity: 20, d_gmp: 15, d_price: 15, d_leadtime: 10, d_inspection: 15 };
