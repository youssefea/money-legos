"use client";

import type { BrickStageProps } from "@/lib/contract";

/**
 * Placeholder for the live 3D board (react-three-fiber). The bricks worker replaces the body;
 * the props and default export stay as defined in src/lib/contract.ts.
 */
export default function BrickStage({ bricks, nextLevel, dark, className }: BrickStageProps) {
  const label =
    bricks.length === 0
      ? "Empty baseplate"
      : "Stack of " + bricks.map((b) => `${b.label.verb} (${b.label.name})`).join(", bottom to top: ");
  return (
    <div
      data-testid="brick-stage"
      data-bricks={bricks.length}
      data-next-level={nextLevel ?? "full"}
      data-dark={dark ? "true" : "false"}
      className={className}
      role="img"
      aria-label={label}
    />
  );
}
