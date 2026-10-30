"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import BrickSprite from "@/components/bricks/BrickSprite";
import { SPRITE_DPR, SPRITE_META, SPRITE_STUD_PX } from "@/components/bricks/spriteMeta";
import { CATEGORIES, HERO_LEGOS, MORE_LEGOS, type Category, type Lego, type LegoId } from "@/lib";
import { BrickGlyph } from "./BrickArt";
import { statusChip } from "./statusChip";
import styles from "./Tray.module.css";

export type TrayProps = {
  ids: readonly LegoId[];
  onToggle: (id: LegoId) => void;
  onPointerDown: (e: ReactPointerEvent<HTMLElement>, id: LegoId) => void;
  wasDrag: () => boolean;
  dragging: LegoId | null;
  /** The brick being inspected (its tile is hovered or focused), and a way to inspect a placed brick. */
  inspect?: LegoId | null;
  onInspect?: (id: LegoId | null) => void;
};

type Tip = { id: LegoId; x: number; top: number; bottom: number };

const TIP_ID = "brick-tip";
const HOVER_DELAY = 320;
const LONG_PRESS = 450;
const EDGE = 16;

const Check = () => (
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
    <path d="M2.5 6.4l2.2 2.2 4.8-5.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/**
 * Where a brick sits on the tray's stud scale, in studs: the whole sprite's width, the front face's
 * left and right edges inside it, and how many 3-stud cells it needs (1, or 2 for a hero or anything
 * wider than a 2x2 with its side face).
 */
function geometry(lego: Lego): { sw: number; fl: number; fr: number; span: 1 | 2 } {
  const meta = SPRITE_META[lego.id];
  const k = SPRITE_DPR * SPRITE_STUD_PX;
  const [w, d] = lego.size;
  const sw = meta ? meta.width / k : w + 0.6 * d;
  const [fl, fr] = meta?.front ? [meta.front[0] / k, meta.front[1] / k] : [0, w];
  const span = lego.tier === "hero" || sw - fl > 3.4 ? 2 : 1;
  return { sw, fl, fr, span };
}

/** The brick picture: the baked sprite, or a drawn brick with its verb until the sprite exists. */
function BrickArtFor({ lego }: { lego: Lego }) {
  if (SPRITE_META[lego.id]) {
    return <BrickSprite id={lego.id} color={lego.brick.hex} size={lego.size} className={styles.sprite} />;
  }
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

/** Tooltip box after clamping to the viewport: flips below when there is no room above. */
function TipBox({ tip, lego }: { tip: Tip; lego: Lego }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(tip.x - w / 2, EDGE), Math.max(EDGE, vw - w - EDGE));
    const above = tip.top - h - 8 >= EDGE || tip.bottom + h + 8 > vh - EDGE;
    const top = above ? Math.max(EDGE, tip.top - h - 8) : tip.bottom + 8;
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.dataset.side = above ? "top" : "bottom";
    el.style.visibility = "visible";
  }, [tip]);
  return (
    <div ref={ref} id={TIP_ID} role="tooltip" className={styles.tip} style={{ visibility: "hidden" }}>
      <span className={styles.tipHead}>
        <span className={styles.tipName}>{lego.name}</span>
        <span className={styles.tipChip} data-kind={lego.statusKind}>
          {statusChip(lego)}
        </span>
      </span>
      <span className={styles.tipTag}>{lego.tag}</span>
      {lego.note && <span className={styles.tipNote}>{lego.note}</span>}
    </div>
  );
}

/**
 * The brick bin on one stud scale: the 5 hero 2x4s always on top (dimmed when a filter leaves them
 * out), then the rest on a true stud grid. Bricks are buttons (one Tab stop, arrow keys move, Enter
 * adds); name, tag and status show in a tooltip on hover, keyboard focus or a long press. Category
 * chips come after the bricks in tab order (shown above them) and are one Tab stop too.
 */
export default function Tray({ ids, onToggle, onPointerDown, wasDrag, dragging, inspect = null, onInspect }: TrayProps) {
  const [filter, setFilter] = useState<Category | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [focusId, setFocusId] = useState<LegoId | null>(null);
  const [chipFocus, setChipFocus] = useState<Category | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const pressTimer = useRef<number | undefined>(undefined);
  const longPressed = useRef(false);

  const match = (l: Lego) => filter === null || l.category === filter;
  const more = MORE_LEGOS.filter(match);
  const visible = [...HERO_LEGOS, ...more];
  const tabId = focusId && visible.some((l) => l.id === focusId) ? focusId : visible[0]?.id;
  const chipTab = chipFocus ?? filter ?? CATEGORIES[0];

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
    // Scrolling only drops the open tooltip; a hover that is about to open one still may.
    const drop = () => setTip(null);
    const sc = scrollRef.current;
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", hideTip);
    window.addEventListener("scroll", drop, { passive: true });
    sc?.addEventListener("scroll", drop, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", hideTip);
      window.removeEventListener("scroll", drop);
      sc?.removeEventListener("scroll", drop);
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

  const onChipKey = (e: ReactKeyboardEvent<HTMLButtonElement>, i: number) => {
    let j: number;
    if (e.key === "ArrowRight") j = (i + 1) % CATEGORIES.length;
    else if (e.key === "ArrowLeft") j = (i - 1 + CATEGORIES.length) % CATEGORIES.length;
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = CATEGORIES.length - 1;
    else return;
    e.preventDefault();
    setChipFocus(CATEGORIES[j]!);
    const el = rootRef.current?.querySelectorAll<HTMLButtonElement>("button[data-chip]")[j];
    el?.focus();
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };

  const item = (lego: Lego) => {
    const placed = ids.includes(lego.id);
    const hero = lego.tier === "hero";
    const dim = hero && !match(lego);
    const g = geometry(lego);
    return (
      <li key={lego.id} className={styles.cell} data-span={g.span > 1 ? g.span : undefined} data-hero={hero || undefined}>
        <button
          type="button"
          className={styles.brick}
          aria-pressed={placed}
          aria-label={`${lego.verb}, ${lego.name}${placed ? ", on board" : ""}`}
          aria-describedby={tip?.id === lego.id ? TIP_ID : undefined}
          tabIndex={lego.id === tabId ? 0 : -1}
          data-lego={lego.id}
          data-placed={placed || undefined}
          data-dim={dim || undefined}
          data-inspect={(placed && inspect === lego.id) || undefined}
          data-dragging={dragging === lego.id || undefined}
          style={{ "--sw": g.sw.toFixed(3), "--fl": g.fl.toFixed(3), "--fr": g.fr.toFixed(3) } as CSSProperties}
          onKeyDown={onKeyDown}
          onFocus={(e) => {
            setFocusId(lego.id);
            if (placed) onInspect?.(lego.id);
            if (e.currentTarget.matches(":focus-visible")) showTip(lego.id, e.currentTarget);
          }}
          onBlur={() => {
            hideTip();
            if (placed) onInspect?.(null);
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            if (placed) onInspect?.(lego.id);
            window.clearTimeout(hoverTimer.current);
            hoverTimer.current = window.setTimeout(() => showTip(lego.id, el), tip ? 0 : HOVER_DELAY);
          }}
          onMouseLeave={() => {
            hideTip();
            if (placed) onInspect?.(null);
          }}
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
            {placed && (
              <span className={styles.check} aria-hidden="true" data-testid="placed-check">
                <Check />
              </span>
            )}
          </span>
        </button>
      </li>
    );
  };

  const tipLego = tip ? visible.find((l) => l.id === tip.id) : undefined;

  return (
    <section ref={rootRef} className={styles.tray} aria-labelledby="tray-h">
      <h2 id="tray-h" className="visually-hidden">
        Bricks
      </h2>
      <div ref={scrollRef} className={styles.scroll} data-testid="tray-scroll">
        <ul className={styles.grid} aria-label={filter ? `${filter} bricks` : "Bricks"}>
          {HERO_LEGOS.map(item)}
          {more.map(item)}
        </ul>
      </div>
      <div className={styles.chipsWrap}>
        <div className={styles.chips} role="group" aria-label="Filter bricks">
          {CATEGORIES.map((c, i) => (
            <button
              key={c}
              type="button"
              className={styles.chip}
              aria-pressed={filter === c}
              tabIndex={c === chipTab ? 0 : -1}
              data-chip={c}
              onKeyDown={(e) => onChipKey(e, i)}
              onFocus={() => setChipFocus(c)}
              onClick={() => {
                setFilter((f) => (f === c ? null : c));
                hideTip();
                scrollRef.current?.scrollTo({ top: 0 });
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {tip && tipLego && <TipBox tip={tip} lego={tipLego} />}
    </section>
  );
}
