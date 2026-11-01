"use client";

import { useCallback, useState, type CSSProperties, type MouseEvent, type RefObject } from "react";
import { MAX_LEGOS, MIN_LEGOS, type LegoId } from "@/lib";
import StageView, { type Frame, type StageLayout } from "./StageView";
import styles from "./Board.module.css";

export type BoardProps = {
  ids: readonly LegoId[];
  dark: boolean;
  reducedMotion: boolean;
  generation: number;
  /** The app is live (built, 2+ bricks): the Build button becomes Replay (plays the boot again). */
  appLive: boolean;
  lastAdded: LegoId | null;
  /** Mount the live 3D board here (only one instance on the page at a time). */
  live: boolean;
  dropRef: RefObject<HTMLDivElement | null>;
  dragOver: boolean;
  dragging: boolean;
  /** Footprint of the brick about to be added (hovered or dragged in the tray), for the ghost. */
  ghostSize?: [number, number];
  /** Hide the ghost (built app of 3+ bricks, nothing hovered or dragged). */
  ghostHidden?: boolean;
  inspect: LegoId | null;
  onInspect: (id: LegoId | null) => void;
  /** A board brick was clicked (or Enter, `keyboard`): take it off (the page shows Undo). */
  onRemove: (id: LegoId, keyboard: boolean) => void;
  onBuild: (e: MouseEvent<HTMLButtonElement>) => void;
  onSurprise: () => void;
  onClear: () => void;
  onLayout?: (layout: StageLayout | null) => void;
};

/** Four small studs that fill as bricks land (replaces the "n of 4" text). */
export function StudCount({ count, className, style }: { count: number; className?: string; style?: CSSProperties }) {
  return (
    <span className={[styles.studs, className].filter(Boolean).join(" ")} style={style} role="img" aria-label={`${count} of ${MAX_LEGOS} bricks`} data-testid="board-count" data-count={count}>
      {Array.from({ length: MAX_LEGOS }, (_, i) => (
        <i key={i} data-on={i < count || undefined} />
      ))}
    </span>
  );
}

const ReplayIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
    <path d="M4.5 10a5.5 5.5 0 1 0 1.7-4M4.5 3.5V6.5h3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Centre column: the baseplate with the stack, Build app (then Replay) / Surprise me / Clear. */
export default function Board({ dropRef, ...p }: BoardProps) {
  const count = p.ids.length;
  const ready = count >= MIN_LEGOS;
  // The stud count sits just above the stack (or the ghost on an empty plate), not at the top of the column.
  const [stackTop, setStackTop] = useState<number | null>(null);
  const onFrame = useCallback((f: Frame) => setStackTop(f.stackTop), []);
  const studTop = stackTop === null ? undefined : `max(0px, calc(${(stackTop * 100).toFixed(2)}% - 40px))`;
  const { inspect, onInspect, onRemove } = p;
  const hits = { inspect, onInspect, onRemove };
  return (
    <section className={styles.board} aria-labelledby="board-h" tabIndex={-1} data-testid="board">
      <h2 id="board-h" className="visually-hidden">
        Board
      </h2>

      <div ref={dropRef} className={styles.drop} data-drag={p.dragging || undefined} data-over={p.dragOver || undefined}>
        <StudCount count={count} className={styles.count} style={studTop ? { top: studTop } : undefined} />
        <StageView
          ids={p.ids}
          dark={p.dark}
          reducedMotion={p.reducedMotion}
          generation={p.generation}
          lastAdded={p.lastAdded}
          live={p.live}
          onLayout={p.onLayout}
          onFrame={onFrame}
          ghostSize={p.ghostSize}
          ghostHidden={p.ghostHidden}
          hits={p.live ? hits : undefined}
        />
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.generate}
          data-replay={p.appLive || undefined}
          aria-disabled={!ready}
          aria-label={p.appLive ? "Replay the app build" : undefined}
          onClick={p.onBuild}
          data-testid="build"
        >
          {p.appLive ? (
            <>
              <ReplayIcon />
              Replay
            </>
          ) : (
            "Build app"
          )}
        </button>
        <button type="button" className={styles.text} data-ink onClick={p.onSurprise} data-testid="surprise">
          Surprise me
        </button>
        <button type="button" className={styles.text} onClick={p.onClear} disabled={count === 0}>
          Clear
        </button>
      </div>
    </section>
  );
}
