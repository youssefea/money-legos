import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import DevBricks from "@/app/dev/bricks/DevBricks";
import SpriteBake from "@/components/bricks/three/SpriteBake";
import { ALL_BRICKS, toPlacedBricks } from "@/lib/bricks";
import { isLegoId } from "@/lib/legos";

const q = new URLSearchParams(window.location.search);
const bake = q.get("bake");
const glyph = q.get("glyph") === "1";
const root = createRoot(document.getElementById("root")!);
declare global {
  interface Window {
    __bricks?: typeof ALL_BRICKS;
  }
}
// The baker reads the catalog from here (ids, footprints, colours, tiers): never from source text.
window.__bricks = ALL_BRICKS;
if (bake && isLegoId(bake)) {
  document.documentElement.classList.add("bake");
  const brick = toPlacedBricks([bake])[0]!;
  // Glyphs are all the same 2x4 shape, in the Lego's colour.
  root.render(<SpriteBake brick={glyph ? { ...brick, size: [4, 2] } : brick} glyph={glyph} />);
} else {
  root.render(<DevBricks />);
}
