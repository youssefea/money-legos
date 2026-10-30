import { VIEW, type V3 } from "../core/layout";

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
