import { ArrowRight, Check, ChevronDown, ChevronUp, ListChecks, PartyPopper, Sparkles, X } from 'lucide-react';
import { cx } from '../components/ui/cx';
import { SCENARIOS, SCENARIO_ORDER } from '../data/scenarios';
import { splitCellKey } from '../data/types';
import { isChecklistComplete, type ChecklistStep } from '../lib/checklist';
import { newId, now, useApp } from '../state/AppContext';

// TODO(phase 7b): set to true when the What-if panel ships, to restore the SPEC bonus hint.
const WHAT_IF_AVAILABLE = false;

export function DemoChecklist() {
  const { state, dispatch, view } = useApp();
  if (!view || !state.ui.checklistOpen || state.ui.welcomeOpen) return null;
  const { scenario, session, checklist } = view;
  const doneCount = checklist.filter((s) => s.done).length;
  const complete = isChecklistComplete(checklist);
  const collapsed = state.ui.checklistCollapsed;
  const gapCriterion = splitCellKey(scenario.demo.gapCell).criterionId;

  const showMe = (step: ChecklistStep): (() => void) | null => {
    if (step.done) return null;
    if (step.id === 1) return session.stage === 'setup' ? () => dispatch({ type: 'SET_STAGE', stage: 'criteria' }) : null;
    if (!session.hasRun || session.stage !== 'workspace') return null;
    if (step.id === 2)
      return () => {
        dispatch({ type: 'SET_FILTER', key: 'needsReviewOnly', value: true });
        dispatch({ type: 'SET_UI', patch: { focusTarget: 'first_pending' } });
        dispatch({ type: 'SET_TAB', tab: 'compare' });
      };
    if (step.id === 3)
      return session.setup.criteria.includes(gapCriterion)
        ? () => {
            dispatch({ type: 'SET_TAB', tab: 'compare' });
            dispatch({ type: 'CLEAR_FILTERS' });
            dispatch({ type: 'OPEN_CELL', key: scenario.demo.gapCell });
          }
        : null;
    return () => dispatch({ type: 'SET_TAB', tab: 'report' });
  };

  return (
    <aside
      aria-labelledby="checklist-title"
      className="fixed inset-x-3 bottom-3 z-[35] rounded-2xl border border-slate-200 bg-white shadow-xl sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[22rem] print:hidden"
      data-testid="demo-checklist"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <ListChecks className="size-5 text-ink-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="checklist-title" className="text-sm font-semibold text-slate-900">
            Try this demo in 4 steps
          </h2>
          <p className="text-xs text-slate-500" aria-live="polite">
            {doneCount} of 4 done · {scenario.title}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls="checklist-body"
          aria-label={collapsed ? 'Expand demo guide' : 'Collapse demo guide'}
          onClick={() => dispatch({ type: 'SET_UI', patch: { checklistCollapsed: !collapsed } })}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          {collapsed ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
        </button>
        <button
          type="button"
          aria-label="Close demo guide"
          onClick={() => dispatch({ type: 'SET_UI', patch: { checklistOpen: false } })}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {!collapsed && (
        <div id="checklist-body" className="max-h-[60dvh] overflow-y-auto px-4 py-3">
          <ol className="space-y-3">
            {checklist.map((step) => {
              const action = showMe(step);
              return (
                <li key={step.id} className="flex gap-3" data-testid={`checklist-step-${step.id}`} data-done={step.done}>
                  <span
                    className={cx(
                      'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      step.done ? 'bg-emerald-600 text-white' : 'border border-slate-300 text-slate-600',
                    )}
                    aria-hidden
                  >
                    {step.done ? <Check className="size-3.5" /> : step.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cx('text-sm', step.done ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900')}>
                      <span className="sr-only">{step.done ? 'Done: ' : 'To do: '}</span>
                      {step.label}
                    </p>
                    {step.hint && !step.done && <p className="mt-0.5 text-xs text-slate-500">{step.hint}</p>}
                    {action && (
                      <button
                        type="button"
                        onClick={action}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-ink-700 underline-offset-2 hover:underline"
                      >
                        Show me <ArrowRight className="size-3" aria-hidden />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {complete && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4" data-testid="checklist-complete">
              {WHAT_IF_AVAILABLE && (
                <p className="flex gap-2 rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-900">
                  <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Bonus: drag a weight in What-if and watch the ranking and report update instantly.
                </p>
              )}
              <p className="flex gap-2 text-sm font-medium text-slate-900">
                <PartyPopper className="mt-0.5 size-4 shrink-0 text-ink-600" aria-hidden />
                That's Contrast: from documents to a defensible decision in minutes. Same engine, any industry. Try another:
              </p>
              <div className="flex flex-col gap-2">
                {SCENARIO_ORDER.filter((id) => id !== scenario.id).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => dispatch({ type: 'QUICK_START', scenarioId: id, at: now(), id: newId('audit'), withWelcome: false })}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-ink-300 hover:bg-ink-50"
                  >
                    <span>
                      <span className="block font-medium text-slate-900">{SCENARIOS[id].title}</span>
                      <span className="block text-xs text-slate-500">{SCENARIOS[id].industryTag}</span>
                    </span>
                    <ArrowRight className="size-4 text-ink-600" aria-hidden />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
