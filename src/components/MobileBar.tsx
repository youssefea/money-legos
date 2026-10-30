"use client";

import type { CSSProperties, RefObject } from "react";
import { MAX_LEGOS, MIN_LEGOS, type LegoId } from "@/lib";
import { requirementText } from "@/state/store";
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
  /** Mini stack container size in CSS px (the live board auto-fits inside it). Default 136x76. */
  stageSize?: [number, number];
};

/** Phone only: sticky bar with the live mini stack, "n/4" and Generate. */
export default function MobileBar({ generateRef, stageSize = [136, 76], ...p }: MobileBarProps) {
  const count = p.ids.length;
  const ready = count >= MIN_LEGOS;
  const need = requirementText(count);
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
        <span id="m-need" className={styles.need}>
          {count === 0 ? "Pick 2+ Legos" : need || (p.hasResult ? "Idea ready" : "Ready")}
        </span>
      </p>
      <button
        ref={generateRef}
        type="button"
        className={styles.generate}
        aria-disabled={!ready}
        aria-describedby="m-need"
        onClick={p.onGenerate}
      >
        {p.hasResult ? "Open set" : "Generate"}
      </button>
    </div>
  );
}
