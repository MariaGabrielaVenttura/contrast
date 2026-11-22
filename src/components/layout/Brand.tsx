import { Info } from 'lucide-react';
import { Tip } from '../ui/Tip';

export function Wordmark({ onClick }: { onClick?: () => void }) {
  const content = (
    <>
      <span aria-hidden className="flex size-7 items-center justify-center gap-0.5 rounded-lg bg-indigo-600">
        <span className="h-3.5 w-1.5 rounded-sm bg-white" />
        <span className="h-3.5 w-1.5 rounded-sm bg-white/55" />
      </span>
      <span className="text-lg font-semibold tracking-tight text-slate-900">Contrast</span>
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
