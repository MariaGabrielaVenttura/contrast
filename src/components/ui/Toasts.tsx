import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useCallback, useEffect } from 'react';
import { newId, useApp } from '../../state/AppContext';
import type { Toast } from '../../state/types';

export function useToast() {
  const { dispatch } = useApp();
  return useCallback(
    (message: string, tone: Toast['tone'] = 'success') => dispatch({ type: 'PUSH_TOAST', toast: { id: newId('toast'), message, tone } }),
    [dispatch],
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { dispatch } = useApp();
  useEffect(() => {
    const t = window.setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id: toast.id }), 4500);
    return () => window.clearTimeout(t);
  }, [dispatch, toast.id]);
  const Icon = toast.tone === 'error' ? XCircle : toast.tone === 'info' ? Info : CheckCircle2;
  return (
    <div className="pointer-events-auto flex w-full items-start gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
      <Icon className={toast.tone === 'error' ? 'mt-0.5 size-4 shrink-0 text-red-300' : 'mt-0.5 size-4 shrink-0 text-indigo-300'} aria-hidden />
      <p className="flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => dispatch({ type: 'DISMISS_TOAST', id: toast.id })}
        className="-m-1 rounded p-1 text-slate-300 hover:text-white"
        aria-label="Dismiss notification"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function ToastRegion() {
  const { state } = useApp();
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] mx-auto flex w-full max-w-md flex-col gap-2 px-4 print:hidden"
    >
      {state.toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
