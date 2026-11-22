import { ListChecks, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useIsDesktop } from '../../hooks/useMediaQuery';
import { useApp, useView } from '../../state/AppContext';
import { Button } from '../ui/Button';
import { cx } from '../ui/cx';
import { DemoPill, Wordmark } from './Brand';
import { MobileMenu } from './MobileMenu';
import { ScenarioSwitcher } from './ScenarioSwitcher';

export function WorkspaceHeader() {
  const { dispatch } = useApp();
  const { scenario, docs } = useView();
  const isDesktop = useIsDesktop();
  const [showFull, setShowFull] = useState(false);
  return (
    <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Wordmark onClick={() => dispatch({ type: 'GO_HOME' })} />
        <DemoPill />
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {isDesktop ? (
            <>
              <ScenarioSwitcher />
              <Button
                size="sm"
                variant="ghost"
                icon={<ListChecks className="size-4" aria-hidden />}
                onClick={() => dispatch({ type: 'SET_UI', patch: { checklistOpen: true, checklistCollapsed: false } })}
              >
                Demo guide
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<SlidersHorizontal className="size-4" aria-hidden />}
                onClick={() => dispatch({ type: 'SET_STAGE', stage: 'setup' })}
              >
                Edit setup
              </Button>
              <Button
                size="sm"
                variant="ghost"
                icon={<RotateCcw className="size-4" aria-hidden />}
                onClick={() => dispatch({ type: 'SET_UI', patch: { confirmStartOverOpen: true } })}
              >
                Start over
              </Button>
            </>
          ) : (
            <MobileMenu />
          )}
        </div>
      </div>
      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brass-700">
          {scenario.title} · {scenario.industryTag}
        </p>
        <h1
          className={cx('mt-0.5 text-lg font-semibold leading-snug text-ink-900 sm:text-2xl', (isDesktop || !showFull) && 'line-clamp-2')}
          title={scenario.question}
        >
          {scenario.question}
        </h1>
        {!isDesktop && (
          <button
            type="button"
            aria-expanded={showFull}
            onClick={() => setShowFull((v) => !v)}
            className="mt-0.5 text-xs font-semibold text-ink-700 underline underline-offset-2"
          >
            {showFull ? 'Show less' : 'Show full question'}
          </button>
        )}
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Documents">
          {docs.map((d) => (
            <li key={d.id} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {d.nickname}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
