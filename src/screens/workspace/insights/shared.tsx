import { Shield, ShieldAlert, ShieldCheck, Scale } from 'lucide-react';
import { cx } from '../../../components/ui/cx';
import type { RobustnessLevel } from '../../../lib/scoring';

const robustnessStyle: Record<RobustnessLevel, { cls: string; Icon: typeof Shield }> = {
  Low: { cls: 'border-rose-200 bg-rose-50 text-rose-800', Icon: ShieldAlert },
  Medium: { cls: 'border-amber-200 bg-amber-50 text-amber-900', Icon: Shield },
  High: { cls: 'border-emerald-200 bg-emerald-50 text-emerald-800', Icon: ShieldCheck },
};

export function RobustnessBadge({ level }: { level: RobustnessLevel }) {
  const { cls, Icon } = robustnessStyle[level];
  return (
    <span data-testid="robustness" className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold', cls)}>
      <Icon className="size-4" aria-hidden />
      Decision robustness: {level}
    </span>
  );
}

export function TieBanner({ text }: { text: string }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
      <Scale className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="font-medium">{text}</p>
    </div>
  );
}
