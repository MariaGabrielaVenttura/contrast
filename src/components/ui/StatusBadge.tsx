import { ArrowDown, BadgeCheck, CircleMinus, CircleSlash, Mail, Pencil, TriangleAlert, Trophy, UserCheck } from 'lucide-react';
import type { CellStatus } from '../../lib/cells';
import { STATUS_LABEL } from '../../lib/cells';
import { cx } from './cx';

const styles: Record<CellStatus, { cls: string; Icon: typeof Mail | null }> = {
  auto: { cls: 'border-slate-200 bg-white text-slate-600', Icon: null },
  needs_review: { cls: 'border-orange-300 bg-orange-50 text-orange-800', Icon: TriangleAlert },
  human_verified: { cls: 'border-ink-200 bg-ink-50 text-ink-800', Icon: BadgeCheck },
  human_edited: { cls: 'border-ink-200 bg-ink-50 text-ink-800', Icon: Pencil },
  human_provided: { cls: 'border-ink-200 bg-ink-50 text-ink-800', Icon: UserCheck },
  not_found: { cls: 'border-slate-300 bg-slate-100 text-slate-700', Icon: CircleSlash },
  info_requested: { cls: 'border-sky-200 bg-sky-50 text-sky-800', Icon: Mail },
  accepted_gap: { cls: 'border-slate-300 bg-slate-100 text-slate-700', Icon: CircleMinus },
};

export function statusText(status: CellStatus, confidence?: number): string {
  return status === 'auto' ? `Confidence ${confidence ?? 0}%` : STATUS_LABEL[status];
}

export function StatusBadge({ status, confidence, size = 'sm' }: { status: CellStatus; confidence?: number; size?: 'sm' | 'md' }) {
  const { cls, Icon } = styles[status];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        cls,
      )}
    >
      {Icon && <Icon className="size-3.5 shrink-0" aria-hidden />}
      {status === 'auto' ? (
        <>
          <span className="sr-only">Confidence </span>
          {confidence}%
        </>
      ) : (
        STATUS_LABEL[status]
      )}
    </span>
  );
}

export function BestMarker() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      <Trophy className="size-3.5" aria-hidden />
      Best
    </span>
  );
}

export function BelowMarker() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
      <ArrowDown className="size-3.5" aria-hidden />
      Below expectation
    </span>
  );
}
