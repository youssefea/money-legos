import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import DevBricks from "@/app/dev/bricks/DevBricks";
import SpriteBake from "@/components/bricks/three/SpriteBake";
import { toPlacedBricks } from "@/lib/bricks";
import { isLegoId } from "@/lib/legos";

const q = new URLSearchParams(window.location.search);
const bake = q.get("bake");
const glyph = q.get("glyph") === "1";
const root = createRoot(document.getElementById("root")!);
if (bake && isLegoId(bake)) {
  document.documentElement.classList.add("bake");
  const brick = toPlacedBricks([bake])[0]!;
  // Glyphs are all the same 2x4 shape, in the Lego's colour.
  root.render(<SpriteBake brick={glyph ? { ...brick, size: [4, 2] } : brick} glyph={glyph} />);
} else {
  root.render(<DevBricks />);
}
