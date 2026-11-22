import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Equal, Plus, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { cx } from '../../components/ui/cx';
import { getCriterion, suggestionCriteria } from '../../data/scenarios';
import type { CriterionDef } from '../../data/types';
import { formatPercent } from '../../lib/format';
import { ruleLabel } from '../../lib/rules';
import { newId, now, useApp, useView } from '../../state/AppContext';
import { MIN_CRITERIA, weightTotal } from '../../state/reducer';
import { SetupLayout } from './SetupLayout';

export function RuleChip({ def }: { def: CriterionDef }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{ruleLabel(def)}</span>
  );
}

function WeightControl({ def, value, onChange }: { def: CriterionDef; value: number; onChange: (v: number) => void }) {
  const id = `weight-${def.id}`;
  return (
    <div className="flex items-center gap-3">
      <label htmlFor={id} className="sr-only">
        Weight for {def.name}
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        aria-valuetext={`${value}%`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full min-w-0 flex-1 cursor-pointer accent-indigo-600"
      />
      <div className="flex items-center gap-1">
        <label htmlFor={`${id}-n`} className="sr-only">
          Weight for {def.name}, in percent
        </label>
        <input
          id={`${id}-n`}
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="h-9 w-16 rounded-lg border border-slate-300 px-2 text-right text-sm tabular-nums"
        />
        <span className="text-sm text-slate-500" aria-hidden>
          %
        </span>
      </div>
    </div>
  );
}

function LiveRankingStrip() {
  const { session, analysis, nickname } = useView();
  if (!session.hasRun || !analysis) return null;
  return (
    <p className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900" aria-live="polite">
      <span className="font-semibold">Current ranking with these weights: </span>
      {analysis.results.ranking.map((r, i) => `${i + 1}. ${nickname(r.docId)} ${formatPercent(r.adherence)}`).join(' · ')}
    </p>
  );
}

export function CriteriaStep() {
  const { dispatch } = useApp();
  const { scenario, session } = useView();
  const helperRef = useRef<HTMLParagraphElement>(null);
  const total = weightTotal(session.setup);
  const count = session.setup.criteria.length;
  const valid = total === 100 && count >= MIN_CRITERIA;
  const suggestions = [
    ...scenario.criteria.filter((c) => c.defaultWeight !== null && !session.setup.criteria.includes(c.id)),
    ...suggestionCriteria(scenario).filter((c) => !session.setup.criteria.includes(c.id)),
  ];
  const diff = 100 - total;

  const add = (id: string) => {
    dispatch({ type: 'ADD_CRITERION', criterionId: id });
    window.setTimeout(() => document.getElementById(`weight-${id}-n`)?.focus(), 0);
  };

  return (
    <SetupLayout step={2}>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Confirm criteria and weights</h1>
      <p className="mt-2 text-slate-600">Contrast suggested these criteria for your question. Adjust weights so they add up to 100%.</p>

      <ol className="mt-8 space-y-3" aria-label="Selected criteria">
        {session.setup.criteria.map((id, i) => {
          const def = getCriterion(scenario, id);
          return (
            <li key={id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{def.name}</h2>
                    <RuleChip def={def} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{def.description}</p>
                </div>
                <div className="flex items-center gap-2 md:w-[22rem]">
                  <div className="min-w-0 flex-1">
                    <WeightControl
                      def={def}
                      value={session.setup.weights[id] ?? 0}
                      onChange={(v) => dispatch({ type: 'SET_WEIGHT', criterionId: id, weight: v })}
                    />
                  </div>
                  <div className="flex items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      aria-label={`Move ${def.name} up`}
                      inactive={i === 0}
                      onClick={() => dispatch({ type: 'MOVE_CRITERION', criterionId: id, direction: -1 })}
                      icon={<ArrowUp className="size-4" aria-hidden />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      aria-label={`Move ${def.name} down`}
                      inactive={i === count - 1}
                      onClick={() => dispatch({ type: 'MOVE_CRITERION', criterionId: id, direction: 1 })}
                      icon={<ArrowDown className="size-4" aria-hidden />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="px-2 text-red-700 hover:bg-red-50"
                      aria-label={`Remove ${def.name}`}
                      inactive={count <= MIN_CRITERIA}
                      disabledReason="At least 3 criteria are needed for a comparison."
                      onClick={() => dispatch({ type: 'REMOVE_CRITERION', criterionId: id })}
                      icon={<Trash2 className="size-4" aria-hidden />}
                    />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-0 z-10 -mx-4 mt-4 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {valid ? (
              <CheckCircle2 className="size-5 text-emerald-600" aria-hidden />
            ) : (
              <AlertCircle className="size-5 text-amber-600" aria-hidden />
            )}
            <p className="text-sm">
              <span className="font-semibold tabular-nums text-slate-900">Total: {total}%</span>{' '}
              <span ref={helperRef} tabIndex={-1} id="weights-helper" className={valid ? 'text-emerald-700' : 'text-amber-800'}>
                {total === 100 ? 'Weights add up to 100%' : `Weights must add up to 100% (${diff > 0 ? `${diff}% left to assign` : `${-diff}% over`})`}
              </span>
            </p>
          </div>
          <Button size="sm" icon={<Equal className="size-4" aria-hidden />} onClick={() => dispatch({ type: 'DISTRIBUTE_EVENLY' })}>
            Distribute evenly
          </Button>
        </div>
      </div>

      <LiveRankingStrip />

      <section className="mt-10" aria-labelledby="suggestions-heading">
        <h2 id="suggestions-heading" className="font-semibold text-slate-900">
          More suggestions
        </h2>
        {suggestions.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No more suggestions for this scenario.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {suggestions.map((def) => (
              <li key={def.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{def.name}</span>
                    <RuleChip def={def} />
                  </div>
                  <p className="text-sm text-slate-600">{def.description}</p>
                </div>
                <Button size="sm" variant="subtle" icon={<Plus className="size-4" aria-hidden />} aria-label={`Add ${def.name}`} onClick={() => add(def.id)}>
                  Add
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button
          className="mt-3"
          size="sm"
          variant="ghost"
          icon={<Plus className="size-4" aria-hidden />}
          inactive
          disabledReason="Custom criteria are available in the full version"
        >
          Add custom criterion
        </Button>
      </section>

      <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button icon={<ArrowLeft className="size-4" aria-hidden />} onClick={() => dispatch({ type: 'SET_STAGE', stage: 'setup' })}>
          Back to setup
        </Button>
        <Button
          variant="primary"
          size="lg"
          aria-disabled={!valid || undefined}
          aria-describedby="weights-helper"
          onClick={() => {
            if (!valid) {
              helperRef.current?.focus();
              return;
            }
            dispatch({ type: 'RUN_COMPARISON', at: now(), id: newId('audit') });
            window.scrollTo({ top: 0 });
          }}
          className={cx(!valid && 'cursor-not-allowed opacity-50 hover:bg-indigo-600')}
        >
          Run comparison
        </Button>
      </div>
    </SetupLayout>
  );
}
