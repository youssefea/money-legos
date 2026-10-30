"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { BY_ID, nextLevel, toPlacedBricks, type BrickLayoutItem, type LegoId } from "@/lib";
import { BoardPoster } from "./BrickArt";
import styles from "./StageView.module.css";

// The live 3D board. Client only; the SVG poster below stands in while it loads.
const BrickStage = dynamic(() => import("@/components/bricks/BrickStage"), { ssr: false, loading: () => null });

/** Where the bricks are, as fractions of `el` (see BrickStageProps.onLayout). */
export type StageLayout = { el: HTMLElement; items: BrickLayoutItem[]; estimated: boolean };

export type StageViewProps = {
  ids: readonly LegoId[];
  dark: boolean;
  reducedMotion: boolean;
  /** Bumps on Generate (settle bounce). */
  generation: number;
  lastAdded: LegoId | null;
  /** Mount the live 3D board here (only one instance on the page at a time). */
  live: boolean;
  compact?: boolean;
  className?: string;
  /** Brick positions for connector lines: the stage's own report when it sends one, else an estimate. */
  onLayout?: (layout: StageLayout | null) => void;
  /** Framing readout (top of the stack or ghost as a fraction of the height, plate width in px). */
  onFrame?: (frame: Frame) => void;
  /** Footprint of the brick about to be added (hovered or dragged in the tray): sizes the ghost. */
  ghostSize?: [number, number];
  /**
   * Board bricks as controls: an invisible button over each placed brick. Hover or focus inspects it
   * (its tile and outline light up); click or Enter removes it. On touch the first tap selects, the
   * second removes.
   */
  hits?: { inspect: LegoId | null; onInspect: (id: LegoId | null) => void; onRemove: (id: LegoId) => void };
};

export type Frame = { stackTop: number; platePx: number };

/** Bounding box (fractions) of a layout item: its silhouette when the stage sent one, else the front face. */
export function itemBox(it: BrickLayoutItem): { x: number; y: number; w: number; h: number } {
  if (it.hull && it.hull.length >= 3) {
    const xs = it.hull.map((p) => p[0]);
    const ys = it.hull.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  }
  return { x: it.cx - it.w / 2, y: it.cy - it.h / 2, w: it.w, h: it.h };
}

/**
 * Estimated front-face boxes for a centred stack, from the board camera (28° up, 32° round), until the
 * stage reports real ones. `frame` is BrickStage's framing readout (top of stack or ghost, plate width).
 */
export function estimateLayout(ids: readonly LegoId[], width: number, height: number, frame: Frame | null): BrickLayoutItem[] {
  if (!ids.length || width <= 0 || height <= 0) return [];
  const platePx = frame?.platePx && frame.platePx > 0 ? frame.platePx : Math.min(width * 0.9, height * 1.3);
  const stud = platePx / 11; // an 8-stud plate seen at 32° spans about 11 studs
  const brickH = stud * 1.06; // 9.6 mm at 28° pitch
  const rows = ids.length < 4 ? ids.length + 1 : ids.length; // the ghost slot sits on top
  const topD = ids.length < 4 ? 2 : BY_ID[ids[ids.length - 1]!].size[1];
  const top = frame ? frame.stackTop * height : height * 0.5 - (rows * brickH) / 2;
  const frontTop = top + stud * (0.2 + 0.42 * topD);
  return ids.map((id, i) => {
    const [w, d] = BY_ID[id].size;
    const above = rows - 1 - i;
    const cy = frontTop + (above + 0.5) * brickH;
    const fw = w * stud * 0.85;
    const cx = width / 2 - d * stud * 0.22;
    return { id, cx: cx / width, cy: cy / height, w: fw / width, h: brickH / height };
  });
}

/**
 * The baseplate. Always draws the SVG poster; once the live board renders something visible
 * (a canvas, or its own SVG fallback) the poster fades out. The box size never changes.
 */
export default function StageView({ ids, dark, reducedMotion, generation, lastAdded, live, compact, className, onLayout, onFrame: onFrameOut, ghostSize, hits }: StageViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);
  const [liveVisible, setLiveVisible] = useState(false);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [real, setReal] = useState<BrickLayoutItem[] | null>(null);
  const [size, setSize] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    const el = liveRef.current;
    if (!live || !el) return;
    const check = () => setLiveVisible(!!el.querySelector("canvas, svg, img"));
    const mo = new MutationObserver(check);
    mo.observe(el, { childList: true, subtree: true });
    const raf = requestAnimationFrame(check);
    return () => {
      mo.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [live]);

  const measure = !!(onLayout || hits);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !measure) return;
    const ro = new ResizeObserver(() => setSize([el.clientWidth, el.clientHeight]));
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // Real layout from the stage wins once it matches the stack; otherwise estimate.
  const realOk = !!real && real.length === ids.length && real.every((r, i) => r.id === ids[i]);
  useEffect(() => {
    const el = rootRef.current;
    if (!onLayout || !el) return;
    if (!live) {
      onLayout(null);
      return;
    }
    onLayout(realOk ? { el, items: real!, estimated: false } : { el, items: estimateLayout(ids, size[0], size[1], frame), estimated: true });
  }, [onLayout, live, realOk, real, ids, size, frame]);

  const onFrame = useCallback((f: Frame) => setFrame((p) => (p && p.stackTop === f.stackTop && p.platePx === f.platePx ? p : { stackTop: f.stackTop, platePx: f.platePx })), []);
  const onStageLayout = useCallback((items: BrickLayoutItem[]) => setReal(items.slice()), []);
  useEffect(() => {
    if (frame) onFrameOut?.(frame);
  }, [frame, onFrameOut]);
  const wantsFrame = !!(onLayout || onFrameOut);
  const wantsLayout = !!(onLayout || hits);
  const items = realOk ? real! : estimateLayout(ids, size[0], size[1], frame);

  // Touch: the first tap on a board brick selects it, the second removes it; a tap elsewhere clears.
  const touchSel = useRef<LegoId | null>(null);
  const lastPointer = useRef<string>("mouse");
  const onHitsInspect = hits?.onInspect;
  const selected = hits?.inspect ?? null;
  useEffect(() => {
    if (!onHitsInspect || !selected || touchSel.current !== selected) return;
    const away = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("[data-board-brick]")) {
        touchSel.current = null;
        onHitsInspect(null);
      }
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [onHitsInspect, selected]);

  const bricks = toPlacedBricks(ids);
  const next = nextLevel(ids.length);
  const poster = ids.map((id) => {
    const l = BY_ID[id];
    return { id, color: l.brick.hex, labelColor: l.brick.label, studs: l.size, verb: l.kicker, name: l.title };
  });

  return (
    <div ref={rootRef} className={[styles.stage, compact ? styles.compact : undefined, className].filter(Boolean).join(" ")} data-live={live && liveVisible ? "true" : "false"}>
      <BoardPoster
        className={styles.poster}
        bricks={poster}
        next={next === null ? null : ids.length}
        dark={dark}
        dropId={lastAdded}
        settle={generation}
        dropClassName={styles.drop}
        settleClassName={generation % 2 ? styles.settleA : styles.settleB}
        compact={compact}
        ghostSize={ghostSize}
      />
      {live && (
        <div ref={liveRef} className={styles.live}>
          <BrickStage
            bricks={bricks}
            nextLevel={next}
            dark={dark}
            reducedMotion={reducedMotion}
            settledSignal={generation}
            className={styles.canvas}
            ghostSize={ghostSize}
            onFrame={wantsFrame ? onFrame : undefined}
            onLayout={wantsLayout ? onStageLayout : undefined}
          />
        </div>
      )}
      {hits && live && (
        <div className={styles.hits}>
          {items.map((it) => {
            const id = it.id as LegoId;
            const b = itemBox(it);
            const lego = BY_ID[id];
            if (!lego) return null;
            // The hit area is the brick's silhouette (when the stage sent one), so a brick's studs and
            // top face never steal the pointer from the brick above or below.
            const clip =
              it.hull && it.hull.length >= 3 && b.w > 0 && b.h > 0
                ? `polygon(${it.hull.map(([x, y]) => `${(((x - b.x) / b.w) * 100).toFixed(2)}% ${(((y - b.y) / b.h) * 100).toFixed(2)}%`).join(", ")})`
                : undefined;
            return (
              <button
                key={id}
                type="button"
                className={styles.hit}
                data-board-brick={id}
                data-on={selected === id || undefined}
                aria-label={`${lego.kicker} — remove`}
                style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`, clipPath: clip }}
                onPointerDown={(e) => {
                  lastPointer.current = e.pointerType;
                }}
                onMouseEnter={() => hits.onInspect(id)}
                onMouseLeave={() => {
                  if (touchSel.current !== id) hits.onInspect(null);
                }}
                onFocus={() => hits.onInspect(id)}
                onBlur={() => {
                  if (touchSel.current !== id) hits.onInspect(null);
                }}
                onClick={() => {
                  if (lastPointer.current === "touch" && touchSel.current !== id) {
                    touchSel.current = id;
                    hits.onInspect(id);
                    return;
                  }
                  lastPointer.current = "mouse";
                  touchSel.current = null;
                  hits.onInspect(null);
                  hits.onRemove(id);
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
