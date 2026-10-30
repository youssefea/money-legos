import { describe, expect, it } from "vitest";

/** WCAG 2.x relative luminance and contrast ratio. */
function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const W = "#FFFFFF", G10 = "#EEF0F3", G30 = "#B1B7C3", G60 = "#5B616E", G80 = "#32353D", K = "#0A0B0D";
const BLUE = "#0000FF", CER = "#3C8AFF", GREEN = "#66C800";

/** [name, foreground, background, minimum]. Text needs 4.5; lines, outlines and focus rings need 3. */
const PAIRS: [string, string, string, number][] = [
  ["light body", K, W, 4.5],
  ["light muted text / Clear", G60, W, 4.5],
  ["light muted on panel (steps, phone bar)", G60, G10, 4.5],
  ["light link", BLUE, W, 4.5],
  ["light link on panel", BLUE, G10, 4.5],
  ["white on Base Blue (band, Generate, Copy, Start here)", W, BLUE, 4.5],
  ["COPIED", K, GREEN, 4.5],
  ["ON BOARD pill light", K, G10, 4.5],
  ["prompt light", W, K, 4.5],
  ["scroll pill", W, G80, 4.5],
  ["light set-box drawing", G60, G10, 3],
  ["dark body", W, K, 4.5],
  ["dark muted", G30, K, 4.5],
  ["dark muted on Gray 80", G30, G80, 4.5],
  ["dark link", CER, K, 4.5],
  ["dark step label", W, K, 4.5],
  ["dark step line", CER, K, 3],
  ["dark prompt / ON BOARD pill", W, G80, 4.5],
  ["dark blueprint outline", G60, K, 3],
  ["dark set-box drawing", G30, G80, 3],
  ["dark focus ring", CER, K, 3],
];

describe("colour contrast (brand palette, WCAG AA)", () => {
  it.each(PAIRS)("%s", (_name, fg, bg, min) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(min);
  });

  it("never uses Base Blue as text on the dark surface", () => {
    expect(ratio(BLUE, K)).toBeLessThan(4.5); // documents why dark mode swaps it for white / Cerulean
  });
});
