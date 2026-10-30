import * as THREE from "three";
import { fontStacks, layoutLabel, NAME_TRACKING, VERB_TRACKING, type Measure } from "../core/label";

/** Print resolution: a 2x4 face (30 mm) is ~2000 px wide, sharp even on a 3x phone. */
const PX_PER_MM = 64;
const cache = new Map<string, THREE.CanvasTexture>();

/**
 * Draws the pad-printed label for a brick front face into a transparent canvas texture.
 * Call after loadLabelFonts() so Base Sans is used, not a fallback.
 */
export function labelTexture(verb: string, name: string, ink: string, faceW: number, faceH: number, anisotropy = 8) {
  const key = [verb, name, ink, faceW.toFixed(2), faceH.toFixed(2), anisotropy].join("|");
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
  ctx.textAlign = L.align === "middle" ? "center" : "left";
  ctx.textBaseline = "alphabetic";
  const x = L.x * PX_PER_MM;
  ctx.font = font("verb", L.verb.size);
  ctx.letterSpacing = `${VERB_TRACKING * L.verb.size * PX_PER_MM}px`;
  // Bold glyphs carry a little left side bearing: pull the verb back so both lines share one edge.
  ctx.fillText(L.verb.text, x - (L.align === "start" ? L.verb.size * 0.045 * PX_PER_MM : 0), L.verb.y * PX_PER_MM);
  for (const line of L.name) {
    ctx.font = font("name", line.size);
    ctx.letterSpacing = `${NAME_TRACKING * line.size * PX_PER_MM}px`;
    ctx.fillText(line.text, x, line.y * PX_PER_MM);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  cache.set(key, tex);
  return tex;
}
