// Frame-rate probe for the live board: vsync off, real GPU. Reports the stage's own measurement
// (median fps of animation frames, `data-fps`) during drops, plus load timings.
// node scripts/bake-sprites/perf.mjs
import { chromium } from "playwright";
import { serve, GPU_ARGS } from "./serve.mjs";

const s = await serve();
const browser = await chromium.launch({ args: [...GPU_ARGS, "--disable-gpu-vsync", "--disable-frame-rate-limit"] });
for (const [w, h, dpr] of [[1440, 900, 2], [1920, 1080, 1], [390, 844, 3]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const t0 = Date.now();
  await page.goto(s.url + "?n=2");
  await page.waitForFunction(() => document.querySelector("[data-testid=brick-stage]")?.getAttribute("data-ready") === "true");
  const ready = Date.now() - t0;
  const fps = [];
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Remove top" }).click();
    await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelector("[data-testid=brick-stage]").removeAttribute("data-fps"));
    await page.getByRole("button", { name: "Add brick" }).click();
    await page.waitForTimeout(600);
    fps.push(await page.evaluate(() => document.querySelector("[data-testid=brick-stage]").getAttribute("data-fps")));
  }
  console.log(`${w}x${h}@${dpr}: board ready ${ready} ms (dev harness, unminified), drop fps samples ${fps.join(", ")}`);
  await page.close();
}
await browser.close();
await s.close();
