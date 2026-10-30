/**
 * Shared contract between the UI and the 3D bricks layer. Keep this file stable:
 * the UI worker and the bricks worker both build against it.
 */

export type PlacedBrick = {
  id: string;
  legoId: string;
  color: string;
  labelColor: string;
  /** Studs [w, d], w facing the viewer: 2x4 = [4, 2], 2x3 = [3, 2], 2x2 = [2, 2], 1x4 = [4, 1], 2x1 = [2, 1]. */
  size: [number, number];
  kind: "brick" | "plate";
  level: number;
  label: { verb: string; name: string };
};

export type BrickStageProps = {
  bricks: PlacedBrick[];
  nextLevel: number | null;
  dark: boolean;
  reducedMotion: boolean;
  settledSignal?: number;
  onSettled?: (id: string) => void;
  /**
   * Reports where each brick sits inside the stage container so the UI can draw connector lines to it.
   * Coordinates are fractions (0..1) of the container: cx/cy = centre of the brick's front face, w/h = its size.
   * Called after layout and again whenever bricks move/settle or the container resizes.
   */
  onLayout?: (items: BrickLayoutItem[]) => void;
  className?: string;
};

export type BrickLayoutItem = {
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** Optional screen-space silhouette of the brick (fractions of the container, clockwise) for outline highlights. */
  hull?: [number, number][];
};

/** A Lego id; sprite files live at public/sprites/<legoId>.webp. */
export type SpriteId = string;
