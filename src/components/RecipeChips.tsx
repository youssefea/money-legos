"use client";

import type { ReactNode } from "react";
import { RECIPES, type Recipe } from "@/lib";
import styles from "./RecipeChips.module.css";

export type RecipeChipsProps = {
  active: string | null;
  onPick: (recipe: Recipe) => void;
  className?: string;
  /** Distinguishes the phone and desktop copies for the label id. */
  idPrefix: string;
  /** Extra buttons that lead the row (phone: Surprise me, Clear). Each is wrapped in an <li>. */
  lead?: ReactNode[];
};

/** "Try a recipe:" row. A recipe loads its stack and opens the set. */
export default function RecipeChips({ active, onPick, className, idPrefix, lead }: RecipeChipsProps) {
  const labelId = `${idPrefix}-recipes`;
  return (
    <div className={[styles.root, className].filter(Boolean).join(" ")}>
      <p id={labelId} className={styles.label}>
        Try a recipe:
      </p>
      <ul className={styles.list} aria-labelledby={labelId}>
        {lead?.map((node, i) => (
          <li key={`lead-${i}`} className={styles.lead}>
            {node}
          </li>
        ))}
        {RECIPES.map((r) => (
          <li key={r.recipe}>
            <button type="button" className={styles.chip} aria-pressed={active === r.recipe} onClick={() => onPick(r)}>
              {r.recipe}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
