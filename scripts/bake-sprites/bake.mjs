// npm run bake-sprites — renders every Lego from the board's own 3D rig (same studio, materials,
// lens and camera direction) on a transparent background, crops it tight to the brick and its
// contact shadow, and writes:
//   public/sprites/<legoId>.webp        tray sprite: every hero 2x4 on the same CANVAS (192x104 CSS px at 2x,
//                                       TOP_PAD clear above the rear studs); 2x2s at the same mm-to-px
//                                       scale, same height and baseline, width = brick + side margins
//   public/sprites/glyph-<legoId>.webp  unprinted 2x4 glyph, GLYPH px, for small lists (heroes only)
//   src/components/bricks/spriteMeta.ts pixel sizes + aspect, so <BrickSprite> reserves its box.
// The catalog comes from the harness (ALL_BRICKS). Uses Playwright's bundled Chromium with real GPU
// flags. ONLY=<id> bakes one Lego.
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
/** Hero sprite canvas, px (192 x 104 CSS px at 2x). */
const CANVAS = [384, 208];
/** Clear space above the brick (16 CSS px) so rear studs are never cropped, and at the other sides. */
const TOP_PAD = 32;
const SIDE_PAD = 8;
const BOTTOM_PAD = 6;
/** Glyph canvas, px (64 x 40 CSS px at 2x). */
const GLYPH = [128, 80];
/** Alpha below this counts as empty when cropping (invisible on any background). */
const ALPHA_CUT = 6;
const PAD = 2;

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

// The catalog, from the harness (src/lib/bricks ALL_BRICKS): id, footprint, tier.
await page.goto(`${s.url}?list=1`);
const ids = (await page.waitForFunction(() => window.__bricks).then((h) => h.jsonValue())).map((b) => ({ id: b.id, hero: b.hero, size: b.size }));
if (ids.length < 13) throw new Error(`expected the full catalog, found ${ids.length} bricks`);
const keep = new Set(ids.flatMap(({ id, hero }) => [`${id}.webp`, ...(hero ? [`glyph-${id}.webp`] : [])]));

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

// Same scale for every sprite: set by fitting the first hero 2x4 (brick + shadow) inside the canvas.
let scale = null;
const meta = {};
let total = 0;
try {
  // Scale reference first: a hero 2x4.
  const ref = (b) => (b.hero && b.size[0] === 4 && b.size[1] === 2 ? 2 : b.hero ? 1 : 0);
  const order = [...ids].sort((a, b) => ref(b) - ref(a));
  for (const { id, hero, size } of order) {
    const { png, box, renderer } = await render(id, false);
    if (scale === null) {
      if (!hero || size[0] !== 4 || size[1] !== 2) throw new Error("first bake must be a hero 2x4");
      scale = Math.min((CANVAS[0] - 2 * SIDE_PAD) / box.width, (CANVAS[1] - TOP_PAD - BOTTOM_PAD) / box.height);
    }
    const w = Math.min(CANVAS[0] - 2 * SIDE_PAD, Math.round(box.width * scale));
    const h = Math.min(CANVAS[1] - TOP_PAD - BOTTOM_PAD, Math.round(box.height * scale));
    const cw = size[0] === 4 && size[1] === 2 ? CANVAS[0] : w + 2 * SIDE_PAD;
    const ch = CANVAS[1];
    meta[id] = { width: cw, height: ch, aspect: +(cw / ch).toFixed(4) };
    if (only && only !== id) continue;
    const file = path.join(outDir, `${id}.webp`);
    // Bottom-aligned above BOTTOM_PAD so every sprite shares one baseline; centred across.
    const left = Math.round((cw - w) / 2);
    const top = ch - BOTTOM_PAD - h;
    const fitted = await sharp(png).extract(box).resize(w, h, { kernel: "lanczos3" }).png().toBuffer();
    await webp(
      sharp({ create: { width: cw, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).composite([{ input: fitted, left, top }]),
    ).toFile(file);

    let bytes = fs.statSync(file).size;
    let gsize = "";
    // Glyphs (unprinted 2x4s for small lists) only for the five heroes: the UI draws its own elsewhere.
    if (hero) {
      const g = await render(id, true);
      const gfile = path.join(outDir, `glyph-${id}.webp`);
      await webp(
        sharp(g.png)
          .extract(g.box)
          .resize(GLYPH[0], GLYPH[1], { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" }),
      ).toFile(gfile);
      bytes += fs.statSync(gfile).size;
      gsize = `  glyph ${(fs.statSync(gfile).size / 1024).toFixed(1)} KB`;
    }
    total += bytes;
    console.log(`${id.padEnd(16)} ${size.join("x")}  ${`${cw}x${ch}`.padEnd(8)} ${(fs.statSync(file).size / 1024).toFixed(1)} KB${gsize}  (${renderer})`);
  }
} finally {
  await browser.close();
  await s.close();
}

// Drop sprites of ids that left the catalog (and non-hero glyphs).
if (!only) for (const f of fs.readdirSync(outDir)) if (f.endsWith(".webp") && !keep.has(f)) fs.rmSync(path.join(outDir, f));
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

/**
 * Tray sprites, per Lego id: heroes on one ${CANVAS[0]}x${CANVAS[1]} canvas (${CANVAS[0] / DPR}x${CANVAS[1] / DPR} CSS px, ${TOP_PAD / DPR} px clear above the
 * rear studs); 2x2s at the same scale and height. Seen from TRAY_CAMERA (more front-on than the board).
 */
export const SPRITE_META: Readonly<Record<string, SpriteMeta>> = {
${ordered.map(([id, m]) => `  ${JSON.stringify(id)}: { width: ${m.width}, height: ${m.height}, aspect: ${m.aspect} },`).join("\n")}
};

/** Glyph sprites public/sprites/glyph-<legoId>.webp (the five heroes only): one shape, a 2x4 brick. */
export const GLYPH_META: SpriteMeta = { width: ${GLYPH[0]}, height: ${GLYPH[1]}, aspect: ${+(GLYPH[0] / GLYPH[1]).toFixed(4)} };
`;
fs.writeFileSync(path.join(repo, "src/components/bricks/spriteMeta.ts"), manifest);
const all = fs.readdirSync(outDir).filter((f) => f.endsWith(".webp")).reduce((a, f) => a + fs.statSync(path.join(outDir, f)).size, 0);
console.log(`baked ${only ? 1 : ids.length} (+glyphs); this run ${(total / 1024).toFixed(1)} KB; all sprites ${(all / 1024).toFixed(1)} KB`);
if (all > 700 * 1024) throw new Error(`sprite budget exceeded: ${(all / 1024).toFixed(1)} KB > 700 KB`);
