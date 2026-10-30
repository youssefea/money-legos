"use client";

import type { CSSProperties, RefObject } from "react";
import { BY_ID, MIN_LEGOS, chipLabel, type FakeApp, type LegoId } from "@/lib";
import { StudCount } from "./Board";
import StageView from "./StageView";
import styles from "./MobileBar.module.css";

export type MobileBarProps = {
  ids: readonly LegoId[];
  /** The app the stack makes: its modules show as tiny chips while bricks are added. */
  app: FakeApp;
  dark: boolean;
  reducedMotion: boolean;
  generation: number;
  /** Built once: the button opens the live app ("View app") instead of building it. */
  built: boolean;
  lastAdded: LegoId | null;
  live: boolean;
  actionRef: RefObject<HTMLButtonElement | null>;
  onAction: () => void;
  /** Mini stack container size in CSS px (the live board auto-fits inside it). Default 96x64. */
  stageSize?: [number, number];
};

/**
 * Compact layouts (<1024px): a sticky bar. Top row: the live mini stack, four count studs and
 * Build app / View app. Bottom row: one tiny chip per module of the app (brick colour dot + one
 * word), top tile first, so the app previews itself as bricks go on. No sentences in the bar.
 */
export default function MobileBar({ actionRef, stageSize = [96, 64], ...p }: MobileBarProps) {
  const count = p.ids.length;
  const ready = count >= MIN_LEGOS;
  return (
    <div className={styles.bar} data-testid="mobile-bar" style={{ "--mini-w": `${stageSize[0]}px`, "--mini-h": `${stageSize[1]}px` } as CSSProperties}>
      <StageView className={styles.stage} ids={p.ids} dark={p.dark} reducedMotion={p.reducedMotion} generation={p.generation} lastAdded={p.lastAdded} live={p.live} compact />
      <div className={styles.count}>
        <StudCount count={count} />
      </div>
      <button ref={actionRef} type="button" className={styles.generate} aria-disabled={!ready} onClick={p.onAction} data-testid="mobile-action">
        {p.built ? "View app" : "Build app"}
      </button>
      <ol className={styles.modules} aria-label="App preview" data-testid="mobile-modules">
        {p.app.tiles.length ? (
          p.app.tiles.map((t) => (
            <li key={t.legoId} className={styles.module} data-module={t.legoId}>
              <i style={{ background: BY_ID[t.legoId].brick.hex }} aria-hidden="true" />
              {chipLabel(t)}
            </li>
          ))
        ) : (
          <li className={styles.module} data-empty>
            <i aria-hidden="true" />
            Your app
          </li>
        )}
      </ol>
    </div>
  );
}
