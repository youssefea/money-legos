"use client";

import { useEffect, useRef, useState } from "react";
import type { Toast as ToastData } from "@/state/store";
import styles from "./Toast.module.css";

export const TOAST_MS = 6000;

export type ToastProps = {
  toast: ToastData | null;
  onUndo: () => void;
  /** Called when the toast has been on screen for 6s (paused while hovered or focused). */
  onDone: (n: number) => void;
};

/**
 * Transient feedback with Undo: "Full · swapped Issue for Hold · Undo", "Issue removed · Undo".
 * 6s, paused while the pointer or focus is on it; Ctrl/Cmd+Z does the same Undo from anywhere.
 */
export default function Toast({ toast, onUndo, onDone }: ToastProps) {
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

  return (
    <div className={styles.dock}>
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
