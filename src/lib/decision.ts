// Decision status: can the user act on the recommendation, given what is still missing?

import type { CellKey } from '../data/types';
import type { CellStatus } from './cells';
import { canChangeLeader, type Analysis } from './scoring';

export type DecisionStatus =
  | { kind: 'ready' }
  /** A Not found gap that could change #1 has no decision yet. */
  | { kind: 'needs_decision'; keys: CellKey[] }
  /** An info request is open on a gap that could change #1. */
  | { kind: 'provisional'; keys: CellKey[] }
  /** An accepted gap could change #1. */
  | { kind: 'accepted_risk'; keys: CellKey[] };

export function decisionStatus(analysis: Analysis, statusOf: (key: CellKey) => CellStatus): DecisionStatus {
  const changers = analysis.gaps.filter((k) => {
    const t = analysis.tipping[k];
    return t !== undefined && canChangeLeader(t);
  });
  const by = (s: CellStatus) => changers.filter((k) => statusOf(k) === s);
  const undecided = by('not_found');
  if (undecided.length) return { kind: 'needs_decision', keys: undecided };
  const pending = by('info_requested');
  if (pending.length) return { kind: 'provisional', keys: pending };
  const accepted = by('accepted_gap');
  if (accepted.length) return { kind: 'accepted_risk', keys: accepted };
  return { kind: 'ready' };
}

export function isProvisional(s: DecisionStatus): boolean {
  return s.kind === 'needs_decision' || s.kind === 'provisional';
}

export function decisionLabel(s: DecisionStatus): string {
  switch (s.kind) {
    case 'ready':
      return 'Ready to decide';
    case 'needs_decision': {
      const n = s.keys.length;
      return `Needs a decision — ${n} missing ${n === 1 ? 'value' : 'values'} could change #1`;
    }
    case 'provisional': {
      const n = s.keys.length;
      return `Provisional — ${n} pending ${n === 1 ? 'answer' : 'answers'} could change #1`;
    }
    case 'accepted_risk': {
      const n = s.keys.length;
      return `Decided with ${n} accepted ${n === 1 ? 'risk' : 'risks'}`;
    }
  }
}

/** "Recommended: X — 96.6%" or "Provisional recommendation: X — 89.8%". */
export function recommendationPrefix(s: DecisionStatus): string {
  return isProvisional(s) ? 'Provisional recommendation' : 'Recommended';
}
