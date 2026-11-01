"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { BY_ID, RECIPES, stackOrder, type Recipe } from "@/lib";
import { BrickGlyph } from "./BrickArt";
import styles from "./RecipesMenu.module.css";

export type RecipesMenuProps = {
  active: string | null;
  onPick: (r: Recipe) => void;
  /** Where the list opens relative to the button. */
  placement?: "up" | "down";
  /** Which edge of the button the list lines up with (start = it grows rightward, for a button at the left edge). */
  align?: "start" | "end";
  className?: string;
};

/**
 * A small "Recipes" button with a popover list of named recipes: the recipe's bricks as mini glyphs in
 * their colours, then its name (the idea lives in Details). Picking one loads and builds it. Arrow keys move, Escape or a click outside closes, focus returns to the button.
 */
export default function RecipesMenu({ active, onPick, placement = "up", align = "end", className }: RecipesMenuProps) {
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
        // onMouseDown: Safari does not focus a clicked button, so keep focus inside (the blur would close the menu before the click lands).
        <div ref={popRef} id={id} role="dialog" aria-label="Recipes" className={styles.pop} data-placement={placement} data-align={align} onKeyDown={onKeyDown} onMouseDown={(e) => e.preventDefault()}>
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
                  <Glyphs ids={r.ids} />
                  <span className={styles.name}>{r.recipe}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export type RecipesShelfProps = {
  active: string | null;
  onPick: (r: Recipe) => void;
  /** column = the left column's bottom part (a list that scrolls); row = a sideways card row (compact). */
  layout?: "column" | "row";
  className?: string;
};

/** A recipe's bricks as mini glyphs in catalog colours, bottom-aligned like a little row of parts. */
function Glyphs({ ids }: { ids: Recipe["ids"] }) {
  return (
    <span className={styles.glyphs} aria-hidden="true">
      {stackOrder(ids).map((id) => (
        <BrickGlyph key={id} color={BY_ID[id].brick.hex} studs={BY_ID[id].size} className={styles.glyph} />
      ))}
    </span>
  );
}

/**
 * The quick-start shelf under the bricks: a small "Recipes" header and every named recipe (mini brick
 * glyphs + name). Click or Enter loads and builds it; the current one has aria-current. One Tab stop
 * (roving): arrow keys move inside, Tab moves on. Scrolls on its own, with a fade on the side that has more.
 */
export function RecipesShelf({ active, onPick, layout = "column", className }: RecipesShelfProps) {
  const headId = useId();
  const listRef = useRef<HTMLUListElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [more, setMore] = useState<{ start: boolean; end: boolean }>({ start: false, end: false });
  const row = layout === "row";
  const current = RECIPES.find((r) => r.recipe === active)?.id ?? null;
  const tabId = focusId ?? current ?? RECIPES[0]!.id;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const pos = row ? el.scrollLeft : el.scrollTop;
      const span = row ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
      const start = pos > 2;
      const end = pos < span - 2;
      setMore((p) => (p.start === start && p.end === end ? p : { start, end }));
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [row]);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-recipe]") ?? []);
    const i = items.indexOf(e.currentTarget);
    let next: HTMLButtonElement | undefined;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = items[Math.min(items.length - 1, i + 1)];
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = items[Math.max(0, i - 1)];
    else if (e.key === "Home") next = items[0];
    else if (e.key === "End") next = items[items.length - 1];
    else return;
    e.preventDefault();
    if (next) {
      next.focus();
      next.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  return (
    <section className={[styles.shelf, className].filter(Boolean).join(" ")} data-layout={layout} aria-labelledby={headId} data-testid="recipes-shelf">
      <h2 id={headId} className={styles.head}>
        Recipes
      </h2>
      <div ref={scrollRef} className={styles.shelfScroll} data-more-start={more.start || undefined} data-more-end={more.end || undefined} tabIndex={-1}>
        <ul ref={listRef} className={styles.shelfList}>
          {RECIPES.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className={styles.shelfItem}
                data-recipe={r.id}
                aria-current={active === r.recipe ? "true" : undefined}
                tabIndex={r.id === tabId ? 0 : -1}
                onFocus={() => setFocusId(r.id)}
                onKeyDown={onKeyDown}
                onClick={() => onPick(r)}
              >
                <Glyphs ids={r.ids} />
                <span className={styles.name}>{r.recipe}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
