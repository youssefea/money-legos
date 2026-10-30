import * as THREE from "three";
import { mergeGeometries, toCreasedNormals } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DIM } from "../core/dims";

/*
 * Brick geometry in true proportions (pitch 8, height 9.6, stud 4.8 x 1.7, wall 1.2), merged into one
 * crease-shaded BufferGeometry per brick type. Every vertex carries a `wear` value (0..1): how much it
 * sits on an outer filleted edge. The material uses it for faint moulding wear on the edges only.
 */

function roundedRect(w: number, d: number, r: number, path: THREE.Path) {
  const x = -w / 2;
  const y = -d / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + d - r);
  path.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  path.lineTo(x + r, y + d);
  path.quadraticCurveTo(x, y + d, x, y + d - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

/** Extrude along +Z, then stand it up so it grows along +Y from y0. */
function standUp(g: THREE.BufferGeometry, y0: number) {
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0, 0);
  return g;
}

function keepTriangles(g: THREE.BufferGeometry, keep: (ys: [number, number, number]) => boolean) {
  const out = new THREE.BufferGeometry();
  const pos = g.attributes.position!;
  const tris: number[] = [];
  for (let t = 0; t < pos.count / 3; t++) {
    if (keep([pos.getY(t * 3), pos.getY(t * 3 + 1), pos.getY(t * 3 + 2)])) tris.push(t);
  }
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name]!;
    const n = a.itemSize;
    const arr = new Float32Array(tris.length * 3 * n);
    tris.forEach((t, k) => arr.set((a.array as Float32Array).subarray(t * 3 * n, t * 3 * n + 3 * n), k * 3 * n));
    out.setAttribute(name, new THREE.BufferAttribute(arr, n));
  }
  return out;
}

function flipWinding(g: THREE.BufferGeometry) {
  for (const name of Object.keys(g.attributes)) {
    const a = g.attributes[name]!;
    const n = a.itemSize;
    const arr = a.array as Float32Array;
    for (let t = 0; t < a.count; t += 3) {
      for (let c = 0; c < n; c++) {
        const i1 = (t + 1) * n + c;
        const i2 = (t + 2) * n + c;
        const tmp = arr[i1]!;
        arr[i1] = arr[i2]!;
        arr[i2] = tmp;
      }
    }
  }
  return g;
}

/** Non-indexed, only the shared attributes, plus `wear` (from normals when `edges`, else 0). */
function prep(g: THREE.BufferGeometry, edges = false) {
  const n = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(n.attributes)) if (!["position", "normal", "uv"].includes(k)) n.deleteAttribute(k);
  if (!n.attributes.normal) n.computeVertexNormals();
  if (!n.attributes.uv) n.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(n.attributes.position!.count * 2), 2));
  const count = n.attributes.position!.count;
  const wear = new Float32Array(count);
  if (edges) {
    const nor = n.attributes.normal!;
    for (let i = 0; i < count; i++) {
      const m = Math.max(Math.abs(nor.getX(i)), Math.abs(nor.getY(i)), Math.abs(nor.getZ(i)));
      wear[i] = Math.min(1, Math.max(0, (1 - m) * 3.2));
    }
  }
  n.setAttribute("wear", new THREE.BufferAttribute(wear, 1));
  return n;
}

export function studGeometry(segments = 40) {
  const { studR: r, studH: h, studFillet: f } = DIM;
  // A small root fillet where the stud meets the top face: real studs do not meet it at a hard 90°.
  const root = 0.12;
  const pts: THREE.Vector2[] = [new THREE.Vector2(0.0001, -0.05), new THREE.Vector2(r + root, -0.05)];
  for (let i = 1; i <= 3; i++) {
    const a = (i / 3) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r + root - Math.sin(a) * root, root - Math.cos(a) * root));
  }
  pts.push(new THREE.Vector2(r, h - f));
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2);
    pts.push(new THREE.Vector2(r - f + Math.cos(a) * f, h - f + Math.sin(a) * f));
  }
  pts.push(new THREE.Vector2(0.0001, h));
  return new THREE.LatheGeometry(pts, segments);
}

function ringTube(rOut: number, rIn: number, h: number, segments = 24) {
  const pts =
    rIn > 0
      ? [new THREE.Vector2(rIn, h), new THREE.Vector2(rIn, 0), new THREE.Vector2(rOut, 0), new THREE.Vector2(rOut, h), new THREE.Vector2(rIn, h)]
      : [new THREE.Vector2(0.0001, 0), new THREE.Vector2(rOut, 0), new THREE.Vector2(rOut, h), new THREE.Vector2(0.0001, h)];
  return new THREE.LatheGeometry(pts, segments);
}

export type BrickShape = { w: number; d: number; plates: number; studs?: boolean; hollow?: boolean };

const cache = new Map<string, THREE.BufferGeometry>();

/**
 * One merged geometry per brick type. Origin = bottom centre.
 * w = studs along X, d = studs along Z, plates = height in plates (a brick is 3).
 */
export function brickGeometry({ w, d, plates, studs = true, hollow = true }: BrickShape) {
  const key = `${w}x${d}x${plates}:${studs}:${hollow}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { pitch, gap, plate, wall, top, cornerR, fillet } = DIM;
  const W = w * pitch - gap;
  const D = d * pitch - gap;
  const H = plates * plate;
  const parts: THREE.BufferGeometry[] = [];

  // Outer body: one seamless extrusion. The contour is inset by the fillet; the bevel pushes the sides
  // back out to full size and rounds the top and bottom edges.
  const bodyShape = roundedRect(W - 2 * fillet, D - 2 * fillet, Math.max(0.05, cornerR - fillet * 0.5), new THREE.Shape()) as THREE.Shape;
  let body: THREE.BufferGeometry = new THREE.ExtrudeGeometry(bodyShape, {
    depth: H - 2 * fillet,
    bevelEnabled: true,
    bevelSize: fillet,
    bevelThickness: fillet,
    bevelSegments: 5,
    curveSegments: 6,
  });
  standUp(body, fillet);
  if (hollow) {
    // Open the underside: drop the bottom cap, add the 1.2 mm rim, an inward-facing cavity and tubes.
    body = keepTriangles(body.index ? body.toNonIndexed() : body, (ys) => !(ys[0] < 1e-3 && ys[1] < 1e-3 && ys[2] < 1e-3));
    const iw = W - 2 * wall;
    const id = D - 2 * wall;
    const rim = roundedRect(W - 2 * fillet, D - 2 * fillet, Math.max(0.05, cornerR - fillet * 0.5), new THREE.Shape()) as THREE.Shape;
    const hole = new THREE.Path();
    hole.moveTo(-iw / 2, -id / 2);
    hole.lineTo(-iw / 2, id / 2);
    hole.lineTo(iw / 2, id / 2);
    hole.lineTo(iw / 2, -id / 2);
    hole.lineTo(-iw / 2, -id / 2);
    rim.holes.push(hole);
    const rimG = new THREE.ShapeGeometry(rim, 5);
    rimG.rotateX(Math.PI / 2); // face down
    parts.push(prep(rimG));
    const cavH = H - top;
    let cav: THREE.BufferGeometry = new THREE.BoxGeometry(iw, cavH, id).toNonIndexed();
    cav.translate(0, cavH / 2, 0);
    cav = keepTriangles(cav, (ys) => !(ys[0] < 1e-3 && ys[1] < 1e-3 && ys[2] < 1e-3));
    parts.push(prep(flipWinding(cav)));
  }
  parts.push(prep(body, true));

  if (hollow) {
    const tubeH = H - top;
    if (w >= 2 && d >= 2) {
      for (let i = 1; i < w; i++) {
        for (let j = 1; j < d; j++) {
          const t = ringTube(DIM.tubeR, DIM.tubeIn, tubeH);
          t.translate(i * pitch - (w * pitch) / 2, 0, j * pitch - (d * pitch) / 2);
          parts.push(prep(t));
        }
      }
    } else {
      const n = Math.max(w, d);
      for (let i = 1; i < n; i++) {
        const t = ringTube(DIM.rodR, 0, tubeH, 16);
        const o = i * pitch - (n * pitch) / 2;
        t.translate(w >= d ? o : 0, 0, w >= d ? 0 : o);
        parts.push(prep(t));
      }
    }
  }

  if (studs) {
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < d; j++) {
        const s = studGeometry();
        s.translate((i + 0.5) * pitch - (w * pitch) / 2, H, (j + 0.5) * pitch - (d * pitch) / 2);
        parts.push(prep(s));
      }
    }
  }

  const merged = mergeGeometries(parts, false)!;
  const out = toCreasedNormals(merged, THREE.MathUtils.degToRad(35));
  out.computeBoundingBox();
  out.computeBoundingSphere();
  cache.set(key, out);
  return out;
}

/** Size of the flat part of the front (+Z) face, where the label is printed. */
export function frontFace(w: number, plates: number) {
  const W = w * DIM.pitch - DIM.gap;
  const H = plates * DIM.plate;
  return { width: W - 2 * DIM.cornerR, height: H - 2 * DIM.fillet, W, H };
}
