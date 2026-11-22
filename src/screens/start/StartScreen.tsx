import { ArrowRight, ChevronRight, ListChecks, Play, Scale, Star, Upload } from 'lucide-react';
import { Wordmark } from '../../components/layout/Brand';
import { Button } from '../../components/ui/Button';
import { SCENARIOS, SCENARIO_ORDER, QUICK_DEMO_SCENARIO } from '../../data/scenarios';
import { newId, now, useApp } from '../../state/AppContext';
import { AboutModal } from './AboutModal';
import { ResultPreview } from './ResultPreview';
import { UploadDropzone } from './UploadDropzone';

const steps = [
  { icon: Upload, title: 'Upload' },
  { icon: ListChecks, title: 'Confirm criteria' },
  { icon: Scale, title: 'Review and decide' },
];

export function StartScreen() {
  const { state, dispatch } = useApp();

  return (
    <>
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Wordmark />
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'SET_UI', patch: { aboutOpen: true } })}>
            About this prototype
          </Button>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section>
          <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
            Compare any documents. Decide with evidence.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Upload your documents, tell Contrast what decision you need to make, and get a cited side-by-side comparison you can
            trust.
          </p>
          <div className="mt-8 flex flex-col items-start gap-2">
            <Button
              variant="primary"
              size="lg"
              icon={<Play className="size-4" aria-hidden />}
              onClick={() =>
                dispatch({ type: 'QUICK_START', scenarioId: QUICK_DEMO_SCENARIO, at: now(), id: newId('audit'), withWelcome: true })
              }
            >
              Quick demo (2 min)
            </Button>
            <p className="text-sm text-slate-500">Pharma supplier qualification · 3 documents</p>
          </div>
        </section>
        <ResultPreview />
        </div>

        <ol className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center" aria-label="How Contrast works">
          {steps.map(({ icon: Icon, title }, i) => (
            <li key={title} className="flex items-center gap-3">
              <span className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <span className="flex size-8 items-center justify-center rounded-lg bg-ink-50 text-ink-700">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-medium text-slate-800">
                  <span className="sr-only">Step {i + 1}: </span>
                  {title}
                </span>
              </span>
              {i < steps.length - 1 && <ChevronRight className="hidden size-4 text-slate-400 sm:block" aria-hidden />}
            </li>
          ))}
        </ol>

        <section className="mt-14" aria-labelledby="scenarios-heading">
          <h2 id="scenarios-heading" className="font-display text-2xl font-semibold text-ink-900">
            Or pick a sample scenario
          </h2>
          <p className="mt-1 text-sm text-slate-600">Same engine, any industry. Each scenario has fictional documents and simulated AI results.</p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SCENARIO_ORDER.map((id) => {
              const s = SCENARIOS[id];
              const session = state.sessions[id];
              const inProgress = !!session && (session.hasRun || session.stage !== 'setup');
              return (
                <li key={id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">{s.industryTag}</span>
                    {s.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2.5 py-0.5 text-xs font-semibold text-ink-700">
                        <Star className="size-3" aria-hidden /> Featured
                      </span>
                    )}
                    {inProgress && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">In progress</span>
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-semibold text-ink-900">{s.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-slate-600">{s.cardDescription}</p>
                  <Button
                    className="mt-4 self-start"
                    size="sm"
                    trailingIcon={<ArrowRight className="size-4" aria-hidden />}
                    aria-label={`${inProgress ? 'Resume scenario' : 'Load sample scenario'}: ${s.title}`}
                    onClick={() => dispatch({ type: 'OPEN_SCENARIO', scenarioId: id })}
                  >
                    {inProgress ? 'Resume scenario' : 'Load sample scenario'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-14" aria-labelledby="upload-heading">
          <h2 id="upload-heading" className="font-display text-2xl font-semibold text-ink-900">
            Upload your own documents
          </h2>
          <div className="mt-4">
            <UploadDropzone />
          </div>
        </section>
      </main>
      <AboutModal />
    </>
  );
}
