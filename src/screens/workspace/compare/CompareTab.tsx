import { CircleSlash, Repeat, TriangleAlert, Trophy, ArrowDown } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { Toggle } from '../../../components/ui/Toggle';
import { reviewCounter } from '../../../lib/messages';
import { useApp, useView } from '../../../state/AppContext';
import { EvidencePanel } from './EvidencePanel';
import { MatrixTable } from './MatrixTable';
import { buildRows, filterRows } from './model';

function Legend() {
  const items = [
    { icon: <Trophy className="size-3.5 text-emerald-700" aria-hidden />, label: 'Best in row' },
    { icon: <ArrowDown className="size-3.5 text-amber-700" aria-hidden />, label: 'Below expectation (score under 3.0)' },
    { icon: <TriangleAlert className="size-3.5 text-orange-700" aria-hidden />, label: 'Needs review (AI confidence under 70%)' },
    { icon: <CircleSlash className="size-3.5 text-slate-600" aria-hidden />, label: 'Not found (scores 0)' },
    { icon: <Repeat className="size-3.5 text-slate-600" aria-hidden />, label: 'Unit converted' },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1">
          {i.icon}
          {i.label}
        </li>
      ))}
      <li className="text-slate-500">Simulated AI confidence is shown only when below 70%; open any cell to see it.</li>
    </ul>
  );
}

export function CompareTab() {
  const { state, dispatch } = useApp();
  const view = useView();
  const { session, pendingReviewKeys, gapKeys } = view;
  const rows = useMemo(() => buildRows(view), [view]);
  const visible = filterRows(rows, session.filters);
  const filtering = session.filters.needsReviewOnly || session.filters.onlyDifferences;

  // One-shot focus request (from the report lock or the checklist).
  useEffect(() => {
    if (state.ui.focusTarget !== 'first_pending') return;
    dispatch({ type: 'SET_UI', patch: { focusTarget: null } });
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>('[data-pending="true"]') ?? document.getElementById('matrix-heading');
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 50);
  }, [state.ui.focusTarget, dispatch]);

  return (
    <section aria-labelledby="matrix-heading">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="matrix-heading" tabIndex={-1} className="font-display text-2xl font-semibold text-ink-900">
            Side-by-side comparison
          </h2>
          <p className="text-sm font-medium text-slate-700" aria-live="polite">
            {reviewCounter(pendingReviewKeys.length, gapKeys.length)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filters">
          <Toggle pressed={session.filters.onlyDifferences} onChange={(v) => dispatch({ type: 'SET_FILTER', key: 'onlyDifferences', value: v })}>
            Show only differences
          </Toggle>
          <Toggle pressed={session.filters.needsReviewOnly} onChange={(v) => dispatch({ type: 'SET_FILTER', key: 'needsReviewOnly', value: v })}>
            Needs review only
          </Toggle>
        </div>
      </div>
      <div className="mt-3">
        <Legend />
      </div>

      <div className="mt-4">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-10 text-center">
            {session.filters.needsReviewOnly && pendingReviewKeys.length === 0 ? (
              <p className="font-medium text-slate-900">Nothing needs review. Every extracted value has been checked.</p>
            ) : (
              <p className="font-medium text-slate-900">No rows match these filters.</p>
            )}
            <Button className="mt-4" size="sm" onClick={() => dispatch({ type: 'CLEAR_FILTERS' })}>
              {session.filters.needsReviewOnly && pendingReviewKeys.length === 0 ? 'Show all rows' : 'Clear filters'}
            </Button>
          </div>
        ) : (
          <MatrixTable rows={visible} />
        )}
        {filtering && visible.length > 0 && (
          <p className="mt-2 text-sm text-slate-500">
            Showing {visible.length} of {rows.length} criteria. Totals always include every criterion.{' '}
            <button type="button" className="font-medium text-ink-700 underline-offset-2 hover:underline" onClick={() => dispatch({ type: 'CLEAR_FILTERS' })}>
              Clear filters
            </button>
          </p>
        )}
      </div>
      <EvidencePanel />
    </section>
  );
}
