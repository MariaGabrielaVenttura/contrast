// User-facing sentences generated from engine results. Wording follows SPEC.md exactly where given.

import type { CriterionDef } from '../data/types';
import { formatAmount, formatPercent, formatPoints, pluralize, possessive } from './format';
import type { Robustness, TippingResult } from './scoring';

export function tippingSentence(t: TippingResult, docName: string, def: CriterionDef): string {
  switch (t.kind) {
    case 'threshold':
      return `If ${possessive(docName)} ${def.messageName} is ${t.operator} ${formatAmount(def, t.threshold)}, ${docName} would rank #1.`;
    case 'boolean':
      return `If ${possessive(docName)} ${def.messageName} is ${t.value ? 'Yes' : 'No'}, ${docName} would rank #1.`;
    case 'decisive':
      return `Any plausible value would make ${docName} #1. This gap is decisive.`;
    case 'none':
      return 'Even the best plausible value would not change the ranking.';
    case 'already_first':
      return `${docName} is already #1. Filling this gap can only widen its lead.`;
  }
}

export interface RobustnessContext {
  leaderName: string;
  gapToSecondPoints: number;
  /** Document and criterion of the gap named in the reason, when there is one. */
  gapDocName?: string;
  gapCriterion?: CriterionDef;
}

export function robustnessReason(r: Robustness, ctx: RobustnessContext): string {
  switch (r.reason.kind) {
    case 'tie':
      return 'The top documents are within 5.0 points of each other.';
    case 'decisive':
      return `${possessive(ctx.gapDocName ?? '')} missing ${ctx.gapCriterion?.messageName ?? 'value'} is decisive: any plausible value would make it #1.`;
    case 'could_change':
      return `${ctx.leaderName} leads clearly, but ${possessive(ctx.gapDocName ?? '')} missing ${ctx.gapCriterion?.messageName ?? 'value'} could change #1.`;
    case 'safe':
      return `${ctx.leaderName} leads by ${formatPoints(ctx.gapToSecondPoints)} points and no open gap can change #1.`;
  }
}

export function reviewCounter(pendingReviews: number, openGaps: number): string {
  const items = pendingReviews === 1 ? '1 item needs review' : `${pendingReviews} items need review`;
  return `${items} · ${pluralize(openGaps, 'gap', 'gaps')}`;
}

export interface InfoRequestContext {
  criterionName: string;
  nickname: string;
  documentName: string;
  question: string;
  ask: string;
}

export function infoRequestMessage(c: InfoRequestContext): string {
  return [
    `Subject: Information request — ${c.criterionName}`,
    '',
    `Hello ${c.nickname} team,`,
    '',
    `We are reviewing "${c.documentName}" to answer: "${c.question}"`,
    `We could not find ${c.ask} in the document. Could you share it, together with where it is stated (page, clause or cell)?`,
    '',
    'Thank you.',
  ].join('\n');
}

export interface SummaryContext {
  scenarioTitle: string;
  question: string;
  isTie: boolean;
  tiedNames: string[];
  leaderName: string;
  leaderAdherence: number;
  robustnessLevel: string;
  ranking: { name: string; adherence: number }[];
  openGaps: string[];
  openRequests: number;
}

export function copySummary(c: SummaryContext): string {
  const headline = c.isTie
    ? `Technical tie: ${c.tiedNames.join(' and ')} (Decision robustness: ${c.robustnessLevel})`
    : `Recommended: ${c.leaderName} — ${formatPercent(c.leaderAdherence)} (Decision robustness: ${c.robustnessLevel})`;
  return [
    `Contrast decision brief — ${c.scenarioTitle}`,
    `Question: ${c.question}`,
    headline,
    `Ranking: ${c.ranking.map((r, i) => `${i + 1}. ${r.name} ${formatPercent(r.adherence)}`).join(' · ')}`,
    `Open gaps: ${c.openGaps.length === 0 ? 'none' : `${c.openGaps.length} (${c.openGaps.join('; ')})`}`,
    `Open information requests: ${c.openRequests === 0 ? 'none' : c.openRequests}`,
    'Simulated AI results and fictional data.',
  ].join('\n');
}
