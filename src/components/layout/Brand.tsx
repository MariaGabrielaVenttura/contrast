import { Info } from 'lucide-react';
import { Tip } from '../ui/Tip';

/** Two contrasting halves: ink and brass. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <path d="M10 2h6v28h-6a8 8 0 0 1-8-8V10a8 8 0 0 1 8-8z" fill="var(--color-ink-700)" />
      <path d="M16 2h6a8 8 0 0 1 8 8v12a8 8 0 0 1-8 8h-6z" fill="var(--color-brass-400)" />
    </svg>
  );
}

export function Wordmark({ onClick }: { onClick?: () => void }) {
  const content = (
    <>
      <LogoMark className="size-7" />
      <span className="font-display text-xl font-semibold tracking-tight text-ink-900">Contrast</span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="flex items-center gap-2 rounded-lg" aria-label="Contrast, back to start">
      {content}
    </button>
  ) : (
    <span className="flex items-center gap-2">{content}</span>
  );
}

export function DemoPill() {
  return (
    <Tip content="Fictional data and simulated AI. Switch scenarios anytime.">
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
      >
        Demo
        <Info className="size-3" aria-hidden />
        <span className="sr-only">: fictional data and simulated AI. Switch scenarios anytime.</span>
      </button>
    </Tip>
  );
}

export function DisclaimerBanner({ text }: { text: string }) {
  return (
    <div role="note" className="border-b border-amber-200 bg-amber-50 print:border print:rounded-md">
      <p className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 text-sm font-medium text-amber-900 sm:px-6">
        <Info className="size-4 shrink-0" aria-hidden />
        {text}
      </p>
    </div>
  );
}
