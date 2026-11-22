import { useSyncExternalStore } from 'react';

/** True when the media query matches. Renders one layout only, so assistive tech never sees duplicate content. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}

/** Tailwind's md breakpoint (768px). Below it the app switches to its mobile layouts. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 768px)');
}
