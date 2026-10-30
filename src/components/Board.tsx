"use client";

import type { RefObject } from "react";
import { BY_ID, MAX_LEGOS, MIN_LEGOS, type LegoId, type Recipe } from "@/lib";
import type { Swap } from "@/state/store";
import RecipesMenu from "./RecipesMenu";
import StageView, { type StageLayout } from "./StageView";
import styles from "./Board.module.css";

export type BoardProps = {
  ids: readonly LegoId[];
  recipe: string | null;
  dark: boolean;
  reducedMotion: boolean;
  generation: number;
  built: boolean;
  lastAdded: LegoId | null;
  swap: Swap | null;
  live: boolean;
  dropRef: RefObject<HTMLDivElement | null>;
  dragOver: boolean;
  dragging: boolean;
  onBuild: () => void;
  onSurprise: () => void;
  onClear: () => void;
  onRecipe: (r: Recipe) => void;
  onLayout?: (layout: StageLayout | null) => void;
};

/** Four small studs that fill as bricks land (replaces the "n of 4" text). */
export function StudCount({ count, className }: { count: number; className?: string }) {
  return (
    <span className={[styles.studs, className].filter(Boolean).join(" ")} role="img" aria-label={`${count} of ${MAX_LEGOS} bricks`} data-testid="board-count" data-count={count}>
      {Array.from({ length: MAX_LEGOS }, (_, i) => (
        <i key={i} data-on={i < count || undefined} />
      ))}
    </span>
  );
}

/** One short line by the count at 4 of 4: what a new brick will do, or what it just did. */
export function boardNote(count: number, swap: Swap | null): string | null {
  if (swap) return `Full. ${BY_ID[swap.added].verb} swapped in for ${BY_ID[swap.removed].verb}.`;
  return count >= MAX_LEGOS ? "Full. A new brick swaps out the bottom one." : null;
}

/** Centre column: the baseplate with the stack, Build app / Surprise me / Clear and Recipes. */
export default function Board({ dropRef, ...p }: BoardProps) {
  const count = p.ids.length;
  const ready = count >= MIN_LEGOS;
  const full = boardNote(count, p.swap);
  return (
    <section className={styles.board} aria-labelledby="board-h">
      <h2 id="board-h" className="visually-hidden">
        Board
      </h2>
      <div className={styles.head}>
        {full && (
          <p key={p.swap?.n ?? 0} className={styles.full} data-testid="board-full">
            {full}
          </p>
        )}
        <StudCount count={count} />
      </div>

      <div ref={dropRef} className={styles.drop} data-drag={p.dragging || undefined} data-over={p.dragOver || undefined}>
        <StageView
          ids={p.ids}
          dark={p.dark}
          reducedMotion={p.reducedMotion}
          generation={p.generation}
          lastAdded={p.lastAdded}
          live={p.live}
          onLayout={p.onLayout}
        />
      </div>

      <div className={styles.controls}>
        {!p.built && (
          <button type="button" className={styles.generate} aria-disabled={!ready} onClick={p.onBuild} data-testid="build">
            Build app
          </button>
        )}
        <button type="button" className={styles.secondary} onClick={p.onSurprise} data-testid="surprise">
          Surprise me
        </button>
        <button type="button" className={styles.text} onClick={p.onClear} disabled={count === 0}>
          Clear
        </button>
        <RecipesMenu className={styles.recipes} active={p.recipe} onPick={p.onRecipe} placement="up" />
      </div>
    </section>
  );
}
