/*
 * Front-face label layout (pad-print look): a big verb in Base Sans Bold and the Lego name in
 * small Base Sans Mono caps. Sizes are in millimetres on the brick face, so the 3D texture and the
 * SVG fallback print the same thing.
 */

export type LabelLine = { text: string; size: number; y: number };
/**
 * `x` is the left edge of both lines (left-aligned pad print, `align: "start"`), mm from the face's left
 * edge, or the centre of the verb when it is printed alone (`align: "middle"`, the tray sprites).
 */
export type LabelLayout = { x: number; align: "start" | "middle"; verb: LabelLine; name: LabelLine[]; tracking: number };

export type Measure = (text: string, font: "verb" | "name", size: number) => number;

/** Rough widths for when no canvas is around (server render, SVG fallback). */
export const approxMeasure: Measure = (text, font, size) =>
  font === "verb" ? text.length * size * 0.58 : text.length * size * (0.6 + NAME_TRACKING);

/** Sublabel tracking (Base Sans Mono caps), em. */
export const NAME_TRACKING = 0.08;
export const VERB_TRACKING = -0.02; // em

/*
 * Print sizes in mm on the face. A tray hero sprite is 192 CSS px wide (seen from TRAY_CAMERA, about
 * 4.1 px/mm), so these read as: 10 px left inset, ~21 px Base Sans Bold verb, ~9-10 px mono caps
 * (a long name shrinks to stay on one line, down to `minName`, before it wraps). The board shows them
 * bigger.
 */
/*
 * Verb only (no name: the tray sprites, where a sublabel would print at 4-8 CSS px): one bold verb,
 * centred, as big as the face allows. On the tray's stud scale (--stud CSS px per 8 mm stud) the verb's
 * font size is 0.875 x --stud on a hero (2x4 and wider) and 0.7 x --stud on a smaller face, unless a
 * long verb has to shrink to fit the face width.
 */
const VERB_ONLY = {
  hero: { inset: 1.6, verb: 7.0 },
  small: { inset: 1.0, verb: 5.6 },
} as const;

const PRINT = {
  hero: { inset: 2.4, verb: 5.1, name: 2.3, minName: 1.75 },
  // minName 1.55 mm: >= 9 CSS px on the 1440 board (~5.9 px/mm)
  small: { inset: 1.6, verb: 3.9, name: 1.6, minName: 1.55 },
} as const;

function wrap2(words: string[], fits: (s: string) => boolean): string[] | null {
  for (let cut = words.length - 1; cut >= 1; cut--) {
    const a = words.slice(0, cut).join(" ");
    const b = words.slice(cut).join(" ");
    if (fits(a) && fits(b)) return [a, b];
  }
  return null;
}

export function layoutLabel(verb: string, name: string, faceW: number, faceH: number, measure: Measure): LabelLayout {
  if (name.trim() === "") return verbOnly(verb, faceW, faceH, measure);
  const P = faceW < 20 ? PRINT.small : PRINT.hero;
  const x = P.inset;
  const maxW = faceW - 2 * P.inset;
  let verbSize: number = P.verb;
  const vw = measure(verb, "verb", verbSize) + verb.length * verbSize * VERB_TRACKING;
  if (vw > maxW) verbSize *= maxW / vw;

  const caps = name.toUpperCase();
  let nameSize: number = P.name;
  let lines = [caps];
  const nameFits = (s: string, sz: number) => measure(s, "name", sz) <= maxW;
  if (!nameFits(caps, nameSize)) {
    const shrunk = nameSize * (maxW / measure(caps, "name", nameSize));
    if (shrunk >= P.minName) nameSize = shrunk;
    else {
      // Two lines at the largest size (down to minName) that fits; else one line shrunk to fit.
      let two: string[] | null = null;
      let sz: number = P.name;
      for (; sz >= P.minName - 1e-6 && !two; sz -= 0.05) two = wrap2(caps.split(" "), (t) => nameFits(t, sz));
      if (two) {
        lines = two;
        nameSize = sz + 0.05;
      } else {
        // Nothing fits at minName: the larger of one line or the best two-line cut, shrunk to fit the face.
        // (Board sublabels then print under 9 CSS px: keep names to <= 11 caps a line on a 2-wide brick.)
        nameSize = shrunk;
        const words = caps.split(" ");
        for (let cut = 1; cut < words.length; cut++) {
          const pair = [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
          const sz2 = Math.min(...pair.map((t) => P.name * (maxW / measure(t, "name", P.name))), P.name);
          if (sz2 > nameSize) {
            nameSize = sz2;
            lines = pair;
          }
        }
      }
    }
  }
  // Two sublabel lines on a small face: give the verb a little less room.
  if (lines.length > 1 && faceW < 20) verbSize = Math.min(verbSize, P.verb * 0.86);

  // Vertical block: verb cap height (~0.7 em) + gap + name lines, centred on the face (a hair low: the top bevel catches the light and reads as part of the face).
  const blockOf = () => verbSize * 0.71 + verbSize * 0.3 + nameSize * 0.72 + (lines.length - 1) * nameSize * 1.3;
  // Never taller than the face (minus a 0.55 mm margin top and bottom): shrink both lines together.
  const room = faceH - 1.1;
  if (blockOf() > room) {
    const k = room / blockOf();
    verbSize *= k;
    nameSize *= k;
  }
  const capH = verbSize * 0.71;
  const gap = verbSize * 0.3;
  const lineH = nameSize * 1.3;
  const block = blockOf();
  const top = Math.min((faceH - block) / 2 + faceH * 0.025, faceH - 0.55 - block);
  const verbBaseline = top + capH;
  return {
    x,
    align: "start",
    verb: { text: verb, size: verbSize, y: verbBaseline },
    name: lines.map((text, i) => ({ text, size: nameSize, y: verbBaseline + gap + nameSize * 0.72 + i * lineH })),
    tracking: NAME_TRACKING,
  };
}

/** The verb alone, centred on the face both ways (cap height centred, a hair low like the two-line print). */
function verbOnly(verb: string, faceW: number, faceH: number, measure: Measure): LabelLayout {
  const P = faceW < 20 ? VERB_ONLY.small : VERB_ONLY.hero;
  const maxW = faceW - 2 * P.inset;
  // cap height (0.71 em) within the face less a 0.9 mm margin top and bottom
  let size = Math.min(P.verb, (faceH - 1.8) / 0.71);
  const w = measure(verb, "verb", size) + verb.length * size * VERB_TRACKING;
  if (w > maxW) size *= maxW / w;
  const capH = size * 0.71;
  return { x: faceW / 2, align: "middle", verb: { text: verb, size, y: (faceH + capH) / 2 + faceH * 0.02 }, name: [], tracking: NAME_TRACKING };
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
