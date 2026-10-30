"use client";

import type { RefObject } from "react";
import { MAX_LEGOS, MIN_LEGOS, type LegoId, type Recipe } from "@/lib";
import RecipesMenu from "./RecipesMenu";
import StageView, { type StageLayout } from "./StageView";
import styles from "./Board.module.css";

export type BoardProps = {
  ids: readonly LegoId[];
  recipe: string | null;
  dark: boolean;
  reducedMotion: boolean;
  generation: number;
  hasResult: boolean;
  lastAdded: LegoId | null;
  live: boolean;
  dropRef: RefObject<HTMLDivElement | null>;
  dragOver: boolean;
  dragging: boolean;
  onGenerate: () => void;
  onSurprise: () => void;
  onClear: () => void;
  onRecipe: (r: Recipe) => void;
  onLayout?: (layout: StageLayout | null) => void;
};

/** Centre column: counter, the baseplate, Generate / Surprise me / Clear and the Recipes menu. */
export default function Board({ dropRef, ...p }: BoardProps) {
  const count = p.ids.length;
  const ready = count >= MIN_LEGOS;
  return (
    <section className={styles.board} aria-labelledby="board-h">
      <div className={styles.head}>
        <h2 id="board-h" className={styles.label}>
          Your board
        </h2>
        <p className={styles.count} data-testid="board-count">
          {count} of {MAX_LEGOS}
        </p>
      </div>

      <div ref={dropRef} className={styles.drop} data-drag={p.dragging || undefined} data-over={p.dragOver || undefined}>
        {count === 0 && !p.dragging && (
          <p className={styles.caption} aria-hidden="true" data-testid="board-caption">
            Tap a Lego
          </p>
        )}
        <StageView
          ids={p.ids}
          dark={p.dark}
          reducedMotion={p.reducedMotion}
          generation={p.hasResult ? p.generation : 0}
          lastAdded={p.lastAdded}
          live={p.live}
          onLayout={p.onLayout}
        />
      </div>

      <div className={styles.controls}>
        <div className={styles.generateWrap}>
          <button
            type="button"
            className={styles.generate}
            aria-disabled={!ready}
            aria-describedby={ready ? undefined : "generate-need"}
            onClick={p.onGenerate}
            data-testid="generate"
          >
            {p.hasResult ? "Regenerate" : "Generate"}
          </button>
          {!ready && (
            <span id="generate-need" className={styles.need}>
              Pick 2+
            </span>
          )}
        </div>
        <button type="button" className={styles.secondary} onClick={p.onSurprise}>
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
