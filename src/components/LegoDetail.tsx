"use client";

import { useEffect, useRef } from "react";
import { DOCS, type Lego, type StatusKind } from "@/lib";
import styles from "./LegoDetail.module.css";

const STATUS_LABEL: Record<StatusKind, string> = { live: "Live", testnet: "Testnet", available: "Available" };

export type LegoDetailProps = {
  lego: Lego;
  /** Viewport position (position: fixed). */
  pos: { top: number; left: number; width: number };
  onClose: (returnFocus: boolean) => void;
  /** The info button that opened it; clicks on it are not "outside". */
  anchor: HTMLElement | null;
};

/** Small non-modal popover: what the Lego is, its status, one example and its docs. */
export default function LegoDetail({ lego, pos, onClose, anchor }: LegoDetailProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    titleRef.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current(true);
      }
    };
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor?.contains(t)) return;
      onCloseRef.current(false);
    };
    const away = () => onCloseRef.current(false);
    const focusOut = (e: FocusEvent) => {
      const t = e.relatedTarget as Node | null;
      if (t && !ref.current?.contains(t) && !anchor?.contains(t)) onCloseRef.current(false);
    };
    const el = ref.current;
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", down);
    window.addEventListener("resize", away);
    el?.addEventListener("focusout", focusOut);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", down);
      window.removeEventListener("resize", away);
      el?.removeEventListener("focusout", focusOut);
    };
  }, [anchor]);

  const titleId = `lego-detail-${lego.id}`;
  return (
    <div
      ref={ref}
      id={`detail-${lego.id}`}
      className={styles.pop}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      <div className={styles.head}>
        <h3 id={titleId} ref={titleRef} tabIndex={-1} className={styles.title}>
          {lego.kicker}
          <span className={styles.name}>{lego.title}</span>
        </h3>
        <button type="button" className={styles.close} onClick={() => onClose(true)} aria-label={`Close ${lego.kicker} details`}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className={styles.status}>
        <span className={styles.chip} data-kind={lego.statusKind}>
          {STATUS_LABEL[lego.statusKind]}
        </span>
        <span>{lego.status}</span>
      </p>
      <p className={styles.what}>{lego.what}</p>
      <p className={styles.label}>Example</p>
      <p className={styles.example}>{lego.example}</p>
      <p className={styles.label}>Docs</p>
      <ul className={styles.docs}>
        {lego.docs.map((d) => (
          <li key={d}>
            <a href={DOCS[d].url} target="_blank" rel="noopener noreferrer">
              {DOCS[d].label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
