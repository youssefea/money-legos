"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
  /** "wrap": label on its own line, pills wrap (desktop board). "scroll": one sideways row with a chevron. */
  layout?: "wrap" | "scroll";
};

/** "Try a recipe" row. A recipe loads its stack and opens the set. */
export default function RecipeChips({ active, onPick, className, idPrefix, lead, layout = "wrap" }: RecipeChipsProps) {
  const labelId = `${idPrefix}-recipes`;
  const listRef = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  const scroll = layout === "scroll";

  const check = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!scroll || !el) return;
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [scroll, check]);

  const next = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollBy({ left: Math.round(el.clientWidth * 0.75), behavior: "smooth" });
  };

  return (
    <div className={[styles.root, scroll ? styles.scroll : styles.wrap, className].filter(Boolean).join(" ")}>
      <p id={labelId} className={styles.label}>
        Try a recipe
      </p>
      <div className={styles.row}>
        <ul ref={listRef} className={styles.list} aria-labelledby={labelId}>
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
        {scroll && (
          <button type="button" className={styles.next} aria-label="More recipes" onClick={next} disabled={!more} data-testid="recipes-next">
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
