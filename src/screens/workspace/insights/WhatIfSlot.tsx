import { ArrowDown, ArrowUp, FlaskConical, Minus, RotateCcw, Save } from 'lucide-react';
import { useId } from 'react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toasts';
import { cx } from '../../../components/ui/cx';
import { getCriterion } from '../../../data/scenarios';
import { splitCellKey, type CellKey } from '../../../data/types';
import { formatNumber, formatPercent } from '../../../lib/format';
import { tippingSentence } from '../../../lib/messages';
import { canChangeLeader, type Analysis, type TippingResult } from '../../../lib/scoring';
import { newId, now, useApp, useView } from '../../../state/AppContext';
import { MIN_CRITERIA, MIN_DOCUMENTS } from '../../../state/reducer';
import type { ScenarioView } from '../../../state/selectors';
import { RobustnessBadge } from './shared';

function Ranking({
  title,
  analysis,
  view,
  baseline,
  testId,
}: {
  title: string;
  analysis: Analysis;
  view: ScenarioView;
  baseline?: Analysis;
  testId: string;
}) {
  const r = analysis.results;
  const changers = baseline
    ? (Object.entries(analysis.tipping) as [CellKey, TippingResult][]).filter(([, t]) => canChangeLeader(t))
    : [];
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4" data-testid={testId}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
      <ol className="mt-3 space-y-2">
        {r.ranking.map((d) => {
          const before = baseline?.results.byDoc[d.docId];
          const delta = before ? (d.adherenceTenths - before.adherenceTenths) / 10 : null;
          return (
            <li key={d.docId} className="flex items-start justify-between gap-2 text-sm">
              <span className={cx('min-w-0 break-words', d.rank === 1 ? 'font-semibold text-ink-900' : 'text-slate-700')}>
                <span className="tabular-nums text-slate-600">{d.rank}.</span> {view.nickname(d.docId)}
              </span>
              <span className="flex shrink-0 flex-col items-end tabular-nums">
                <span className="font-semibold text-ink-900">{formatPercent(d.adherence)}</span>
                {delta !== null && (
                  <span
                    className={cx(
                      'inline-flex items-center justify-end gap-0.5 text-xs font-semibold',
                      delta > 0 ? 'text-emerald-700' : delta < 0 ? 'text-rose-700' : 'text-slate-500',
                    )}
                  >
                    {delta > 0 ? <ArrowUp className="size-3" aria-hidden /> : delta < 0 ? <ArrowDown className="size-3" aria-hidden /> : <Minus className="size-3" aria-hidden />}
                    {delta > 0 ? '+' : ''}
                    {formatNumber(delta, 1)} pts
                  </span>
                )}
              </span>
            </li>
          );
        })}
        {baseline &&
          view.docs
            .filter((d) => !r.byDoc[d.id])
            .map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-sm text-slate-500">
                <span className="truncate">{d.nickname}</span>
                <span className="text-xs">Excluded</span>
              </li>
            ))}
      </ol>
      <div className="mt-3 flex flex-col items-start gap-1.5 border-t border-slate-100 pt-3">
        {r.isTie ? (
          <p className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
            Technical tie: {r.tiedDocIds.map(view.nickname).join(' and ')}
          </p>
        ) : (
          <p className="text-xs text-slate-600">
            Clear winner: <span className="font-semibold text-ink-900">{view.nickname(r.leaderId)}</span>
          </p>
        )}
        <RobustnessBadge level={analysis.robustness.level} />
        {baseline && changers.length > 0 && (
          <p className="mt-1 text-xs font-medium text-slate-800">Gaps that could change this result:</p>
        )}
        {baseline && changers.length > 0 && (
          <ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">
            {changers.map(([key, t]) => {
              const { criterionId, docId } = splitCellKey(key);
              return <li key={key}>{tippingSentence(t, view.nickname(docId), getCriterion(view.scenario, criterionId))}</li>;
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/** What-if simulation. Never changes the confirmed setup until "Apply as new setup". */
export function WhatIfSlot() {
  const { dispatch } = useApp();
  const view = useView();
  const toast = useToast();
  const uid = useId();
  const { whatIf, analysis, scenario, session, docs } = view;
  if (!whatIf || !analysis) return null;
  const { state, effectiveWeights, modified } = whatIf;
  const includedCriteria = session.setup.criteria.filter((id) => !state.excludedCriteria.includes(id));
  const includedDocs = docs.filter((d) => !state.excludedDocs.includes(d.id));
  const simulationOnly = state.excludedDocs.length > 0 || state.gapPolicy === 'neutral';

  const setWeight = (id: string, v: number) => dispatch({ type: 'SET_WHATIF', patch: { weights: { ...state.weights, [id]: v } } });
  const toggleCriterion = (id: string, include: boolean) =>
    dispatch({
      type: 'SET_WHATIF',
      patch: { excludedCriteria: include ? state.excludedCriteria.filter((x) => x !== id) : [...state.excludedCriteria, id] },
    });
  const toggleDoc = (id: string, include: boolean) =>
    dispatch({
      type: 'SET_WHATIF',
      patch: { excludedDocs: include ? state.excludedDocs.filter((x) => x !== id) : [...state.excludedDocs, id] },
    });

  return (
    <section aria-labelledby="whatif-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2" data-testid="whatif">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="whatif-heading" className="flex items-center gap-2 font-display text-xl font-semibold text-ink-900">
            <FlaskConical className="size-5 text-brass-600" aria-hidden />
            What-if simulation
          </h2>
          <p className="mt-1 text-sm text-slate-600">Try changes without touching your confirmed setup. Nothing changes until you apply it.</p>
        </div>
        {modified && (
          <span className="self-start rounded-full bg-brass-100 px-2.5 py-0.5 text-xs font-semibold text-brass-800 sm:self-auto">Simulation active</span>
        )}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">Criteria and weights</legend>
            <p className="mt-0.5 text-xs text-slate-600">
              Weights of the included criteria are rescaled proportionally for this simulation only.
              {includedCriteria.length <= MIN_CRITERIA && ' Keep at least 3 criteria.'}
            </p>
            <ul className="mt-3 space-y-3">
              {session.setup.criteria.map((id) => {
                const def = getCriterion(scenario, id);
                const included = !state.excludedCriteria.includes(id);
                const lockIn = included && includedCriteria.length <= MIN_CRITERIA;
                const eff = effectiveWeights?.[id];
                return (
                  <li key={id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[12rem_minmax(0,1fr)_7.5rem]">
                    <label className="flex min-w-0 items-center gap-2 text-sm text-slate-800" title={def.name}>
                      <input
                        type="checkbox"
                        checked={included}
                        disabled={lockIn}
                        onChange={(e) => toggleCriterion(id, e.target.checked)}
                        className="size-4 accent-ink-600"
                      />
                      <span className="truncate">{def.name}</span>
                    </label>
                    <span className="whitespace-nowrap text-right text-xs tabular-nums text-slate-600 sm:order-last">
                      {included ? (eff !== undefined ? `${formatNumber(eff, 1)}% effective` : '—') : 'Excluded'}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={state.weights[id] ?? 0}
                      disabled={!included}
                      aria-label={`What-if weight for ${def.name}`}
                      aria-valuetext={`${state.weights[id] ?? 0}`}
                      onChange={(e) => setWeight(id, Number(e.target.value))}
                      className="col-span-2 h-2 w-full cursor-pointer accent-ink-600 disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1"
                    />
                  </li>
                );
              })}
            </ul>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">Documents</legend>
            {includedDocs.length <= MIN_DOCUMENTS && <p className="mt-0.5 text-xs text-slate-600">Keep at least 2 documents.</p>}
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
              {docs.map((d) => {
                const included = !state.excludedDocs.includes(d.id);
                return (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-slate-800">
                    <input
                      type="checkbox"
                      checked={included}
                      disabled={included && includedDocs.length <= MIN_DOCUMENTS}
                      onChange={(e) => toggleDoc(d.id, e.target.checked)}
                      className="size-4 accent-ink-600"
                    />
                    {d.nickname}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-semibold text-slate-900">Treat gaps as:</legend>
            <div className="mt-2 inline-flex rounded-lg border border-slate-300 p-0.5" role="radiogroup" aria-label="Treat gaps as">
              {(
                [
                  ['penalize', 'Penalize (0)'],
                  ['neutral', 'Neutral (average of others)'],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={cx(
                    'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink-600',
                    state.gapPolicy === value ? 'bg-ink-600 text-white' : 'text-slate-700 hover:bg-slate-50',
                  )}
                >
                  <input
                    type="radio"
                    name={`${uid}-policy`}
                    value={value}
                    checked={state.gapPolicy === value}
                    onChange={() => dispatch({ type: 'SET_WHATIF', patch: { gapPolicy: value } })}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-600">
              {state.gapPolicy === 'neutral'
                ? 'Each gap gets the average score of the other documents on that criterion, to show how sensitive the decision is to missing information.'
                : 'Every gap scores 0: unverified information should not earn points.'}
            </p>
          </fieldset>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Before vs After</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Ranking title="Before (confirmed)" analysis={analysis} view={view} testId="whatif-before" />
            {whatIf.analysis ? (
              <Ranking title="After (simulation)" analysis={whatIf.analysis} view={view} baseline={analysis} testId="whatif-after" />
            ) : (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-700">
                Set at least one weight above 0 to simulate.
              </p>
            )}
          </div>
          {simulationOnly && modified && (
            <p className="text-xs text-slate-600">Document exclusions and the gap policy are simulation-only and won't be applied.</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              icon={<RotateCcw className="size-4" aria-hidden />}
              inactive={!modified}
              disabledReason="Nothing to reset: the simulation matches your confirmed setup."
              onClick={() => {
                dispatch({ type: 'RESET_WHATIF' });
                toast('Simulation reset to your confirmed setup.', 'info');
              }}
            >
              Reset to confirmed setup
            </Button>
            <Button
              variant="primary"
              icon={<Save className="size-4" aria-hidden />}
              inactive={!modified || !whatIf.analysis}
              disabledReason={!modified ? 'Change something first.' : 'Set at least one weight above 0.'}
              onClick={() => {
                dispatch({ type: 'APPLY_WHATIF', at: now(), id: newId('audit') });
                toast('What-if applied as your new setup.');
              }}
            >
              Apply as new setup
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
