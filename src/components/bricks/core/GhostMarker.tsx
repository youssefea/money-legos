import type { CSSProperties } from "react";
import { BOARD } from "./layout";
import type { GhostGeom } from "./ghost";
import styles from "./GhostMarker.module.css";

const path = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join("") + "Z";

export type GhostMarkerProps = {
  ghost: GhostGeom;
  dark: boolean;
  still: boolean;
  /** Screen px per drawing unit (1 in the 3D overlay, which draws in px; the SVG view-box scale otherwise). */
  pxPerUnit?: number;
};

/**
 * "Next slot" marker: the outer silhouette of the brick that lands next, as a 2px dashed outline,
 * with an upright slot numeral (Base Sans Mono, 16px) in the middle of its front face. Brand blue on
 * slot 1 of an empty board, grey after. An SVG <g>: the 3D stage draws it in an overlay above the
 * canvas, the SVG fallback inline. It always marks the top of the stack, so it never needs a depth test.
 */
export function GhostMarker({ ghost, dark, still, pxPerUnit = 1 }: GhostMarkerProps) {
  const c = dark ? BOARD.dark : BOARD.light;
  const color = ghost.slot === 1 ? c.ghostNext : c.ghost;
  const u = 1 / pxPerUnit;
  const style = { "--ghost-color": color, "--ghost-bob": `${-3 * u}px`, "--ghost-halo": c.page } as CSSProperties;
  return (
    <g key={ghost.slot} className={[styles.ghost, still ? styles.still : ""].join(" ")} style={style} data-ghost-slot={ghost.slot}>
      <g className={styles.bob}>
        <path className={styles.outline} d={path(ghost.outline)} />
        <text className={styles.numeral} x={ghost.centre[0]} y={ghost.centre[1]} fontSize={16 * u} strokeWidth={4 * u}>
          {ghost.slot}
        </text>
      </g>
    </g>
  );
}
