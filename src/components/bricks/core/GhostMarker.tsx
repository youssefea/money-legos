import type { CSSProperties } from "react";
import { BOARD } from "./layout";
import type { Affine, GhostGeom } from "./ghost";
import styles from "./GhostMarker.module.css";

const mat = (a: Affine) => `matrix(${a.map((n) => n.toFixed(3)).join(" ")})`;
const line = (pts: [number, number][]) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

/**
 * Dashed "next slot" outline with a flat number badge above its stud grid. An SVG <g>: the 3D stage
 * draws it in an overlay above the canvas, the SVG fallback draws it inline. It never sits behind
 * a brick (it always marks the top of the stack), so the overlay needs no depth test.
 */
export function GhostMarker({ ghost, dark, still }: { ghost: GhostGeom; dark: boolean; still: boolean }) {
  const c = dark ? BOARD.dark : BOARD.light;
  const style = { "--ghost-color": c.ghost, "--ghost-ink": c.ghostInk } as CSSProperties;
  return (
    <g key={ghost.slot} className={[styles.ghost, still ? styles.still : ""].join(" ")} style={style} data-ghost-slot={ghost.slot}>
      {ghost.studs.map((s, i) => (
        <circle key={i} className={styles.stud} transform={mat(s)} r={2.4} />
      ))}
      {ghost.edges.map((e, i) => (
        <path key={i} className={styles.edges} d={line(e)} />
      ))}
      <g className={styles.badge}>
        <g transform={mat(ghost.badge)}>
          <rect className={styles.badgePlate} x={-3.6} y={-3.6} width={7.2} height={7.2} rx={1.4} />
          <text className={styles.badgeText} x={0} y={0.2}>
            {ghost.slot}
          </text>
        </g>
      </g>
    </g>
  );
}
