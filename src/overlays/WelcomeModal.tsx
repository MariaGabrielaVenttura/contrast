import { useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../state/AppContext';

export function WelcomeModal() {
  const { state, dispatch } = useApp();
  const startRef = useRef<HTMLButtonElement>(null);
  const afterClose = useRef<'start' | 'switch'>('start');

  const start = () => {
    afterClose.current = 'start';
    dispatch({ type: 'SET_UI', patch: { welcomeOpen: false, checklistOpen: true, checklistCollapsed: false } });
  };
  const chooseAnother = () => {
    afterClose.current = 'switch';
    dispatch({ type: 'SET_UI', patch: { welcomeOpen: false, checklistOpen: true, checklistCollapsed: false } });
  };

  return (
    <Modal
      open={state.ui.welcomeOpen}
      onOpenChange={(open) => !open && start()}
      size="lg"
      eyebrow="Demo · fictional data, simulated AI"
      title="Big decisions live in documents nobody has time to compare."
      description="Proposals, contracts, financial reports, supplier dossiers. Teams line them up by hand, miss what's missing, and lose the reasoning behind the final call. Contrast turns any set of documents into a cited, side-by-side decision you can defend."
      initialFocus={startRef}
      returnFocus={() => {
        if (afterClose.current === 'switch') {
          dispatch({ type: 'SET_UI', patch: { switcherOpen: true } });
        } else {
          document.getElementById('matrix-heading')?.focus();
        }
      }}
      footer={
        <>
          <Button onClick={chooseAnother}>Choose another scenario</Button>
          <Button ref={startRef} variant="primary" onClick={start}>
            Start the 2-minute demo
          </Button>
        </>
      }
    >
      <p className="font-semibold text-slate-900">In the next 2 minutes you will:</p>
      <ol className="mt-2 space-y-2 text-slate-700">
        {[
          'Compare 3 pharmaceutical ingredient suppliers and see who wins, and why.',
          'Check where every number came from, down to the page.',
          "Fix what the AI wasn't sure about, and see how one missing answer can change the decision.",
        ].map((t, i) => (
          <li key={t} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-ink-100 text-xs font-semibold text-ink-700">
              {i + 1}
            </span>
            <span>{t}</span>
          </li>
        ))}
      </ol>
      <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
        Same engine, any industry. After this one, switch to IT vendor selection, contract risk review or company performance.
      </p>
    </Modal>
  );
}
