import { describe, expect, it } from 'vitest';
import { SCENARIOS } from '../data/scenarios';
import { availableActions, resolveCell } from './cells';

const D = SCENARIOS.D;
const at = '2026-11-21T12:00:00.000Z';

describe('resolveCell', () => {
  it('confidence ≥ 70% → auto; < 70% → Needs review (pending)', () => {
    expect(resolveCell('d_purity|helix', D.cells['d_purity|helix']).status).toBe('auto');
    const r = resolveCell('d_impurity|pacifico', D.cells['d_impurity|pacifico']);
    expect(r.status).toBe('needs_review');
    expect(r.isPendingReview).toBe(true);
  });
  it('70% exactly is not Needs review', () => {
    expect(resolveCell('a_senior|beta', SCENARIOS.A.cells['a_senior|beta']).status).toBe('auto');
  });
  it('Confirm → Human-verified, keeps the extracted value', () => {
    const r = resolveCell('d_impurity|pacifico', D.cells['d_impurity|pacifico'], { type: 'confirm', at });
    expect(r.status).toBe('human_verified');
    expect(r.value).toEqual({ kind: 'number', value: 0.06 });
    expect(r.isPendingReview).toBe(false);
  });
  it('Edit → Human-edited with the new value', () => {
    const r = resolveCell('d_impurity|pacifico', D.cells['d_impurity|pacifico'], {
      type: 'edit',
      value: { kind: 'number', value: 0.07 },
      note: 'Checked the original',
      at,
    });
    expect(r.status).toBe('human_edited');
    expect(r.value).toEqual({ kind: 'number', value: 0.07 });
  });
  it('Not found → gap; Add value → Human-provided; Info requested and Accepted gap stay gaps', () => {
    const seed = D.cells['d_inspection|pacifico'];
    expect(resolveCell('d_inspection|pacifico', seed)).toMatchObject({ status: 'not_found', isGap: true, value: null });
    expect(
      resolveCell('d_inspection|pacifico', seed, {
        type: 'provide',
        value: { kind: 'qualitative', score: 5, text: 'No observations' },
        sourceNote: 'Email from QA',
        at,
      }),
    ).toMatchObject({ status: 'human_provided', isGap: false });
    expect(resolveCell('d_inspection|pacifico', seed, { type: 'request_info', message: 'm', at })).toMatchObject({
      status: 'info_requested',
      isGap: true,
      value: null,
    });
    expect(resolveCell('d_inspection|pacifico', seed, { type: 'accept_gap', at })).toMatchObject({
      status: 'accepted_gap',
      isGap: true,
    });
  });
  it('ignores review actions that do not apply to the seed', () => {
    expect(resolveCell('d_inspection|pacifico', D.cells['d_inspection|pacifico'], { type: 'confirm', at }).status).toBe('not_found');
    expect(resolveCell('d_purity|helix', D.cells['d_purity|helix'], { type: 'accept_gap', at }).status).toBe('auto');
  });
});

describe('availableActions', () => {
  it('matches the SPEC actions per status', () => {
    expect(availableActions('needs_review')).toEqual(['confirm', 'edit']);
    expect(availableActions('not_found')).toEqual(['add_value', 'request_info', 'accept_gap']);
    expect(availableActions('info_requested')).toEqual(['add_value', 'accept_gap']);
    expect(availableActions('accepted_gap')).toEqual(['add_value', 'request_info']);
    expect(availableActions('auto')).toEqual([]);
  });
});
