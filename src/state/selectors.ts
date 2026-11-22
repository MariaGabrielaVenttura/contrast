// Derived, read-only view of a scenario session. Every number shown in the UI comes from here.

import { useMemo } from 'react';
import { getCriterion } from '../data/scenarios';
import type { CellKey, CriterionDef, DocId, DocumentInfo, Scenario } from '../data/types';
import { cellKey } from '../data/types';
import { resolveCell, type ResolvedCell } from '../lib/cells';
import { checklistSteps, type ChecklistStep } from '../lib/checklist';
import { analyze, buildInput, normalizeWeights, type Analysis } from '../lib/scoring';
import { isSetupValid, isWhatIfModified, MIN_CRITERIA } from './reducer';
import type { ScenarioSession, WhatIfState } from './types';

export interface DocView {
  id: DocId;
  nickname: string;
  info: DocumentInfo;
}

export interface CriterionView {
  def: CriterionDef;
  weight: number;
}

export interface WhatIfView {
  state: WhatIfState;
  modified: boolean;
  /** Effective (renormalized) weights of included criteria, or null when they sum to 0. */
  effectiveWeights: Record<string, number> | null;
  analysis: Analysis | null;
}

export interface ScenarioView {
  scenario: Scenario;
  session: ScenarioSession;
  docs: DocView[];
  nickname: (docId: DocId) => string;
  criteria: CriterionView[];
  cells: Record<CellKey, ResolvedCell>;
  setupValid: boolean;
  /** Analysis of the confirmed setup (Penalize). Null until the setup is valid. */
  analysis: Analysis | null;
  pendingReviewKeys: CellKey[];
  gapKeys: CellKey[];
  openRequestKeys: CellKey[];
  checklist: ChecklistStep[];
  whatIf: WhatIfView | null;
}

export function deriveView(scenario: Scenario, session: ScenarioSession): ScenarioView {
  const docs = scenario.documents.map((d) => ({ id: d.id, nickname: session.nicknames[d.id] ?? d.defaultNickname, info: d }));
  const nicknameMap = new Map(docs.map((d) => [d.id, d.nickname]));
  const nickname = (id: DocId) => nicknameMap.get(id) ?? id;

  const cells: Record<CellKey, ResolvedCell> = {};
  for (const [key, seed] of Object.entries(scenario.cells) as [CellKey, Scenario['cells'][CellKey]][]) {
    cells[key] = resolveCell(key, seed, session.reviews[key]);
  }

  const criteria = session.setup.criteria.map((id) => ({ def: getCriterion(scenario, id), weight: session.setup.weights[id] ?? 0 }));
  const activeKeys = criteria.flatMap(({ def }) => docs.map((d) => cellKey(def.id, d.id)));
  const overrides = Object.fromEntries(activeKeys.map((k) => [k, cells[k].value]));
  const setupValid = isSetupValid(session.setup);

  const analysis = setupValid
    ? analyze(
        buildInput(scenario, {
          criteriaIds: session.setup.criteria,
          weights: session.setup.weights,
          overrides,
          gapPolicy: 'penalize',
        }),
      )
    : null;

  let whatIf: WhatIfView | null = null;
  if (setupValid) {
    const state: WhatIfState = session.whatIf ?? {
      weights: { ...session.setup.weights },
      excludedDocs: [],
      excludedCriteria: [],
      gapPolicy: 'penalize',
    };
    const includedCriteria = session.setup.criteria.filter((id) => !state.excludedCriteria.includes(id));
    const includedDocs = scenario.documents.map((d) => d.id).filter((id) => !state.excludedDocs.includes(id));
    const effectiveWeights = normalizeWeights(state.weights, includedCriteria);
    const simAnalysis =
      effectiveWeights && includedCriteria.length >= MIN_CRITERIA
        ? analyze(
            buildInput(scenario, {
              criteriaIds: includedCriteria,
              weights: effectiveWeights,
              docIds: includedDocs,
              overrides,
              gapPolicy: state.gapPolicy,
            }),
          )
        : null;
    whatIf = { state, modified: isWhatIfModified(session.setup, session.whatIf), effectiveWeights, analysis: simAnalysis };
  }

  return {
    scenario,
    session,
    docs,
    nickname,
    criteria,
    cells,
    setupValid,
    analysis,
    pendingReviewKeys: activeKeys.filter((k) => cells[k].isPendingReview),
    gapKeys: activeKeys.filter((k) => cells[k].isGap),
    openRequestKeys: activeKeys.filter((k) => cells[k].status === 'info_requested'),
    checklist: checklistSteps(scenario, session),
    whatIf,
  };
}

export function useScenarioView(scenario: Scenario | null, session: ScenarioSession | undefined): ScenarioView | null {
  return useMemo(() => (scenario && session ? deriveView(scenario, session) : null), [scenario, session]);
}
