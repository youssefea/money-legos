// QA screenshots of the brick layer -> ../design/bricks-shots/ (or OUT=dir). Real GPU, bundled Chromium.
// node scripts/bake-sprites/shots.mjs   [ONLY=substring]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve, GPU_ARGS } from "./serve.mjs";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const out = process.env.OUT ?? path.join(repo, "../design/bricks-shots");
fs.mkdirSync(out, { recursive: true });
const STACKS = { 1: "b20", 3: "b20,payments,validity", 4: "b20,payments,validity,speed" };
const VIEWS = { "1440x900": [1440, 900, 2], "390x844": [390, 844, 3] };
const jobs = [];
for (const [v, size] of Object.entries(VIEWS)) {
  for (const theme of ["light", "dark"]) {
    const d = theme === "dark" ? "&dark=1" : "";
    for (const n of [1, 3, 4]) jobs.push([`stage-${theme}-${v}-${n}brick${n > 1 ? "s" : ""}`, `?only=stage&ids=${STACKS[n]}${d}`, size]);
    jobs.push([`sprites-${theme}-${v}`, `?only=sprites${d}`, size, true]);
    jobs.push([`svg-fallback-${theme}-${v}-4bricks`, `?only=svg&ids=${STACKS[4]}${d}`, size]);
  }
}
jobs.push(["dev-page-light-1440", "?ids=" + STACKS[3], [1440, 1500, 1], true]);
jobs.push(["dev-page-dark-1440", "?dark=1&ids=" + STACKS[4], [1440, 1500, 1], true]);

const only = process.env.ONLY;
const s = await serve();
const browser = await chromium.launch({ args: GPU_ARGS });
try {
  for (const [name, q, [w, h, dpr], fullPage] of jobs) {
    if (only && !name.includes(only)) continue;
    const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
    page.on("pageerror", (e) => console.error(name, "pageerror", e.message));
    await page.goto(s.url + q);
    await page.waitForFunction(() => [...document.querySelectorAll("[data-testid=brick-stage]")].every((e) => e.getAttribute("data-ready") === "true"), null, { timeout: 30000 });
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 30000 });
    await page.waitForTimeout(1500); // AO fade-in and ghost entrance
    const info = await page.evaluate(() => [...document.querySelectorAll("[data-testid=brick-stage]")].map((e) => e.getAttribute("data-renderer")).join(","));
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: Boolean(fullPage) });
    console.log("shot", name, info);
    await page.close();
  }
} finally {
  await browser.close();
  await s.close();
}
