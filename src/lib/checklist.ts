// Demo checklist step derivation (auto-checking).

import type { Scenario } from '../data/types';
import type { ScenarioSession } from '../state/types';

export interface ChecklistStep {
  id: 1 | 2 | 3 | 4;
  label: string;
  done: boolean;
}

export function checklistSteps(scenario: Scenario, session: ScenarioSession | undefined): ChecklistStep[] {
  const reviewed = (key: string) => {
    const r = session?.reviews[key as keyof ScenarioSession['reviews']];
    return r?.type === 'confirm' || r?.type === 'edit';
  };
  const gap = session?.reviews[scenario.demo.gapCell];
  return [
    { id: 1, label: 'Run the comparison', done: !!session?.hasRun },
    { id: 2, label: 'Confirm the 2 items that need review', done: scenario.demo.reviewCells.every(reviewed) },
    { id: 3, label: scenario.demo.gapStepText, done: gap?.type === 'provide' },
    { id: 4, label: 'Open the report and export it', done: !!session?.exported },
  ];
}

export function isChecklistComplete(steps: ChecklistStep[]): boolean {
  return steps.every((s) => s.done);
}
