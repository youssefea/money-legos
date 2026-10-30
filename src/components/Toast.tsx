"use client";

import { useEffect, useRef, useState } from "react";
import type { Toast as ToastData } from "@/state/store";
import styles from "./Toast.module.css";

export const TOAST_MS = 2800;

export type ToastProps = {
  toast: ToastData | null;
  onUndo: () => void;
  /** Called when the toast has been on screen for 2.8s (paused while hovered or focused). */
  onDone: (n: number) => void;
};

/**
 * Transient feedback with Undo: "Full · swapped Issue for Hold · Undo", "Issue removed · Undo".
 * 2.8s, paused while the pointer or focus is on it, so the Undo button can be reached.
 */
export default function Toast({ toast, onUndo, onDone }: ToastProps) {
  const [held, setHeld] = useState(false);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  const n = toast?.n;
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
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
        >
          <span className={styles.text}>{toast.text}</span>
          <span className={styles.sep} aria-hidden="true">
            ·
          </span>
          <button type="button" className={styles.undo} onClick={onUndo} data-testid="toast-undo">
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
