"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Toast as ToastData } from "@/state/store";
import styles from "./Toast.module.css";

export const TOAST_MS = 6000;

export type ToastProps = {
  toast: ToastData | null;
  onUndo: () => void;
  /** Called when the toast has been on screen for 6s (paused while hovered or focused). */
  onDone: (n: number) => void;
  /** board = inside the board column, just above its controls (desktop: clear of the footer); page = fixed just under the compact bar. */
  placement?: "board" | "page";
};

/**
 * Transient feedback with Undo: "Full · swapped Issue for Hold · Undo", "Issue removed · Undo".
 * 6s, paused while the pointer or focus is on it; Ctrl/Cmd+Z does the same Undo from anywhere.
 */
export default function Toast({ toast, onUndo, onDone, placement = "page" }: ToastProps) {
  // Held (pointer or focus on it) for this toast only: a new toast, or Undo unmounting it, never stays held.
  const [heldN, setHeldN] = useState<number | null>(null);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  const n = toast?.n;
  const held = n !== undefined && heldN === n;
  useEffect(() => {
    if (n === undefined || held) return;
    const t = window.setTimeout(() => doneRef.current(n), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [n, held]);

  // Compact: docked just under the sticky compact bar (which is always on screen), so it never covers
  // the footer risk line at the end of the page or the sheet's pinned action bar.
  const dockRef = useRef<HTMLDivElement>(null);
  const shown = !!toast;
  useLayoutEffect(() => {
    const dock = dockRef.current;
    if (!dock || placement !== "page" || !shown) return;
    let raf = 0;
    const place = () => {
      raf = 0;
      const bar = document.querySelector<HTMLElement>('[data-testid="mobile-bar"]');
      const r = bar?.getBoundingClientRect();
      if (r && r.height > 0) {
        dock.style.top = `${Math.max(8, r.bottom + 8)}px`;
        dock.style.bottom = "auto";
      } else {
        dock.style.top = "";
        dock.style.bottom = "";
      }
    };
    const later = () => {
      if (!raf) raf = requestAnimationFrame(place);
    };
    place();
    window.addEventListener("scroll", later, { passive: true });
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", later);
      window.removeEventListener("resize", later);
    };
  }, [placement, shown]);

  return (
    <div ref={dockRef} className={styles.dock} data-place={placement}>
      {toast && (
        <div
          key={toast.n}
          className={styles.toast}
          role="status"
          data-testid="toast"
          onMouseEnter={() => setHeldN(toast.n)}
          onMouseLeave={() => setHeldN(null)}
          onFocus={() => setHeldN(toast.n)}
          onBlur={() => setHeldN(null)}
        >
          <span className={styles.text}>{toast.text}</span>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <button type="button" className={styles.undo} onClick={onUndo} data-testid="toast-undo" aria-keyshortcuts="Control+Z Meta+Z">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
