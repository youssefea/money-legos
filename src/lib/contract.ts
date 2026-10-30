/**
 * Shared contract between the UI and the 3D bricks layer. Keep this file stable:
 * the UI worker and the bricks worker both build against it.
 */

export type PlacedBrick = {
  id: string;
  legoId: string;
  color: string;
  labelColor: string;
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
  className?: string;
};

/** A Lego id; sprite files live at public/sprites/<legoId>.webp. */
export type SpriteId = string;
