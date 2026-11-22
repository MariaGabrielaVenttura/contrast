import { BadgeCheck, Mail, Pencil, ShieldOff, Trophy, UserCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { LogoMark } from '../../../components/layout/Brand';
import { cx } from '../../../components/ui/cx';
import { getCriterion } from '../../../data/scenarios';
import { cellKey, splitCellKey } from '../../../data/types';
import { STATUS_LABEL, type CellStatus } from '../../../lib/cells';
import { formatDate, formatPercent, formatScore, formatTime, formatTotal } from '../../../lib/format';
import { ruleLabel } from '../../../lib/rules';
import { acceptance, acceptanceText } from '../../../lib/suggestions';
import type { ScenarioView } from '../../../state/selectors';
import type { AuditEntry } from '../../../state/types';
import { DecisionStamp } from '../insights/DecisionStamp';
import { buildRows } from '../compare/model';
import type { InsightsModel } from '../insights/model';
import { ChangedAfterResultsNote, RobustnessBadge, TieBanner } from '../insights/shared';

export const PRINT_AUDIT_LIMIT = 8;

function Section({ n, title, children, className }: { n: number; title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx('break-inside-avoid', className)} aria-labelledby={`report-s${n}`}>
      <h3 id={`report-s${n}`} className="flex items-baseline gap-2 border-b border-slate-200 pb-1.5">
        <span className="font-display text-sm font-semibold text-brass-600 tabular-nums">{String(n).padStart(2, '0')}</span>
        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-800">{title}</span>
      </h3>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

const HUMAN_ICON: Partial<Record<CellStatus, { Icon: typeof Pencil; label: string }>> = {
  human_verified: { Icon: BadgeCheck, label: 'Human-verified' },
  human_edited: { Icon: Pencil, label: 'Human-edited' },
  human_provided: { Icon: UserCheck, label: 'Human-provided' },
  info_requested: { Icon: Mail, label: 'Info requested' },
  accepted_gap: { Icon: ShieldOff, label: 'Accepted gap' },
};

/**
 * Heatmap tint: light-to-medium ink, dark text throughout. The curve is steeper at the top so that
 * 4.6 and 5.0 read differently, and low scores stay clearly lighter.
 */
export function heatPercent(score: number): number {
  const t = Math.max(0, Math.min(1, score / 5));
  return Math.round(4 + Math.pow(t, 3) * 40);
}
function heat(score: number, best: boolean): { background: string; color: string; boxShadow?: string } {
  return {
    background: `color-mix(in srgb, var(--color-ink-500) ${heatPercent(score)}%, white)`,
    color: 'var(--color-ink-900)',
    boxShadow: best ? 'inset 0 0 0 1.5px var(--color-brass-500)' : undefined,
  };
}

const HATCH = 'repeating-linear-gradient(135deg, #f1f5f9 0 5px, #e2e8f0 5px 10px)';

/** Shown while a What-if simulation differs from the confirmed setup. Never replaces the verdict. */
function SimulationBox({ view, sim }: { view: ScenarioView; sim: NonNullable<NonNullable<ScenarioView['whatIf']>['analysis']> }) {
  const w = view.whatIf!.state;
  const changes: string[] = [];
  const weightChanges = view.session.setup.criteria.filter(
    (id) => !w.excludedCriteria.includes(id) && (w.weights[id] ?? 0) !== (view.session.setup.weights[id] ?? 0),
  ).length;
  if (weightChanges) changes.push(`${weightChanges} weight${weightChanges === 1 ? '' : 's'} changed`);
  if (w.excludedCriteria.length) changes.push(`excluded ${w.excludedCriteria.map((id) => getCriterion(view.scenario, id).name).join(', ')}`);
  if (w.excludedDocs.length) changes.push(`excluded ${w.excludedDocs.map(view.nickname).join(', ')}`);
  if (w.gapPolicy === 'neutral') changes.push('gaps treated as neutral (average of others)');
  return (
    <section
      aria-label="What-if simulation (not applied)"
      data-testid="report-simulation"
      className="break-inside-avoid rounded-xl border border-dashed border-brass-400 bg-brass-50 px-4 py-3 text-sm"
    >
      <p className="font-semibold text-brass-800">What-if simulation (not applied)</p>
      <p className="mt-1 text-slate-800">
        {sim.results.ranking.map((r, i) => `${i + 1}. ${view.nickname(r.docId)} ${formatPercent(r.adherence)}`).join(' · ')}
        {sim.results.isTie ? ' · technical tie' : ''}
      </p>
      {changes.length > 0 && <p className="mt-0.5 text-xs text-slate-700">Changes: {changes.join('; ')}.</p>}
      <p className="mt-0.5 text-xs text-slate-700">The verdict above reflects the confirmed setup. Apply or reset the simulation in Insights.</p>
    </section>
  );
}

function groupByDate(entries: AuditEntry[]): { date: string; items: { entry: AuditEntry; index: number }[] }[] {
  const groups: { date: string; items: { entry: AuditEntry; index: number }[] }[] = [];
  entries.forEach((entry, index) => {
    const date = formatDate(new Date(entry.at));
    const last = groups.at(-1);
    if (last && last.date === date) last.items.push({ entry, index });
    else groups.push({ date, items: [{ entry, index }] });
  });
  return groups;
}

export function ReportDocument({ view, model }: { view: ScenarioView; model: InsightsModel }) {
  const { scenario, session, docs, criteria, cells, analysis, openRequestKeys, nickname } = view;
  const results = analysis!.results;
  const audit = [...session.audit].reverse();
  const hiddenInPrint = Math.max(0, audit.length - PRINT_AUDIT_LIMIT);
  const changers = model.gaps.filter((g) => g.canChange);
  const best = new Set(buildRows(view).flatMap((r) => r.cells.filter((c) => c.isBest).map((c) => c.key)));

  return (
    <article
      className="report mx-auto max-w-4xl space-y-7 rounded-2xl border border-slate-200 bg-white p-6 text-slate-800 shadow-sm sm:p-10"
      aria-labelledby="report-title"
    >
      {/* Masthead */}
      <header className="flex flex-col gap-3 border-b-2 border-ink-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <LogoMark className="mt-1 size-8 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brass-700">Contrast · Decision brief</p>
            <h2 id="report-title" className="mt-1 font-display text-3xl font-semibold leading-tight tracking-tight text-ink-900">
              {scenario.title}
            </h2>
          </div>
        </div>
        <p className="text-sm text-slate-600 sm:text-right">
          <span className="block text-xs uppercase tracking-wide text-slate-500">Date</span>
          {formatDate(new Date())}
        </p>
      </header>

      {/* Verdict */}
      <section aria-label="Verdict" className="break-inside-avoid rounded-xl bg-ink-50 p-5 ring-1 ring-ink-100">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div>
            <DecisionStamp status={model.decision} text={model.decisionText} />
            <div className="mt-3">
              {model.isTie ? (
                <TieBanner text={model.tieText} />
              ) : (
                <p className="flex items-start gap-2 font-display text-2xl font-semibold leading-snug text-ink-900" data-testid="report-recommendation">
                  <Trophy className="mt-1 size-5 shrink-0 text-brass-500" aria-hidden />
                  {model.recommendationText}
                </p>
              )}
            </div>
            <div className="mt-3 flex flex-col items-start gap-1.5">
              <RobustnessBadge level={model.robustness.level} />
              <p className="text-sm text-slate-700">{model.robustnessText}</p>
            </div>
          </div>
          <ol className="space-y-3 self-center" aria-label="Weighted score by document">
            {model.ranking.map((r) => (
              <li key={r.docId}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={cx('truncate', r.rank === 1 ? 'font-semibold text-ink-900' : 'text-slate-700')}>
                    <span className="tabular-nums text-slate-600">#{r.rank}</span> {r.name}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    <span className={cx('font-semibold', r.rank === 1 ? 'text-ink-900' : 'text-slate-800')}>{formatPercent(r.adherence)}</span>
                    <span className="ml-1.5 text-xs text-slate-600">{formatTotal(r.total)} / 5</span>
                  </span>
                </div>
                <span aria-hidden className="mt-1 block h-2.5 overflow-hidden rounded-full bg-white ring-1 ring-ink-100">
                  <span className={cx('block h-full rounded-full', r.rank === 1 ? 'bg-ink-600' : 'bg-ink-300')} style={{ width: `${r.adherence}%` }} />
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {view.whatIf?.modified && view.whatIf.analysis && (
        <SimulationBox view={view} sim={view.whatIf.analysis} />
      )}

      <Section n={1} title="Decision question">
        <p className="font-display text-lg leading-snug text-ink-900">{scenario.question}</p>
      </Section>

      <div className="grid gap-7 sm:grid-cols-2">
        <Section n={2} title="Documents">
          <ul className="space-y-1.5 text-sm">
            {docs.map((d) => (
              <li key={d.id}>
                <span className="font-semibold text-ink-900">{d.nickname}</span>
                <span className="block text-xs text-slate-600">
                  {d.info.name} · {d.info.fileType}
                  {d.info.pages ? ` · ${d.info.pages} pages` : ''}
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <Section n={3} title="Criteria and weights">
          <p className="mb-1.5 text-xs text-slate-600" data-testid="report-acceptance">
            {acceptanceText(acceptance(scenario, session.setup))}
          </p>
          {session.changedAfterResults && <ChangedAfterResultsNote className="mb-2" />}
          <ul className="space-y-1 text-sm">
            {criteria.map(({ def, weight }) => (
              <li key={def.id} className="flex items-baseline justify-between gap-3">
                <span>
                  {def.name} <span className="text-xs text-slate-500">· {ruleLabel(def)}</span>
                </span>
                <span className="font-semibold tabular-nums text-ink-900">{weight}%</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section n={4} title="Comparison (scores 0–5)">
        <table className="w-full table-fixed border-separate border-spacing-1 text-sm">
          <caption className="sr-only">Heatmap of scores by criterion and document</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[34%] px-1 text-left text-xs font-semibold text-slate-600">
                Criterion
              </th>
              {docs.map((d) => (
                <th key={d.id} scope="col" className="px-1 text-left text-xs font-semibold text-ink-900">
                  <span className="block truncate">{d.nickname}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map(({ def, weight }) => (
              <tr key={def.id}>
                <th scope="row" className="px-1 text-left text-xs font-normal leading-tight text-slate-700">
                  {def.name} <span className="text-slate-500">({weight}%)</span>
                </th>
                {docs.map((d) => {
                  const key = cellKey(def.id, d.id);
                  const c = cells[key];
                  const score = results.cellScores[key];
                  const icon = HUMAN_ICON[c.status];
                  return (
                    <td
                      key={d.id}
                      className="relative rounded-md px-2 py-1.5 text-sm font-semibold tabular-nums"
                      style={c.isGap ? { background: HATCH, color: 'var(--color-slate-600)' } : heat(score, best.has(key))}
                    >
                      {c.isGap ? <span className="text-xs font-medium">{STATUS_LABEL[c.status]}</span> : formatScore(score)}
                      {best.has(key) && <span className="sr-only">, best in row</span>}
                      {icon && (
                        <span className="absolute right-1 top-1" title={icon.label}>
                          <icon.Icon className="size-3" aria-hidden />
                          <span className="sr-only">, {icon.label}</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" className="px-1 pt-1 text-left text-xs font-semibold text-ink-900">
                Weighted total
              </th>
              {docs.map((d) => {
                const r = results.byDoc[d.id];
                return (
                  <td key={d.id} className="px-2 pt-1 text-xs tabular-nums">
                    <span className={cx('font-semibold', r.rank === 1 ? 'text-ink-900' : 'text-slate-800')}>{formatPercent(r.adherence)}</span>
                    <span className="text-slate-500"> · #{r.rank}</span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-16 rounded-sm"
              style={{
                background: `linear-gradient(90deg, ${[0, 2.5, 4, 4.6, 5].map((s) => `color-mix(in srgb, var(--color-ink-500) ${heatPercent(s)}%, white)`).join(', ')})`,
              }}
            />
            Score 0 → 5
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-5 rounded-sm bg-white" style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-brass-500)' }} />
            Best in row
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-5 rounded-sm" style={{ background: HATCH }} />
            Gap (scores 0)
          </span>
          {Object.values(HUMAN_ICON).map(({ Icon, label }) => (
            <span key={label} className="flex items-center gap-1">
              <Icon className="size-3" aria-hidden />
              {label}
            </span>
          ))}
        </div>
      </Section>

      <div className="grid gap-7 sm:grid-cols-2">
        <Section n={5} title="What drives the result">
          <ul className="space-y-1.5 text-sm">
            {model.gapToSecondText && <li>{model.gapToSecondText}</li>}
            {model.topAdvantageText && <li>{model.topAdvantageText}</li>}
            {changers.length === 0 ? <li>No open gap could change the result.</li> : changers.map((g) => <li key={g.key}>{g.sentence}</li>)}
          </ul>
        </Section>
        <Section n={6} title="Gaps and open requests">
          {model.gaps.length === 0 ? (
            <p className="text-sm">No gaps. Every criterion has a value for every document.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {model.gaps.map((g) => (
                <li key={g.key}>
                  <span className="font-semibold text-ink-900">
                    {g.docName} · {g.criterionName}
                  </span>{' '}
                  <span className="text-slate-500">({g.statusLabel})</span>
                  <span className="block text-slate-700">{g.sentence}</span>
                  {g.reason && <span className="block text-slate-700">Accepted risk. Reason: {g.reason}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Open information requests</p>
          {openRequestKeys.length === 0 ? (
            <p className="mt-1 text-sm">None.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm" data-testid="open-requests">
              {openRequestKeys.map((k) => {
                const { criterionId, docId } = splitCellKey(k);
                const r = cells[k].review;
                return (
                  <li key={k}>
                    {nickname(docId)} · {getCriterion(scenario, criterionId).name}
                    {r ? (
                      <span className="text-slate-500">
                        {' '}
                        · requested {formatDate(new Date(r.at))}, {formatTime(r.at)}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>

      <Section n={7} title="Audit trail">
        <div className="space-y-3">
          {groupByDate(audit).map((g) => (
            <div key={g.date} className={cx(g.items.every((i) => i.index >= PRINT_AUDIT_LIMIT) && 'print:hidden')}>
              <p className="text-xs font-semibold text-ink-900">{g.date}</p>
              <ol className="mt-1 divide-y divide-slate-100 text-sm">
                {g.items.map(({ entry: e, index }) => (
                  <li
                    key={e.id}
                    className={cx('grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3 py-1.5 sm:grid-cols-[4.5rem_10rem_minmax(0,1fr)]', index >= PRINT_AUDIT_LIMIT && 'print:hidden')}
                  >
                    <span className="tabular-nums text-slate-500">{formatTime(e.at)}</span>
                    <span className="hidden font-medium text-slate-700 sm:block">{e.actor}</span>
                    <span>
                      <span className="font-medium text-slate-700 sm:hidden">{e.actor}: </span>
                      {e.summary}
                      {e.note && <span className="text-slate-500"> Note: {e.note}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
        {hiddenInPrint > 0 && <p className="mt-1 hidden text-xs text-slate-500 print:block">…and {hiddenInPrint} earlier entries.</p>}
      </Section>

      <Section n={8} title="Sign-off">
        <p className="sr-only">Prepared by: You · Reviewed by: ______ · Decision owner: ______</p>
        <dl className="grid grid-cols-3 gap-6 text-sm" aria-hidden>
          {[
            ['Prepared by', 'You'],
            ['Reviewed by', ''],
            ['Decision owner', ''],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-5 border-b border-slate-400 pb-1 font-medium text-ink-900">{value || ' '}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <footer className="border-t border-slate-200 pt-3 text-xs text-slate-500">
        <p>Simulated AI results and fictional data. Generated with Contrast, a prototype.</p>
        {scenario.disclaimerBanner && <p className="mt-0.5 font-medium text-amber-900">{scenario.disclaimerBanner}</p>}
      </footer>
    </article>
  );
}
