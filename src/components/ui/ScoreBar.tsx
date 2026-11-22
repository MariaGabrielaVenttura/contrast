import { formatScore } from '../../lib/format';
import { cx } from './cx';

/** Small horizontal bar (0–5) with the score number. The bar is decorative; the number carries the value. */
export function ScoreBar({ score, className, muted }: { score: number; className?: string; muted?: boolean }) {
  const pct = Math.max(0, Math.min(100, (score / 5) * 100));
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <span aria-hidden className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-200">
        <span className={cx('block h-full rounded-full', muted ? 'bg-slate-400' : 'bg-ink-600')} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-xs font-semibold tabular-nums text-slate-900">
        <span className="sr-only">Score </span>
        {formatScore(score)}
      </span>
    </span>
  );
}
