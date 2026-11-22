// Row-level presentation logic for the comparison matrix.

import type { CellKey, CriterionDef } from '../../../data/types';
import { cellKey } from '../../../data/types';
import type { ResolvedCell } from '../../../lib/cells';
import { formatScore, formatValue } from '../../../lib/format';
import { BELOW_EXPECTATION_SCORE } from '../../../lib/rules';
import type { ScenarioView } from '../../../state/selectors';
import { statusText } from '../../../components/ui/StatusBadge';

export interface CellInfo {
  key: CellKey;
  docId: string;
  nickname: string;
  resolved: ResolvedCell;
  score: number;
  valueText: string;
  isBest: boolean;
  isBelow: boolean;
  confidence?: number;
  ariaLabel: string;
}

export interface RowInfo {
  def: CriterionDef;
  weight: number;
  cells: CellInfo[];
  hasPending: boolean;
  allEqual: boolean;
}

const EPS = 1e-9;

export function buildRows(view: ScenarioView): RowInfo[] {
  const scores = view.analysis?.results.cellScores ?? {};
  return view.criteria.map(({ def, weight }) => {
    const raw = view.docs.map((d) => {
      const key = cellKey(def.id, d.id);
      return { key, d, resolved: view.cells[key], score: scores[key] ?? 0 };
    });
    const allEqual = raw.every((r) => Math.abs(r.score - raw[0].score) < EPS);
    const found = raw.filter((r) => !r.resolved.isGap);
    const max = found.length ? Math.max(...found.map((r) => r.score)) : -1;
    const cells: CellInfo[] = raw.map(({ key, d, resolved, score }) => {
      const isBest = !allEqual && !resolved.isGap && Math.abs(score - max) < EPS;
      const isBelow = !resolved.isGap && !isBest && score < BELOW_EXPECTATION_SCORE;
      const confidence = resolved.seed.extraction === 'found' ? resolved.seed.confidence : undefined;
      const valueText = resolved.isGap ? 'No value' : formatValue(def, resolved.value);
      const parts = [
        `${def.name}, ${d.nickname}: ${valueText}`,
        `Score ${formatScore(score)} of 5`,
        statusText(resolved.status, confidence),
        isBest ? 'Best in row' : '',
        isBelow ? 'Below expectation' : '',
        'Open details',
      ].filter(Boolean);
      return {
        key,
        docId: d.id,
        nickname: d.nickname,
        resolved,
        score,
        valueText,
        isBest,
        isBelow,
        confidence,
        ariaLabel: parts.join('. ') + '.',
      };
    });
    return { def, weight, cells, hasPending: cells.some((c) => c.resolved.isPendingReview), allEqual };
  });
}

export function filterRows(rows: RowInfo[], filters: { onlyDifferences: boolean; needsReviewOnly: boolean }): RowInfo[] {
  return rows.filter((r) => (!filters.onlyDifferences || !r.allEqual) && (!filters.needsReviewOnly || r.hasPending));
}
