import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown } from 'lucide-react';
import { SCENARIOS, SCENARIO_ORDER } from '../../data/scenarios';
import { newId, now, useApp } from '../../state/AppContext';

export function ScenarioSwitcher() {
  const { state, dispatch } = useApp();
  return (
    <Menu.Root modal={false} open={state.ui.switcherOpen} onOpenChange={(open) => dispatch({ type: 'SET_UI', patch: { switcherOpen: open } })}>
      <Menu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Switch scenario
          <ChevronDown className="size-4" aria-hidden />
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          collisionPadding={12}
          className="z-[60] w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg print:hidden"
        >
          <Menu.Label className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Scenarios</Menu.Label>
          {SCENARIO_ORDER.map((id) => {
            const s = SCENARIOS[id];
            const current = state.activeScenarioId === id;
            const inProgress = !!state.sessions[id]?.hasRun;
            return (
              <Menu.Item
                key={id}
                onSelect={() => dispatch({ type: 'QUICK_START', scenarioId: id, at: now(), id: newId('audit'), withWelcome: false })}
                className="flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-ink-50"
              >
                <span className="mt-0.5 size-4 shrink-0 text-ink-600">{current && <Check className="size-4" aria-hidden />}</span>
                <span className="min-w-0">
                  <span className="block font-medium text-slate-900">
                    {s.title}
                    {current && <span className="sr-only"> (current)</span>}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {s.industryTag}
                    {inProgress && !current ? ' · In progress' : ''}
                  </span>
                </span>
              </Menu.Item>
            );
          })}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
