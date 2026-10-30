import type { CSSProperties } from "react";
import { BOARD } from "./layout";
import type { GhostGeom } from "./ghost";
import styles from "./GhostMarker.module.css";

const path = (pts: [number, number][], close = true) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join("") + (close ? "Z" : "");

export type GhostMarkerProps = {
  ghost: GhostGeom;
  dark: boolean;
  still: boolean;
  /** Screen px per drawing unit (1 in the 3D overlay, which draws in px; the SVG view-box scale otherwise). */
  pxPerUnit?: number;
};

/**
 * "Next slot" marker: a see-through brick volume where the next brick lands, standing on the stack.
 * Base Blue at 8% (Cerulean in dark mode) with 1.5 px dashed edges on the silhouette and on the three
 * inner edges and a slightly denser lid; no numeral (the volume alone says "here", and a number read
 * as a step count). Hidden once the stack is full. It breathes (scale 1 to 1.02 over 1.6 s), still with reduced motion. An SVG <g>: the 3D
 * stage draws it in an overlay above the canvas, the SVG fallback inline. It always marks the top of
 * the stack, so it never needs a depth test.
 */
export function GhostMarker({ ghost, dark, still, pxPerUnit = 1 }: GhostMarkerProps) {
  const c = dark ? BOARD.dark : BOARD.light;
  const style = { "--ghost-color": c.ghostNext, "--ghost-halo": c.page } as CSSProperties;
  // A thumbnail board (the phone's scene) draws thinner edges.
  const small = ghost.bounds.width * pxPerUnit < 90;
  const edges = ghost.edges.map(([a, b]) => path([a, b], false)).join("");
  return (
    <g key={ghost.slot} className={[styles.ghost, still ? styles.still : "", small ? styles.small : ""].join(" ")} style={style} data-ghost-slot={ghost.slot} data-ghost-size={ghost.size.join("x")}>
      <g className={styles.breathe}>
        <path className={styles.body} d={path(ghost.outline)} />
        <path className={styles.lid} d={path(ghost.top)} />
        <path className={styles.edge} d={path(ghost.outline) + edges} />
      </g>
    </g>
  );
}
