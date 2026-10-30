import { DIM } from "./dims";
import { GHOST_SIZE, levelY, slotNumber, type V3 } from "./layout";

type Pt = [number, number];

/** The "next slot" marker in screen space, ready for the SVG overlay: a see-through brick volume. */
export type GhostGeom = {
  slot: number;
  /** Footprint in studs [w, d] of the volume drawn. */
  size: [number, number];
  /** Outer silhouette of the slot's brick body (convex hull of its box), screen coordinates. */
  outline: Pt[];
  /** The visible top face (the lid of the volume), drawn a touch denser than the body. */
  top: Pt[];
  /** The three inner edges where the visible faces meet (top/front, top/right, front/right). */
  edges: [Pt, Pt][];
  /** Centre of the front face, where the upright numeral sits. */
  centre: Pt;
  /** Screen-space bounds of the silhouette. */
  bounds: { x: number; y: number; width: number; height: number };
};

/** The ghost slot's box in the stage's own CSS px, for anchoring UI (e.g. a caption), and its footprint. */
export type GhostRect = { slot: number; x: number; y: number; width: number; height: number; size: [number, number] };

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

/**
 * Builds the ghost for a stack level (plates) with any projector (3D camera or the SVG orthographic one):
 * a brick-high volume of `size` studs (the next brick's footprint when known, else a 2x4) standing ON the
 * stack, on the same stud grid a real brick of that size would use (odd sides shift half a stud).
 */
export function ghostGeom(level: number, project: Project, size: [number, number] = GHOST_SIZE): GhostGeom {
  const [w, d] = size;
  const W = w * DIM.pitch - DIM.gap;
  const D = d * DIM.pitch - DIM.gap;
  const ox = ((w % 2) * DIM.pitch) / 2, oz = ((d % 2) * DIM.pitch) / 2;
  const x0 = ox - W / 2, x1 = ox + W / 2, z0 = oz - D / 2, z1 = oz + D / 2;
  const y0 = levelY(level);
  const y1 = y0 + DIM.plate * 3;
  const pts: Pt[] = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) pts.push(project([x, y, z]));
  const outline = hull(pts);
  const xs = outline.map((p) => p[0]);
  const ys = outline.map((p) => p[1]);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  const width = Math.max(...xs) - x;
  const height = Math.max(...ys) - y;
  const top = [project([x0, y1, z0]), project([x1, y1, z0]), project([x1, y1, z1]), project([x0, y1, z1])];
  // The near top corner (front right) joins the three visible faces.
  const near = project([x1, y1, z1]);
  const edges: [Pt, Pt][] = [
    [project([x0, y1, z1]), near],
    [project([x1, y1, z0]), near],
    [near, project([x1, y0, z1])],
  ];
  const centre = project([ox, (y0 + y1) / 2, z1]);
  return { slot: slotNumber(level), size: [w, d], outline, top, edges, centre, bounds: { x, y, width, height } };
}
