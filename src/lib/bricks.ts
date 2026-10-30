import type { PlacedBrick } from "./contract";
import { BY_ID } from "./legos";
import type { LegoId } from "./types";

/** Height of one brick in plates (a brick is 9.6 mm = 3 plates of 3.2 mm). */
export const PLATES_PER_BRICK = 3;

/**
 * Builds the stack for the board: slot 1 is the bottom brick.
 * `level` is the height in plates above the baseplate (0, 3, 6, 9).
 */
export function toPlacedBricks(ids: readonly LegoId[]): PlacedBrick[] {
  return ids.map((legoId, i) => {
    const lego = BY_ID[legoId];
    return {
      id: legoId,
      legoId,
      color: lego.brick.hex,
      labelColor: lego.brick.label,
      size: [lego.size[0], lego.size[1]],
      kind: "brick",
      level: i * PLATES_PER_BRICK,
      label: { verb: lego.kicker, name: lego.title },
    };
  });
}

/** Level where the next brick would land, or null when the stack is full (4). */
export function nextLevel(count: number, max = 4): number | null {
  return count >= max ? null : count * PLATES_PER_BRICK;
}
