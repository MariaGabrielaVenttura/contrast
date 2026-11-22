import { ArrowRight, FileText, Lock } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { cx } from '../../components/ui/cx';
import { useApp, useView } from '../../state/AppContext';
import { nicknameErrors } from '../../state/reducer';
import { SetupLayout } from './SetupLayout';

export function SetupStep() {
  const { dispatch } = useApp();
  const { scenario, session } = useView();
  const errors = nicknameErrors(scenario, session.nicknames);
  const invalid = Object.keys(errors).length > 0;
  const firstInputRef = useRef<HTMLInputElement>(null);

  return (
    <SetupLayout step={1}>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Set up your comparison</h1>

      <section className="mt-8" aria-labelledby="question-label">
        <h2 id="question-label" className="text-sm font-semibold text-slate-900">
          Decision question
        </h2>
        <div className="mt-2 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
          <p className="text-slate-900" aria-describedby="question-note">
            {scenario.question}
            <span className="sr-only"> (read-only)</span>
          </p>
        </div>
        <p id="question-note" className="mt-2 text-sm text-slate-500">
          In demo mode, the question and criteria are pre-generated for each scenario.
        </p>
      </section>

      <section className="mt-10" aria-labelledby="docs-heading">
        <h2 id="docs-heading" className="text-sm font-semibold text-slate-900">
          Documents
        </h2>
        <p className="mt-1 text-sm text-slate-500">Nicknames are used everywhere in the comparison and the report.</p>
        <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {scenario.documents.map((d, i) => {
            const error = errors[d.id];
            const inputId = `nickname-${d.id}`;
            return (
              <li key={d.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <FileText className="mt-0.5 size-5 shrink-0 text-ink-600" aria-hidden />
                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-900">{d.name}</p>
                    <p className="text-sm text-slate-500">
                      {d.fileType}
                      {d.pages ? ` · ${d.pages} pages` : ' · spreadsheet'}
                    </p>
                  </div>
                </div>
                <div className="sm:w-64">
                  <label htmlFor={inputId} className="block text-xs font-medium text-slate-600">
                    Nickname<span className="sr-only"> for {d.name}</span>
                  </label>
                  <input
                    ref={i === 0 ? firstInputRef : undefined}
                    id={inputId}
                    value={session.nicknames[d.id] ?? ''}
                    maxLength={24}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    onChange={(e) => dispatch({ type: 'SET_NICKNAME', docId: d.id, value: e.target.value })}
                    className={cx(
                      'mt-1 h-10 w-full rounded-lg border px-3 text-sm text-slate-900 shadow-sm',
                      error ? 'border-red-500' : 'border-slate-300',
                    )}
                  />
                  {error && (
                    <p id={`${inputId}-error`} className="mt-1 text-xs font-medium text-red-700">
                      {error}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-10 flex justify-end">
        <Button
          variant="primary"
          size="lg"
          inactive={invalid}
          disabledReason="Fix the nicknames above to continue."
          trailingIcon={<ArrowRight className="size-4" aria-hidden />}
          onClick={() => dispatch({ type: 'SET_STAGE', stage: 'criteria' })}
        >
          Continue to criteria
        </Button>
      </div>
    </SetupLayout>
  );
}
