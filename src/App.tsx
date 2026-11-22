import { useEffect, type ReactNode } from 'react';
import { Footer } from './components/layout/Footer';
import { TipProvider } from './components/ui/Tip';
import { ToastRegion } from './components/ui/Toasts';
import { AppProvider, useApp } from './state/AppContext';
import { CriteriaStep } from './screens/setup/CriteriaStep';
import { SetupStep } from './screens/setup/SetupStep';
import { StartScreen } from './screens/start/StartScreen';
import { Workspace } from './screens/workspace/Workspace';
import { DemoChecklist } from './overlays/DemoChecklist';
import { WelcomeModal } from './overlays/WelcomeModal';

function Screens() {
  const { state } = useApp();
  const id = state.activeScenarioId;
  const session = id ? state.sessions[id] : undefined;

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [id, session?.stage]);

  if (!id || !session) return <StartScreen />;
  if (session.stage === 'setup') return <SetupStep />;
  if (session.stage === 'criteria') return <CriteriaStep />;
  return <Workspace />;
}

/** Prevents the browser from opening a file dropped anywhere on the page. */
function useGlobalDropGuard() {
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);
}

/** Leaves room at the bottom so the floating demo guide never hides the end of the page. */
function ChecklistSpacer({ children }: { children: ReactNode }) {
  const { state } = useApp();
  const open = !!state.activeScenarioId && state.ui.checklistOpen && !state.ui.welcomeOpen;
  const pad = !open ? '' : state.ui.checklistCollapsed ? 'pb-20' : 'pb-80';
  return <div className={`flex min-h-dvh flex-col print:pb-0 ${pad}`}>{children}</div>;
}

export default function App() {
  useGlobalDropGuard();
  return (
    <AppProvider>
      <TipProvider>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[90] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
        >
          Skip to content
        </a>
        <ChecklistSpacer>
          <Screens />
          <Footer />
        </ChecklistSpacer>
        <DemoChecklist />
        <WelcomeModal />
        <ToastRegion />
      </TipProvider>
    </AppProvider>
  );
}
