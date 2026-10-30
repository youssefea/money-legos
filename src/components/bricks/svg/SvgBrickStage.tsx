"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { GhostRect } from "../core/ghost";
import type { BrickStageProps, PlacedBrick } from "@/lib/contract";
import { GhostMarker } from "../core/GhostMarker";
import { ghostGeom } from "../core/ghost";
import { BASEPLATE, BOARD, DEFAULT_FRAMING, byLevel, poseFor, stackLabel, type Framing } from "../core/layout";
import { EXTENTS, project, svgViewBox } from "./projector";
import { SvgBrick } from "./SvgBrick";
import styles from "./SvgBrickStage.module.css";

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
  framing?: Framing;
  /** The ghost slot's box in this element's CSS px (null = stack full). */
  onGhostRect?: (rect: GhostRect | null) => void;
};

/**
 * No-WebGL / slow-device board: the same stack, angle and ghost slot as the 3D stage, drawn as SVG
 * (zero image bytes). Drops use a CSS keyframe; prefers-reduced-motion places bricks at once.
 */
export default function SvgBrickStage(props: SvgBrickStageProps) {
  const { bricks, nextLevel, dark, reducedMotion, settledSignal = 0, onSettled, className, decorative = false, onGhostRect } = props;
  const framing = props.framing ?? DEFAULT_FRAMING;
  const root = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const read = () => {
      const r = el.getBoundingClientRect();
      setBox((b) => (b[0] === r.width && b[1] === r.height ? b : [r.width, r.height]));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const vb = svgViewBox(box[0], box[1], framing);
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
  // Report the ghost in CSS px of this element.
  const gr = ghost && vb.scale > 0 ? { slot: ghost.slot, x: (ghost.bounds.x - vb.x) * vb.scale, y: (ghost.bounds.y - vb.y) * vb.scale, width: ghost.bounds.width * vb.scale, height: ghost.bounds.height * vb.scale } : null;
  const grKey = gr ? [gr.slot, gr.x, gr.y, gr.width, gr.height].map((n) => n.toFixed(1)).join(",") : "";
  const ghostCb = useRef(onGhostRect);
  useEffect(() => {
    ghostCb.current = onGhostRect;
  });
  const measured = vb.scale > 0;
  useEffect(() => {
    if (!measured) return;
    const [slot, x, y, width, height] = grKey ? grKey.split(",").map(Number) : [];
    ghostCb.current?.(grKey ? { slot: slot!, x: x!, y: y!, width: width!, height: height! } : null);
  }, [grKey, measured]);
  const cx = project([0, 0, 0]);
  return (
    <div
      ref={root}
      className={[styles.root, reducedMotion ? styles.still : "", className].filter(Boolean).join(" ")}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : stackLabel(bricks, nextLevel)}
      aria-hidden={decorative || undefined}
      data-renderer="svg"
    >
      <svg className={styles.svg} viewBox={`${vb.x.toFixed(2)} ${vb.y.toFixed(2)} ${vb.w.toFixed(2)} ${vb.h.toFixed(2)}`} preserveAspectRatio="xMidYMid meet">
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
        <ellipse cx={cx[0]} cy={cx[1] + 6} rx={(EXTENTS.plate.x1 - EXTENTS.plate.x0) * 0.85} ry={(EXTENTS.plate.y1 - EXTENTS.plate.y0) * 0.75} fill={`url(#${uid}-floor)`} />
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
        {ghost && <GhostMarker ghost={ghost} dark={dark} still={reducedMotion} pxPerUnit={vb.scale || 5} />}
      </svg>
    </div>
  );
}
