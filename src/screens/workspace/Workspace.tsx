import * as Tabs from '@radix-ui/react-tabs';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { DisclaimerBanner } from '../../components/layout/Brand';
import { WorkspaceHeader } from '../../components/layout/WorkspaceHeader';
import { useToast } from '../../components/ui/Toasts';
import { cx } from '../../components/ui/cx';
import { formatPercent } from '../../lib/format';
import { ConfirmStartOver } from '../../overlays/ConfirmStartOver';
import { useApp, useView } from '../../state/AppContext';
import type { TabId } from '../../state/types';
import { CompareTab } from './compare/CompareTab';
import { InsightsTab } from './insights/InsightsTab';
import { ReportTab } from './report/ReportTab';

/** Announces when the #1 document changes within the same scenario. */
function useLeaderChangeToast() {
  const { scenario, analysis, nickname } = useView();
  const toast = useToast();
  const prev = useRef<{ scenarioId: string; leaderId: string } | null>(null);
  const leaderId = analysis?.results.leaderId;
  const adherence = leaderId ? analysis!.results.byDoc[leaderId].adherence : 0;
  useEffect(() => {
    if (!leaderId) return;
    const p = prev.current;
    if (p && p.scenarioId === scenario.id && p.leaderId !== leaderId) {
      toast(`Ranking changed: ${nickname(leaderId)} is now #1 with ${formatPercent(adherence)}.`, 'info');
    }
    prev.current = { scenarioId: scenario.id, leaderId };
  }, [leaderId, scenario.id, adherence, nickname, toast]);
}

export function Workspace() {
  const { dispatch } = useApp();
  const { scenario, session, pendingReviewKeys } = useView();
  useLeaderChangeToast();
  const pending = pendingReviewKeys.length;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'compare', label: 'Compare' },
    { id: 'insights', label: 'Insights' },
    { id: 'report', label: 'Report' },
  ];

  return (
    <Tabs.Root
      value={session.activeTab}
      onValueChange={(v) => dispatch({ type: 'SET_TAB', tab: v as TabId })}
      className="flex flex-1 flex-col"
      activationMode="manual"
    >
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <WorkspaceHeader />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Tabs.List aria-label="Workspace" className="mt-3 flex gap-1">
            {tabs.map((t) => (
              <Tabs.Trigger
                key={t.id}
                value={t.id}
                aria-label={t.id === 'report' && pending > 0 ? `Report, ${pending} ${pending === 1 ? 'item' : 'items'} pending review` : undefined}
                className={cx(
                  'relative inline-flex h-10 flex-1 items-center justify-center gap-2 border-b-2 px-4 text-sm font-medium transition-colors sm:flex-none',
                  'border-transparent text-slate-600 hover:text-slate-900 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-700',
                )}
              >
                {t.label}
                {t.id === 'report' && pending > 0 && (
                  <span
                    data-testid="report-badge"
                    className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 text-xs font-semibold text-orange-800"
                  >
                    <TriangleAlert className="size-3" aria-hidden />
                    {pending}
                  </span>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </div>
      </header>
      {scenario.disclaimerBanner && (
        <div className="print:hidden">
          <DisclaimerBanner text={scenario.disclaimerBanner} />
        </div>
      )}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 print:max-w-none print:p-0">
        <Tabs.Content value="compare" className="outline-none">
          <CompareTab />
        </Tabs.Content>
        <Tabs.Content value="insights" className="outline-none">
          <InsightsTab />
        </Tabs.Content>
        <Tabs.Content value="report" className="outline-none">
          <ReportTab />
        </Tabs.Content>
      </main>
      <ConfirmStartOver />
    </Tabs.Root>
  );
}
