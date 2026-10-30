"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { BrickStageProps, PlacedBrick } from "@/lib/contract";
import { GhostMarker } from "../core/GhostMarker";
import { ghostGeom } from "../core/ghost";
import { BASEPLATE, BOARD, byLevel, frameBox, poseFor, stackLabel } from "../core/layout";
import { project } from "./projector";
import { SvgBrick } from "./SvgBrick";
import styles from "./SvgBrickStage.module.css";

/** The board's view box: the same fixed frame (baseplate + full stack) the 3D camera fits. */
const VIEWBOX = (() => {
  const { min, max } = frameBox();
  const xs: number[] = [];
  const ys: number[] = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) {
    const [px, py] = project([x, y, z]);
    xs.push(px);
    ys.push(py);
  }
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const m = (x1 - x0) * 0.055;
  return { x: x0 - m, y: y0 - m, w: x1 - x0 + 2 * m, h: y1 - y0 + 2 * m };
})();

const BASE_CORNERS = (() => {
  const hx = (BASEPLATE[0] * 8) / 2, hz = (BASEPLATE[1] * 8) / 2;
  return [project([-hx, 0, -hz]), project([hx, 0, -hz]), project([hx, 0, hz]), project([-hx, 0, hz])]
    .map((p) => p.map((v) => v.toFixed(2)).join(","))
    .join(" ");
})();

function SvgStackBrick({ brick, added, reducedMotion, bounce, index, uid, onSettled }: {
  brick: PlacedBrick;
  /** Added after the first render (drops in). */
  added: boolean;
  reducedMotion: boolean;
  bounce: number;
  index: number;
  uid: string;
  onSettled?: (id: string) => void;
}) {
  const pose = poseFor(brick);
  const [drop] = useState(added && !reducedMotion);
  const [px, py] = project([pose.x, pose.y, pose.z]);
  const [firstBounce] = useState(bounce);
  const settledRef = useRef(onSettled);
  useEffect(() => {
    settledRef.current = onSettled;
  });
  // Reduced motion: the brick lands at once.
  useEffect(() => {
    if (added && reducedMotion) settledRef.current?.(brick.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount only
  }, []);
  useEffect(() => {
    if (bounce !== firstBounce && reducedMotion) settledRef.current?.(brick.id);
  }, [bounce, firstBounce, reducedMotion, brick.id]);
  const hopping = bounce !== firstBounce;
  const cls = hopping ? styles.hop : drop ? styles.drop : undefined;
  return (
    <g transform={`translate(${px.toFixed(2)} ${py.toFixed(2)})`}>
      <g
        key={bounce}
        className={cls}
        style={hopping ? { animationDelay: `${index * 60}ms` } : undefined}
        onAnimationEnd={() => settledRef.current?.(brick.id)}
      >
        <SvgBrick
          id={`${uid}-${brick.id}`}
          size={brick.size}
          kind={brick.kind}
          color={brick.color}
          label={{ verb: brick.label.verb, name: brick.label.name, ink: brick.labelColor }}
        />
      </g>
    </g>
  );
}

export type SvgBrickStageProps = BrickStageProps & {
  /** Drop role/label when a parent already describes the stack. */
  decorative?: boolean;
};

/**
 * No-WebGL / slow-device board: the same stack, angle and ghost slot as the 3D stage, drawn as SVG
 * (zero image bytes). Drops use a CSS keyframe; prefers-reduced-motion places bricks at once.
 */
export default function SvgBrickStage({ bricks, nextLevel, dark, reducedMotion, settledSignal = 0, onSettled, className, decorative = false }: SvgBrickStageProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  // Bricks present at first render appear in place; later ones drop in (also after a remove and re-add).
  const [initial, setInitial] = useState(() => new Set(bricks.map((b) => b.id)));
  const [prev, setPrev] = useState(bricks);
  if (prev !== bricks) {
    setPrev(bricks);
    const now = new Set(bricks.map((b) => b.id));
    if ([...initial].some((id) => !now.has(id))) setInitial(new Set([...initial].filter((id) => now.has(id))));
  }
  const c = dark ? BOARD.dark : BOARD.light;
  const ghost = nextLevel === null ? null : ghostGeom(nextLevel, project);
  const cx = project([0, 0, 0]);
  return (
    <div
      className={[styles.root, reducedMotion ? styles.still : "", className].filter(Boolean).join(" ")}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : stackLabel(bricks, nextLevel)}
      aria-hidden={decorative || undefined}
      data-renderer="svg"
    >
      <svg className={styles.svg} viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`} preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id={`${uid}-floor`}>
            <stop offset="0" stopColor={c.floor} stopOpacity={dark ? 0.55 : 0.9} />
            <stop offset="0.6" stopColor={c.floor} stopOpacity={dark ? 0.2 : 0.35} />
            <stop offset="1" stopColor={c.floor} stopOpacity={0} />
          </radialGradient>
          <filter id={`${uid}-blur`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        <ellipse cx={cx[0]} cy={cx[1] + 6} rx={VIEWBOX.w * 0.62} ry={VIEWBOX.h * 0.42} fill={`url(#${uid}-floor)`} />
        <polygon points={BASE_CORNERS} fill="#0a0b0d" opacity={dark ? 0.6 : 0.22} filter={`url(#${uid}-blur)`} transform="translate(0.8 1.6)" />
        <g transform={`translate(${cx[0]} ${cx[1]})`}>
          <SvgBrick id={`${uid}-base`} size={BASEPLATE} kind="plate" color={c.baseplate} matte />
        </g>
        {byLevel(bricks).map((b, i) => (
          <SvgStackBrick
            key={b.id}
            brick={b}
            added={!initial.has(b.id)}
            reducedMotion={reducedMotion}
            bounce={settledSignal}
            index={i}
            uid={uid}
            onSettled={onSettled}
          />
        ))}
        {ghost && <GhostMarker ghost={ghost} dark={dark} still={reducedMotion} />}
      </svg>
    </div>
  );
}
