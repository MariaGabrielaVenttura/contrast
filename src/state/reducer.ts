// Pure application reducer. Timestamps and ids always arrive in action payloads.

import { SCENARIOS, defaultCriteria, getCriterion } from '../data/scenarios';
import type { CellKey, CellValue, CriterionDef, CriterionId, DocId, Scenario, ScenarioId } from '../data/types';
import { splitCellKey } from '../data/types';
import type { ReviewAction } from '../lib/cells';
import { isValidReview } from '../lib/cells';
import { formatScore, formatValue } from '../lib/format';
import { distributeEvenly, largestRemainder, normalizeWeights } from '../lib/scoring';
import type { AppState, AuditEntry, Filters, ScenarioSession, Setup, Stage, TabId, Toast, UiState, WhatIfState } from './types';

export const MIN_CRITERIA = 3;
export const MIN_DOCUMENTS = 2;

export type Action =
  | { type: 'OPEN_SCENARIO'; scenarioId: ScenarioId }
  | { type: 'QUICK_START'; scenarioId: ScenarioId; at: string; id: string; withWelcome: boolean }
  | { type: 'GO_HOME' }
  | { type: 'SET_STAGE'; stage: Exclude<Stage, 'workspace'> }
  | { type: 'SET_NICKNAME'; docId: DocId; value: string }
  | { type: 'SET_WEIGHT'; criterionId: CriterionId; weight: number }
  | { type: 'DISTRIBUTE_EVENLY' }
  | { type: 'REMOVE_CRITERION'; criterionId: CriterionId }
  | { type: 'MOVE_CRITERION'; criterionId: CriterionId; direction: -1 | 1 }
  | { type: 'ADD_CRITERION'; criterionId: CriterionId }
  | { type: 'RUN_COMPARISON'; at: string; id: string }
  | { type: 'SET_TAB'; tab: TabId }
  | { type: 'SET_FILTER'; key: keyof Filters; value: boolean }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'OPEN_CELL'; key: CellKey | null }
  | { type: 'REVIEW'; key: CellKey; review: ReviewAction; id: string }
  | { type: 'MARK_EXPORTED' }
  | { type: 'SET_WHATIF'; patch: Partial<WhatIfState> }
  | { type: 'RESET_WHATIF' }
  | { type: 'APPLY_WHATIF'; at: string; id: string }
  | { type: 'RESET_ALL' }
  | { type: 'SET_UI'; patch: Partial<UiState> }
  | { type: 'PUSH_TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; id: string };

export const initialUi: UiState = {
  welcomeOpen: false,
  aboutOpen: false,
  switcherOpen: false,
  checklistOpen: false,
  checklistCollapsed: false,
  confirmStartOverOpen: false,
  focusTarget: null,
};

export const initialState: AppState = {
  activeScenarioId: null,
  sessions: {},
  ui: initialUi,
  toasts: [],
};

// ---------- helpers ----------

export function defaultSetup(scenario: Scenario): Setup {
  const defs = defaultCriteria(scenario);
  return {
    criteria: defs.map((c) => c.id),
    weights: Object.fromEntries(defs.map((c) => [c.id, c.defaultWeight ?? 0])),
  };
}

export function createSession(scenario: Scenario): ScenarioSession {
  return {
    scenarioId: scenario.id,
    stage: 'setup',
    hasRun: false,
    activeTab: 'compare',
    nicknames: Object.fromEntries(scenario.documents.map((d) => [d.id, d.defaultNickname])),
    setup: defaultSetup(scenario),
    lastRunSetup: null,
    lastRunNicknames: null,
    reviews: {},
    audit: [],
    whatIf: null,
    filters: { onlyDifferences: false, needsReviewOnly: false },
    openCell: null,
    exported: false,
  };
}

export function weightTotal(setup: Setup): number {
  return setup.criteria.reduce((s, id) => s + (setup.weights[id] ?? 0), 0);
}

export function isSetupValid(setup: Setup): boolean {
  return setup.criteria.length >= MIN_CRITERIA && weightTotal(setup) === 100;
}

export function nicknameErrors(scenario: Scenario, nicknames: Record<DocId, string>): Record<DocId, string> {
  const errors: Record<DocId, string> = {};
  const seen = new Map<string, number>();
  for (const d of scenario.documents) {
    const n = (nicknames[d.id] ?? '').trim().toLowerCase();
    if (n) seen.set(n, (seen.get(n) ?? 0) + 1);
  }
  for (const d of scenario.documents) {
    const n = (nicknames[d.id] ?? '').trim();
    if (!n) errors[d.id] = "Nickname can't be empty.";
    else if ((seen.get(n.toLowerCase()) ?? 0) > 1) errors[d.id] = 'Each document needs a different nickname.';
  }
  return errors;
}

export function describeValue(def: CriterionDef, value: CellValue | null): string {
  if (!value) return '—';
  if (value.kind === 'qualitative') return `score ${formatScore(value.score)} (${value.text})`;
  return formatValue(def, value);
}

function cellLabel(scenario: Scenario, session: ScenarioSession, key: CellKey): { def: CriterionDef; label: string } {
  const { criterionId, docId } = splitCellKey(key);
  const def = getCriterion(scenario, criterionId);
  return { def, label: `${session.nicknames[docId]} · ${def.name}` };
}

function setupDiff(
  scenario: Scenario,
  prev: Setup,
  next: Setup,
  prevNick: Record<DocId, string>,
  nextNick: Record<DocId, string>,
): string[] {
  const changes: string[] = [];
  for (const d of scenario.documents) {
    if (prevNick[d.id] !== nextNick[d.id]) changes.push(`renamed ${prevNick[d.id]} to ${nextNick[d.id]}`);
  }
  for (const id of next.criteria) {
    const name = getCriterion(scenario, id).name;
    if (!prev.criteria.includes(id)) changes.push(`added ${name} (${next.weights[id] ?? 0}%)`);
    else if ((prev.weights[id] ?? 0) !== (next.weights[id] ?? 0)) changes.push(`${name} ${prev.weights[id]}% → ${next.weights[id]}%`);
  }
  for (const id of prev.criteria) {
    if (!next.criteria.includes(id)) changes.push(`removed ${getCriterion(scenario, id).name}`);
  }
  const prevOrder = prev.criteria.filter((id) => next.criteria.includes(id));
  const nextOrder = next.criteria.filter((id) => prev.criteria.includes(id));
  if (changes.length === 0 && prevOrder.join() !== nextOrder.join()) changes.push('reordered criteria');
  return changes;
}

function extractionSummary(scenario: Scenario, setup: Setup): string {
  const keys = setup.criteria.flatMap((c) => scenario.documents.map((d) => `${c}|${d.id}` as CellKey));
  const seeds = keys.map((k) => scenario.cells[k]);
  const found = seeds.filter((s) => s.extraction === 'found');
  const review = found.filter((s) => s.extraction === 'found' && s.confidence < 70).length;
  const missing = seeds.length - found.length;
  const docs = scenario.documents.length;
  return `Extracted ${found.length} of ${seeds.length} values from ${docs} documents: ${review} need review, ${missing} not found.`;
}

function runSession(scenario: Scenario, s: ScenarioSession, at: string, id: string): ScenarioSession {
  let entry: AuditEntry | null;
  if (!s.hasRun || !s.lastRunSetup || !s.lastRunNicknames) {
    entry = { id, at, actor: 'Contrast (simulated AI)', action: 'comparison_run', summary: extractionSummary(scenario, s.setup) };
  } else {
    const changes = setupDiff(scenario, s.lastRunSetup, s.setup, s.lastRunNicknames, s.nicknames);
    entry = changes.length
      ? { id, at, actor: 'You', action: 'setup_updated', summary: `Setup updated: ${changes.join('; ')}.` }
      : null;
  }
  return {
    ...s,
    hasRun: true,
    stage: 'workspace',
    activeTab: 'compare',
    whatIf: null,
    openCell: null,
    lastRunSetup: { criteria: [...s.setup.criteria], weights: { ...s.setup.weights } },
    lastRunNicknames: { ...s.nicknames },
    audit: entry ? [...s.audit, entry] : s.audit,
  };
}

function reviewAudit(scenario: Scenario, s: ScenarioSession, key: CellKey, review: ReviewAction, id: string): AuditEntry {
  const { def, label } = cellLabel(scenario, s, key);
  const seed = scenario.cells[key];
  const extracted = seed.extraction === 'found' ? seed.value : null;
  const prevReview = s.reviews[key];
  const current =
    prevReview && (prevReview.type === 'edit' || prevReview.type === 'provide') ? prevReview.value : extracted;
  const base = { id, at: review.at, actor: 'You' as const, cellKey: key };
  switch (review.type) {
    case 'confirm':
      return { ...base, action: 'confirmed', summary: `Confirmed ${label}: ${describeValue(def, extracted)}.` };
    case 'edit':
      return {
        ...base,
        action: 'edited',
        summary: `Edited ${label}: ${describeValue(def, current)} → ${describeValue(def, review.value)}.`,
        note: review.note || undefined,
      };
    case 'provide':
      return {
        ...base,
        action: 'value_added',
        summary: current
          ? `Updated the value for ${label}: ${describeValue(def, current)} → ${describeValue(def, review.value)}.`
          : `Added a value for ${label}: ${describeValue(def, review.value)}.`,
        note: review.value.kind === 'qualitative' && review.value.text === review.sourceNote ? undefined : review.sourceNote,
      };
    case 'request_info':
      return { ...base, action: 'info_requested', summary: `Drafted an information request for ${label}.` };
    case 'accept_gap':
      return { ...base, action: 'gap_accepted', summary: `Kept ${label} as an accepted gap (scores 0).` };
  }
}

/** Weights and criteria the What-if layer would apply (integers summing to 100). */
export function whatIfAsSetup(setup: Setup, w: WhatIfState): Setup | null {
  const included = setup.criteria.filter((id) => !w.excludedCriteria.includes(id));
  const normalized = normalizeWeights(w.weights, included);
  if (!normalized || included.length < MIN_CRITERIA) return null;
  const ints = largestRemainder(included.map((id) => normalized[id]));
  return { criteria: included, weights: Object.fromEntries(included.map((id, i) => [id, ints[i]])) };
}

export function initialWhatIf(setup: Setup): WhatIfState {
  return { weights: { ...setup.weights }, excludedDocs: [], excludedCriteria: [], gapPolicy: 'penalize' };
}

export function isWhatIfModified(setup: Setup, w: WhatIfState | null): boolean {
  if (!w) return false;
  if (w.excludedDocs.length || w.excludedCriteria.length || w.gapPolicy !== 'penalize') return true;
  return setup.criteria.some((id) => (w.weights[id] ?? 0) !== (setup.weights[id] ?? 0));
}

function clampWeight(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, Math.round(x)));
}

// ---------- reducer ----------

function updateActive(state: AppState, fn: (s: ScenarioSession, scenario: Scenario) => ScenarioSession): AppState {
  const id = state.activeScenarioId;
  if (!id) return state;
  const session = state.sessions[id];
  if (!session) return state;
  return { ...state, sessions: { ...state.sessions, [id]: fn(session, SCENARIOS[id]) } };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'OPEN_SCENARIO': {
      const existing = state.sessions[action.scenarioId];
      const session = existing ?? createSession(SCENARIOS[action.scenarioId]);
      return {
        ...state,
        activeScenarioId: action.scenarioId,
        sessions: { ...state.sessions, [action.scenarioId]: session },
        ui: { ...state.ui, switcherOpen: false },
      };
    }

    case 'QUICK_START': {
      const scenario = SCENARIOS[action.scenarioId];
      let session = state.sessions[action.scenarioId] ?? createSession(scenario);
      if (!session.hasRun) {
        if (!isSetupValid(session.setup)) session = { ...session, setup: defaultSetup(scenario) };
        session = runSession(scenario, session, action.at, action.id);
      } else if (session.stage !== 'workspace' && isSetupValid(session.setup)) {
        session = runSession(scenario, session, action.at, action.id);
      }
      return {
        ...state,
        activeScenarioId: action.scenarioId,
        sessions: { ...state.sessions, [action.scenarioId]: session },
        ui: { ...state.ui, switcherOpen: false, welcomeOpen: action.withWelcome },
      };
    }

    case 'GO_HOME':
      return { ...state, activeScenarioId: null, ui: { ...state.ui, switcherOpen: false } };

    case 'SET_STAGE':
      return updateActive(state, (s) => ({ ...s, stage: action.stage, openCell: null }));

    case 'SET_NICKNAME':
      return updateActive(state, (s) => ({ ...s, nicknames: { ...s.nicknames, [action.docId]: action.value.slice(0, 24) } }));

    case 'SET_WEIGHT':
      return updateActive(state, (s) => ({
        ...s,
        setup: { ...s.setup, weights: { ...s.setup.weights, [action.criterionId]: clampWeight(action.weight) } },
      }));

    case 'DISTRIBUTE_EVENLY':
      return updateActive(state, (s) => {
        const w = distributeEvenly(s.setup.criteria.length);
        return { ...s, setup: { ...s.setup, weights: Object.fromEntries(s.setup.criteria.map((id, i) => [id, w[i]])) } };
      });

    case 'REMOVE_CRITERION':
      return updateActive(state, (s) => {
        if (s.setup.criteria.length <= MIN_CRITERIA) return s;
        const weights = { ...s.setup.weights };
        delete weights[action.criterionId];
        return { ...s, setup: { criteria: s.setup.criteria.filter((id) => id !== action.criterionId), weights } };
      });

    case 'MOVE_CRITERION':
      return updateActive(state, (s) => {
        const list = [...s.setup.criteria];
        const i = list.indexOf(action.criterionId);
        const j = i + action.direction;
        if (i < 0 || j < 0 || j >= list.length) return s;
        [list[i], list[j]] = [list[j], list[i]];
        return { ...s, setup: { ...s.setup, criteria: list } };
      });

    case 'ADD_CRITERION':
      return updateActive(state, (s) => {
        if (s.setup.criteria.includes(action.criterionId)) return s;
        return {
          ...s,
          setup: { criteria: [...s.setup.criteria, action.criterionId], weights: { ...s.setup.weights, [action.criterionId]: 0 } },
        };
      });

    case 'RUN_COMPARISON':
      return updateActive(state, (s, scenario) => {
        if (!isSetupValid(s.setup)) return s;
        if (Object.keys(nicknameErrors(scenario, s.nicknames)).length) return s;
        return runSession(scenario, s, action.at, action.id);
      });

    case 'SET_TAB':
      return updateActive(state, (s) => ({ ...s, activeTab: action.tab, openCell: null }));

    case 'SET_FILTER':
      return updateActive(state, (s) => ({ ...s, filters: { ...s.filters, [action.key]: action.value } }));

    case 'CLEAR_FILTERS':
      return updateActive(state, (s) => ({ ...s, filters: { onlyDifferences: false, needsReviewOnly: false } }));

    case 'OPEN_CELL':
      return updateActive(state, (s) => ({ ...s, openCell: action.key }));

    case 'REVIEW':
      return updateActive(state, (s, scenario) => {
        const seed = scenario.cells[action.key];
        if (!seed || !isValidReview(seed, action.review)) return s;
        const entry = reviewAudit(scenario, s, action.key, action.review, action.id);
        return { ...s, reviews: { ...s.reviews, [action.key]: action.review }, audit: [...s.audit, entry] };
      });

    case 'MARK_EXPORTED':
      return updateActive(state, (s) => ({ ...s, exported: true }));

    case 'SET_WHATIF':
      return updateActive(state, (s) => {
        const base = s.whatIf ?? initialWhatIf(s.setup);
        const next = { ...base, ...action.patch };
        const docCount = SCENARIOS[s.scenarioId].documents.length;
        if (docCount - next.excludedDocs.length < MIN_DOCUMENTS) return s;
        if (s.setup.criteria.length - next.excludedCriteria.filter((id) => s.setup.criteria.includes(id)).length < MIN_CRITERIA) return s;
        return { ...s, whatIf: { ...next, weights: Object.fromEntries(Object.entries(next.weights).map(([k, v]) => [k, clampWeight(v)])) } };
      });

    case 'RESET_WHATIF':
      return updateActive(state, (s) => ({ ...s, whatIf: null }));

    case 'APPLY_WHATIF':
      return updateActive(state, (s, scenario) => {
        if (!s.whatIf) return s;
        const next = whatIfAsSetup(s.setup, s.whatIf);
        if (!next) return s;
        const changes = setupDiff(scenario, s.setup, next, s.nicknames, s.nicknames);
        const entry: AuditEntry = {
          id: action.id,
          at: action.at,
          actor: 'You',
          action: 'whatif_applied',
          summary: changes.length ? `Applied what-if as new setup: ${changes.join('; ')}.` : 'Applied what-if as new setup (no setup changes).',
        };
        return {
          ...s,
          setup: next,
          whatIf: null,
          lastRunSetup: { criteria: [...next.criteria], weights: { ...next.weights } },
          audit: [...s.audit, entry],
        };
      });

    case 'RESET_ALL':
      return { ...initialState, toasts: state.toasts };

    case 'SET_UI':
      return { ...state, ui: { ...state.ui, ...action.patch } };

    case 'PUSH_TOAST':
      return { ...state, toasts: [...state.toasts.slice(-2), action.toast] };

    case 'DISMISS_TOAST':
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
  }
}
