"use client";

import { useEffect, useRef } from "react";

/** Writes text to the clipboard. Resolves false when the clipboard is blocked or missing. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Selects all text inside an element, so Cmd/Ctrl+C copies it. */
export function selectContents(el: HTMLElement | null): void {
  if (!el) return;
  el.focus({ preventScroll: false });
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

/** Calls `reset` 2s after `copied` turns true (the green "Copied" state). */
export function useCopiedReset(copied: boolean, reset: () => void) {
  const resetRef = useRef(reset);
  useEffect(() => {
    resetRef.current = reset;
  });
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => resetRef.current(), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);
}
