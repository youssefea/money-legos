"use client";

import type { Ref } from "react";
import type { FakeApp } from "@/lib";
import FakePhone from "./phone/FakePhone";
import styles from "./ResultPanel.module.css";

export type CopyButtonProps = { copied: boolean; disabled: boolean; onCopy: () => void; className?: string; testId?: string };

const CopyIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <rect x="6.5" y="6.5" width="10" height="10" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M13.5 4.2V4a1.5 1.5 0 0 0-1.5-1.5H5A1.5 1.5 0 0 0 3.5 4v7A1.5 1.5 0 0 0 5 12.5h.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** The big Copy prompt button: green "Copied" for 2s. */
export function CopyButton({ copied, disabled, onCopy, className, testId = "copy" }: CopyButtonProps) {
  return (
    <button
      type="button"
      className={[styles.copy, className].filter(Boolean).join(" ")}
      data-copied={copied || undefined}
      aria-disabled={disabled}
      onClick={() => {
        if (!disabled) onCopy();
      }}
      data-testid={testId}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="off">{copied ? "Copied" : "Copy prompt"}</span>
    </button>
  );
}

export type ResultPanelProps = {
  app: FakeApp;
  slots: number;
  tileRef: (id: string, el: HTMLLIElement | null) => void;
  /** App name once generated. */
  name: string | null;
  copied: boolean;
  onCopy: () => void;
  onDetails: () => void;
  detailsRef?: Ref<HTMLButtonElement>;
};

/** Right column: the fake phone, the app name, Copy prompt and a quiet Details link. */
export default function ResultPanel({ app, slots, tileRef, name, copied, onCopy, onDetails, detailsRef }: ResultPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="app-name">
      <FakePhone className={styles.phone} app={app} slots={slots} tileRef={tileRef} />
      <h2 id="app-name" className={styles.name} data-empty={!name || undefined} data-testid="app-name">
        {name ?? "Your app"}
      </h2>
      <CopyButton copied={copied} disabled={!name} onCopy={onCopy} />
      <button ref={detailsRef} type="button" className={styles.details} aria-disabled={!name} onClick={() => name && onDetails()} aria-haspopup="dialog">
        Details
      </button>
    </section>
  );
}
