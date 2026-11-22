import { Trophy } from 'lucide-react';
import { cx } from '../../../components/ui/cx';
import { formatPercent, formatTotal } from '../../../lib/format';
import { useApp, useView } from '../../../state/AppContext';
import { RuleChip } from '../../setup/CriteriaStep';
import { CellButton } from './MatrixTable';
import type { RowInfo } from './model';

/** Mobile layout (< 768px): one card per criterion, documents stacked inside. */
export function CriterionCards({ rows }: { rows: RowInfo[] }) {
  const { dispatch } = useApp();
  const { docs, analysis } = useView();
  const results = analysis!.results;
  return (
    <div className="space-y-4">
      <ul className="space-y-4" aria-label="Comparison by criterion">
        {rows.map((row) => (
          <li key={row.def.id}>
            <section aria-labelledby={`card-${row.def.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 id={`card-${row.def.id}`} className="font-semibold text-ink-900">
                {row.def.name}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-ink-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-700">{row.weight}%</span>
                <RuleChip def={row.def} />
              </p>
              <ul className="mt-3 space-y-2">
                {row.cells.map((cell) => (
                  <li key={cell.key}>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500" aria-hidden>
                      {cell.nickname}
                    </p>
                    <CellButton cell={cell} onOpen={() => dispatch({ type: 'OPEN_CELL', key: cell.key })} />
                  </li>
                ))}
              </ul>
            </section>
          </li>
        ))}
      </ul>

      <section aria-labelledby="card-total" className="rounded-2xl border border-ink-200 bg-ink-50 p-4">
        <h3 id="card-total" className="font-semibold text-ink-900">
          Weighted total
        </h3>
        <p className="text-xs text-slate-600">Adherence and rank · from unrounded scores</p>
        <ul className="mt-3 space-y-2">
          {docs.map((d) => {
            const r = results.byDoc[d.id];
            const first = r.rank === 1;
            const tied = results.isTie && results.tiedDocIds.includes(d.id);
            return (
              <li key={d.id} data-testid={`total-${d.id}`} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-ink-900">{d.nickname}</span>
                  <span className="text-xs tabular-nums text-slate-600">{formatTotal(r.total)} / 5</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-lg font-semibold tabular-nums text-ink-900">{formatPercent(r.adherence)}</span>
                  <span className="flex gap-1">
                    {tied && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Technical tie</span>}
                    <span
                      className={cx(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                        first ? 'bg-ink-600 text-white' : 'bg-slate-200 text-slate-700',
                      )}
                    >
                      {first && <Trophy className="size-3.5" aria-hidden />}
                      Rank #{r.rank}
                    </span>
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
