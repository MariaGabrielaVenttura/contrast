import type { CellKey, CriterionId, DocId, ScenarioId } from '../data/types';
import type { ReviewAction } from '../lib/cells';
import type { GapPolicy } from '../lib/scoring';

export type Stage = 'setup' | 'criteria' | 'workspace';
export type TabId = 'compare' | 'insights' | 'report';

export interface Setup {
  /** Ordered criterion ids in the confirmed setup. */
  criteria: CriterionId[];
  /** Integer weights 0–100 for the criteria in the setup. */
  weights: Record<CriterionId, number>;
}

export interface WhatIfState {
  weights: Record<CriterionId, number>;
  excludedDocs: DocId[];
  excludedCriteria: CriterionId[];
  gapPolicy: GapPolicy;
}

export type AuditActor = 'You' | 'Contrast (simulated AI)';
export type AuditAction =
  | 'comparison_run'
  | 'setup_updated'
  | 'confirmed'
  | 'edited'
  | 'value_added'
  | 'info_requested'
  | 'gap_accepted'
  | 'whatif_applied';

export interface AuditEntry {
  id: string;
  at: string;
  actor: AuditActor;
  action: AuditAction;
  /** Frozen at action time (uses nicknames as they were then). */
  summary: string;
  cellKey?: CellKey;
  note?: string;
}

export interface Filters {
  onlyDifferences: boolean;
  needsReviewOnly: boolean;
}

export interface ScenarioSession {
  scenarioId: ScenarioId;
  stage: Stage;
  hasRun: boolean;
  activeTab: TabId;
  nicknames: Record<DocId, string>;
  setup: Setup;
  lastRunSetup: Setup | null;
  lastRunNicknames: Record<DocId, string> | null;
  reviews: Partial<Record<CellKey, ReviewAction>>;
  audit: AuditEntry[];
  whatIf: WhatIfState | null;
  filters: Filters;
  openCell: CellKey | null;
  exported: boolean;
}

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'error';
}

export interface UiState {
  welcomeOpen: boolean;
  aboutOpen: boolean;
  switcherOpen: boolean;
  checklistOpen: boolean;
  checklistCollapsed: boolean;
  confirmStartOverOpen: boolean;
  /** One-shot focus request consumed by the Compare tab. */
  focusTarget: 'first_pending' | null;
}

export interface AppState {
  activeScenarioId: ScenarioId | null;
  sessions: Partial<Record<ScenarioId, ScenarioSession>>;
  ui: UiState;
  toasts: Toast[];
}
