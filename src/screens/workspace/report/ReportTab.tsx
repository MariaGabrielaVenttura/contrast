import { ClipboardList, Copy, Lock, Printer } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toasts';
import { useClipboard } from '../../../hooks/useClipboard';
import { copySummary } from '../../../lib/messages';
import { useApp, useView } from '../../../state/AppContext';
import { insightsModel } from '../insights/model';
import { ReportDocument } from './ReportDocument';

export function ReportTab() {
  const { dispatch } = useApp();
  const view = useView();
  const toast = useToast();
  const copy = useClipboard();
  const { scenario, analysis, nickname, cells, pendingReviewKeys, openRequestKeys } = view;
  const model = useMemo(
    () => (analysis ? insightsModel(scenario, analysis, nickname, (k) => cells[k].status) : null),
    [scenario, analysis, nickname, cells],
  );
  if (!model) return null;
  const pending = pendingReviewKeys.length;
  const locked = pending > 0;
  const reason = `Review ${pending} pending ${pending === 1 ? 'item' : 'items'} before exporting`;

  const exportPdf = () => {
    dispatch({ type: 'MARK_EXPORTED' });
    window.setTimeout(() => window.print(), 0);
  };

  const copyText = async () => {
    const text = copySummary({
      scenarioTitle: scenario.title,
      question: scenario.question,
      isTie: model.isTie,
      tiedNames: model.tiedNames,
      leaderName: model.leaderName,
      leaderAdherence: model.leaderAdherence,
      robustnessLevel: model.robustness.level,
      ranking: model.ranking.map((r) => ({ name: r.name, adherence: r.adherence })),
      openGaps: model.gaps.map((g) => `${g.docName} · ${g.criterionName}`),
      openRequests: openRequestKeys.length,
    });
    const ok = await copy(text);
    toast(ok ? 'Summary copied to clipboard.' : "Couldn't copy. Select the text and copy it manually.", ok ? 'success' : 'error');
    if (ok) dispatch({ type: 'MARK_EXPORTED' });
  };

  const goToReview = () => {
    dispatch({ type: 'SET_FILTER', key: 'needsReviewOnly', value: true });
    dispatch({ type: 'SET_UI', patch: { focusTarget: 'first_pending' } });
    dispatch({ type: 'SET_TAB', tab: 'compare' });
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Executive report</h2>
          <p className="text-sm text-slate-600">One-page brief. Updates instantly with every review decision.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="primary"
            icon={<Printer className="size-4" aria-hidden />}
            inactive={locked}
            disabledReason={reason}
            onClick={exportPdf}
          >
            Export PDF
          </Button>
          <Button icon={<Copy className="size-4" aria-hidden />} inactive={locked} disabledReason={reason} onClick={copyText}>
            Copy summary
          </Button>
        </div>
      </div>

      <div className="relative">
        <div className={locked ? 'pointer-events-none select-none blur-[3px] print:hidden' : undefined} inert={locked || undefined} aria-hidden={locked || undefined}>
          <ReportDocument view={view} model={model} />
        </div>
        {locked && (
          <>
            <div className="absolute inset-0 flex items-start justify-center p-4 pt-16 print:hidden">
              <div role="alert" className="w-full max-w-md rounded-2xl border border-orange-200 bg-white p-6 text-center shadow-xl">
                <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-orange-100 text-orange-700">
                  <Lock className="size-5" aria-hidden />
                </span>
                <p className="mt-3 text-lg font-semibold text-slate-900" data-testid="report-lock">
                  {reason}
                </p>
                <p className="mt-1 text-sm text-slate-600">Gaps don't block export. They're listed in the report.</p>
                <Button className="mt-4" variant="primary" icon={<ClipboardList className="size-4" aria-hidden />} onClick={goToReview}>
                  Go to items needing review
                </Button>
              </div>
            </div>
            <p className="hidden print:block">Report locked: review pending items before exporting.</p>
          </>
        )}
      </div>
    </div>
  );
}
