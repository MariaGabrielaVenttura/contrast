import { Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../../../components/ui/cx';
import { getCriterion } from '../../../data/scenarios';
import { cellKey, splitCellKey } from '../../../data/types';
import { STATUS_LABEL } from '../../../lib/cells';
import { formatDate, formatDateTime, formatPercent, formatScore, formatTotal } from '../../../lib/format';
import { ruleLabel } from '../../../lib/rules';
import type { ScenarioView } from '../../../state/selectors';
import type { InsightsModel } from '../insights/model';
import { RobustnessBadge, TieBanner } from '../insights/shared';

export const PRINT_AUDIT_LIMIT = 10;

function H({ children }: { children: ReactNode }) {
  return <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 print:text-[7.5pt]">{children}</h3>;
}

export function ReportDocument({ view, model }: { view: ScenarioView; model: InsightsModel }) {
  const { scenario, session, docs, criteria, cells, analysis, openRequestKeys, nickname } = view;
  const results = analysis!.results;
  const audit = [...session.audit].reverse();
  const hiddenInPrint = Math.max(0, audit.length - PRINT_AUDIT_LIMIT);
  const changers = model.gaps.filter((g) => g.canChange);

  return (
    <article
      className="report mx-auto max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 print:max-w-none print:space-y-3 print:rounded-none print:border-0 print:p-0 print:shadow-none"
      aria-labelledby="report-title"
    >
      <header className="flex flex-col gap-1 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between print:pb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Contrast · Decision brief</p>
          <h2 id="report-title" className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 print:text-[15pt]">
            Decision brief: {scenario.title}
          </h2>
        </div>
        <p className="text-sm text-slate-600 print:text-[8.5pt]">{formatDate(new Date())}</p>
      </header>

      <section>
        <H>Decision question</H>
        <p className="mt-1 font-medium text-slate-900">{scenario.question}</p>
      </section>

      <section className="rounded-xl border-2 border-indigo-200 bg-indigo-50/50 p-4 print:p-2.5" aria-label="Recommendation">
        {model.isTie ? (
          <TieBanner text={model.tieText} />
        ) : (
          <p className="flex items-center gap-2 text-xl font-semibold text-slate-900 print:text-[12pt]">
            <Trophy className="size-5 text-indigo-600" aria-hidden />
            {model.recommendationText}
          </p>
        )}
        <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3 print:mt-1.5">
          <RobustnessBadge level={model.robustness.level} />
          <p className="text-sm text-slate-700 print:text-[8.5pt]">{model.robustnessText}</p>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
        <section>
          <H>Documents</H>
          <ul className="mt-2 space-y-1 text-sm print:text-[8.5pt]">
            {docs.map((d) => (
              <li key={d.id}>
                <span className="font-medium text-slate-900">{d.nickname}</span>
                <span className="text-slate-600">
                  {' '}
                  — {d.info.name}, {d.info.fileType}
                  {d.info.pages ? `, ${d.info.pages} pages` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <H>Criteria and weights</H>
          <ul className="mt-2 space-y-1 text-sm print:text-[8.5pt]">
            {criteria.map(({ def, weight }) => (
              <li key={def.id} className="flex justify-between gap-3">
                <span className="text-slate-800">
                  {def.name} <span className="text-slate-500">· {ruleLabel(def)}</span>
                </span>
                <span className="font-semibold tabular-nums text-slate-900">{weight}%</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section>
        <H>Comparison (scores 0–5)</H>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm print:min-w-0 print:text-[8pt]">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th scope="col" className="py-1.5 pr-3 font-semibold text-slate-700">
                  Criterion
                </th>
                {docs.map((d) => (
                  <th key={d.id} scope="col" className="px-2 py-1.5 font-semibold text-slate-700">
                    {d.nickname}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {criteria.map(({ def, weight }) => (
                <tr key={def.id} className="border-b border-slate-100">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal text-slate-800">
                    {def.name} <span className="text-slate-500">({weight}%)</span>
                  </th>
                  {docs.map((d) => {
                    const key = cellKey(def.id, d.id);
                    const c = cells[key];
                    const showStatus = c.status !== 'auto';
                    return (
                      <td key={d.id} className="px-2 py-1.5 tabular-nums text-slate-900">
                        {formatScore(results.cellScores[key])}
                        {showStatus && <span className="ml-1 text-xs text-slate-500 print:text-[7pt]">· {STATUS_LABEL[c.status]}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300">
                <th scope="row" className="py-1.5 pr-3 text-left font-semibold text-slate-900">
                  Weighted total
                </th>
                {docs.map((d) => {
                  const r = results.byDoc[d.id];
                  return (
                    <td key={d.id} className={cx('px-2 py-1.5 tabular-nums', r.rank === 1 ? 'font-semibold text-indigo-700' : 'text-slate-900')}>
                      {formatTotal(r.total)} / 5 · {formatPercent(r.adherence)} · #{r.rank}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <div className="grid gap-6 sm:grid-cols-2 print:grid-cols-2 print:gap-3">
        <section>
          <H>What drives the result</H>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700 print:text-[8.5pt]">
            {model.gapToSecondText && <li>{model.gapToSecondText}</li>}
            {model.topAdvantageText && <li>{model.topAdvantageText}</li>}
            {changers.length === 0 ? <li>No open gap could change the result.</li> : changers.map((g) => <li key={g.key}>{g.sentence}</li>)}
          </ul>
        </section>
        <section>
          <H>Gaps</H>
          {model.gaps.length === 0 ? (
            <p className="mt-2 text-sm text-slate-700 print:text-[8.5pt]">None. Every criterion has a value for every document.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700 print:text-[8.5pt]">
              {model.gaps.map((g) => (
                <li key={g.key}>
                  <span className="font-medium text-slate-900">
                    {g.docName} · {g.criterionName}
                  </span>{' '}
                  ({g.statusLabel}). {g.sentence}
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500 print:mt-2 print:text-[7.5pt]">
            Open information requests
          </h3>
          {openRequestKeys.length === 0 ? (
            <p className="mt-1 text-sm text-slate-700 print:text-[8.5pt]">None.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm text-slate-700 print:text-[8.5pt]" data-testid="open-requests">
              {openRequestKeys.map((k) => {
                const { criterionId, docId } = splitCellKey(k);
                const r = cells[k].review;
                return (
                  <li key={k}>
                    {nickname(docId)} · {getCriterion(scenario, criterionId).name}
                    {r ? <span className="text-slate-500"> · requested {formatDateTime(r.at)}</span> : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <section>
        <H>Audit trail</H>
        <ol className="mt-2 divide-y divide-slate-100 text-sm print:text-[7.5pt]">
          {audit.map((e, i) => (
            <li key={e.id} className={cx('grid gap-x-3 py-1.5 sm:grid-cols-[9.5rem_9rem_1fr] print:grid-cols-[8rem_7.5rem_1fr] print:py-0.5', i >= PRINT_AUDIT_LIMIT && 'print:hidden')}>
              <span className="tabular-nums text-slate-500">{formatDateTime(e.at)}</span>
              <span className="font-medium text-slate-700">{e.actor}</span>
              <span className="text-slate-800">
                {e.summary}
                {e.note && <span className="text-slate-500"> Note: {e.note}</span>}
              </span>
            </li>
          ))}
        </ol>
        {hiddenInPrint > 0 && <p className="hidden text-[7.5pt] text-slate-500 print:block">…and {hiddenInPrint} earlier entries.</p>}
      </section>

      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500 print:pt-1.5 print:text-[7.5pt]">
        <p>Simulated AI results and fictional data. Generated with Contrast, a prototype.</p>
        {scenario.disclaimerBanner && <p className="mt-0.5 font-medium text-amber-900">{scenario.disclaimerBanner}</p>}
      </footer>
    </article>
  );
}
