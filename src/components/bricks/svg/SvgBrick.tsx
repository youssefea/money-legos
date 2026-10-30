import { DIM } from "../core/dims";
import { approxMeasure, layoutLabel, NAME_TRACKING, VERB_TRACKING } from "../core/label";
import type { V3 } from "../core/layout";
import { depth, project } from "./projector";

/** Lighten (k > 0) or darken (k < 0) a hex. Lighting on a brick, never a flat UI colour. */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => (k >= 0 ? c + (255 - c) * k : c * (1 + k)));
  return `rgb(${ch.map((c) => Math.round(c)).join(",")})`;
}

function hull(pts: [number, number][]) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: number[], a: number[], b: number[]) => (a[0]! - o[0]!) * (b[1]! - o[1]!) - (a[1]! - o[1]!) * (b[0]! - o[0]!);
  const lo: [number, number][] = [];
  const up: [number, number][] = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2]!, lo[lo.length - 1]!, q) <= 0) lo.pop();
    lo.push(q);
  }
  for (const q of p.reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2]!, up[up.length - 1]!, q) <= 0) up.pop();
    up.push(q);
  }
  return [...lo.slice(0, -1), ...up.slice(0, -1)];
}

const pts = (a: [number, number][]) => a.map((p) => p.map((v) => v.toFixed(2)).join(",")).join(" ");

export type SvgBrickProps = {
  size: [number, number];
  kind?: "brick" | "plate";
  color: string;
  /** Unique within the page (gradient ids). */
  id: string;
  label?: { verb: string; name: string; ink: string };
  /** Darken the stud tops less on a baseplate. */
  matte?: boolean;
};

/**
 * A brick drawn as flat SVG in the same view as the 3D board. Origin (bottom centre) is at (0, 0);
 * place it with a transform. Shading: three face gradients, a fillet highlight and stud cylinders.
 */
export function SvgBrick({ size: [w, d], kind = "brick", color, id, label, matte = false }: SvgBrickProps) {
  const W = w * DIM.pitch - DIM.gap;
  const D = d * DIM.pitch - DIM.gap;
  const H = kind === "brick" ? DIM.plate * 3 : DIM.plate;
  const P = (p: V3) => project(p);
  const x0 = -W / 2, x1 = W / 2, z0 = -D / 2, z1 = D / 2;
  const top = [P([x0, H, z0]), P([x1, H, z0]), P([x1, H, z1]), P([x0, H, z1])];
  const front = [P([x0, H, z1]), P([x1, H, z1]), P([x1, 0, z1]), P([x0, 0, z1])];
  const side = [P([x1, H, z0]), P([x1, H, z1]), P([x1, 0, z1]), P([x1, 0, z0])];
  const studs: { c: V3; body: [number, number][]; cap: [number, number][] }[] = [];
  for (let i = 0; i < w; i++) {
    for (let j = 0; j < d; j++) {
      const c: V3 = [(i + 0.5) * DIM.pitch - (w * DIM.pitch) / 2, H, (j + 0.5) * DIM.pitch - (d * DIM.pitch) / 2];
      const ring = (y: number) =>
        Array.from({ length: 28 }, (_, k) => {
          const a = (k / 28) * Math.PI * 2;
          return P([c[0] + Math.cos(a) * DIM.studR, y, c[2] + Math.sin(a) * DIM.studR]);
        });
      const capRing = ring(H + DIM.studH);
      studs.push({ c, body: hull([...ring(H), ...capRing]), cap: capRing });
    }
  }
  studs.sort((a, b) => depth(a.c) - depth(b.c));

  let print = null;
  if (label) {
    const fw = W - 2 * DIM.cornerR;
    const fh = H - 2 * DIM.fillet;
    const L = layoutLabel(label.verb, label.name, fw, fh, approxMeasure);
    const o = P([-fw / 2, H - DIM.fillet, z1]);
    const u = P([-fw / 2 + 1, H - DIM.fillet, z1]);
    const v = P([-fw / 2, H - DIM.fillet - 1, z1]);
    const m = [u[0] - o[0], u[1] - o[1], v[0] - o[0], v[1] - o[1], o[0], o[1]].map((n) => n.toFixed(4)).join(" ");
    print = (
      <g transform={`matrix(${m})`} fill={label.ink} textAnchor="start">
        <text x={L.x - L.verb.size * 0.045} y={L.verb.y} fontSize={L.verb.size} fontWeight={700} letterSpacing={VERB_TRACKING * L.verb.size} style={{ fontFamily: "var(--font-sans)" }}>
          {L.verb.text}
        </text>
        {L.name.map((line, i) => (
          <text key={i} x={L.x} y={line.y} fontSize={line.size} fontWeight={500} letterSpacing={NAME_TRACKING * line.size} style={{ fontFamily: "var(--font-mono)" }}>
            {line.text}
          </text>
        ))}
      </g>
    );
  }

  return (
    <g>
      <defs>
        <linearGradient id={`${id}-t`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={shade(color, 0.14)} />
          <stop offset="1" stopColor={color} />
        </linearGradient>
        <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(color, -0.04)} />
          <stop offset="0.65" stopColor={shade(color, -0.13)} />
          <stop offset="1" stopColor={shade(color, -0.02)} />
        </linearGradient>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shade(color, -0.3)} />
          <stop offset="1" stopColor={shade(color, -0.4)} />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(color, 0.04)} />
          <stop offset="0.25" stopColor={shade(color, 0.3)} />
          <stop offset="0.55" stopColor={shade(color, -0.1)} />
          <stop offset="1" stopColor={shade(color, -0.32)} />
        </linearGradient>
      </defs>
      <polygon points={pts(front)} fill={`url(#${id}-f)`} />
      <polygon points={pts(side)} fill={`url(#${id}-s)`} />
      <polygon points={pts(top)} fill={`url(#${id}-t)`} />
      {/* fillet highlight along the front and right top edges, hairline shadow at the bottom */}
      <polyline points={pts([top[3]!, top[2]!, top[1]!])} fill="none" stroke="rgba(255,255,255,.6)" strokeWidth={0.32} strokeLinejoin="round" />
      <polyline points={pts([front[1]!, front[2]!])} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth={0.28} />
      {/* recess seam at the bottom edge: reads as the joint to the brick below */}
      <polyline points={pts([front[3]!, front[2]!, side[3]!])} fill="none" stroke="rgba(10,11,13,.55)" strokeWidth={0.32} strokeLinejoin="round" />
      {print}
      {studs.map((s, k) => (
        <g key={k}>
          <polygon points={pts(s.body)} fill={`url(#${id}-b)`} />
          <polygon points={pts(s.cap)} fill={matte ? shade(color, 0.08) : shade(color, 0.16)} stroke="rgba(255,255,255,.4)" strokeWidth={0.18} />
        </g>
      ))}
    </g>
  );
}
