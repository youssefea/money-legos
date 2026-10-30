/**
 * Small SVG bricks in true proportions (stud pitch 8, brick 9.6, stud 4.8 x 1.7, in mm),
 * drawn in a fixed oblique view. Used for the "why" glyphs, the drag ghost, the board poster
 * (shown until the live 3D board is ready) and the closed set-box line drawing.
 * The front face is always the exact brand hex; top and side are shaded only as lighting.
 */
import type { ReactNode } from "react";

const PITCH = 8;
const BRICK_H = 9.6;
const STUD_R = 2.4;
const STUD_H = 1.7;
const PLATE_H = 1.6; // thin baseplate
const KX = 0.55;
const KY = 0.42;

type Pt = [number, number];

/** World (x right, y up, z back) to screen. */
const P = (x: number, y: number, z: number): Pt => [x + KX * z, -y - KY * z];
const pts = (list: Pt[]) => list.map(([a, b]) => `${round(a)},${round(b)}`).join(" ");
const round = (n: number) => Math.round(n * 100) / 100;

function mix(hex: string, to: "#000000" | "#ffffff", t: number): string {
  const n = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(n(hex, i) + (n(to, i) - n(hex, i)) * t));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

// Extreme point of a circle on the top plane after projection (for the stud silhouette).
const T0 = Math.atan(KX);
const EX = STUD_R * Math.cos(T0) + KX * STUD_R * Math.sin(T0);
const EY = -KY * STUD_R * Math.sin(T0);

function Stud({ cx, y, cz, color, keyId }: { cx: number; y: number; cz: number; color: string; keyId: string }) {
  const [bx, by] = P(cx, y, cz);
  const [tx, ty] = P(cx, y + STUD_H, cz);
  const ellipse = (x: number, yy: number, fill: string, k: string) => (
    <circle key={k} r={STUD_R} transform={`matrix(1 0 ${KX} ${-KY} ${round(x)} ${round(yy)})`} fill={fill} />
  );
  return (
    <g key={keyId}>
      {ellipse(bx, by, mix(color, "#000000", 0.28), "b")}
      <polygon points={pts([[bx - EX, by - EY], [bx + EX, by + EY], [tx + EX, ty + EY], [tx - EX, ty - EY]])} fill={mix(color, "#000000", 0.14)} />
      {ellipse(tx, ty, mix(color, "#ffffff", 0.16), "t")}
    </g>
  );
}

export type BoxSpec = {
  /** Studs along x (width) and z (depth). */
  studs: [number, number];
  x: number;
  y: number;
  z: number;
  color: string;
  height?: number;
  studsOn?: boolean;
};

function Box({ studs, x, y, z, color, height = BRICK_H, studsOn = true }: BoxSpec): ReactNode {
  const W = studs[0] * PITCH;
  const D = studs[1] * PITCH;
  const H = height;
  const top = mix(color, "#ffffff", 0.14);
  const side = mix(color, "#000000", 0.24);
  const edge = mix(color, "#000000", 0.38);
  const studList: ReactNode[] = [];
  for (let j = studs[1] - 1; j >= 0; j--) {
    for (let i = 0; i < studs[0]; i++) {
      studList.push(
        <Stud key={`${i}-${j}`} keyId={`${i}-${j}`} cx={x + PITCH / 2 + i * PITCH} y={y + H} cz={z + PITCH / 2 + j * PITCH} color={color} />,
      );
    }
  }
  return (
    <>
      <polygon points={pts([P(x + W, y, z), P(x + W, y + H, z), P(x + W, y + H, z + D), P(x + W, y, z + D)])} fill={side} stroke={edge} strokeWidth={0.2} strokeLinejoin="round" />
      <polygon points={pts([P(x, y + H, z), P(x + W, y + H, z), P(x + W, y + H, z + D), P(x, y + H, z + D)])} fill={top} stroke={edge} strokeWidth={0.2} strokeLinejoin="round" />
      <polygon points={pts([P(x, y, z), P(x + W, y, z), P(x + W, y + H, z), P(x, y + H, z)])} fill={color} stroke={edge} strokeWidth={0.2} strokeLinejoin="round" />
      {/* Gloss: soft highlight along the top front edge. */}
      <polyline points={pts([P(x + 0.6, y + H - 0.35, z), P(x + W - 0.6, y + H - 0.35, z)])} stroke="#ffffff" strokeOpacity={0.45} strokeWidth={0.35} fill="none" />
      {studsOn && studList}
    </>
  );
}

function viewBoxFor(minX: number, minY: number, maxX: number, maxY: number, pad = 1.2) {
  return `${round(minX - pad)} ${round(minY - pad)} ${round(maxX - minX + pad * 2)} ${round(maxY - minY + pad * 2)}`;
}

export type BrickGlyphProps = {
  color: string;
  studs?: [number, number];
  className?: string;
  title?: string;
};

/** One brick, no label. Decorative unless `title` is given. */
export function BrickGlyph({ color, studs = [4, 2], className, title }: BrickGlyphProps) {
  const W = studs[0] * PITCH;
  const D = studs[1] * PITCH;
  const [, topY] = P(0, BRICK_H + STUD_H, D);
  const vb = viewBoxFor(0, topY, W + KX * D, 0);
  return (
    <svg className={className} viewBox={vb} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <Box studs={studs} x={0} y={0} z={0} color={color} />
    </svg>
  );
}

/** A small stack (bottom first), no baseplate: the build-step "booklet" pictures. */
export function MiniStack({ bricks, className }: { bricks: { color: string; studs: [number, number] }[]; className?: string }) {
  const maxW = Math.max(...bricks.map((b) => b.studs[0])) * PITCH;
  const maxD = Math.max(...bricks.map((b) => b.studs[1])) * PITCH;
  const H = bricks.length * BRICK_H;
  const [, topY] = P(0, H + STUD_H, maxD);
  return (
    <svg className={className} viewBox={viewBoxFor(0, topY, maxW + KX * maxD, 0)} aria-hidden="true" focusable="false">
      {bricks.map((b, i) => {
        const W = b.studs[0] * PITCH;
        const D = b.studs[1] * PITCH;
        const x = Math.round((maxW - W) / 2 / PITCH) * PITCH;
        const z = Math.round((maxD - D) / 2 / PITCH) * PITCH;
        return (
          <g key={i}>
            <Box studs={b.studs} x={x} y={i * BRICK_H} z={z} color={b.color} studsOn={i === bricks.length - 1} />
          </g>
        );
      })}
    </svg>
  );
}

export type PosterBrick = { id: string; color: string; labelColor: string; studs: [number, number]; verb: string; name: string };

export type BoardPosterProps = {
  bricks: PosterBrick[];
  /** Where the next brick lands (0-3), or null when full. */
  next: number | null;
  dark: boolean;
  /** Id of the brick that just landed; it plays the drop. */
  dropId?: string | null;
  /** Bumps to play the settle hop on every brick. */
  settle?: number;
  className?: string;
  dropClassName?: string;
  settleClassName?: string;
  compact?: boolean;
};

const PLATE: [number, number] = [12, 8];
const MAX = 4;

/**
 * The board drawn in SVG: baseplate, the stack (slot 1 at the bottom) and the dashed ghost
 * where the next brick lands. Fixed viewBox sized for a full stack, so nothing shifts.
 */
export function BoardPoster({ bricks, next, dark, dropId, settle = 0, className, dropClassName, settleClassName, compact }: BoardPosterProps) {
  const plate = PLATE;
  const PW = plate[0] * PITCH;
  const PD = plate[1] * PITCH;
  const plateColor = dark ? "#32353D" : "#DEE1E7";
  const ghost = dark ? "#3C8AFF" : "#0000FF";
  const [, topY] = P(0, PLATE_H + MAX * BRICK_H + STUD_H, 24 + 16);
  const vb = viewBoxFor(0, Math.min(topY, P(0, PLATE_H, PD)[1]), PW + KX * PD, 0, 2);

  const placed = bricks.slice(0, MAX).map((b, i) => {
    const W = b.studs[0] * PITCH;
    const D = b.studs[1] * PITCH;
    // Centre on the plate, snapped to the stud grid; a 0.3mm nudge so a stack is not machine-perfect.
    const x = Math.round((PW - W) / 2 / PITCH) * PITCH + (i % 2 ? 0.3 : -0.2);
    const z = Math.round((PD - D) / 2 / PITCH) * PITCH;
    const y = PLATE_H + i * BRICK_H + i * 0.12;
    const [fx, fy] = P(x, y, z);
    const small = W < 32;
    const verbSize = small ? 3.1 : 4.0;
    const nameLen = b.name.length * 1.9 * 0.62;
    const nameFit = nameLen > W - 3.6;
    return (
      <g
        key={b.id}
        className={[b.id === dropId ? dropClassName : undefined, settle ? settleClassName : undefined].filter(Boolean).join(" ") || undefined}
        style={{ animationDelay: b.id === dropId ? undefined : `${i * 60}ms` }}
      >
        <Box studs={b.studs} x={x} y={y} z={z} color={b.color} />
        {!compact && (
          <g transform={`translate(${round(fx)} ${round(fy)})`} fill={b.labelColor} aria-hidden="true">
            <text x={1.8} y={-BRICK_H + verbSize + 1.4} fontSize={verbSize} fontWeight={700} fontFamily="var(--font-sans)" letterSpacing={-0.05}>
              {b.verb}
            </text>
            <text
              x={1.8}
              y={-1.8}
              fontSize={1.9}
              fontWeight={500}
              fontFamily="var(--font-mono)"
              letterSpacing={0.18}
              {...(nameFit ? { textLength: W - 3.6, lengthAdjust: "spacingAndGlyphs" as const } : {})}
            >
              {b.name.toUpperCase()}
            </text>
          </g>
        )}
      </g>
    );
  });

  let ghostEl: ReactNode = null;
  if (next !== null && next < MAX) {
    const W = 32;
    const D = 16;
    const x = (PW - W) / 2;
    const z = (PD - D) / 2;
    const y = PLATE_H + next * BRICK_H + next * 0.12;
    const face = [P(x, y, z), P(x + W, y, z), P(x + W, y + BRICK_H, z), P(x, y + BRICK_H, z)];
    const topFace = [P(x, y + BRICK_H, z), P(x + W, y + BRICK_H, z), P(x + W, y + BRICK_H, z + D), P(x, y + BRICK_H, z + D)];
    const sideFace = [P(x + W, y, z), P(x + W, y + BRICK_H, z), P(x + W, y + BRICK_H, z + D), P(x + W, y, z + D)];
    const [cx, cy] = P(x + W / 2, y + BRICK_H / 2, z);
    ghostEl = (
      <g aria-hidden="true">
        {[sideFace, topFace, face].map((f, k) => (
          <polygon
            key={k}
            points={pts(f)}
            fill={k === 2 ? ghost : "none"}
            fillOpacity={k === 2 ? 0.08 : 0}
            stroke={ghost}
            strokeWidth={0.45}
            strokeDasharray="1.6 1.2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        <text x={cx} y={cy + 2.2} textAnchor="middle" fontSize={6} fontWeight={500} fontFamily="var(--font-mono)" fill={ghost}>
          {next + 1}
        </text>
      </g>
    );
  }

  return (
    <svg className={className} viewBox={vb} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
      <Box studs={plate} x={0} y={0} z={0} color={plateColor} height={PLATE_H} />
      {placed}
      {ghostEl}
    </svg>
  );
}

/** Line drawing of a closed set box, for the empty right column. */
export function ClosedBoxArt({ className }: { className?: string }) {
  const W = 72;
  const D = 48;
  const H = 22;
  const lid = 5;
  const box = (x: number, y: number, z: number, w: number, h: number, d: number) => [
    [P(x, y, z), P(x + w, y, z), P(x + w, y + h, z), P(x, y + h, z)],
    [P(x, y + h, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x, y + h, z + d)],
    [P(x + w, y, z), P(x + w, y + h, z), P(x + w, y + h, z + d), P(x + w, y, z + d)],
  ];
  const faces = [...box(0, 0, 0, W, H - lid, D), ...box(-0.8, H - lid, -0.8, W + 1.6, lid, D + 1.6)];
  const [, topY] = P(0, H, D + 1.6);
  return (
    <svg className={className} viewBox={viewBoxFor(-1, topY, W + 1 + KX * (D + 1.6), 0, 2)} aria-hidden="true" focusable="false">
      {faces.map((f, i) => (
        <polygon key={i} points={pts(f)} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      ))}
      {/* Thumb notch on the lid. */}
      <polyline points={pts([P(W / 2 - 6, H - lid, -0.8), P(W / 2, H - lid - 3, -0.8), P(W / 2 + 6, H - lid, -0.8)])} fill="none" stroke="currentColor" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
