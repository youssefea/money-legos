import type { PlacedBrick } from "@/lib/contract";
import { PLATES_PER_BRICK } from "@/lib/bricks";
import { BASEPLATE_TOP, DIM } from "./dims";

export type V3 = [number, number, number];

/**
 * Camera direction shared by the 3D board, the baked sprites and the SVG fallback,
 * so all three show the bricks from the same angle: front face (where the label is) towards
 * the viewer, a little of the right side and enough of the top to read the studs.
 */
export const VIEW: V3 = [0.5, 0.62, 1.2];
/** Long lens (vertical field of view in degrees): close to product photography, little distortion. */
export const FOV = 20;

/** Baseplate size in studs. Even, so a centred 2x4 or 2x2 lands on the stud grid. */
export const BASEPLATE: [number, number] = [8, 8];
/** Most bricks a stack can hold (the board frames for this height so it never re-zooms). */
export const MAX_STACK = 4;
/** Footprint drawn for the ghost "next slot" (a hero 2x4). */
export const GHOST_SIZE: [number, number] = [4, 2];

export const BOARD = {
  light: { baseplate: "#DEE1E7", floor: "#EEF0F3", ghost: "#5B616E", ghostInk: "#FFFFFF", page: "#FFFFFF" },
  dark: { baseplate: "#32353D", floor: "#32353D", ghost: "#B1B7C3", ghostInk: "#0A0B0D", page: "#0A0B0D" },
} as const;

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
 * Where a placed brick sits: centred on the baseplate, `level` plates up, with a deterministic
 * sub-0.3 mm misalignment per brick id (corner displacement included).
 */
export function poseFor(b: PlacedBrick): BrickPose {
  const yaw = jitter(b.id, 3) * 0.0035;
  const halfDiag = (Math.hypot(b.size[0], b.size[1]) * DIM.pitch) / 2;
  const room = Math.max(0, 0.28 - Math.abs(yaw) * halfDiag);
  return {
    x: jitter(b.id, 1) * room * 0.7,
    z: jitter(b.id, 2) * room * 0.7,
    y: levelY(b.level),
    yaw,
    height: pieceHeight(b.kind),
  };
}

/** Slot number (1-based) shown on the ghost for a stack level in plates. */
export function slotNumber(level: number): number {
  return Math.round(level / PLATES_PER_BRICK) + 1;
}

/** World-space box the camera keeps in frame: the baseplate plus a full stack and its ghost label. */
export function frameBox(): { min: V3; max: V3 } {
  const hx = (BASEPLATE[0] * DIM.pitch) / 2;
  const hz = (BASEPLATE[1] * DIM.pitch) / 2;
  const top = levelY(MAX_STACK * PLATES_PER_BRICK) - DIM.stackGap + DIM.studH;
  return { min: [-hx, 0, -hz], max: [hx, top, hz] };
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
