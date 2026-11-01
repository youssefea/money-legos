"use client";

import { useState, type CSSProperties, type Ref } from "react";
import type { FakeApp, LegoId } from "@/lib";
import type { Typing } from "@/state/store";
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
  ref?: Ref<HTMLButtonElement>;
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
export function CopyButton({ copied, disabled, onCopy, quiet, className, testId = "copy", ref }: CopyButtonProps) {
  return (
    <button
      ref={ref}
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

/** Typing pace for the app name: 28ms a character after the boot's dark hold, the whole name within 1.4s. */
export function typePace(name: string): number {
  return Math.max(8, Math.min(28, Math.floor((1400 - 300 - 90) / Math.max(1, Array.from(name).length))));
}

/**
 * The app name. It types in letter by letter only on a Build / Replay or a recipe / Surprise me load
 * (`typing` matches the name); a live edit crossfades to the new name in 120ms; a shared link or
 * reopening the app shows it at once. Reduced motion shows it at once.
 */
export function AppName({ name, typing, id, className }: { name: string | null; typing?: Typing | null; id?: string; className?: string }) {
  // Remember which name arrived by a live edit (it crossfades); the first name and a cleared typing never animate.
  const [prev, setPrev] = useState(name);
  const [fadeFor, setFadeFor] = useState<string | null>(null);
  if (prev !== name) {
    setPrev(name);
    setFadeFor(prev !== null ? name : null);
  }
  const typed = !!name && !!typing && typing.name === name;
  return (
    <h2
      id={id}
      className={[styles.name, className].filter(Boolean).join(" ")}
      style={{ "--len": Array.from(name ?? "Your app").length } as CSSProperties}
      data-empty={!name || undefined}
      data-testid="app-name"
      data-typing={typed || undefined}
    >
      {name ? (
        <span
          key={typed ? `t${typing!.n}` : name}
          className={typed ? styles.typed : fadeFor === name ? styles.fade : undefined}
          style={typed ? ({ "--cs": `${typePace(name)}ms` } as CSSProperties) : undefined}
        >
          {typed
            ? Array.from(name).map((c, i) => (
                <span key={i} style={{ "--c": i } as CSSProperties}>
                  {c}
                </span>
              ))
            : name}
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
  /** The Build boot plays (Build / Replay / recipe / Surprise me); false for a shared link. */
  play: boolean;
  typing: Typing | null;
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
  copyRef?: Ref<HTMLButtonElement>;
};

/** Right column: the app name as the column title, the fake phone, Copy prompt and Details. */
export default function ResultPanel({ app, phase, boot, play, typing, slots, tileRef, name, ready, copied, onCopy, onDetails, inspect, onInspect, detailsRef, copyRef }: ResultPanelProps) {
  return (
    <section className={styles.panel} aria-labelledby="app-name">
      <div className={styles.head}>
        <AppName id="app-name" name={name} typing={typing} />
      </div>
      <FakePhone className={styles.phone} app={app} phase={phase} boot={boot} play={play} slots={slots} tileRef={tileRef} inspect={inspect} onInspect={onInspect} />
      <div className={styles.actions}>
        <CopyButton ref={copyRef} copied={copied} disabled={!ready} quiet={phase !== "live"} onCopy={onCopy} />
        <button ref={detailsRef} type="button" className={styles.details} aria-disabled={!ready} onClick={() => ready && onDetails()} aria-haspopup="dialog">
          Details
        </button>
      </div>
    </section>
  );
}
