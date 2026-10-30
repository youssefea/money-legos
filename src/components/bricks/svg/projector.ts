import { DEFAULT_FRAMING, VIEW, boxCorners, frameBox, plateCorners, plateFraction, type Framing, type V3 } from "../core/layout";

/** Orthographic projector for the SVG fallback, looking along the same VIEW as the 3D camera. */
type Basis = { right: V3; up: V3; dir: V3 };

const norm = (v: V3): V3 => {
  const l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const basis: Basis = (() => {
  const dir = norm(VIEW);
  const f: V3 = [-dir[0], -dir[1], -dir[2]];
  const right = norm(cross(f, [0, 1, 0]));
  const up = cross(right, f);
  return { right, up, dir };
})();

/** World mm -> SVG user units (1 unit = 1 mm on screen), y down. */
export function project(p: V3): [number, number] {
  return [dot(p, basis.right), -dot(p, basis.up)];
}

/** Larger = closer to the viewer. */
export function depth(p: V3): number {
  return dot(p, basis.dir);
}

/** Projected extents (mm) of the board box (plate + full tower) and of the plate alone. */
export const EXTENTS = (() => {
  const ext = (pts: V3[]) => {
    const p = pts.map(project);
    const xs = p.map((q) => q[0]);
    const ys = p.map((q) => q[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  const { min, max } = frameBox();
  const box: V3[] = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) box.push([x, y, z]);
  return { box: ext(box), plate: ext(plateCorners()) };
})();

export type ViewBox = { x: number; y: number; w: number; h: number; scale: number };

/** Projected extents (mm) of any world box. */
export function extentOf(box: { min: V3; max: V3 }) {
  const p = boxCorners(box).map(project);
  const xs = p.map((q) => q[0]);
  const ys = p.map((q) => q[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

/**
 * Same framing rule as the 3D camera, for a container of cw x ch px: scale from the plate and the full
 * tower, then centre the board box (plate + full tower) lifted by `framing.bias`. It never depends on
 * the stack, so the board never pans as bricks land.
 */
export function svgViewBox(cw: number, ch: number, framing: Framing = DEFAULT_FRAMING): ViewBox {
  const { box, plate } = EXTENTS;
  const bw = box.x1 - box.x0, bh = box.y1 - box.y0;
  if (cw <= 0 || ch <= 0) {
    const m = bw * 0.055;
    return { x: box.x0 - m, y: box.y0 - m, w: bw + 2 * m, h: bh + 2 * m, scale: 0 };
  }
  const scale = Math.min((plateFraction(framing, cw) * cw) / (plate.x1 - plate.x0), (framing.maxH * ch) / bh, (framing.maxW * cw) / bw);
  const w = cw / scale, h = ch / scale;
  const cx = (box.x0 + box.x1) / 2;
  // centre y in view units, lifted by bias * h, clamped so the box stays 0.75% inside the frame
  const want = (box.y0 + box.y1) / 2 + framing.bias * h;
  const cy = Math.min(box.y0 - 0.0075 * h + h / 2, Math.max(box.y1 + 0.0075 * h - h / 2, want));
  return { x: cx - w / 2, y: cy - h / 2, w, h, scale };
}
