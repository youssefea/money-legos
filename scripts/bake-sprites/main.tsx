import { createRoot } from "react-dom/client";
import "@/styles/globals.css";
import DevBricks from "@/app/dev/bricks/DevBricks";
import SpriteBake from "@/components/bricks/three/SpriteBake";
import { toPlacedBricks } from "@/lib/bricks";
import { isLegoId } from "@/lib/legos";

const q = new URLSearchParams(window.location.search);
const bake = q.get("bake");
const root = createRoot(document.getElementById("root")!);
if (bake && isLegoId(bake)) {
  document.documentElement.classList.add("bake");
  root.render(<SpriteBake brick={toPlacedBricks([bake])[0]!} />);
} else {
  root.render(<DevBricks />);
}
