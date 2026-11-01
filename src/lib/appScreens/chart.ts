/** Seeded chart data and smooth paths for the fake app's sparklines and price charts. */

/** Mulberry32: a tiny seeded PRNG, so every render draws the same line. */
function rand(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `n` values from `from` to `to` with a seeded wobble, lightly smoothed. The last value is exactly `to`
 * (the chart ends on the price shown above it).
 */
export function series(seed: number, n: number, from: number, to: number, wobble = 0.06): number[] {
  const r = rand(seed);
  const span = Math.abs(to - from) || Math.abs(to) || 1;
  const raw = Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1) + (r() - 0.5) * 2 * wobble * span * 3);
  const out = raw.map((v, i) => (i === 0 || i === n - 1 ? v : (raw[i - 1]! + v * 2 + raw[i + 1]!) / 4));
  out[0] = from;
  out[n - 1] = to;
  return out;
}

export type Pt = [number, number];

/** Values to points in a w x h box (top = max), with `pad` px kept free top and bottom. */
export function toPoints(v: readonly number[], w: number, h: number, pad = 4, lo?: number, hi?: number): Pt[] {
  const min = lo ?? Math.min(...v);
  const max = hi ?? Math.max(...v);
  const k = max - min || 1;
  return v.map((y, i) => [(i / (v.length - 1)) * w, pad + (1 - (y - min) / k) * (h - pad * 2)]);
}

/** Monotone cubic (Fritsch–Carlson) path through the points: smooth, never overshoots. */
export function monotonePath(p: readonly Pt[]): string {
  const n = p.length;
  if (n < 2) return "";
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((p[i + 1]![1] - p[i]![1]) / (p[i + 1]![0] - p[i]![0]));
  m.push(d[0]!);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1]! * d[i]! <= 0 ? 0 : (d[i - 1]! + d[i]!) / 2);
  m.push(d[n - 2]!);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / d[i]!;
    const b = m[i + 1]! / d[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i]!;
      m[i + 1] = t * b * d[i]!;
    }
  }
  const f = (x: number) => x.toFixed(2);
  let out = `M${f(p[0]![0])} ${f(p[0]![1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = p[i]!;
    const [x1, y1] = p[i + 1]!;
    const h = (x1 - x0) / 3;
    out += ` C${f(x0 + h)} ${f(y0 + m[i]! * h)} ${f(x1 - h)} ${f(y1 - m[i + 1]! * h)} ${f(x1)} ${f(y1)}`;
  }
  return out;
}
