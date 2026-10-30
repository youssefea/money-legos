import { DIM } from "./dims";
import { GHOST_SIZE, levelY, slotNumber, type V3 } from "./layout";

/** 2D affine transform (SVG matrix order a b c d e f) mapping plane mm (u along +X, v along +Z) to screen px. */
export type Affine = [number, number, number, number, number, number];

/** The "next slot" marker in screen space, ready for the SVG overlay. */
export type GhostGeom = {
  slot: number;
  /** Visible dashed edges of the slot box, as polylines. */
  edges: [number, number][][];
  /** Flat stud rings on the slot top. */
  studs: Affine[];
  /** Flat number badge above the stud grid. */
  badge: Affine;
};

export type Project = (p: V3) => [number, number];

function affineAt(c: V3, project: Project): Affine {
  const o = project(c);
  const u = project([c[0] + 1, c[1], c[2]]);
  const v = project([c[0], c[1], c[2] + 1]);
  return [u[0] - o[0], u[1] - o[1], v[0] - o[0], v[1] - o[1], o[0], o[1]];
}

/** Builds the ghost for a stack level (plates) with any projector (3D camera or the SVG orthographic one). */
export function ghostGeom(level: number, project: Project): GhostGeom {
  const [w, d] = GHOST_SIZE;
  const W = w * DIM.pitch - DIM.gap;
  const D = d * DIM.pitch - DIM.gap;
  const H = DIM.plate * 3;
  const y0 = levelY(level);
  const y1 = y0 + H;
  const x0 = -W / 2;
  const x1 = W / 2;
  const z0 = -D / 2;
  const z1 = D / 2;
  const P = (x: number, y: number, z: number) => project([x, y, z]);
  const edges: [number, number][][] = [
    [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1), P(x0, y1, z0)],
    [P(x0, y1, z1), P(x0, y0, z1), P(x1, y0, z1), P(x1, y0, z0), P(x1, y1, z0)],
    [P(x1, y1, z1), P(x1, y0, z1)],
  ];
  const studs: Affine[] = [];
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < d; j++) {
      studs.push(affineAt([(i + 0.5) * DIM.pitch - (w * DIM.pitch) / 2, y1, (j + 0.5) * DIM.pitch - (d * DIM.pitch) / 2], project));
    }
  }
  return { slot: slotNumber(level), edges, studs, badge: affineAt([0, y1 + DIM.studH + 0.6, 0], project) };
}
