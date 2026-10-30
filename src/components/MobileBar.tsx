"use client";

import type { CSSProperties, RefObject } from "react";
import { MIN_LEGOS, type LegoId } from "@/lib";
import { StudCount } from "./Board";
import StageView from "./StageView";
import styles from "./MobileBar.module.css";

export type MobileBarProps = {
  ids: readonly LegoId[];
  dark: boolean;
  reducedMotion: boolean;
  generation: number;
  /** Built once: the button opens the live app ("View app") instead of building it. */
  built: boolean;
  lastAdded: LegoId | null;
  live: boolean;
  actionRef: RefObject<HTMLButtonElement | null>;
  onAction: () => void;
  /** One short line under the count (the capacity swap), or null. */
  note?: string | null;
  /** Mini stack container size in CSS px (the live board auto-fits inside it). Default 144x88. */
  stageSize?: [number, number];
};

/** Compact layouts (<1024px): sticky bar with the live mini stack, four count studs and Build app / View app. */
export default function MobileBar({ actionRef, stageSize = [144, 88], ...p }: MobileBarProps) {
  const count = p.ids.length;
  const ready = count >= MIN_LEGOS;
  return (
    <div className={styles.bar} data-testid="mobile-bar" style={{ "--mini-w": `${stageSize[0]}px`, "--mini-h": `${stageSize[1]}px` } as CSSProperties}>
      <StageView className={styles.stage} ids={p.ids} dark={p.dark} reducedMotion={p.reducedMotion} generation={p.generation} lastAdded={p.lastAdded} live={p.live} compact />
      <div className={styles.count}>
        <StudCount count={count} />
        {p.note && <span className={styles.need}>{p.note}</span>}
      </div>
      <button ref={actionRef} type="button" className={styles.generate} aria-disabled={!ready} onClick={p.onAction} data-testid="mobile-action">
        {p.built ? "View app" : "Build app"}
      </button>
    </div>
  );
}
