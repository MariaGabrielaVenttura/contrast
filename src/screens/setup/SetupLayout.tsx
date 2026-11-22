import { ArrowLeft, Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { DemoPill, DisclaimerBanner, Wordmark } from '../../components/layout/Brand';
import { Button } from '../../components/ui/Button';
import { cx } from '../../components/ui/cx';
import { useApp, useView } from '../../state/AppContext';

export function SetupLayout({ step, children }: { step: 1 | 2; children: ReactNode }) {
  const { dispatch } = useApp();
  const { scenario } = useView();
  const steps = ['Setup', 'Criteria'];
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <Wordmark onClick={() => dispatch({ type: 'GO_HOME' })} />
          <DemoPill />
          <nav aria-label="Setup steps" className="order-last w-full sm:order-none sm:ml-6 sm:w-auto">
            <ol className="flex items-center gap-2 text-sm">
              {steps.map((label, i) => {
                const n = i + 1;
                const current = n === step;
                const done = n < step;
                return (
                  <li key={label} className="flex items-center gap-2" aria-current={current ? 'step' : undefined}>
                    <span
                      className={cx(
                        'flex size-6 items-center justify-center rounded-full text-xs font-semibold',
                        current ? 'bg-ink-600 text-white' : done ? 'bg-ink-100 text-ink-700' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {done ? <Check className="size-3.5" aria-hidden /> : n}
                    </span>
                    <span className={cx(current ? 'font-semibold text-slate-900' : 'text-slate-500')}>
                      {label}
                      {done && <span className="sr-only"> (done)</span>}
                    </span>
                    {n < steps.length && <span aria-hidden className="mx-1 h-px w-6 bg-slate-300" />}
                  </li>
                );
              })}
            </ol>
          </nav>
          <Button
            className="ml-auto"
            variant="ghost"
            size="sm"
            icon={<ArrowLeft className="size-4" aria-hidden />}
            onClick={() => dispatch({ type: 'GO_HOME' })}
          >
            All scenarios
          </Button>
        </div>
      </header>
      {scenario.disclaimerBanner && <DisclaimerBanner text={scenario.disclaimerBanner} />}
      <main id="main" className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-brass-700">
          {scenario.title} · Step {step} of 2
        </p>
        {children}
      </main>
    </>
  );
}
