// Quick look: node scripts/bake-sprites/probe.mjs "<query>" out.png [w h dpr]
import { chromium } from "playwright";
import { serve, GPU_ARGS } from "./serve.mjs";
const [q = "", out = "/tmp/probe.png", w = "1440", h = "900", dpr = "1"] = process.argv.slice(2);
const s = await serve();
const browser = await chromium.launch({ args: GPU_ARGS });
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
page.on("pageerror", (e) => console.log("pageerror", e.message));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("console", m.type(), m.text().slice(0, 300)); });
await page.goto(s.url + q);
await page.waitForTimeout(+(process.env.WAIT ?? 4000));
console.log(await page.evaluate(() => [...document.querySelectorAll("[data-testid=brick-stage]")].map((e) => `${e.dataset.renderer} ready=${e.dataset.ready} fps=${e.dataset.fps}`).join(" | ")));
await page.screenshot({ path: out });
await browser.close();
await s.close();
