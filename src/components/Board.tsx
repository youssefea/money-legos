"use client";

import type { RefObject } from "react";
import { MAX_LEGOS, MIN_LEGOS, type LegoId, type Recipe } from "@/lib";
import { requirementText } from "@/state/store";
import RecipeChips from "./RecipeChips";
import StageView from "./StageView";
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
};

/** Centre column: the baseplate, the counter, Generate / Surprise me / Clear, and recipes. */
export default function Board({ dropRef, ...p }: BoardProps) {
  const count = p.ids.length;
  const ready = count >= MIN_LEGOS;
  const need = requirementText(count);
  return (
    <section className={styles.board} aria-labelledby="board-h">
      <div className={styles.head}>
        <h2 id="board-h" className={styles.label}>
          Your board
        </h2>
        <p className={styles.count} aria-hidden="true" data-testid="board-count">
          {count} of {MAX_LEGOS}
        </p>
      </div>

      <div ref={dropRef} className={styles.drop} data-drag={p.dragging || undefined} data-over={p.dragOver || undefined}>
        <StageView
          ids={p.ids}
          dark={p.dark}
          reducedMotion={p.reducedMotion}
          generation={p.hasResult ? p.generation : 0}
          lastAdded={p.lastAdded}
          live={p.live}
        />
        {count === 0 && (
          <p className={styles.start} aria-hidden="true">
            Start here: tap a Lego
          </p>
        )}
        {p.dragging && (
          <p className={styles.dropHint} aria-hidden="true">
            {count >= MAX_LEGOS ? "Board is full" : "Drop to snap it on"}
          </p>
        )}
      </div>

      <div className={styles.controls}>
        <div className={styles.generateWrap}>
          <button
            type="button"
            className={styles.generate}
            aria-disabled={!ready}
            aria-describedby={need ? "generate-need" : undefined}
            onClick={p.onGenerate}
          >
            Generate app
          </button>
        </div>
        <button type="button" className={styles.secondary} onClick={p.onSurprise}>
          Surprise me
        </button>
        <button type="button" className={styles.text} onClick={p.onClear} disabled={count === 0}>
          Clear
        </button>
      </div>
      <p id="generate-need" className={styles.need} aria-live="off">
        {need || "\u00a0"}
      </p>

      <RecipeChips className={styles.recipes} active={p.recipe} onPick={p.onRecipe} idPrefix="board" />
    </section>
  );
}
