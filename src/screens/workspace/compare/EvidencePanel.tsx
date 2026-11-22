import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, Calculator, Copy, FileText, Lightbulb, Quote, Repeat, Sparkles, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { useToast } from '../../../components/ui/Toasts';
import { cx } from '../../../components/ui/cx';
import { getCriterion } from '../../../data/scenarios';
import type { CellKey, CellValue, CriterionDef } from '../../../data/types';
import { cellKey, REVIEW_THRESHOLD, splitCellKey } from '../../../data/types';
import { useClipboard } from '../../../hooks/useClipboard';
import { availableActions, type ResolvedCell } from '../../../lib/cells';
import { formatAmount, formatNumber, formatScore, formatValue } from '../../../lib/format';
import { infoRequestMessage, tippingSentence } from '../../../lib/messages';
import { GAP_RULE, ruleExplanation } from '../../../lib/rules';
import { newId, now, useApp, useView } from '../../../state/AppContext';
import type { ScenarioView } from '../../../state/selectors';

// ---------- helpers ----------

function calculation(view: ScenarioView, def: CriterionDef, cell: ResolvedCell, score: number): string {
  if (cell.isGap) return 'Missing information → score 0.';
  const v = cell.value!;
  if (v.kind === 'qualitative') return `Score set from the evidence: ${formatScore(v.score)} of 5.`;
  if (v.kind === 'boolean') return v.value ? 'Yes → score 5.' : 'No → score 0.';
  const values = view.docs
    .map((d) => view.analysis?.input.values[cellKey(def.id, d.id)] ?? null)
    .filter((x): x is Extract<CellValue, { kind: 'number' }> => x?.kind === 'number')
    .map((x) => x.value);
  if (def.kind !== 'number' || values.length === 0) return `Score ${formatNumber(score, 2)}.`;
  const best = def.direction === 'lower' ? Math.min(...values) : Math.max(...values);
  if (v.value === best) return `Best found value in this row → score 5.00.`;
  return def.direction === 'lower'
    ? `5 × ${formatAmount(def, best)} ÷ ${formatAmount(def, v.value)} = ${formatNumber(score, 2)}`
    : `5 × ${formatAmount(def, v.value)} ÷ ${formatAmount(def, best)} = ${formatNumber(score, 2)}`;
}

function Highlighted({ snippet, highlight }: { snippet: string; highlight: string }) {
  const i = snippet.indexOf(highlight);
  if (i < 0) return <>{snippet}</>;
  return (
    <>
      {snippet.slice(0, i)}
      <mark className="rounded bg-yellow-200 px-0.5 text-slate-900">{highlight}</mark>
      {snippet.slice(i + highlight.length)}
    </>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="border-t border-slate-200 pt-4">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {icon}
        {title}
      </h3>
      <div className="mt-2 text-sm text-slate-700">{children}</div>
    </section>
  );
}

// ---------- value form ----------

interface ValueFormProps {
  def: CriterionDef;
  mode: 'edit' | 'provide';
  initial: CellValue | null;
  placeholderValue?: CellValue;
  onSubmit: (value: CellValue, note: string) => void;
  onCancel: () => void;
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, '');
  if (cleaned === '' || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

function ValueForm({ def, mode, initial, placeholderValue, onSubmit, onCancel }: ValueFormProps) {
  const uid = useId();
  const valueRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const initialText =
    initial?.kind === 'number' ? String(initial.value) : initial?.kind === 'qualitative' ? String(initial.score) : '';
  const [raw, setRaw] = useState(mode === 'edit' ? initialText : '');
  const [bool, setBool] = useState<boolean | null>(initial?.kind === 'boolean' ? initial.value : null);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<{ value?: string; note?: string }>({});

  useEffect(() => {
    valueRef.current?.focus();
  }, []);

  const noteRequired = mode === 'provide' || def.kind === 'qualitative';
  const noteLabel = mode === 'provide' ? 'Source note' : def.kind === 'qualitative' ? 'Rationale' : 'Note (optional)';
  const placeholder =
    placeholderValue?.kind === 'number'
      ? `e.g., ${placeholderValue.value}`
      : placeholderValue?.kind === 'qualitative'
        ? `e.g., ${placeholderValue.score}`
        : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: { value?: string; note?: string } = {};
    let value: CellValue | null = null;
    if (def.kind === 'boolean') {
      if (bool === null) next.value = 'Choose Yes or No.';
      else value = { kind: 'boolean', value: bool };
    } else {
      const n = parseNumber(raw);
      if (n === null) next.value = def.kind === 'qualitative' ? 'Enter a score from 0 to 5.' : 'Enter a number.';
      else if (def.kind === 'qualitative') {
        if (n < 0 || n > 5) next.value = 'Enter a score from 0 to 5.';
        else value = { kind: 'qualitative', score: Math.round(n * 10) / 10, text: note.trim() };
      } else {
        const { min = 0, max } = def.unit;
        if (def.direction === 'lower' && n <= 0) next.value = 'Enter a value greater than 0.';
        else if (max !== undefined && (n < min || n > max)) next.value = `Enter a value from ${min} to ${max}.`;
        else if (n < min) next.value = `Enter a value of ${min} or more.`;
        else value = { kind: 'number', value: n };
      }
    }
    if (noteRequired && !note.trim()) {
      next.note = mode === 'provide' ? 'Add where this value came from.' : 'Add a short rationale for the score.';
    }
    setErrors(next);
    if (next.value) {
      valueRef.current?.focus();
      return;
    }
    if (next.note) {
      noteRef.current?.focus();
      return;
    }
    if (value?.kind === 'qualitative') value = { ...value, text: note.trim() };
    onSubmit(value!, note.trim());
  };

  const valueLabel =
    def.kind === 'qualitative' ? 'Score (0–5)' : def.kind === 'number' ? `${def.name} (${def.unit.label})` : def.name;

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <p className="text-sm font-semibold text-slate-900">{mode === 'provide' ? 'Add value' : 'Edit value'}</p>
      {def.kind === 'boolean' ? (
        <fieldset aria-describedby={errors.value ? `${uid}-ve` : undefined}>
          <legend className="text-sm font-medium text-slate-800">{valueLabel}</legend>
          <div className="mt-2 flex gap-4">
            {[true, false].map((b) => (
              <label key={String(b)} className="flex items-center gap-2 text-sm">
                <input
                  ref={b ? valueRef : undefined}
                  type="radio"
                  name={`${uid}-bool`}
                  checked={bool === b}
                  onChange={() => setBool(b)}
                  className="accent-indigo-600"
                />
                {b ? 'Yes' : 'No'}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div>
          <label htmlFor={`${uid}-v`} className="block text-sm font-medium text-slate-800">
            {valueLabel}
          </label>
          <div className="mt-1 flex items-center gap-2">
            {def.kind === 'number' && def.unit.prefix && <span className="text-sm text-slate-500">{def.unit.prefix.trim()}</span>}
            <input
              ref={valueRef}
              id={`${uid}-v`}
              inputMode="decimal"
              value={raw}
              placeholder={placeholder}
              onChange={(e) => setRaw(e.target.value)}
              aria-invalid={!!errors.value}
              aria-describedby={errors.value ? `${uid}-ve` : undefined}
              className={cx('h-10 w-40 rounded-lg border bg-white px-3 text-sm', errors.value ? 'border-red-500' : 'border-slate-300')}
            />
            {def.kind === 'number' && def.unit.suffix && <span className="text-sm text-slate-500">{def.unit.suffix.trim()}</span>}
          </div>
        </div>
      )}
      {errors.value && (
        <p id={`${uid}-ve`} className="-mt-2 text-xs font-medium text-red-700">
          {errors.value}
        </p>
      )}
      <div>
        <label htmlFor={`${uid}-n`} className="block text-sm font-medium text-slate-800">
          {noteLabel}
        </label>
        <textarea
          ref={noteRef}
          id={`${uid}-n`}
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === 'provide' ? "Where did this come from? e.g., Email from the supplier's QA team" : undefined}
          aria-invalid={!!errors.note}
          aria-describedby={errors.note ? `${uid}-ne` : undefined}
          className={cx('mt-1 w-full rounded-lg border bg-white px-3 py-2 text-sm', errors.note ? 'border-red-500' : 'border-slate-300')}
        />
        {errors.note && (
          <p id={`${uid}-ne`} className="mt-1 text-xs font-medium text-red-700">
            {errors.note}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm">
          Save
        </Button>
        <Button size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------- info request ----------

function InfoRequestDraft({ message }: { message: string }) {
  const copy = useClipboard();
  const toast = useToast();
  const id = useId();
  return (
    <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-900">
        Information request (ready to copy)
      </label>
      <textarea
        id={id}
        readOnly
        rows={9}
        value={message}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-800"
      />
      <Button
        size="sm"
        icon={<Copy className="size-4" aria-hidden />}
        onClick={async () => {
          const ok = await copy(message);
          toast(ok ? 'Message copied to clipboard.' : "Couldn't copy. Select the text and copy it manually.", ok ? 'success' : 'error');
        }}
      >
        Copy message
      </Button>
    </div>
  );
}

// ---------- panel body ----------

function PanelBody({ cellKeyValue }: { cellKeyValue: CellKey }) {
  const { dispatch } = useApp();
  const view = useView();
  const toast = useToast();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'provide'>('view');
  const { scenario } = view;
  const { criterionId, docId } = splitCellKey(cellKeyValue);
  const def = getCriterion(scenario, criterionId);
  const doc = view.docs.find((d) => d.id === docId)!;
  const cell = view.cells[cellKeyValue];
  const seed = cell.seed;
  const score = view.analysis?.results.cellScores[cellKeyValue] ?? 0;
  const actions = availableActions(cell.status);
  const tipping = view.analysis?.tipping[cellKeyValue];
  const nextPending = view.pendingReviewKeys.find((k) => k !== cellKeyValue);
  const review = cell.review;

  useEffect(() => {
    headingRef.current?.focus();
  }, [cellKeyValue]);

  const act = (r: Parameters<typeof dispatch>[0], message: string) => {
    dispatch(r);
    toast(message);
    setMode('view');
    window.setTimeout(() => headingRef.current?.focus(), 0);
  };

  const draftRequest = () => {
    const message = infoRequestMessage({
      criterionName: def.name,
      nickname: doc.nickname,
      documentName: doc.info.name,
      question: scenario.question,
      ask: def.infoRequestAsk,
    });
    act({ type: 'REVIEW', key: cellKeyValue, review: { type: 'request_info', message, at: now() }, id: newId('audit') }, 'Info request drafted. Status set to Info requested.');
  };

  const humanNote =
    review?.type === 'edit' ? review.note : review?.type === 'provide' ? review.sourceNote : undefined;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{doc.nickname}</p>
          <Dialog.Title asChild>
            <h2 ref={headingRef} tabIndex={-1} className="mt-0.5 text-lg font-semibold text-slate-900">
              {def.name}
            </h2>
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            Evidence, scoring rule and review actions for {def.name} in {doc.nickname}.
          </Dialog.Description>
        </div>
        <Dialog.Close aria-label="Close details" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
          <X className="size-5" aria-hidden />
        </Dialog.Close>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={cell.status} confidence={seed.extraction === 'found' ? seed.confidence : undefined} size="md" />
          {seed.extraction === 'found' && (
            <span className="text-sm text-slate-600">
              {seed.confidence < REVIEW_THRESHOLD
                ? `Confidence ${seed.confidence}% — below the ${REVIEW_THRESHOLD}% review threshold`
                : `Confidence ${seed.confidence}%`}
            </span>
          )}
        </div>

        <div>
          <p className="break-words text-2xl font-semibold tracking-tight text-slate-900">
            {cell.isGap ? 'Not found' : formatValue(def, cell.value)}
          </p>
          <p className="mt-1 text-sm tabular-nums text-slate-600">
            Score <span className="font-semibold text-slate-900">{formatNumber(score, 2)}</span> / 5
          </p>
        </div>

        {(review?.type === 'edit' || review?.type === 'provide' || review?.type === 'confirm') && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3 text-sm text-indigo-950">
            {review.type === 'confirm' && 'You confirmed the extracted value.'}
            {review.type === 'edit' && (
              <>
                You edited this value. Extracted value: {seed.extraction === 'found' ? formatValue(def, seed.value) : '—'}.
              </>
            )}
            {review.type === 'provide' && 'You provided this value. It was not in the document.'}
            {humanNote && <p className="mt-1 text-indigo-900">Note: {humanNote}</p>}
          </div>
        )}

        {nextPending && !cell.isPendingReview && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'OPEN_CELL', key: nextPending })}
            className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline"
          >
            Next item needing review <ArrowRight className="size-4" aria-hidden />
          </button>
        )}

        {mode !== 'view' ? (
          <ValueForm
            def={def}
            mode={mode}
            initial={cell.value}
            placeholderValue={cellKeyValue === scenario.demo.gapCell ? scenario.demo.suggestedValue : undefined}
            onCancel={() => setMode('view')}
            onSubmit={(value, note) =>
              mode === 'edit'
                ? act(
                    { type: 'REVIEW', key: cellKeyValue, review: { type: 'edit', value, note, at: now() }, id: newId('audit') },
                    'Value updated. Scores recalculated.',
                  )
                : act(
                    { type: 'REVIEW', key: cellKeyValue, review: { type: 'provide', value, sourceNote: note, at: now() }, id: newId('audit') },
                    'Value added. Scores recalculated.',
                  )
            }
          />
        ) : (
          actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.includes('confirm') && (
                <Button
                  variant="primary"
                  onClick={() =>
                    act(
                      { type: 'REVIEW', key: cellKeyValue, review: { type: 'confirm', at: now() }, id: newId('audit') },
                      'Value confirmed. Marked as Human-verified.',
                    )
                  }
                >
                  Confirm
                </Button>
              )}
              {actions.includes('edit') && <Button onClick={() => setMode('edit')}>Edit value</Button>}
              {actions.includes('add_value') && (
                <Button variant={cell.isGap ? 'primary' : 'secondary'} onClick={() => setMode('provide')}>
                  {cell.status === 'human_provided' ? 'Edit value' : 'Add value'}
                </Button>
              )}
              {actions.includes('request_info') && <Button onClick={draftRequest}>Draft info request</Button>}
              {actions.includes('accept_gap') && (
                <Button
                  onClick={() =>
                    act(
                      { type: 'REVIEW', key: cellKeyValue, review: { type: 'accept_gap', at: now() }, id: newId('audit') },
                      'Kept as gap. It still scores 0.',
                    )
                  }
                >
                  Keep as gap
                </Button>
              )}
            </div>
          )
        )}
        {cell.status === 'auto' && <p className="text-sm text-slate-500">No review needed.</p>}
        {cell.status === 'info_requested' && review?.type === 'request_info' && mode === 'view' && (
          <InfoRequestDraft message={review.message} />
        )}

        {seed.extraction === 'found' ? (
          <>
            <Section icon={<Quote className="size-3.5" aria-hidden />} title="Evidence">
              <blockquote className="rounded-lg border-l-4 border-indigo-300 bg-slate-50 px-3 py-2 leading-relaxed text-slate-800">
                <Highlighted snippet={seed.evidence.snippet} highlight={seed.evidence.highlight} />
              </blockquote>
              <p className="mt-2 flex items-center gap-1.5 text-slate-600">
                <FileText className="size-4 shrink-0" aria-hidden />
                <span>
                  Source: {doc.nickname} · {seed.source.label}
                  {seed.source.qualifier ? ` (${seed.source.qualifier})` : ''}
                </span>
              </p>
              {seed.caveat && <p className="mt-2 text-amber-900">{seed.caveat}</p>}
            </Section>
            {seed.conversionNote && (
              <Section icon={<Repeat className="size-3.5" aria-hidden />} title="Unit conversion">
                {seed.conversionNote}
              </Section>
            )}
            {seed.aiRationale && (
              <Section icon={<Sparkles className="size-3.5" aria-hidden />} title="AI rationale">
                {seed.aiRationale}
              </Section>
            )}
          </>
        ) : (
          <Section icon={<FileText className="size-3.5" aria-hidden />} title={cell.status === 'human_provided' ? 'Original search result' : 'Search result'}>
            <p>Not found in {doc.info.name}.</p>
            <p className="mt-1 text-slate-600">{seed.searchNote}</p>
          </Section>
        )}

        <Section icon={<Calculator className="size-3.5" aria-hidden />} title="Scoring rule">
          <p>{ruleExplanation(def)}</p>
          <p className="mt-1 font-mono text-xs text-slate-700">{calculation(view, def, cell, score)}</p>
          {cell.isGap && <p className="mt-2 text-slate-600">{GAP_RULE}</p>}
        </Section>

        {cell.isGap && tipping && (
          <Section icon={<Lightbulb className="size-3.5" aria-hidden />} title="Could this change the decision?">
            <p className="font-medium text-slate-900">{tippingSentence(tipping, doc.nickname, def)}</p>
          </Section>
        )}

        <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          Simulated AI extraction · fictional data.
        </p>
      </div>
    </div>
  );
}

// ---------- panel ----------

export function EvidencePanel() {
  const { dispatch } = useApp();
  const { session } = useView();
  const openKey = session.openCell;
  const lastKey = useRef<CellKey | null>(null);
  if (openKey) lastKey.current = openKey;

  return (
    <Dialog.Root open={!!openKey} onOpenChange={(open) => !open && dispatch({ type: 'OPEN_CELL', key: null })}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/30 print:hidden" />
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            const key = lastKey.current;
            const target =
              (key && document.querySelector<HTMLElement>(`[data-cell-key="${key}"]`)) || document.getElementById('matrix-heading');
            target?.focus();
          }}
          className="fixed inset-0 z-50 bg-white shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:w-[460px] md:border-l md:border-slate-200 print:hidden"
        >
          {openKey && <PanelBody key={openKey} cellKeyValue={openKey} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
