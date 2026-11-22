import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export function TipProvider({ children }: { children: ReactNode }) {
  return (
    <Tooltip.Provider delayDuration={200} skipDelayDuration={100}>
      {children}
    </Tooltip.Provider>
  );
}

/** Tooltip on hover and keyboard focus. The child must be a focusable element that forwards refs. */
export function Tip({ content, children, side = 'top' }: { content: ReactNode; children: ReactNode; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="z-[70] max-w-xs rounded-lg bg-slate-900 px-3 py-2 text-xs leading-snug text-white shadow-lg print:hidden"
        >
          {content}
          <Tooltip.Arrow className="fill-slate-900" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
