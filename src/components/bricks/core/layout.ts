import type { BrickLayoutItem, PlacedBrick } from "@/lib/contract";
import { PLATES_PER_BRICK } from "@/lib/bricks";
import { BASEPLATE_TOP, DIM } from "./dims";

export type V3 = [number, number, number];

/** Camera pitch (elevation above the table) and azimuth (turn towards the right side), degrees. */
export const CAMERA = { pitch: 28, azimuth: 32 } as const;

/**
 * Camera direction shared by the 3D board, the baked sprites and the SVG fallback,
 * so all three show the bricks from the same angle: front face (where the label is) towards
 * the viewer, some of the right side and enough of the top to read the studs.
 */
export const VIEW: V3 = viewDir(CAMERA);

/**
 * Tray sprites use a more front-on hero view than the board (24° up, 12° round): the printed label
 * slopes under 5° and reads at a glance in a small tile. The board keeps CAMERA (28°/32°) so the stack
 * shows its depth; the two angles differ on purpose, for legibility.
 */
export const TRAY_CAMERA = { pitch: 24, azimuth: 12 } as const;
export const TRAY_VIEW: V3 = viewDir(TRAY_CAMERA);

function viewDir({ pitch, azimuth }: { pitch: number; azimuth: number }): V3 {
  const p = (pitch * Math.PI) / 180;
  const a = (azimuth * Math.PI) / 180;
  return [Math.sin(a) * Math.cos(p), Math.sin(p), Math.cos(a) * Math.cos(p)];
}
/** Long lens (vertical field of view in degrees): close to product photography, little distortion. */
export const FOV = 20;

/** Baseplate size in studs. Even, so a centred 2x4 or 2x2 lands on the stud grid. */
export const BASEPLATE: [number, number] = [8, 8];
/** Most bricks a stack can hold (the board frames for this height so it never re-zooms). */
export const MAX_STACK = 4;
/** Footprint drawn for the ghost "next slot" (a hero 2x4). */
export const GHOST_SIZE: [number, number] = [4, 2];

export const BOARD = {
  /** `ghostNext` marks the first empty slot of an empty board (slot 1), `ghost` every later one. */
  light: { baseplate: "#DEE1E7", floor: "#EEF0F3", ghost: "#5B616E", ghostNext: "#0000FF", page: "#FFFFFF" },
  dark: { baseplate: "#32353D", floor: "#32353D", ghost: "#B1B7C3", ghostNext: "#3C8AFF", page: "#0A0B0D" },
} as const;

/**
 * Board framing. The camera (and the SVG fallback's view box) scales so the baseplate spans
 * `plateFill` of the container width, keeping at least `side` px clear at each side (capped at
 * `sideMax` of the width, so a 144 px phone scene still gets a ~120 px plate), unless the full
 * 4-brick tower would then not fit: it is kept inside `maxH` of the height and `maxW` of the width,
 * so the board never re-zooms as bricks are added.
 * Then the visual mass (the plate plus the stack and its ghost slot, see `massBox`) is centred in the
 * container and lifted by `bias` of the container height, so an empty board does not sit low under
 * a blank band.
 */
export type Framing = { plateFill: number; maxH: number; maxW: number; side: number; sideMax: number; bias: number };
export const DEFAULT_FRAMING: Framing = { plateFill: 0.97, maxH: 0.96, maxW: 0.98, side: 24, sideMax: 0.083, bias: 0.08 };

/** Fraction of the container width the plate may take, after `plateFill` and the side clearance. */
export function plateFraction(f: Framing, width: number): number {
  if (width <= 0) return f.plateFill;
  const side = Math.min(f.side, f.sideMax * width);
  return Math.min(f.plateFill, 1 - (2 * side) / width);
}

/** FNV-1a: a stable 32-bit hash of a string. */
export function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic value in [-1, 1] for (id, channel). */
export function jitter(id: string, channel: number): number {
  return ((hash32(id + ":" + channel) % 10007) / 10006) * 2 - 1;
}

export type BrickPose = {
  /** Centre of the brick's bottom face, mm. */
  x: number;
  y: number;
  z: number;
  /** Tiny yaw so a stack is never perfectly machine-aligned (radians). */
  yaw: number;
  height: number;
};

/** Height of a piece in mm. */
export function pieceHeight(kind: PlacedBrick["kind"]): number {
  return kind === "plate" ? DIM.plate : DIM.plate * 3;
}

/** Bricks below this level in the stack, used for the hairline gap. */
function gapsBelow(level: number): number {
  return Math.max(0, Math.round(level / PLATES_PER_BRICK));
}

/** Bottom of a piece at `level` (plates above the baseplate), including the stacking hairlines. */
export function levelY(level: number): number {
  return BASEPLATE_TOP + level * DIM.plate + gapsBelow(level) * DIM.stackGap;
}

/**
 * Where a placed brick sits: centred on the baseplate (on the stud grid), `level` plates up, with a deterministic
 * sub-0.3 mm misalignment per brick id (corner displacement included).
 */
export function poseFor(b: PlacedBrick): BrickPose {
  // about ±0.4° of yaw, deterministic per id
  const yaw = jitter(b.id, 3) * 0.007;
  const halfDiag = (Math.hypot(b.size[0], b.size[1]) * DIM.pitch) / 2;
  const room = Math.max(0, 0.28 - Math.abs(yaw) * halfDiag);
  // An odd side shifts half a stud so the studs land on the plate's grid: a 2x3 sits right-flush with
  // a 2x4, a 1-deep brick front-flush with a 2-deep one (the label faces stay in one plane).
  return {
    x: ((b.size[0] % 2) * DIM.pitch) / 2 + jitter(b.id, 1) * room * 0.7,
    z: ((b.size[1] % 2) * DIM.pitch) / 2 + jitter(b.id, 2) * room * 0.7,
    y: levelY(b.level),
    yaw,
    height: pieceHeight(b.kind),
  };
}

/** Slot number (1-based) shown on the ghost for a stack level in plates. */
export function slotNumber(level: number): number {
  return Math.round(level / PLATES_PER_BRICK) + 1;
}

/** The baseplate's eight corners (slab only), the reference for `plateFill`. */
export function plateCorners(): V3[] {
  const hx = (BASEPLATE[0] * DIM.pitch) / 2;
  const hz = (BASEPLATE[1] * DIM.pitch) / 2;
  const out: V3[] = [];
  for (const x of [-hx, hx]) for (const y of [0, BASEPLATE_TOP]) for (const z of [-hz, hz]) out.push([x, y, z]);
  return out;
}

/** World-space box the camera keeps in frame: the baseplate plus a full stack and its ghost label. */
export function frameBox(): { min: V3; max: V3 } {
  const hx = (BASEPLATE[0] * DIM.pitch) / 2;
  const hz = (BASEPLATE[1] * DIM.pitch) / 2;
  const top = levelY(MAX_STACK * PLATES_PER_BRICK) - DIM.stackGap + DIM.studH;
  return { min: [-hx, 0, -hz], max: [hx, top, hz] };
}

/**
 * The part of the board actually on show: the baseplate slab plus the stack up to its top, or up to
 * the ghost slot's top while there is one. Framing centres this box, not the full 4-brick tower.
 */
export function massBox(bricks: readonly PlacedBrick[], nextLevel: number | null): { min: V3; max: V3 } {
  const hx = (BASEPLATE[0] * DIM.pitch) / 2;
  const hz = (BASEPLATE[1] * DIM.pitch) / 2;
  let top = BASEPLATE_TOP + DIM.studH;
  for (const b of bricks) top = Math.max(top, levelY(b.level) + pieceHeight(b.kind) + DIM.studH);
  if (nextLevel !== null) top = Math.max(top, levelY(nextLevel) + pieceHeight("brick"));
  return { min: [-hx, 0, -hz], max: [hx, top, hz] };
}

/** The eight corners of a box. */
export function boxCorners({ min, max }: { min: V3; max: V3 }): V3[] {
  const out: V3[] = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) out.push([x, y, z]);
  return out;
}

/** Accessible summary of the stack, bottom to top. */
export function stackLabel(bricks: readonly PlacedBrick[], nextLevel: number | null): string {
  const sorted = [...bricks].sort((a, b) => a.level - b.level);
  if (sorted.length === 0) return "Empty baseplate. Slot 1 is ready for the first Lego.";
  const names = sorted.map((b) => `${b.label.verb} (${b.label.name})`).join(", ");
  const count = `${sorted.length} ${sorted.length === 1 ? "Lego" : "Legos"}`;
  const next = nextLevel === null ? " The stack is full." : ` Next: slot ${slotNumber(nextLevel)}.`;
  return `Stack of ${count} on the baseplate, bottom to top: ${names}.${next}`;
}

/** Stable display order: bottom to top. */
export function byLevel(bricks: readonly PlacedBrick[]): PlacedBrick[] {
  return [...bricks].sort((a, b) => a.level - b.level);
}

/**
 * Where each brick's front (label) face is on screen, as fractions of a `width` x `height` container
 * (`project` maps world mm to that container's px): cx/cy = centre of the face, w/h = its projected
 * bounding box. The BrickStage `onLayout` payload.
 */
export function brickLayoutItems(bricks: readonly PlacedBrick[], project: (p: V3) => [number, number], width: number, height: number): BrickLayoutItem[] {
  if (width <= 0 || height <= 0) return [];
  return byLevel(bricks).map((b) => {
    const p = poseFor(b);
    const W = b.size[0] * DIM.pitch - DIM.gap;
    const z = p.z + (b.size[1] * DIM.pitch - DIM.gap) / 2;
    const pts = [project([p.x - W / 2, p.y, z]), project([p.x + W / 2, p.y, z]), project([p.x - W / 2, p.y + p.height, z]), project([p.x + W / 2, p.y + p.height, z])];
    const xs = pts.map((q) => q[0]);
    const ys = pts.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const r = (n: number) => Math.round(n * 10000) / 10000;
    return { id: b.id, cx: r((x0 + x1) / 2 / width), cy: r((y0 + y1) / 2 / height), w: r((x1 - x0) / width), h: r((y1 - y0) / height) };
  });
}
