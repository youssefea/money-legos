"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { RECIPES, type Recipe } from "@/lib";
import styles from "./RecipesMenu.module.css";

export type RecipesMenuProps = {
  active: string | null;
  onPick: (r: Recipe) => void;
  /** Where the list opens relative to the button. */
  placement?: "up" | "down";
  className?: string;
};

/**
 * A small "Recipes" button with a popover list of named recipes (name + one-line idea). Picking one
 * loads it. Arrow keys move, Escape or a click outside closes, focus returns to the button.
 */
export default function RecipesMenu({ active, onPick, placement = "up", className }: RecipesMenuProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const close = (focusButton: boolean) => {
    setOpen(false);
    if (focusButton) btnRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const pop = popRef.current;
    const current = pop?.querySelector<HTMLButtonElement>('[aria-current="true"]') ?? pop?.querySelector<HTMLButtonElement>("button");
    current?.focus();
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!pop?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(popRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    let next: HTMLButtonElement | undefined;
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close(true);
      return;
    }
    if (e.key === "ArrowDown") next = items[(i + 1) % items.length];
    else if (e.key === "ArrowUp") next = items[(i - 1 + items.length) % items.length];
    else if (e.key === "Home") next = items[0];
    else if (e.key === "End") next = items[items.length - 1];
    else return;
    e.preventDefault();
    next?.focus();
  };

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      onBlur={(e) => {
        if (open && !e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={btnRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
        data-testid="recipes"
      >
        Recipes
        <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" data-open={open || undefined}>
          <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div ref={popRef} id={id} role="dialog" aria-label="Recipes" className={styles.pop} data-placement={placement} onKeyDown={onKeyDown}>
          <ul className={styles.list}>
            {RECIPES.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={styles.item}
                  aria-current={active === r.recipe ? "true" : undefined}
                  onClick={() => {
                    close(true);
                    onPick(r);
                  }}
                >
                  <span className={styles.name}>{r.recipe}</span>
                  <span className={styles.idea}>{r.idea}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
