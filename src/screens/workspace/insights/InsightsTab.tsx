import { ArrowRight, Lightbulb, Target, TrendingUp, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { formatPercent } from '../../../lib/format';
import { useApp, useView } from '../../../state/AppContext';
import { insightsModel } from './model';
import { RobustnessBadge, TieBanner } from './shared';
import { WhatIfSlot } from './WhatIfSlot';

export function InsightsTab() {
  const { dispatch } = useApp();
  const view = useView();
  const { scenario, analysis, nickname, cells } = view;
  const model = useMemo(
    () => (analysis ? insightsModel(scenario, analysis, nickname, (k) => cells[k].status) : null),
    [scenario, analysis, nickname, cells],
  );
  if (!model) return null;
  const changers = model.gaps.filter((g) => g.canChange);

  const openInCompare = (key: string) => {
    dispatch({ type: 'SET_TAB', tab: 'compare' });
    dispatch({ type: 'OPEN_CELL', key: key as never });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="rec-heading" className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
          <h2 id="rec-heading" className="sr-only">
            Recommendation
          </h2>
          {model.isTie ? (
            <TieBanner text={model.tieText} />
          ) : (
            <p className="flex items-start gap-3 text-2xl font-semibold tracking-tight text-slate-900" data-testid="recommendation">
              <Trophy className="mt-1 size-6 shrink-0 text-indigo-600" aria-hidden />
              {model.recommendationText}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <div>
              <RobustnessBadge level={model.robustness.level} />
            </div>
            <p className="text-sm text-slate-700">{model.robustnessText}</p>
          </div>
          <ol className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-sm" aria-label="Ranking">
            {model.ranking.map((r) => (
              <li key={r.docId} className="flex items-center justify-between gap-3">
                <span className="text-slate-700">
                  <span className="font-semibold tabular-nums text-slate-900">#{r.rank}</span> {r.name}
                </span>
                <span className="font-semibold tabular-nums text-slate-900">{formatPercent(r.adherence)}</span>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="drivers-heading" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="drivers-heading" className="text-lg font-semibold text-slate-900">
            What drives this result
          </h2>
          <ul className="mt-4 space-y-4 text-sm text-slate-700">
            {model.gapToSecondText && (
              <li className="flex gap-3">
                <TrendingUp className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden />
                {model.gapToSecondText}
              </li>
            )}
            {model.topAdvantageText && (
              <li className="flex gap-3">
                <Target className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden />
                {model.topAdvantageText}
              </li>
            )}
            <li className="flex gap-3">
              <Lightbulb className="mt-0.5 size-4 shrink-0 text-indigo-600" aria-hidden />
              <div>
                <p className="font-medium text-slate-900">Gaps that could change the result:</p>
                {changers.length === 0 ? (
                  <p className="mt-1">No open gap could change the result.</p>
                ) : (
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    {changers.map((g) => (
                      <li key={g.key}>{g.sentence}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          </ul>
        </section>

        <section aria-labelledby="gaps-heading" className="rounded-2xl lg:col-span-2 border border-slate-200 bg-white p-6 shadow-sm">
          <h2 id="gaps-heading" className="text-lg font-semibold text-slate-900">
            Gaps
          </h2>
          {model.gaps.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No open gaps. Every criterion has a value for every document.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {model.gaps.map((g) => (
                <li key={g.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                      {g.docName} · {g.criterionName}
                      <StatusBadge status={g.status} />
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{g.sentence}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInCompare(g.key)}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline"
                    aria-label={`Open ${g.docName} · ${g.criterionName} in Compare`}
                  >
                    Open in Compare <ArrowRight className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      <WhatIfSlot />
    </div>
  );
}
