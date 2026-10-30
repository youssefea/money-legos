import { test, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * Design QA screenshots (not a test). Run with:
 *   SHOTS=1 npx playwright test shots
 * Writes PNGs to SHOTS_DIR (default ../design/ui-shots-v4).
 */
const DIR = process.env.SHOTS_DIR ?? join(process.cwd(), "..", "design", "ui-shots-v4");
const SIZES = [
  [390, 844],
  [768, 1024],
  [1440, 900],
  [1920, 1080],
] as const;
const SCHEMES = ["light", "dark"] as const;
const STATES = ["empty", "one", "result"] as const;

test.skip(!process.env.SHOTS, "set SHOTS=1 to take design screenshots");

async function open(page: Page, w: number, state: string) {
  const compact = w < 1024;
  await page.goto(state === "result" || state === "details" ? "/#b20,payments,speed" : state === "four" ? "/#b20,payments,speed,validity" : "/");
  await page.waitForTimeout(900);
  if (state === "one") await page.locator('button[data-lego="b20"]').click();
  if ((state === "result" || state === "four") && compact) await page.getByTestId("mobile-bar").getByRole("button", { name: "Regenerate" }).click();
  if (state === "filter") {
    await page.getByRole("button", { name: "Money", exact: true }).click();
    await page.locator('button[data-lego="b20"]').click();
    await page.locator('button[data-lego="financing"]').focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowRight");
  }
  if (state === "recipes") await page.getByTestId("recipes").locator("visible=true").click();
  if (state === "details") {
    if (compact) {
      await page.getByTestId("mobile-bar").getByRole("button", { name: "Regenerate" }).click();
      await page.getByTestId("result-sheet").getByRole("button", { name: "Details" }).click();
    } else await page.getByRole("button", { name: "Details" }).click();
  }
  await page.waitForTimeout(900);
}

const EXTRA: [number, number, string, string][] = [
  [1440, 900, "light", "four"],
  [1920, 1080, "light", "four"],
  [1440, 900, "dark", "four"],
  [1440, 900, "light", "filter"],
  [1440, 900, "light", "recipes"],
  [1440, 900, "light", "details"],
  [390, 844, "light", "details"],
];

const ALL: [number, number, string, string][] = [
  ...SIZES.flatMap(([w, h]) => SCHEMES.flatMap((s) => STATES.map((st): [number, number, string, string] => [w, h, s, st]))),
  ...EXTRA,
];

for (const [w, h, scheme, state] of ALL) {
  test(`${w}x${h} ${scheme} ${state}`, async ({ browser }) => {
    const phone = w < 768;
    const context = await browser.newContext({
      viewport: { width: w, height: h },
      colorScheme: scheme as "light" | "dark",
      deviceScaleFactor: 1,
      hasTouch: phone,
      isMobile: phone,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await open(page, w, state);
    await page.screenshot({ path: join(DIR, `${w}x${h}-${scheme}-${state}.png`) });
    await context.close();
  });
}
