import { Repeat, Trophy } from 'lucide-react';
import { BelowMarker, BestMarker, StatusBadge } from '../../../components/ui/StatusBadge';
import { cx } from '../../../components/ui/cx';
import { ScoreBar } from '../../../components/ui/ScoreBar';
import { formatPercent, formatTotal } from '../../../lib/format';
import { useApp, useView } from '../../../state/AppContext';
import { RuleChip } from '../../setup/CriteriaStep';
import type { CellInfo, RowInfo } from './model';

export function CellButton({ cell, onOpen }: { cell: CellInfo; onOpen: () => void }) {
  const { resolved } = cell;
  const isQual = resolved.value?.kind === 'qualitative';
  const converted = resolved.seed.extraction === 'found' && !!resolved.seed.conversionNote && resolved.status !== 'human_edited';
  return (
    <button
      type="button"
      data-cell-key={cell.key}
      data-pending={resolved.isPendingReview || undefined}
      aria-label={cell.ariaLabel}
      onClick={onOpen}
      className={cx(
        'flex h-full w-full flex-col items-start gap-2 rounded-xl border p-3 text-left transition-colors hover:border-ink-400 hover:shadow-sm',
        cell.isBest && 'border-emerald-300 bg-emerald-50/60',
        cell.isBelow && 'border-amber-300 bg-amber-50/60',
        resolved.isGap && 'border-dashed border-slate-300 bg-slate-50',
        resolved.isPendingReview && 'ring-2 ring-orange-300 ring-offset-1',
        !cell.isBest && !cell.isBelow && !resolved.isGap && 'border-slate-200 bg-white',
      )}
    >
      <span className={cx('break-words text-sm font-medium text-slate-900', isQual && 'line-clamp-2', resolved.isGap && 'text-slate-400')}>
        {resolved.isGap ? '—' : cell.valueText}
      </span>
      <ScoreBar score={cell.score} muted={resolved.isGap} />
      <span className="flex flex-wrap items-center gap-1 empty:hidden">
        {resolved.status !== 'auto' && <StatusBadge status={resolved.status} confidence={cell.confidence} />}
        {cell.isBest && <BestMarker />}
        {cell.isBelow && <BelowMarker />}
        {converted && (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
            <Repeat className="size-3" aria-hidden />
            Converted
          </span>
        )}
      </span>
    </button>
  );
}

export function MatrixTable({ rows }: { rows: RowInfo[] }) {
  const { dispatch } = useApp();
  const { docs, analysis } = useView();
  const results = analysis!.results;
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] table-fixed border-collapse">
        <caption className="sr-only">
          Comparison matrix: criteria in rows, documents in columns. Each cell opens the evidence.
        </caption>
        <colgroup>
          <col className="w-56" />
          {docs.map((d) => (
            <col key={d.id} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Criterion · weight
            </th>
            {docs.map((d) => (
              <th key={d.id} scope="col" className="px-3 py-3 text-left">
                <span className="block break-words text-sm font-semibold text-slate-900">{d.nickname}</span>
                <span className="text-xs font-normal text-slate-500">{d.info.fileType}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.def.id} className="border-b border-slate-100 align-top">
              <th scope="row" className="px-4 py-3 text-left font-normal">
                <span className="block text-sm font-semibold text-slate-900">{row.def.name}</span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded-md bg-ink-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ink-700">
                    {row.weight}%
                  </span>
                  <RuleChip def={row.def} />
                </span>
              </th>
              {row.cells.map((cell) => (
                <td key={cell.key} className="px-2 py-2">
                  <CellButton cell={cell} onOpen={() => dispatch({ type: 'OPEN_CELL', key: cell.key })} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-50 align-top">
            <th scope="row" className="px-4 py-4 text-left">
              <span className="block text-sm font-semibold text-slate-900">Weighted total</span>
              <span className="text-xs font-normal text-slate-500">Adherence and rank · from unrounded scores</span>
            </th>
            {docs.map((d) => {
              const r = results.byDoc[d.id];
              const first = r.rank === 1;
              const tied = results.isTie && results.tiedDocIds.includes(d.id);
              return (
                <td key={d.id} className="px-3 py-4" data-testid={`total-${d.id}`}>
                  <span className="block text-sm tabular-nums text-slate-600">{formatTotal(r.total)} / 5</span>
                  <span className="block text-2xl font-semibold tabular-nums tracking-tight text-slate-900">{formatPercent(r.adherence)}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-1">
                    <span
                      className={cx(
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                        first ? 'bg-ink-600 text-white' : 'bg-slate-200 text-slate-700',
                      )}
                    >
                      {first && <Trophy className="size-3.5" aria-hidden />}
                      Rank #{r.rank}
                    </span>
                    {tied && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">Technical tie</span>}
                  </span>
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
