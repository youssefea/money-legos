"use client";

import type { CSSProperties, Ref } from "react";
import type { FakeApp, LegoId } from "@/lib";
import FakePhone, { type PhonePhase } from "./phone/FakePhone";
import styles from "./ResultPanel.module.css";

export type CopyButtonProps = {
  copied: boolean;
  disabled: boolean;
  onCopy: () => void;
  /** Before Build app: enabled but quiet (outline), so Build app stays the one blue action. */
  quiet?: boolean;
  className?: string;
  testId?: string;
};

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
export function CopyButton({ copied, disabled, onCopy, quiet, className, testId = "copy" }: CopyButtonProps) {
  return (
    <button
      type="button"
      className={[styles.copy, className].filter(Boolean).join(" ")}
      data-copied={copied || undefined}
      data-quiet={(quiet && !copied) || undefined}
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

/** "Demo · no real funds": always next to the fake screen. */
export function DemoLabel({ className }: { className?: string }) {
  return (
    <p className={[styles.demo, className].filter(Boolean).join(" ")} data-testid="demo-label">
      Demo · no real funds
    </p>
  );
}

/** The app name, typing in letter by letter after each Build (CSS only; reduced motion shows it at once). */
export function AppName({ name, boot, id, className }: { name: string | null; boot: number; id?: string; className?: string }) {
  return (
    <h2 id={id} className={[styles.name, className].filter(Boolean).join(" ")} data-empty={!name || undefined} data-testid="app-name">
      {name ? (
        <span key={boot} className={styles.typed}>
          {Array.from(name).map((c, i) => (
            <span key={i} style={{ "--c": i } as CSSProperties}>
              {c}
            </span>
          ))}
        </span>
      ) : (
        "Your app"
      )}
    </h2>
  );
}

export type ResultPanelProps = {
  app: FakeApp;
  phase: PhonePhase;
  boot: number;
  slots: number;
  tileRef: (id: string, el: HTMLLIElement | null) => void;
  /** App name while the app is live. */
  name: string | null;
  /** 2+ bricks: Copy prompt (and Details) build first if needed. */
  ready: boolean;
  copied: boolean;
  onCopy: () => void;
  onDetails: () => void;
  inspect: LegoId | null;
  onInspect: (id: LegoId | null) => void;
  detailsRef?: Ref<HTMLButtonElement>;
};

/** Right column: the app name as the column title, the demo label, the fake phone, Copy prompt and Details. */
export default function ResultPanel({ app, phase, boot, slots, tileRef, name, ready, copied, onCopy, onDetails, inspect, onInspect, detailsRef }: ResultPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="app-name">
      <div className={styles.head}>
        <AppName id="app-name" name={name} boot={boot} />
        <DemoLabel />
      </div>
      <FakePhone className={styles.phone} app={app} phase={phase} boot={boot} slots={slots} tileRef={tileRef} inspect={inspect} onInspect={onInspect} />
      <div className={styles.actions}>
        <CopyButton copied={copied} disabled={!ready} quiet={phase !== "live"} onCopy={onCopy} />
        <button ref={detailsRef} type="button" className={styles.details} aria-disabled={!ready} onClick={() => ready && onDetails()} aria-haspopup="dialog">
          Details
        </button>
      </div>
    </section>
  );
}
