"use client";

import { useSyncExternalStore } from "react";

/** Live `matchMedia` result. Returns `serverValue` during prerender and hydration. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export const useReducedMotion = () => useMediaQuery("(prefers-reduced-motion: reduce)");
export const useDark = () => useMediaQuery("(prefers-color-scheme: dark)");
/** Compact layout (phone and tablet up to 1023px): sticky compact bar and the set box as a bottom sheet. */
export const useIsMobile = () => useMediaQuery("(max-width: 1023.98px)");
