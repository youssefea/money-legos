import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import DevBricks from "@/app/dev/bricks/DevBricks";
import SpriteBake from "@/components/bricks/three/SpriteBake";
import { ALL_BRICKS, toPlacedBricks } from "@/lib/bricks";
import { isLegoId } from "@/lib/legos";
import { fontStacks, layoutLabel, loadLabelFonts } from "@/components/bricks/core/label";
import { frontFace } from "@/components/bricks/three/geometry";

const q = new URLSearchParams(window.location.search);
const bake = q.get("bake");
const glyph = q.get("glyph") === "1";
const root = createRoot(document.getElementById("root")!);
declare global {
  interface Window {
    __bricks?: typeof ALL_BRICKS;
    /** The tray print's verb font size and the front face width, in mm (as labelTexture lays it out). */
    __bakePrint?: () => Promise<{ verbMm: number; faceMm: number }>;
  }
}
// The baker reads the catalog from here (ids, footprints, colours, tiers): never from source text.
window.__bricks = ALL_BRICKS;
if (bake && isLegoId(bake)) {
  document.documentElement.classList.add("bake");
  const brick = toPlacedBricks([bake])[0]!;
  window.__bakePrint = async () => {
    await loadLabelFonts();
    const { sans } = fontStacks();
    const ctx = document.createElement("canvas").getContext("2d")!;
    // Same measure as labelTexture (verb only: Base Sans Bold, no tracking), at 64 px/mm.
    const face = frontFace(brick.size[0], brick.kind === "plate" ? 1 : 3);
    const L = layoutLabel(brick.label.verb, "", face.width, face.height, (text, _f, size) => {
      ctx.font = `700 ${size * 64}px ${sans}`;
      return ctx.measureText(text).width / 64;
    });
    return { verbMm: L.verb.size, faceMm: face.W };
  };
  // Glyphs are all the same 2x4 shape, in the Lego's colour.
  root.render(<SpriteBake brick={glyph ? { ...brick, size: [4, 2] } : brick} glyph={glyph} />);
} else {
  root.render(<DevBricks />);
}
