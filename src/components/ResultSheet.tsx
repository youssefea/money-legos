"use client";

import { useEffect, useRef, useState } from "react";
import type { FakeApp, LegoId } from "@/lib";
import FakePhone from "./phone/FakePhone";
import { AppName, CopyButton, DemoLabel } from "./ResultPanel";
import styles from "./ResultSheet.module.css";

export type ResultSheetProps = {
  open: boolean;
  app: FakeApp;
  name: string;
  copied: boolean;
  onCopy: () => void;
  onDetails: () => void;
  /** Called after the sheet closes (Escape, backdrop, Back to bricks). */
  onClose: () => void;
};

/**
 * Compact layouts (<1024px): the built app opens as a bottom sheet. The sheet is the screen (no device
 * frame inside a device): the name as its title, the demo label, the app scrolling, and Copy prompt
 * pinned in a 72px action bar with "Back to bricks". Tapping a tile shows "Made with <brick>".
 * Native modal <dialog>: focus trapped, Escape closes.
 */
export default function ResultSheet({ open, app, name, copied, onCopy, onDetails, onClose }: ResultSheetProps) {
  const [inspect, setInspect] = useState<LegoId | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      // Focus the dialog itself (no ring on the heading); Tab then moves into it.
      d.focus();
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
    <dialog ref={ref} className={styles.sheet} aria-labelledby="sheet-h" tabIndex={-1} data-testid="result-sheet">
      <div className={styles.grip} aria-hidden="true" />
      <header className={styles.head}>
        <div className={styles.heading}>
          {/* The full name at once: the sheet never types it in (it opens over a finished app). */}
          <AppName id="sheet-h" name={name} typing={null} className={styles.title} />
          <DemoLabel className={styles.demo} />
        </div>
        <button type="button" className={styles.details} onClick={onDetails} aria-haspopup="dialog">
          Details
        </button>
      </header>
      {/* A tap anywhere but a tile clears "Made with" (pointer only; keyboard focus leaving a tile does the same). */}
      <div
        className={styles.body}
        onPointerDown={(e) => {
          if (!(e.target instanceof Element) || !e.target.closest("[data-tile]")) setInspect(null);
        }}
      >
        <FakePhone className={styles.phone} app={app} phase="live" boot={0} slots={0} frameless inspect={inspect} onInspect={setInspect} />
      </div>
      <div className={styles.bar}>
        <button type="button" className={styles.back} onClick={() => ref.current?.close()}>
          Back to bricks
        </button>
        <CopyButton className={styles.copy} copied={copied} disabled={false} onCopy={onCopy} testId="sheet-copy" />
      </div>
    </dialog>
  );
}
