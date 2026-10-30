// npm run bake-sprites — renders every Lego from the board's own 3D rig (same studio, materials,
// lens and camera direction) on a transparent background, crops it tight to the brick and its
// contact shadow, and writes:
//   public/sprites/<legoId>.webp        tray sprite (hero 2x4 = HERO_W px wide; 2x2 at the same scale)
//   public/sprites/glyph-<legoId>.webp  unprinted 2x4 glyph, GLYPH px, for small lists
//   src/components/bricks/spriteMeta.ts pixel sizes + aspect, so <BrickSprite> reserves its box.
// Uses Playwright's bundled Chromium with real GPU flags. ONLY=<id> bakes one Lego.
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve, GPU_ARGS } from "./serve.mjs";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const outDir = path.join(repo, "public/sprites");
const DPR = 2;
/** Render viewport (CSS px) at RENDER_DPR, then crop and downsample: supersampled edges and print. */
const VIEWPORT = [360, 280];
const RENDER_DPR = 3;
/** Final width of a hero 2x4 sprite, px (= 280 CSS px at 2x). 2x2 sprites keep the same mm-to-px scale. */
const HERO_W = 560;
/** Glyph canvas, px (64 x 40 CSS px at 2x). */
const GLYPH = [128, 80];
/** Alpha below this counts as empty when cropping (invisible on any background). */
const ALPHA_CUT = 6;
const PAD = 2;

// Read the lego list (id + tier) from the source so the script never drifts from src/lib/legos.ts.
const src = fs.readFileSync(path.join(repo, "src/lib/legos.ts"), "utf8");
const ids = [...src.matchAll(/^\s{4}id: "([a-z0-9-]+)",\s*\n\s{4}tier: "(featured|secondary)"/gm)].map((m) => ({ id: m[1], hero: m[2] === "featured" }));
if (ids.length !== 13) throw new Error(`expected 13 legos in src/lib/legos.ts, found ${ids.length}`);

/** Bounding box of pixels with alpha >= ALPHA_CUT, padded. */
async function alphaBox(png) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] >= ALPHA_CUT) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error("empty render");
  x0 = Math.max(0, x0 - PAD);
  y0 = Math.max(0, y0 - PAD);
  x1 = Math.min(info.width - 1, x1 + PAD);
  y1 = Math.min(info.height - 1, y1 + PAD);
  const touches = x0 === 0 || y0 === 0 || x1 === info.width - 1 || y1 === info.height - 1;
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1, full: [info.width, info.height], touches };
}

fs.mkdirSync(outDir, { recursive: true });
const only = process.env.ONLY;
const s = await serve();
const browser = await chromium.launch({ args: GPU_ARGS });
const page = await browser.newPage({ viewport: { width: VIEWPORT[0], height: VIEWPORT[1] }, deviceScaleFactor: RENDER_DPR });
page.on("pageerror", (e) => console.error("pageerror", e.message));

async function render(id, glyph) {
  await page.goto(`${s.url}?bake=${id}${glyph ? "&glyph=1" : ""}`);
  await page.waitForFunction(() => window.__bakeReady === true, null, { timeout: 60000 });
  const renderer = await page.evaluate(() => {
    const gl = document.querySelector("canvas")?.getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unknown";
  });
  if (/swiftshader/i.test(renderer) && process.env.SWIFTSHADER !== "1") console.warn("warning: software renderer", renderer);
  const png = await page.locator("canvas").screenshot({ omitBackground: true });
  const box = await alphaBox(png);
  if (box.touches) console.warn(`warning: ${id}${glyph ? " glyph" : ""} touches the render edge`, box);
  return { png, box, renderer };
}

const webp = (img) => img.webp({ quality: 88, alphaQuality: 85, effort: 6, smartSubsample: true });

// Same scale for every sprite: set by the hero 2x4 crop width.
let scale = null;
const meta = {};
let total = 0;
try {
  const order = [...ids].sort((a, b) => Number(b.hero) - Number(a.hero));
  for (const { id, hero } of order) {
    const { png, box, renderer } = await render(id, false);
    if (scale === null) {
      if (!hero) throw new Error("first bake must be a hero brick");
      scale = HERO_W / box.width;
    }
    const w = Math.round(box.width * scale);
    const h = Math.round(box.height * scale);
    meta[id] = { width: w, height: h, aspect: +(w / h).toFixed(4) };
    if (only && only !== id) continue;
    const file = path.join(outDir, `${id}.webp`);
    await webp(sharp(png).extract(box).resize(w, h, { kernel: "lanczos3" })).toFile(file);

    const g = await render(id, true);
    const gfile = path.join(outDir, `glyph-${id}.webp`);
    await webp(
      sharp(g.png)
        .extract(g.box)
        .resize(GLYPH[0], GLYPH[1], { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" }),
    ).toFile(gfile);
    const bytes = fs.statSync(file).size + fs.statSync(gfile).size;
    total += bytes;
    console.log(`${id.padEnd(14)} ${`${w}x${h}`.padEnd(9)} ${(fs.statSync(file).size / 1024).toFixed(1)} KB  glyph ${(fs.statSync(gfile).size / 1024).toFixed(1)} KB  (${renderer})`);
  }
} finally {
  await browser.close();
  await s.close();
}

const ordered = ids.map(({ id }) => [id, meta[id]]);
const manifest = `// Generated by scripts/bake-sprites/bake.mjs. Do not edit by hand.
export type SpriteMeta = {
  /** Pixel size of public/sprites/<legoId>.webp (baked at SPRITE_DPR). */
  width: number;
  height: number;
  /** width / height */
  aspect: number;
};

/** Device pixel ratio the sprites were baked at: CSS size = pixel size / SPRITE_DPR. */
export const SPRITE_DPR = ${DPR};

/** Tight-cropped tray sprites, per Lego id. */
export const SPRITE_META: Readonly<Record<string, SpriteMeta>> = {
${ordered.map(([id, m]) => `  ${JSON.stringify(id)}: { width: ${m.width}, height: ${m.height}, aspect: ${m.aspect} },`).join("\n")}
};

/** Glyph sprites public/sprites/glyph-<legoId>.webp: one shape (a 2x4 brick), all the same size. */
export const GLYPH_META: SpriteMeta = { width: ${GLYPH[0]}, height: ${GLYPH[1]}, aspect: ${+(GLYPH[0] / GLYPH[1]).toFixed(4)} };
`;
fs.writeFileSync(path.join(repo, "src/components/bricks/spriteMeta.ts"), manifest);
const all = fs.readdirSync(outDir).filter((f) => f.endsWith(".webp")).reduce((a, f) => a + fs.statSync(path.join(outDir, f)).size, 0);
console.log(`baked ${only ? 1 : ids.length} (+glyphs); this run ${(total / 1024).toFixed(1)} KB; all sprites ${(all / 1024).toFixed(1)} KB`);
if (all > 400 * 1024) throw new Error(`sprite budget exceeded: ${(all / 1024).toFixed(1)} KB > 400 KB`);
