"use client";

import { useEffect, useRef } from "react";
import type { GenerateResult } from "@/lib";
import { SetCard } from "./SetBox";
import styles from "./SetSheet.module.css";

export type SetSheetProps = {
  open: boolean;
  result: GenerateResult;
  copied: boolean;
  onCopied: () => void;
  /** Called after the sheet closes (Escape, backdrop, close button). */
  onClose: () => void;
};

/**
 * Phone only: the set box as a modal bottom sheet (native <dialog>: focus is trapped and
 * Escape closes). Focus goes to the app name; the caller returns focus on close.
 */
export default function SetSheet({ open, result, copied, onCopied, onClose }: SetSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      titleRef.current?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const closed = () => onCloseRef.current();
    // A click on the dialog element outside its box is a click on the backdrop.
    const backdrop = (e: MouseEvent) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
    };
    d.addEventListener("close", closed);
    d.addEventListener("click", backdrop);
    return () => {
      d.removeEventListener("close", closed);
      d.removeEventListener("click", backdrop);
    };
  }, []);

  return (
    <dialog ref={ref} className={styles.sheet} aria-labelledby="sheet-set-h">
      <div className={styles.grip} aria-hidden="true" />
      <SetCard ref={titleRef} result={result} copied={copied} onCopied={onCopied} onClose={() => ref.current?.close()} headingId="sheet-set-h" />
    </dialog>
  );
}
