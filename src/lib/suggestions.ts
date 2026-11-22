// Criteria suggestions: why each one was suggested and how much of the suggestion the user kept.

import type { CriterionId, Scenario } from '../data/types';
import { cellKey } from '../data/types';

/** In how many of the scenario's documents the (simulated) extraction found a value for this criterion. */
export function foundCount(scenario: Scenario, criterionId: CriterionId): { found: number; total: number } {
  const total = scenario.documents.length;
  const found = scenario.documents.filter((d) => scenario.cells[cellKey(criterionId, d.id)]?.extraction === 'found').length;
  return { found, total };
}

export function whySuggested(scenario: Scenario, criterionId: CriterionId): string {
  const { found, total } = foundCount(scenario, criterionId);
  return `Found in ${found} of ${total} documents`;
}

export interface SetupLike {
  criteria: CriterionId[];
  weights: Record<CriterionId, number>;
}

export interface Acceptance {
  /** Suggested (default) criteria still in the setup. */
  kept: number;
  /** Number of suggested (default) criteria. */
  suggested: number;
  /** Kept suggested criteria whose weight differs from the suggested weight. */
  weightsChanged: number;
  /** Criteria in the setup that were not among the suggested ones. */
  added: number;
}

/** Compares a setup with the scenario's suggested default setup. */
export function acceptance(scenario: Scenario, setup: SetupLike): Acceptance {
  const defaults = scenario.criteria.filter((c) => c.defaultWeight !== null);
  const defaultIds = new Set(defaults.map((c) => c.id));
  const kept = defaults.filter((c) => setup.criteria.includes(c.id));
  return {
    kept: kept.length,
    suggested: defaults.length,
    weightsChanged: kept.filter((c) => (setup.weights[c.id] ?? 0) !== c.defaultWeight).length,
    added: setup.criteria.filter((id) => !defaultIds.has(id)).length,
  };
}

/** "You kept 6 of 6 suggested criteria · 0 weights changed · 0 added" */
export function acceptanceText(a: Acceptance): string {
  return `You kept ${a.kept} of ${a.suggested} suggested criteria · ${a.weightsChanged} ${a.weightsChanged === 1 ? 'weight' : 'weights'} changed · ${a.added} added`;
}
