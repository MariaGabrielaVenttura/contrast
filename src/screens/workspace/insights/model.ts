// Insight texts derived from an analysis. Shared by Insights, Report and Copy summary.

import { getCriterion } from '../../../data/scenarios';
import type { CellKey, DocId, Scenario } from '../../../data/types';
import { splitCellKey } from '../../../data/types';
import type { CellStatus } from '../../../lib/cells';
import { STATUS_LABEL } from '../../../lib/cells';
import { formatPercent, formatPoints, formatScore, possessive } from '../../../lib/format';
import { robustnessReason, tippingSentence } from '../../../lib/messages';
import { canChangeLeader, type Analysis, type Robustness } from '../../../lib/scoring';

export interface GapItem {
  key: CellKey;
  docId: DocId;
  docName: string;
  criterionName: string;
  status: CellStatus;
  statusLabel: string;
  sentence: string;
  canChange: boolean;
}

export interface InsightsModel {
  leaderId: DocId;
  leaderName: string;
  leaderAdherence: number;
  isTie: boolean;
  tiedNames: string[];
  tieText: string;
  recommendationText: string;
  robustness: Robustness;
  robustnessText: string;
  gapToSecondText: string | null;
  topAdvantageText: string | null;
  gaps: GapItem[];
  ranking: { docId: DocId; name: string; adherence: number; total: number; rank: number }[];
}

function joinNames(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

export function insightsModel(
  scenario: Scenario,
  analysis: Analysis,
  nickname: (id: DocId) => string,
  statusOf: (key: CellKey) => CellStatus,
): InsightsModel {
  const { results, drivers, robustness, tipping } = analysis;
  const leaderId = results.leaderId;
  const leaderName = nickname(leaderId);
  const ranking = results.ranking.map((r) => ({ docId: r.docId, name: nickname(r.docId), adherence: r.adherence, total: r.total, rank: r.rank }));
  const tied = results.tiedDocIds.map((id) => `${nickname(id)} (${formatPercent(results.byDoc[id].adherence)})`);
  const tieText = results.isTie
    ? `Technical tie: ${joinNames(tied)} are within 5.0 points. Review what drives the result before deciding.`
    : '';

  const reasonKey = 'gapKey' in robustness.reason ? robustness.reason.gapKey : undefined;
  const reasonParts = reasonKey ? splitCellKey(reasonKey) : undefined;
  const robustnessText = robustnessReason(robustness, {
    leaderName,
    gapToSecondPoints: drivers?.gapToSecondPoints ?? 0,
    gapDocName: reasonParts ? nickname(reasonParts.docId) : undefined,
    gapCriterion: reasonParts ? getCriterion(scenario, reasonParts.criterionId) : undefined,
  });

  let gapToSecondText: string | null = null;
  let topAdvantageText: string | null = null;
  if (drivers) {
    const n1 = nickname(drivers.firstId);
    const n2 = nickname(drivers.secondId);
    gapToSecondText = `Lead over #2: ${formatPoints(drivers.gapToSecondPoints)} points (${n1} ${formatPercent(
      results.byDoc[drivers.firstId].adherence,
    )} vs ${n2} ${formatPercent(results.byDoc[drivers.secondId].adherence)}).`;
    if (drivers.top) {
      const def = getCriterion(scenario, drivers.top.criterionId);
      topAdvantageText = `Biggest advantage: ${def.name}. ${n1} scores ${formatScore(drivers.top.firstScore)} vs ${formatScore(
        drivers.top.secondScore,
      )}, worth ${formatPoints(drivers.top.points)} points.${drivers.top.secondIsGap ? ` (${possessive(n2)} value is missing.)` : ''}`;
    }
  }

  const rankOf = (id: DocId) => results.byDoc[id]?.rank ?? 99;
  const order = analysis.input.criteria.map((c) => c.def.id);
  const gaps: GapItem[] = analysis.gaps
    .map((key) => {
      const { criterionId, docId } = splitCellKey(key);
      const def = getCriterion(scenario, criterionId);
      const t = tipping[key];
      const status = statusOf(key);
      return {
        key,
        docId,
        docName: nickname(docId),
        criterionName: def.name,
        status,
        statusLabel: STATUS_LABEL[status],
        sentence: tippingSentence(t, nickname(docId), def),
        canChange: canChangeLeader(t),
      };
    })
    .sort((a, b) => rankOf(a.docId) - rankOf(b.docId) || order.indexOf(splitCellKey(a.key).criterionId) - order.indexOf(splitCellKey(b.key).criterionId));

  return {
    leaderId,
    leaderName,
    leaderAdherence: results.byDoc[leaderId].adherence,
    isTie: results.isTie,
    tiedNames: results.tiedDocIds.map(nickname),
    tieText,
    recommendationText: `Recommended: ${leaderName} — ${formatPercent(results.byDoc[leaderId].adherence)}`,
    robustness,
    robustnessText,
    gapToSecondText,
    topAdvantageText,
    gaps,
    ranking,
  };
}
