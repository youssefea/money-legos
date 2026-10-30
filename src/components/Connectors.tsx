"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { BY_ID, type LegoId } from "@/lib";
import type { StageLayout } from "./StageView";
import styles from "./Connectors.module.css";

export type ConnectorsProps = {
  /** The element the overlay covers (the three columns). */
  hostRef: RefObject<HTMLElement | null>;
  /** Stack, bottom brick first. */
  ids: readonly LegoId[];
  layout: StageLayout | null;
  /** Fake-app tiles by Lego id. */
  tiles: RefObject<Map<string, HTMLElement>>;
  dark: boolean;
};

type Line = { id: LegoId; d: string; x0: number; y0: number; x1: number; y1: number; color: string };

/** Line colour per brick: the brick hex, nudged where it would vanish on the page. */
function lineColor(id: LegoId, dark: boolean): string {
  const c = BY_ID[id].brick;
  if (dark) return c.id === "issue" ? "#3C8AFF" : c.id === "gray-dark" ? "#B1B7C3" : c.hex;
  return c.id === "white" || c.id === "gray-light" ? "#B1B7C3" : c.hex;
}

/**
 * Dotted curved lines from each brick on the board to the fake-app tile it made (top brick to top
 * tile, so lines never cross). Redrawn on resize, scroll and every layout report; decorative.
 */
export default function Connectors({ hostRef, ids, layout, tiles, dark }: ConnectorsProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [box, setBox] = useState<[number, number]>([0, 0]);
  const raf = useRef(0);
  const measureRef = useRef<() => void>(() => {});
  const lastKey = useRef("");

  useLayoutEffect(() => {
    measureRef.current = () => {
      const host = hostRef.current;
      if (!host || !layout || !layout.items.length || window.innerWidth < 1024) {
        lastKey.current = "";
        setLines((l) => (l.length ? [] : l));
        return;
      }
      const hr = host.getBoundingClientRect();
      const sr = layout.el.getBoundingClientRect();
      const byId = new Map(layout.items.map((it) => [it.id, it]));
      const starts = ids.map((id) => {
        const it = byId.get(id);
        if (!it) return null;
        return { id, x: sr.left - hr.left + (it.cx + it.w / 2) * sr.width, y: sr.top - hr.top + it.cy * sr.height };
      });
      const rightMost = Math.max(...starts.map((s) => s?.x ?? 0)) + 12;
      const out: Line[] = [];
      for (const s of starts) {
        if (!s) continue;
        const tile = tiles.current?.get(s.id);
        if (!tile) continue;
        const tr = tile.getBoundingClientRect();
        const x1 = tr.left - hr.left;
        const y1 = tr.top - hr.top + tr.height / 2;
        const x0 = s.x + 4;
        const k = Math.max(24, (x1 - rightMost) * 0.5);
        const d = `M${x0.toFixed(1)} ${s.y.toFixed(1)} H${rightMost.toFixed(1)} C${(rightMost + k).toFixed(1)} ${s.y.toFixed(1)} ${(x1 - k).toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
        out.push({ id: s.id, d, x0, y0: s.y, x1, y1, color: lineColor(s.id, dark) });
      }
      // Only re-render when something moved (this runs after every render).
      const key = `${Math.round(hr.width)}x${Math.round(hr.height)}|` + out.map((l) => l.id + l.d + l.color).join("|");
      if (key === lastKey.current) return;
      lastKey.current = key;
      setBox([hr.width, hr.height]);
      setLines(out);
    };
  });

  // Measure after every render (tiles and layout may have moved), and on resize, scroll and when a tile settles.
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => measureRef.current());
  });
  useEffect(() => {
    const host = hostRef.current;
    const schedule = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => measureRef.current());
    };
    const ro = new ResizeObserver(schedule);
    if (host) ro.observe(host);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    host?.addEventListener("animationend", schedule);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      host?.removeEventListener("animationend", schedule);
      cancelAnimationFrame(raf.current);
    };
  }, [hostRef]);

  if (!lines.length) return null;
  return (
    <svg className={styles.overlay} width={box[0]} height={box[1]} viewBox={`0 0 ${box[0]} ${box[1]}`} aria-hidden="true" focusable="false" data-testid="connectors">
      <defs>
        {lines.map((l) => (
          <mask key={l.id} id={`cm-${l.id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={box[0]} height={box[1]}>
            <path className={styles.draw} d={l.d} pathLength={1} fill="none" stroke="#fff" strokeWidth="8" />
          </mask>
        ))}
      </defs>
      {lines.map((l) => (
        <g key={l.id} mask={`url(#cm-${l.id})`} data-line={l.id}>
          <path d={l.d} fill="none" stroke={l.color} strokeWidth="2" strokeLinecap="round" strokeDasharray="0 6" />
          <circle cx={l.x0} cy={l.y0} r="3" fill={l.color} />
          <circle cx={l.x1} cy={l.y1} r="3.5" fill={l.color} />
        </g>
      ))}
    </svg>
  );
}
