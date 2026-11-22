import { Check } from 'lucide-react';
import { cx } from './cx';

export function Toggle({ pressed, onChange, children }: { pressed: boolean; onChange: (v: boolean) => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => onChange(!pressed)}
      className={cx(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors',
        pressed ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      {pressed && <Check className="size-3.5" aria-hidden />}
      {children}
    </button>
  );
}
