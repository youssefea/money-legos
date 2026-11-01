"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import { BY_ID, type LegoId } from "@/lib";
import type { StageLayout } from "./StageView";
import styles from "./Connectors.module.css";

export type ConnectorsProps = {
  /** The element the overlay covers (the three columns). */
  hostRef: RefObject<HTMLElement | null>;
  /** Stack, bottom brick first. */
  ids: readonly LegoId[];
  layout: StageLayout | null;
  /** Fake-app screen regions by brick id. */
  tiles: RefObject<Map<string, HTMLElement>>;
  dark: boolean;
  /** Bumps on Build: every line draws again after its tile lands. */
  boot: number;
  /** The inspected brick: its line goes solid and its brick gets a ring; the rest step back. */
  inspect: LegoId | null;
  /** The Build boot is playing (paced for a room): lines wait for their tiles. */
  play?: boolean;
};

type Line = { id: LegoId; d: string; x0: number; y0: number; x1: number; y1: number; color: string; order: number };
type Ring = { x: number; y: number; w: number; h: number; hull: [number, number][] | null };

/** Pale bricks would vanish as a dotted line on a light page (under 3:1): they use Gray 60. */
const PALE_LIGHT = new Set(["white", "gray-light", "gray", "lime", "grow", "trade", "speed", "tan"]);

function lineColor(id: LegoId, dark: boolean): string {
  const c = BY_ID[id].brick;
  if (dark) return c.id === "issue" ? "#3C8AFF" : c.id === "gray-dark" ? "#B1B7C3" : c.hex;
  return PALE_LIGHT.has(c.id) ? "#5B616E" : c.hex;
}

/**
 * Dotted curved lines from each brick on the board to the region it fills on the fake-app screen.
 * Regions follow the screen's order (balance first), not the stack's, so lines may cross: gentle
 * S-curves with horizontal tangents, one lane each, ending in a disc at the region's left edge. They
 * draw top to bottom just after their region lands. Redrawn on resize, scroll and every layout
 * report; decorative.
 */
export default function Connectors({ hostRef, ids, layout, tiles, dark, boot, inspect, play }: ConnectorsProps) {
  const [lines, setLines] = useState<Line[]>([]);
  const [rings, setRings] = useState<Map<string, Ring>>(new Map());
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
      const ring = new Map<string, Ring>();
      const starts = ids.map((id) => {
        const it = byId.get(id);
        if (!it) return null;
        const ox = sr.left - hr.left;
        const oy = sr.top - hr.top;
        const hull = it.hull && it.hull.length >= 3 ? it.hull.map(([x, y]): [number, number] => [ox + x * sr.width, oy + y * sr.height]) : null;
        ring.set(id, { x: ox + (it.cx - it.w / 2) * sr.width, y: oy + (it.cy - it.h / 2) * sr.height, w: it.w * sr.width, h: it.h * sr.height, hull });
        // Start on the brick's right side face (just past the front face), not across the label.
        return { id, x: sr.left - hr.left + (it.cx + it.w / 2) * sr.width + it.h * sr.height * 0.35, y: sr.top - hr.top + it.cy * sr.height };
      });
      const rightMost = Math.max(...starts.map((s) => s?.x ?? 0)) + 12;
      // Each line ends on its region's left edge, level with the region's first line of text.
      const ends: { id: LegoId; x: number; y: number; y0: number; x0: number }[] = [];
      for (const st of starts) {
        if (!st) continue;
        const el = tiles.current?.get(st.id);
        if (!el || !el.isConnected) continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const screen = el.closest<HTMLElement>("[data-screen]")?.getBoundingClientRect();
        const cy = r.top + Math.min(r.height / 2, 26);
        // A region outside the screen (hidden by the fit) has no line.
        if (screen && (cy < screen.top || cy > screen.bottom || r.left > screen.right)) continue;
        const left = Math.max(r.left, screen ? screen.left + 6 : r.left);
        ends.push({ id: st.id, x: left - hr.left - 7, y: cy - hr.top, x0: st.x, y0: st.y });
      }
      // Draw-on order and lanes follow the screen, top to bottom; each line bends in its own lane so
      // lines that must cross do it once, in the open gap, with even spacing.
      ends.sort((p, q) => p.y - q.y);
      const out: Line[] = ends.map((e, j) => {
        const n = ends.length;
        const gap = Math.max(40, e.x - rightMost);
        const lane = n > 1 ? (j - (n - 1) / 2) * Math.min(10, gap / (n * 4)) : 0;
        const bend = rightMost + lane;
        const k = Math.max(20, (e.x - bend) * 0.5);
        const d = `M${e.x0.toFixed(1)} ${e.y0.toFixed(1)} H${bend.toFixed(1)} C${(bend + k).toFixed(1)} ${e.y0.toFixed(1)} ${(e.x - k).toFixed(1)} ${e.y.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`;
        return { id: e.id, d, x0: e.x0, y0: e.y0, x1: e.x, y1: e.y, color: lineColor(e.id, dark), order: j };
      });
      // Only re-render when something moved (this runs after every render).
      const key =
        `${Math.round(hr.width)}x${Math.round(hr.height)}|` +
        out.map((l) => l.id + l.d + l.color).join("|") +
        "|" +
        [...ring.values()].map((r) => (r.hull ? r.hull.map((p) => p.map(Math.round).join(",")).join(" ") : "")).join("|");
      if (key === lastKey.current) return;
      lastKey.current = key;
      setBox([hr.width, hr.height]);
      setLines(out);
      setRings(ring);
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
  const ring = inspect ? rings.get(inspect) : undefined;
  // The outline is the brick's full silhouette; the bricks stacked above hide part of it (its top
  // face), so mask those out: the outline only traces what you can see.
  const above = inspect && ring?.hull ? ids.slice(ids.indexOf(inspect) + 1).map((id) => rings.get(id)?.hull).filter((h): h is [number, number][] => !!h) : [];
  const pts = (h: [number, number][]) => h.map((p) => p.map((n) => n.toFixed(1)).join(",")).join(" ");
  return (
    <svg
      className={styles.overlay}
      width={box[0]}
      height={box[1]}
      viewBox={`0 0 ${box[0]} ${box[1]}`}
      aria-hidden="true"
      focusable="false"
      data-testid="connectors"
      data-layout={layout?.estimated ? "estimated" : "stage"}
      data-inspect={inspect ?? undefined}
      data-boot={play || undefined}
    >
      <defs>
        {above.length > 0 && (
          <mask id="ring-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={box[0]} height={box[1]}>
            <rect x="0" y="0" width={box[0]} height={box[1]} fill="#fff" />
            {above.map((h, i) => (
              <polygon key={i} points={pts(h)} fill="#000" />
            ))}
          </mask>
        )}
        {lines.map((l) => (
          <mask key={`${l.id}-${boot}`} id={`cm-${l.id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={box[0]} height={box[1]}>
            <path className={styles.draw} d={l.d} pathLength={1} fill="none" stroke="#fff" strokeWidth="12" style={{ "--o": l.order } as CSSProperties} />
          </mask>
        ))}
      </defs>
      {lines.map((l) => {
        const on = inspect === l.id;
        return (
          <g key={`${l.id}-${boot}`} mask={`url(#cm-${l.id})`} data-line={l.id} data-on={on || undefined} className={styles.line} data-dim={(inspect && !on) || undefined}>
            <path d={l.d} fill="none" stroke={l.color} strokeWidth={on ? 3 : l.color === "#66C800" ? 3 : 2.5} strokeLinecap="round" strokeDasharray={on ? undefined : l.color === "#66C800" ? "0 4" : "0 5"} />
            <circle cx={l.x0} cy={l.y0} r="3" fill={l.color} />
            <circle cx={l.x1} cy={l.y1} r="4.5" fill={l.color} stroke={dark ? "#0A0B0D" : "#FFFFFF"} strokeWidth="2" />
          </g>
        );
      })}
      {ring &&
        (ring.hull ? (
          <g mask={above.length ? "url(#ring-mask)" : undefined}>
            {/* A halo under the line so the outline reads on a brick of the same blue. */}
            <polygon className={styles.halo} points={pts(ring.hull)} fill="none" strokeWidth="6" strokeLinejoin="round" />
            <polygon className={styles.ring} points={pts(ring.hull)} fill="none" strokeWidth="2.5" strokeLinejoin="round" data-testid="brick-ring" data-shape="hull" />
          </g>
        ) : (
          <rect className={styles.ring} x={ring.x - 4} y={ring.y - 4} width={ring.w + 8} height={ring.h + 8} rx="8" fill="none" strokeWidth="2" data-testid="brick-ring" data-shape="rect" />
        ))}
    </svg>
  );
}
