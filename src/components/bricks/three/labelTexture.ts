import * as THREE from "three";
import { fontStacks, layoutLabel, NAME_TRACKING, type Measure } from "../core/label";

const PX_PER_MM = 40;
const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Draws the pad-printed label for a brick front face into a transparent canvas texture.
 * Call after loadLabelFonts() so Base Sans is used, not a fallback.
 */
export function labelTexture(verb: string, name: string, ink: string, faceW: number, faceH: number) {
  const key = [verb, name, ink, faceW.toFixed(2), faceH.toFixed(2)].join("|");
  const hit = cache.get(key);
  if (hit) return hit;
  const { sans, mono } = fontStacks();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(faceW * PX_PER_MM);
  canvas.height = Math.round(faceH * PX_PER_MM);
  const ctx = canvas.getContext("2d")!;
  const font = (f: "verb" | "name", size: number) => (f === "verb" ? `700 ${size * PX_PER_MM}px ${sans}` : `500 ${size * PX_PER_MM}px ${mono}`);
  const measure: Measure = (text, f, size) => {
    ctx.font = font(f, size);
    ctx.letterSpacing = f === "name" ? `${NAME_TRACKING * size * PX_PER_MM}px` : "0px";
    return ctx.measureText(text).width / PX_PER_MM;
  };
  const L = layoutLabel(verb, name, faceW, faceH, measure);
  ctx.fillStyle = ink;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const cx = canvas.width / 2;
  ctx.font = font("verb", L.verb.size);
  ctx.letterSpacing = `${-0.015 * L.verb.size * PX_PER_MM}px`;
  ctx.fillText(L.verb.text, cx, L.verb.y * PX_PER_MM);
  for (const line of L.name) {
    ctx.font = font("name", line.size);
    const tr = NAME_TRACKING * line.size * PX_PER_MM;
    ctx.letterSpacing = `${tr}px`;
    // letter-spacing adds trailing space after the last glyph; shift to keep it optically centred
    ctx.fillText(line.text, cx + tr / 2, line.y * PX_PER_MM);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(key, tex);
  return tex;
}
