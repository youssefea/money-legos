"use client";

import BaseLockup from "./BaseLockup";
import { RES } from "@/lib";
import styles from "./Header.module.css";

export type HeaderProps = {
  /** Present mode is on. */
  present?: boolean;
  /** Toggle Present mode (desktop only; omitted on compact layouts). */
  onPresent?: (on: boolean) => void;
};

/** Base lockup, divider, "Money Legos"; Docs and the Present toggle on the right. */
export default function Header({ present = false, onPresent }: HeaderProps) {
  return (
    <header className={styles.header}>
      <span className={styles.brand}>
        <BaseLockup label="Base" />
        <span className={styles.divider} aria-hidden="true" />
        <span className={styles.name}>Money Legos</span>
      </span>
      <nav className={styles.nav} aria-label="Links">
        <a className={styles.docs} href={RES.docs} target="_blank" rel="noopener noreferrer">
          Docs
        </a>
        {onPresent && (
          <button
            type="button"
            className={styles.present}
            aria-pressed={present}
            aria-keyshortcuts="P"
            title={present ? "Leave Present (P or Esc)" : "Present (P)"}
            onClick={() => onPresent(!present)}
            data-testid="present-toggle"
          >
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <rect x="2.5" y="3.5" width="15" height="10" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 13.5v3M6.5 16.5h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Present
          </button>
        )}
      </nav>
    </header>
  );
}

/** The sound toggle (off by default): a quiet icon button in the footer. */
export function SoundToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button type="button" className={styles.sound} aria-pressed={on} onClick={() => onChange(!on)} title={on ? "Sound on" : "Sound off"}>
      <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
        <path d="M3.5 7.5h3l4-3.5v12l-4-3.5h-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        {on ? (
          <path d="M13.5 7.2a4 4 0 0 1 0 5.6M15.6 5.2a7 7 0 0 1 0 9.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        ) : (
          <path d="M13.5 8l4 4M17.5 8l-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        )}
      </svg>
      <span className="visually-hidden">Sound</span>
    </button>
  );
}
