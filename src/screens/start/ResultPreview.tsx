import { ArrowRight, CircleCheck, CircleSlash, Trophy } from 'lucide-react';
import { SCENARIOS, QUICK_DEMO_SCENARIO } from '../../data/scenarios';
import { splitCellKey } from '../../data/types';
import { formatPercent } from '../../lib/format';
import { analyze, buildInput, type Analysis } from '../../lib/scoring';
import { cx } from '../../components/ui/cx';

// Static preview, computed once by the real engine so its numbers always match the demo.
const scenario = SCENARIOS[QUICK_DEMO_SCENARIO];
const gapDoc = splitCellKey(scenario.demo.gapCell).docId;
const before = analyze(buildInput(scenario));
const after = analyze(buildInput(scenario, { overrides: { [scenario.demo.gapCell]: scenario.demo.suggestedValue } }));
const nick = (id: string) => scenario.documents.find((d) => d.id === id)!.defaultNickname;
const ordinal = (n: number) => ['1st', '2nd', '3rd', '4th'][n - 1] ?? `${n}th`;

function Ranking({ title, analysis }: { title: string; analysis: Analysis }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <ol className="mt-2 space-y-2">
        {analysis.results.ranking.map((r) => {
          const highlight = r.docId === gapDoc;
          return (
            <li key={r.docId} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className={cx('truncate', highlight ? 'font-semibold text-ink-900' : 'text-slate-600')}>
                  {r.rank === 1 && <Trophy className="mr-1 inline size-3.5 text-brass-500" aria-hidden />}
                  {nick(r.docId)}
                </span>
                <span className={cx('tabular-nums', highlight ? 'font-semibold text-ink-900' : 'text-slate-600')}>{formatPercent(r.adherence)}</span>
              </div>
              <span aria-hidden className="mt-1 block h-1.5 overflow-hidden rounded-full bg-slate-100">
                <span className={cx('block h-full rounded-full', highlight ? 'bg-brass-400' : 'bg-ink-300')} style={{ width: `${r.adherence}%` }} />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ResultPreview() {
  const from = before.results.byDoc[gapDoc].rank;
  const to = after.results.byDoc[gapDoc].rank;
  return (
    <figure className="relative rounded-3xl border border-ink-100 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(11,19,34,0.45)]" aria-labelledby="preview-title">
      <div aria-hidden className="absolute -right-3 -top-3 rounded-full bg-ink-700 px-3 py-1 text-xs font-semibold text-white shadow">
        Sample result
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-brass-700">{scenario.title}</p>
      <figcaption id="preview-title" className="mt-1 font-display text-2xl font-semibold leading-tight tracking-tight text-ink-900">
        {nick(gapDoc)}: {ordinal(from)} <ArrowRight className="inline size-5 align-[-2px]" aria-label="to" /> {ordinal(to)} after one missing answer
      </figcaption>
      <div className="mt-5 grid grid-cols-2 gap-5">
        <Ranking title="Before" analysis={before} />
        <Ranking title="After filling the gap" analysis={after} />
      </div>
      <div className="mt-5 space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
        <p className="flex items-center gap-1.5">
          <CircleSlash className="size-3.5 shrink-0 text-slate-500" aria-hidden />
          Inspection history: Not found in the dossier, so it scores 0
        </p>
        <p className="flex items-center gap-1.5">
          <CircleCheck className="size-3.5 shrink-0 text-emerald-700" aria-hidden />
          Supplier confirms no observations in the last two inspections: score 5
        </p>
      </div>
    </figure>
  );
}
