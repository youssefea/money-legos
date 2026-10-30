"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import BrickSprite from "@/components/bricks/BrickSprite";
import { SPRITE_DPR, SPRITE_META } from "@/components/bricks/spriteMeta";
import { CATEGORIES, DENIM_SHORT, HERO_LEGOS, MORE_LEGOS, type Category, type Lego, type LegoId } from "@/lib";
import { BrickGlyph } from "./BrickArt";
import { statusChip } from "./statusChip";
import styles from "./Tray.module.css";

export type TrayProps = {
  ids: readonly LegoId[];
  onToggle: (id: LegoId) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>, id: LegoId) => void;
  wasDrag: () => boolean;
  dragging: LegoId | null;
};

type Filter = "All" | Category;
type Tip = { id: LegoId; x: number; top: number; bottom: number };

const TIP_ID = "lego-tip";
/** CSS px per stud in a baked sprite (a hero 2x4 is 192 px wide at 1x). */
const BAKED_STUD = 48;
const HOVER_DELAY = 320;
const LONG_PRESS = 450;

const Check = () => (
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
    <path d="M2.5 6.4l2.2 2.2 4.8-5.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Sprite width in studs (a hero 2x4 is 4): sets the brick's size on the tray's shared stud scale. */
function spriteStuds(lego: Lego): number {
  const meta = SPRITE_META[lego.id];
  return meta ? meta.width / SPRITE_DPR / BAKED_STUD : lego.size[0] + 0.55 * lego.size[1];
}

/** The brick picture: the baked sprite, or a drawn brick with its verb until the sprite exists. */
function BrickArtFor({ lego }: { lego: Lego }) {
  if (SPRITE_META[lego.id]) {
    return <BrickSprite id={lego.id} color={lego.brick.hex} size={lego.size} className={styles.sprite} />;
  }
  // Front face of the drawn brick (BrickArt's oblique view, in mm), for the printed verb.
  const [w, d] = lego.size;
  const fw = (8 * w) / (8 * w + 0.55 * 8 * d);
  const fh = 9.6 / (9.6 + 1.7 + 0.42 * 8 * d);
  const vars = { "--label": lego.brick.label, "--fw": fw.toFixed(3), "--fh": fh.toFixed(3), "--w": w, "--chars": lego.verb.length } as CSSProperties;
  return (
    <span className={styles.drawn} style={vars} data-sprite={lego.id} data-drawn aria-hidden="true">
      <BrickGlyph color={lego.brick.hex} studs={lego.size} className={styles.glyph} />
      <span className={styles.print}>{lego.verb}</span>
    </span>
  );
}

/**
 * The Lego bin: category chips, the 5 hero bricks pinned on top, then a calm grid of the rest. Bricks
 * are buttons (arrow keys move, Enter adds); name, tag and status show in a tooltip on hover,
 * keyboard focus or a long press. A placed brick fades with a check and removes on press.
 */
export default function Tray({ ids, onToggle, onPointerDown, wasDrag, dragging }: TrayProps) {
  const [filter, setFilter] = useState<Filter>("All");
  const [tip, setTip] = useState<Tip | null>(null);
  const [focusId, setFocusId] = useState<LegoId | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  const match = (l: Lego) => filter === "All" || l.category === filter;
  const heroes = HERO_LEGOS.filter(match);
  const more = MORE_LEGOS.filter(match);
  const visible = [...heroes, ...more];
  const tabId = focusId && visible.some((l) => l.id === focusId) ? focusId : visible[0]?.id;

  const clearTimers = () => {
    window.clearTimeout(hoverTimer.current);
    window.clearTimeout(pressTimer.current);
  };
  useEffect(() => clearTimers, []);

  const showTip = useCallback((id: LegoId, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setTip({ id, x: r.left + r.width / 2, top: r.top, bottom: r.bottom });
  }, []);
  const hideTip = useCallback(() => {
    window.clearTimeout(hoverTimer.current);
    setTip(null);
  }, []);

  // A scroll or resize moves the brick away from its tooltip: hide it. Escape closes it from anywhere.
  useEffect(() => {
    if (!tip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideTip();
    };
    const sc = scrollRef.current;
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", hideTip);
    sc?.addEventListener("scroll", hideTip, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", hideTip);
      sc?.removeEventListener("scroll", hideTip);
    };
  }, [tip, hideTip]);

  const buttons = () => Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>("button[data-lego]") ?? []);

  const onKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    const all = buttons();
    const i = all.indexOf(e.currentTarget);
    let next: HTMLButtonElement | undefined;
    if (e.key === "ArrowRight") next = all[i + 1];
    else if (e.key === "ArrowLeft") next = all[i - 1];
    else if (e.key === "Home") next = all[0];
    else if (e.key === "End") next = all[all.length - 1];
    else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const down = e.key === "ArrowDown";
      const cur = e.currentTarget.getBoundingClientRect();
      const cx = cur.left + cur.width / 2;
      let best: { el: HTMLButtonElement; dy: number; dx: number } | null = null;
      for (const el of all) {
        const r = el.getBoundingClientRect();
        const dy = down ? r.top - cur.bottom : cur.top - r.bottom;
        if (dy < -2) continue;
        const dx = Math.abs(r.left + r.width / 2 - cx);
        if (!best || dy < best.dy - 4 || (Math.abs(dy - best.dy) <= 4 && dx < best.dx)) best = { el, dy, dx };
      }
      next = best?.el;
    } else if (e.key === "Escape" && tip) {
      e.stopPropagation();
      hideTip();
      return;
    } else return;
    e.preventDefault();
    if (next) {
      next.focus();
      next.scrollIntoView({ block: "nearest" });
    }
  };

  const item = (lego: Lego) => {
    const placed = ids.includes(lego.id);
    const hero = lego.tier === "hero";
    const span = !hero && lego.size[0] >= 3 ? 2 : 1;
    return (
      <li key={lego.id} className={styles.cell} data-span={span > 1 ? span : undefined}>
        <button
          type="button"
          className={styles.brick}
          aria-pressed={placed}
          aria-label={`${lego.verb}, ${lego.name}${placed ? ", on board" : ""}`}
          aria-describedby={tip?.id === lego.id ? TIP_ID : undefined}
          tabIndex={lego.id === tabId ? 0 : -1}
          data-lego={lego.id}
          data-placed={placed || undefined}
          data-dragging={dragging === lego.id || undefined}
          style={{ "--sw": spriteStuds(lego).toFixed(3) } as CSSProperties}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            setFocusId(lego.id);
            if (e.currentTarget.matches(":focus-visible")) showTip(lego.id, e.currentTarget);
          }}
          onBlur={hideTip}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            window.clearTimeout(hoverTimer.current);
            hoverTimer.current = window.setTimeout(() => showTip(lego.id, el), tip ? 0 : HOVER_DELAY);
          }}
          onMouseLeave={hideTip}
          onPointerDown={(e) => {
            hideTip();
            longPressed.current = false;
            if (e.pointerType === "touch") {
              const el = e.currentTarget;
              window.clearTimeout(pressTimer.current);
              pressTimer.current = window.setTimeout(() => {
                longPressed.current = true;
                showTip(lego.id, el);
              }, LONG_PRESS);
            }
            onPointerDown(e, lego.id);
          }}
          onPointerUp={() => window.clearTimeout(pressTimer.current)}
          onPointerCancel={() => window.clearTimeout(pressTimer.current)}
          onContextMenu={(e) => {
            if (longPressed.current) e.preventDefault();
          }}
          onClick={() => {
            if (wasDrag()) return;
            if (longPressed.current) {
              longPressed.current = false;
              return;
            }
            hideTip();
            onToggle(lego.id);
          }}
        >
          <span className={styles.art}>
            <BrickArtFor lego={lego} />
          </span>
          {placed && (
            <span className={styles.check} aria-hidden="true">
              <Check />
            </span>
          )}
        </button>
      </li>
    );
  };

  const tipLego = tip ? visible.find((l) => l.id === tip.id) : undefined;
  const above = tip ? tip.top > 120 : true;

  return (
    <section ref={rootRef} className={styles.tray} aria-labelledby="tray-h">
      <h2 id="tray-h" className="visually-hidden">
        Legos
      </h2>
      <div className={styles.chips} role="group" aria-label="Filter Legos">
        {(["All", ...CATEGORIES] as Filter[]).map((c) => (
          <button
            key={c}
            type="button"
            className={styles.chip}
            aria-pressed={filter === c}
            onClick={() => {
              setFilter(c);
              hideTip();
              scrollRef.current?.scrollTo({ top: 0 });
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <div ref={scrollRef} className={styles.scroll} data-testid="tray-scroll">
        {heroes.length > 0 && <ul className={styles.hero}>{heroes.map(item)}</ul>}
        {heroes.length > 0 && more.length > 0 && <hr className={styles.rule} />}
        {more.length > 0 && <ul className={styles.grid}>{more.map(item)}</ul>}
      </div>
      {tip && tipLego && (
        <div
          id={TIP_ID}
          role="tooltip"
          className={styles.tip}
          data-side={above ? "top" : "bottom"}
          style={{ left: tip.x, top: above ? tip.top : tip.bottom } as CSSProperties}
        >
          <span className={styles.tipHead}>
            <span className={styles.tipName}>{tipLego.name}</span>
            <span className={styles.tipChip} data-kind={tipLego.statusKind}>
              {statusChip(tipLego)}
            </span>
          </span>
          <span className={styles.tipTag}>{tipLego.tag}</span>
          {tipLego.id === "speed" && <span className={styles.tipNote}>{DENIM_SHORT}</span>}
        </div>
      )}
    </section>
  );
}
