import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { SCENARIOS } from '../data/scenarios';
import type { Scenario } from '../data/types';
import { initialState, reducer, type Action } from './reducer';
import { useScenarioView, type ScenarioView } from './selectors';
import type { AppState } from './types';

interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  scenario: Scenario | null;
  view: ScenarioView | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const scenario = state.activeScenarioId ? SCENARIOS[state.activeScenarioId] : null;
  const session = state.activeScenarioId ? state.sessions[state.activeScenarioId] : undefined;
  const view = useScenarioView(scenario, session);
  const value = useMemo(() => ({ state, dispatch, scenario, view }), [state, scenario, view]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

/** Use only below the workspace/setup screens, where a scenario is active. */
export function useView(): ScenarioView {
  const { view } = useApp();
  if (!view) throw new Error('No active scenario');
  return view;
}

let counter = 0;
export function newId(prefix = 'id'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function now(): string {
  return new Date().toISOString();
}
