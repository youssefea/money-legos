"use client";

import BaseLockup from "./BaseLockup";
import { RES } from "@/lib";
import styles from "./Header.module.css";

export type HeaderProps = { soundOn: boolean; onSound: (on: boolean) => void };

/** Base lockup, divider, "Money Legos"; Docs and the sound toggle on the right. */
export default function Header({ soundOn, onSound }: HeaderProps) {
  return (
    <header className={styles.header}>
      <BaseLockup label="Base" />
      <span className={styles.divider} aria-hidden="true" />
      <span className={styles.name}>Money Legos</span>
      <nav className={styles.nav} aria-label="Links">
        <a className={styles.docs} href={RES.docs} target="_blank" rel="noopener noreferrer">
          Docs
        </a>
        <button
          type="button"
          className={styles.sound}
          aria-pressed={soundOn}
          onClick={() => onSound(!soundOn)}
          title={soundOn ? "Sound on" : "Sound off"}
        >
          <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true">
            <path d="M3.5 7.5h3l4-3.5v12l-4-3.5h-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            {soundOn ? (
              <path d="M13.5 7.2a4 4 0 0 1 0 5.6M15.6 5.2a7 7 0 0 1 0 9.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            ) : (
              <path d="M13.5 8l4 4M17.5 8l-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </svg>
          <span className="visually-hidden">Sound</span>
        </button>
      </nav>
    </header>
  );
}
