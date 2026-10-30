"use client";

import type { CSSProperties, RefObject } from "react";
import { MAX_LEGOS, MIN_LEGOS, type LegoId } from "@/lib";
import StageView from "./StageView";
import styles from "./MobileBar.module.css";

export type MobileBarProps = {
  ids: readonly LegoId[];
  dark: boolean;
  reducedMotion: boolean;
  generation: number;
  hasResult: boolean;
  lastAdded: LegoId | null;
  live: boolean;
  generateRef: RefObject<HTMLButtonElement | null>;
  onGenerate: () => void;
  /** Mini stack container size in CSS px (the live board auto-fits inside it). Default 144x88. */
  stageSize?: [number, number];
};

/** Compact layouts (<1024px): sticky bar with the live mini stack, "n/4" and Generate. */
export default function MobileBar({ generateRef, stageSize = [144, 88], ...p }: MobileBarProps) {
  const count = p.ids.length;
  const ready = count >= MIN_LEGOS;
  return (
    <div
      className={styles.bar}
      data-testid="mobile-bar"
      style={{ "--mini-w": `${stageSize[0]}px`, "--mini-h": `${stageSize[1]}px` } as CSSProperties}
    >
      <StageView
        className={styles.stage}
        ids={p.ids}
        dark={p.dark}
        reducedMotion={p.reducedMotion}
        generation={p.hasResult ? p.generation : 0}
        lastAdded={p.lastAdded}
        live={p.live}
        compact
      />
      <p className={styles.count}>
        <span className={styles.n}>
          {count}/{MAX_LEGOS}
        </span>
        {!ready && (
          <span id="m-need" className={styles.need}>
            Pick 2+
          </span>
        )}
      </p>
      <button
        ref={generateRef}
        type="button"
        className={styles.generate}
        aria-disabled={!ready}
        aria-describedby={ready ? undefined : "m-need"}
        onClick={p.onGenerate}
      >
        {p.hasResult ? "Regenerate" : "Generate"}
      </button>
    </div>
  );
}
