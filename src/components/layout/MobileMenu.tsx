import * as Menu from '@radix-ui/react-dropdown-menu';
import { Check, ListChecks, Menu as MenuIcon, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { SCENARIOS, SCENARIO_ORDER } from '../../data/scenarios';
import { newId, now, useApp } from '../../state/AppContext';

const itemCls =
  'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm text-slate-800 outline-none data-[highlighted]:bg-ink-50';

/** Mobile header menu: scenario switcher plus the header actions. Shares the switcher's open state. */
export function MobileMenu() {
  const { state, dispatch } = useApp();
  return (
    <Menu.Root modal={false} open={state.ui.switcherOpen} onOpenChange={(open) => dispatch({ type: 'SET_UI', patch: { switcherOpen: open } })}>
      <Menu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 shadow-sm"
        >
          <MenuIcon className="size-4" aria-hidden />
          Menu
        </button>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content align="end" sideOffset={6} collisionPadding={12} className="z-[60] w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <Menu.Label className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Switch scenario</Menu.Label>
          {SCENARIO_ORDER.map((id) => {
            const current = state.activeScenarioId === id;
            return (
              <Menu.Item
                key={id}
                className={itemCls}
                onSelect={() => dispatch({ type: 'QUICK_START', scenarioId: id, at: now(), id: newId('audit'), withWelcome: false })}
              >
                <span className="size-4 shrink-0 text-ink-600">{current && <Check className="size-4" aria-hidden />}</span>
                <span className="min-w-0">
                  <span className="block font-medium">
                    {SCENARIOS[id].title}
                    {current && <span className="sr-only"> (current)</span>}
                  </span>
                  <span className="block text-xs text-slate-500">{SCENARIOS[id].industryTag}</span>
                </span>
              </Menu.Item>
            );
          })}
          <Menu.Separator className="my-1 h-px bg-slate-200" />
          <Menu.Item className={itemCls} onSelect={() => dispatch({ type: 'SET_UI', patch: { checklistOpen: true, checklistCollapsed: false } })}>
            <ListChecks className="size-4" aria-hidden /> Demo guide
          </Menu.Item>
          <Menu.Item className={itemCls} onSelect={() => dispatch({ type: 'SET_STAGE', stage: 'setup' })}>
            <SlidersHorizontal className="size-4" aria-hidden /> Edit setup
          </Menu.Item>
          <Menu.Item className={itemCls} onSelect={() => dispatch({ type: 'SET_UI', patch: { confirmStartOverOpen: true } })}>
            <RotateCcw className="size-4" aria-hidden /> Start over
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
