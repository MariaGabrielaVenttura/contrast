// Human-readable scoring rules (shown on Criteria, in the evidence panel and in the report).

import type { CriterionDef } from '../data/types';

export function ruleLabel(def: CriterionDef): string {
  if (def.kind === 'qualitative') return 'Qualitative score (0–5)';
  if (def.kind === 'boolean') return 'Yes = 5, No = 0';
  return def.direction === 'lower' ? 'Lower is better' : 'Higher is better';
}

export function ruleExplanation(def: CriterionDef): string {
  if (def.kind === 'qualitative') return 'Qualitative: scored 0–5 from the evidence. The rationale is always shown.';
  if (def.kind === 'boolean') return 'Yes/No: Yes scores 5, No scores 0.';
  return def.direction === 'lower'
    ? 'Lower is better: the best found value scores 5; others score 5 × best ÷ value.'
    : 'Higher is better: the best found value scores 5; others score 5 × value ÷ best.';
}

export const GAP_RULE =
  "How gaps are scored: a missing value scores 0. Unverified information shouldn't earn points, and a missing answer is itself a risk signal.";

/** Found scores under this threshold are flagged "Below expectation" (amber). */
export const BELOW_EXPECTATION_SCORE = 3;
