// QA screenshots of the brick layer -> ../design/bricks-shots-v3/ (or OUT=dir). Real GPU, bundled Chromium.
// node scripts/bake-sprites/shots.mjs   [ONLY=substring]
// Stages are drawn in fixed-size panels: desktop board panel 567x520 and the phone scene region 144x130.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve, GPU_ARGS } from "./serve.mjs";

const repo = fileURLToPath(new URL("../..", import.meta.url));
const out = process.env.OUT ?? path.join(repo, "../design/bricks-shots-v3");
fs.mkdirSync(out, { recursive: true });
const STACKS = { 0: "", 1: "b20", 3: "b20,payments,validity", 4: "b20,payments,validity,speed" };
// [panel, viewport w, h, dpr]
const VIEWS = { desktop: ["567x520", 640, 580, 2], phone: ["144x130", 390, 180, 3] };
const jobs = [];
for (const [v, [box, w, h, dpr]] of Object.entries(VIEWS)) {
  for (const theme of ["light", "dark"]) {
    const d = theme === "dark" ? "&dark=1" : "";
    for (const n of [0, 1, 3, 4]) jobs.push([`stage-${theme}-${v}-${n}brick${n === 1 ? "" : "s"}`, `?only=stage&box=${box}&n=${n}&ids=${STACKS[n]}${d}`, [w, h, dpr]]);
    jobs.push([`svg-fallback-${theme}-${v}-3bricks`, `?only=svg&box=${box}&ids=${STACKS[3]}${d}`, [w, h, dpr]]);
  }
}
for (const theme of ["light", "dark"]) jobs.push([`sprites-${theme}`, `?only=sprites${theme === "dark" ? "&dark=1" : ""}`, [1440, 900, 2], true]);
jobs.push(["sprites-light-phone", "?only=sprites", [390, 844, 3], true]);

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
    const info = await page.evaluate(() => {
      const st = document.querySelector("[data-testid=brick-stage]");
      const c = document.querySelector("canvas");
      return st ? `${st.getAttribute("data-renderer")} plate=${c?.dataset.platePx ?? "-"}px top=${st.getAttribute("data-stack-top")}` : "";
    });
    const panel = page.getByTestId("box-panel");
    if (await panel.count()) await panel.screenshot({ path: path.join(out, `${name}.png`) });
    else await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: Boolean(fullPage) });
    console.log("shot", name, info);
    await page.close();
  }
} finally {
  await browser.close();
  await s.close();
}
