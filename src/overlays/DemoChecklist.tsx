import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Check, ChevronDown, ChevronUp, ListChecks, PartyPopper, Sparkles, X } from 'lucide-react';
import { cx } from '../components/ui/cx';
import { SCENARIOS, SCENARIO_ORDER } from '../data/scenarios';
import { splitCellKey } from '../data/types';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { isChecklistComplete, type ChecklistStep } from '../lib/checklist';
import { newId, now, useApp } from '../state/AppContext';
import type { ScenarioView } from '../state/selectors';


const iconBtn = 'rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800';

function ChecklistBody({ view, onNavigate }: { view: ScenarioView; onNavigate: () => void }) {
  const { dispatch } = useApp();
  const { scenario, session, checklist } = view;
  const complete = isChecklistComplete(checklist);
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
    <>
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
                    onClick={() => {
                      onNavigate();
                      action();
                    }}
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
          <p className="flex gap-2 rounded-xl bg-ink-50 px-3 py-2 text-sm text-ink-900">
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
            Bonus: drag a weight in What-if and watch the ranking and report update instantly.
          </p>
          <p className="flex gap-2 text-sm font-medium text-slate-900">
            <PartyPopper className="mt-0.5 size-4 shrink-0 text-brass-600" aria-hidden />
            That's Contrast: from documents to a defensible decision in minutes. Same engine, any industry. Try another:
          </p>
          <div className="flex flex-col gap-2">
            {SCENARIO_ORDER.filter((id) => id !== scenario.id).map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  onNavigate();
                  dispatch({ type: 'QUICK_START', scenarioId: id, at: now(), id: newId('audit'), withWelcome: false });
                }}
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
    </>
  );
}

export function DemoChecklist() {
  const { state, dispatch, view } = useApp();
  const isDesktop = useIsDesktop();
  if (!view || !state.ui.checklistOpen || state.ui.welcomeOpen) return null;
  const doneCount = view.checklist.filter((s) => s.done).length;
  const collapsed = state.ui.checklistCollapsed;
  const setCollapsed = (v: boolean) => dispatch({ type: 'SET_UI', patch: { checklistCollapsed: v } });
  const close = () => dispatch({ type: 'SET_UI', patch: { checklistOpen: false } });
  const progress = `${doneCount} of 4 done · ${view.scenario.title}`;

  if (!isDesktop) {
    // Mobile: a docked bar that expands into a modal bottom sheet.
    return (
      <>
        <div
          className="fixed inset-x-0 bottom-0 z-[35] flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2 shadow-[0_-8px_24px_-12px_rgba(11,19,34,0.25)] print:hidden"
          data-testid="demo-checklist"
        >
          <button
            type="button"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed(false)}
            className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left"
          >
            <ListChecks className="size-5 shrink-0 text-ink-600" aria-hidden />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">Demo guide</span>
              <span className="block truncate text-xs text-slate-500" aria-live="polite">
                {progress}
              </span>
            </span>
            <ChevronUp className="ml-auto size-4 shrink-0 text-slate-500" aria-hidden />
          </button>
          <button type="button" aria-label="Close demo guide" onClick={close} className={iconBtn}>
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <Dialog.Root open={!collapsed} onOpenChange={(open) => setCollapsed(!open)}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-[45] bg-slate-900/30 print:hidden" />
            <Dialog.Content className="fixed inset-x-0 bottom-0 z-[46] flex max-h-[80dvh] flex-col rounded-t-2xl bg-white shadow-2xl print:hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                <ListChecks className="size-5 text-ink-600" aria-hidden />
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="text-sm font-semibold text-slate-900">Try this demo in 4 steps</Dialog.Title>
                  <Dialog.Description className="text-xs text-slate-500">{progress}</Dialog.Description>
                </div>
                <Dialog.Close aria-label="Collapse demo guide" className={iconBtn}>
                  <ChevronDown className="size-4" aria-hidden />
                </Dialog.Close>
              </div>
              <div className="overflow-y-auto px-4 py-3 pb-6">
                <ChecklistBody view={view} onNavigate={() => setCollapsed(true)} />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </>
    );
  }

  return (
    <aside
      aria-labelledby="checklist-title"
      className="fixed bottom-5 right-5 z-[35] w-[22rem] rounded-2xl border border-slate-200 bg-white shadow-xl print:hidden"
      data-testid="demo-checklist"
    >
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <ListChecks className="size-5 text-ink-600" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="checklist-title" className="text-sm font-semibold text-slate-900">
            Try this demo in 4 steps
          </h2>
          <p className="text-xs text-slate-500" aria-live="polite">
            {progress}
          </p>
        </div>
        <button
          type="button"
          aria-expanded={!collapsed}
          aria-controls="checklist-body"
          aria-label={collapsed ? 'Expand demo guide' : 'Collapse demo guide'}
          onClick={() => setCollapsed(!collapsed)}
          className={iconBtn}
        >
          {collapsed ? <ChevronUp className="size-4" aria-hidden /> : <ChevronDown className="size-4" aria-hidden />}
        </button>
        <button type="button" aria-label="Close demo guide" onClick={close} className={iconBtn}>
          <X className="size-4" aria-hidden />
        </button>
      </div>
      {!collapsed && (
        <div id="checklist-body" className="max-h-[60dvh] overflow-y-auto px-4 py-3">
          <ChecklistBody view={view} onNavigate={() => undefined} />
        </div>
      )}
    </aside>
  );
}
