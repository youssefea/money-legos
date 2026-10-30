import { DIM } from "./dims";
import { GHOST_SIZE, levelY, slotNumber, type V3 } from "./layout";

/** The "next slot" marker in screen space, ready for the SVG overlay. */
export type GhostGeom = {
  slot: number;
  /** Outer silhouette of the slot's brick body (convex hull of its box), screen coordinates. */
  outline: [number, number][];
  /** Centre of the silhouette, where the upright numeral sits. */
  centre: [number, number];
  /** Screen-space bounds of the silhouette. */
  bounds: { x: number; y: number; width: number; height: number };
};

/** The ghost slot's box in the stage's own CSS px, for anchoring UI (e.g. a "Start here" pill). */
export type GhostRect = { slot: number; x: number; y: number; width: number; height: number };

export type Project = (p: V3) => [number, number];

/** Convex hull (monotone chain), clockwise in screen space. */
export function hull(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: [number, number][] = [];
  const up: [number, number][] = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of p.reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2]!, up[up.length - 1]!, q) <= 0) up.pop();
    up.push(q);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

/** Builds the ghost for a stack level (plates) with any projector (3D camera or the SVG orthographic one). */
export function ghostGeom(level: number, project: Project): GhostGeom {
  const [w, d] = GHOST_SIZE;
  const W = w * DIM.pitch - DIM.gap;
  const D = d * DIM.pitch - DIM.gap;
  const y0 = levelY(level);
  const y1 = y0 + DIM.plate * 3;
  const pts: [number, number][] = [];
  for (const x of [-W / 2, W / 2]) for (const y of [y0, y1]) for (const z of [-D / 2, D / 2]) pts.push(project([x, y, z]));
  const outline = hull(pts);
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;
  // Numeral at the centre of the slot's volume, lifted a little clear of the studs below.
  const centre = project([0, y0 + (y1 - y0) * 0.62, 0]);
  return { slot: slotNumber(level), outline, centre, bounds: { x, y, width, height } };
}
