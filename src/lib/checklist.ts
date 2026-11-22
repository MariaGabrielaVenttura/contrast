// Demo checklist step derivation (auto-checking).

import { getCriterion } from '../data/scenarios';
import type { Scenario } from '../data/types';
import { splitCellKey } from '../data/types';
import type { ScenarioSession } from '../state/types';
import { lowerFirst, possessive } from './format';

export interface ChecklistStep {
  id: 1 | 2 | 3 | 4;
  label: string;
  /** Optional tip shown under the label. */
  hint?: string;
  done: boolean;
}

export function gapStepLabel(scenario: Scenario, nickname: string): string {
  const def = getCriterion(scenario, splitCellKey(scenario.demo.gapCell).criterionId);
  return `Decide what to do with ${possessive(nickname)} missing ${lowerFirst(def.name)}`;
}

export function checklistSteps(scenario: Scenario, session: ScenarioSession | undefined): ChecklistStep[] {
  const reviewed = (key: string) => {
    const r = session?.reviews[key as keyof ScenarioSession['reviews']];
    return r?.type === 'confirm' || r?.type === 'edit';
  };
  const gapDocId = splitCellKey(scenario.demo.gapCell).docId;
  const nickname = session?.nicknames[gapDocId] ?? scenario.documents.find((d) => d.id === gapDocId)!.defaultNickname;
  const gap = session?.reviews[scenario.demo.gapCell];
  const decided = gap?.type === 'provide' || gap?.type === 'request_info' || gap?.type === 'accept_gap';
  return [
    { id: 1, label: 'Run the comparison', done: !!session?.hasRun },
    { id: 2, label: 'Confirm the 2 items that need review', done: scenario.demo.reviewCells.every(reviewed) },
    { id: 3, label: gapStepLabel(scenario, nickname), hint: `Tip: ${scenario.demo.gapStepText}.`, done: decided },
    { id: 4, label: 'Open the report and export it', done: !!session?.exported },
  ];
}

export function isChecklistComplete(steps: ChecklistStep[]): boolean {
  return steps.every((s) => s.done);
}
