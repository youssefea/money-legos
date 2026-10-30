/*
 * Front-face label layout (pad-print look): a big verb in Base Sans Bold and the Lego name in
 * small Base Sans Mono caps. Sizes are in millimetres on the brick face, so the 3D texture and the
 * SVG fallback print the same thing.
 */

export type LabelLine = { text: string; size: number; y: number };
export type LabelLayout = { verb: LabelLine; name: LabelLine[]; tracking: number };

export type Measure = (text: string, font: "verb" | "name", size: number) => number;

/** Rough widths for when no canvas is around (server render, SVG fallback). */
export const approxMeasure: Measure = (text, font, size) =>
  font === "verb" ? text.length * size * 0.56 : text.length * size * (0.6 + NAME_TRACKING);

export const NAME_TRACKING = 0.12; // em
const VERB_TRACKING = -0.015; // em

function wrap2(words: string[], fits: (s: string) => boolean): string[] | null {
  for (let cut = words.length - 1; cut >= 1; cut--) {
    const a = words.slice(0, cut).join(" ");
    const b = words.slice(cut).join(" ");
    if (fits(a) && fits(b)) return [a, b];
  }
  return null;
}

export function layoutLabel(verb: string, name: string, faceW: number, faceH: number, measure: Measure): LabelLayout {
  const maxW = faceW * 0.86;
  const small = faceW < 20;
  let verbSize = Math.min(faceH * 0.5, small ? 4.0 : 4.8);
  const vw = measure(verb, "verb", verbSize) + verb.length * verbSize * VERB_TRACKING;
  if (vw > maxW) verbSize *= maxW / vw;

  const caps = name.toUpperCase();
  let nameSize = small ? 1.05 : 1.2;
  let lines = [caps];
  const nameFits = (s: string, sz: number) => measure(s, "name", sz) <= maxW;
  if (!nameFits(caps, nameSize)) {
    const shrunk = nameSize * (maxW / measure(caps, "name", nameSize));
    if (shrunk >= 0.92) nameSize = shrunk;
    else {
      const two = wrap2(caps.split(" "), (s) => nameFits(s, nameSize));
      if (two) lines = two;
      else nameSize = Math.max(0.7, shrunk);
    }
  }

  // Vertical block: verb cap height (~0.7 em) + gap + name lines, centred on the face.
  const capH = verbSize * 0.7;
  const gap = verbSize * 0.32;
  const lineH = nameSize * 1.25;
  const block = capH + gap + lines.length * lineH - (lineH - nameSize * 0.72);
  const top = (faceH - block) / 2 + faceH * 0.01;
  const verbBaseline = top + capH;
  return {
    verb: { text: verb, size: verbSize, y: verbBaseline },
    name: lines.map((text, i) => ({ text, size: nameSize, y: verbBaseline + gap + nameSize * 0.72 + i * lineH })),
    tracking: NAME_TRACKING,
  };
}

/** Font stacks from next/font (CSS variables on <html>), with the plain family as a fallback. */
export function fontStacks(): { sans: string; mono: string } {
  if (typeof document === "undefined") return { sans: "system-ui, sans-serif", mono: "ui-monospace, monospace" };
  const cs = getComputedStyle(document.documentElement);
  const sans = cs.getPropertyValue("--font-base-sans").trim() || "'Base Sans', system-ui, sans-serif";
  const mono = cs.getPropertyValue("--font-base-sans-mono").trim() || "'Base Sans Mono', ui-monospace, monospace";
  return { sans, mono };
}

let fontsReady: Promise<void> | null = null;

/** Loads Base Sans Bold and Base Sans Mono Medium before any label is drawn. */
export function loadLabelFonts(): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  if (!fontsReady) {
    const { sans, mono } = fontStacks();
    fontsReady = Promise.all([document.fonts.load(`700 64px ${sans}`, "IssuePay"), document.fonts.load(`500 64px ${mono}`, "B20 PAY")])
      .then(() => document.fonts.ready)
      .then(() => undefined)
      .catch(() => undefined);
  }
  return fontsReady;
}
