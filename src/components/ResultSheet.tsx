"use client";

import { useEffect, useRef } from "react";
import type { FakeApp } from "@/lib";
import FakePhone from "./phone/FakePhone";
import { CopyButton } from "./ResultPanel";
import styles from "./ResultSheet.module.css";

export type ResultSheetProps = {
  open: boolean;
  app: FakeApp;
  name: string;
  copied: boolean;
  onCopy: () => void;
  onDetails: () => void;
  /** Called after the sheet closes (Escape, backdrop, Back to Legos). */
  onClose: () => void;
};

/**
 * Compact layouts (<1024px): after Generate the fake phone opens as a bottom sheet with Copy prompt
 * pinned in a 72px action bar and "Back to Legos". Native modal <dialog>: focus trapped, Escape closes.
 */
export default function ResultSheet({ open, app, name, copied, onCopy, onDetails, onClose }: ResultSheetProps) {
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
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const closed = () => onCloseRef.current();
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
    <dialog ref={ref} className={styles.sheet} aria-labelledby="sheet-h" data-testid="result-sheet">
      <div className={styles.grip} aria-hidden="true" />
      <header className={styles.head}>
        <h2 id="sheet-h" ref={titleRef} tabIndex={-1} className={styles.title}>
          {name}
        </h2>
        <button type="button" className={styles.details} onClick={onDetails} aria-haspopup="dialog">
          Details
        </button>
      </header>
      <FakePhone className={styles.phone} app={app} slots={0} />
      <div className={styles.bar}>
        <button type="button" className={styles.back} onClick={() => ref.current?.close()}>
          Back to Legos
        </button>
        <CopyButton className={styles.copy} copied={copied} disabled={false} onCopy={onCopy} testId="sheet-copy" />
      </div>
    </dialog>
  );
}
