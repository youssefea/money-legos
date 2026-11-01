import type { PlacedBrick } from "./contract";
import { BY_ID, LEGOS, resolveId } from "./legos";
import type { BrickSize, LegoId } from "./types";

/** Height of one brick in plates (a brick is 9.6 mm = 3 plates of 3.2 mm). */
export const PLATES_PER_BRICK = 3;

/**
 * Builds the stack for the board: slot 1 is the bottom brick. Footprints are mixed (2x4, 2x3, 2x2,
 * 1x4, 2x1); the stage centres each brick on the one below. `level` is the height in plates above
 * the baseplate (0, 3, 6, 9). Unknown ids are skipped and aliases resolve to their id.
 */
export function toPlacedBricks(ids: readonly (LegoId | string)[]): PlacedBrick[] {
  const stack: LegoId[] = [];
  for (const raw of ids) {
    const id = resolveId(raw);
    if (id && !stack.includes(id)) stack.push(id);
  }
  return stack.map((legoId, i) => {
    const lego = BY_ID[legoId];
    return {
      id: legoId,
      legoId,
      color: lego.brick.hex,
      labelColor: lego.brick.label,
      size: [lego.size[0], lego.size[1]],
      kind: "brick",
      level: i * PLATES_PER_BRICK,
      label: { verb: lego.verb, name: lego.name },
    };
  });
}

/** Level where the next brick would land, or null when the stack is full (4). */
export function nextLevel(count: number, max = 4): number | null {
  return count >= max ? null : count * PLATES_PER_BRICK;
}

/** One entry per brick for the sprite baker and the tray. */
export type BrickSpec = {
  id: LegoId;
  size: BrickSize;
  color: string;
  labelColor: string;
  verb: string;
  name: string;
  hero: boolean;
};

/** All 39 bricks in tray order, with footprint, colours and the printed verb. */
export const ALL_BRICKS: readonly BrickSpec[] = LEGOS.map((l) => ({
  id: l.id,
  size: [l.size[0], l.size[1]] as BrickSize,
  color: l.brick.hex,
  labelColor: l.brick.label,
  verb: l.verb,
  name: l.name,
  hero: l.tier === "hero",
}));

/** Footprint that fits every brick in a stack, [w, d] in studs (for framing a mixed tower). */
export function stackFootprint(bricks: readonly Pick<PlacedBrick, "size">[]): [number, number] {
  let w = 0;
  let d = 0;
  for (const b of bricks) {
    w = Math.max(w, b.size[0]);
    d = Math.max(d, b.size[1]);
  }
  return [w, d];
}
