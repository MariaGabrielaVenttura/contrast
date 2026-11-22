import { CheckCircle2, FlaskConical, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../state/AppContext';

const sections = [
  {
    icon: CheckCircle2,
    title: "What's real",
    body: 'The flow, business rules, scoring, human review, audit trail and report.',
  },
  {
    icon: FlaskConical,
    title: "What's simulated",
    body: 'Reading the documents and the AI extraction, including confidence levels and evidence snippets.',
  },
  {
    icon: Sparkles,
    title: 'What a full version would add',
    body: 'Real AI extraction with citations, extraction accuracy evals, custom criteria, industry templates, history and sharing.',
  },
];

export function AboutModal() {
  const { state, dispatch } = useApp();
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => dispatch({ type: 'SET_UI', patch: { aboutOpen: false } });
  return (
    <Modal
      open={state.ui.aboutOpen}
      onOpenChange={(open) => !open && close()}
      title="About this prototype"
      description="Contrast is a portfolio prototype. Here is exactly what it does and doesn't do."
      initialFocus={closeRef}
      footer={
        <Button ref={closeRef} variant="primary" onClick={close}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        {sections.map(({ icon: Icon, title, body }) => (
          <section key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-5 shrink-0 text-indigo-600" aria-hidden />
            <div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600">{body}</p>
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
