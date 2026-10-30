// Close-up QA render of single tray bricks at full bake resolution (no crop or downsample), for
// comparing materials and lighting against a reference photo. node scripts/bake-sprites/hero.mjs
// OUT=dir (default ../design/bricks-shots-v3)  IDS=b20,validity  DARK=1 (dark page behind)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve, GPU_ARGS } from "./serve.mjs";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const out = process.env.OUT ?? path.join(repo, "../design/bricks-shots-v3");
fs.mkdirSync(out, { recursive: true });
const ids = (process.env.IDS ?? "b20,payments,financing,validity,speed").split(",");
const s = await serve();
const browser = await chromium.launch({ args: GPU_ARGS });
try {
  const page = await browser.newPage({ viewport: { width: 360, height: 280 }, deviceScaleFactor: 3 });
  for (const id of ids) {
    await page.goto(`${s.url}?bake=${id}`);
    await page.waitForFunction(() => window.__bakeReady === true, null, { timeout: 60000 });
    const file = path.join(out, `closeup-${id}.png`);
    await page.locator("canvas").screenshot({ path: file, omitBackground: process.env.DARK !== "1" });
    console.log("closeup", file);
  }
} finally {
  await browser.close();
  await s.close();
}
