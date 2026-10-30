import { test } from "@playwright/test";
import { join } from "node:path";

/**
 * Design QA screenshots (not a test). Run with:
 *   SHOTS=1 npx playwright test shots
 * Writes PNGs to SHOTS_DIR (default ../design/ui-shots-v3).
 */
const DIR = process.env.SHOTS_DIR ?? join(process.cwd(), "..", "design", "ui-shots-v3");
const SIZES = [
  [390, 844],
  [768, 1024],
  [1440, 900],
  [1920, 1080],
] as const;
const SCHEMES = ["light", "dark"] as const;
const STATES = ["empty", "one", "result"] as const;

test.skip(!process.env.SHOTS, "set SHOTS=1 to take design screenshots");

for (const [w, h] of SIZES) {
  for (const scheme of SCHEMES) {
    for (const state of STATES) {
      test(`${w}x${h} ${scheme} ${state}`, async ({ browser }) => {
        const phone = w < 768;
        const compact = w < 1024;
        const context = await browser.newContext({
          viewport: { width: w, height: h },
          colorScheme: scheme,
          deviceScaleFactor: 1,
          hasTouch: phone,
          isMobile: phone,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        await page.goto(state === "result" ? "/#b20,payments,validity" : "/");
        await page.waitForTimeout(600);
        if (state === "one") await page.locator('[data-lego="b20"]').click();
        if (state === "result" && compact) await page.getByTestId("mobile-bar").getByRole("button", { name: "Open set" }).click();
        await page.waitForTimeout(900);
        await page.screenshot({ path: join(DIR, `${w}x${h}-${scheme}-${state}.png`) });
        await context.close();
      });
    }
  }
}
