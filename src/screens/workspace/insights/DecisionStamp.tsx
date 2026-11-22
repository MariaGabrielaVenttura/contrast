import { CircleAlert, CircleCheck, Hourglass, Scale, ShieldAlert } from 'lucide-react';
import { cx } from '../../../components/ui/cx';
import type { DecisionStatus } from '../../../lib/decision';

const styles: Record<DecisionStatus['kind'], { cls: string; Icon: typeof CircleCheck }> = {
  ready: { cls: 'border-emerald-600 text-emerald-800 bg-emerald-50', Icon: CircleCheck },
  needs_decision: { cls: 'border-orange-500 text-orange-800 bg-orange-50', Icon: CircleAlert },
  provisional: { cls: 'border-sky-600 text-sky-800 bg-sky-50', Icon: Hourglass },
  too_close: { cls: 'border-amber-500 text-amber-900 bg-amber-50', Icon: Scale },
  // Amber: a deliberate, recorded risk. Red is reserved for blocking states.
  accepted_risk: { cls: 'border-amber-500 text-amber-900 bg-amber-50', Icon: ShieldAlert },
};

/** Status stamp: "Ready to decide", "Provisional — …", "Decided with N accepted risk(s)". */
export function DecisionStamp({ status, text, className }: { status: DecisionStatus; text: string; className?: string }) {
  const { cls, Icon } = styles[status.kind];
  return (
    <p
      data-testid="decision-status"
      className={cx(
        'inline-flex items-center gap-2 rounded-md border-2 px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em]',
        cls,
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span>
        <span className="sr-only">Decision status: </span>
        {text}
      </span>
    </p>
  );
}
