import { test, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * Design QA screenshots (not a test). Run with:
 *   SHOTS=1 npx playwright test shots
 * Writes PNGs to SHOTS_DIR (default ../design/ui-shots-v9).
 */
const DIR = process.env.SHOTS_DIR ?? join(process.cwd(), "..", "design", "ui-shots-v9");
const SCHEMES = ["light", "dark"] as const;
test.skip(!process.env.SHOTS, "set SHOTS=1 to take design screenshots");

async function open(page: Page, w: number, state: string) {
  const compact = w < 1024;
  const built = ["built", "sheet", "details", "inspect", "full", "toast", "present"].includes(state);
  // recipe-<slug>: a curated recipe link (largest bricks at the bottom, the anchor task as the hero card).
  const recipe = state.startsWith("recipe-") ? state.slice(7) : null;
  await page.goto(recipe ? `/#recipe=${recipe}` : state === "status-only" ? "/#sponsored-gas,verify,speed" : built ? "/#b20,payments,speed,financing" : "/");
  await page.waitForTimeout(1200);
  if (state === "wire") {
    await page.locator('button[data-lego="b20"]').click();
    await page.locator('button[data-lego="payments"]').click();
  }
  // "bin": the phone page scrolled to the end of the bricks, with the Recipes card row in view.
  if (state === "bin") await page.getByTestId("recipes-shelf").scrollIntoViewIfNeeded();
  if (state === "details") {
    if (compact) await page.getByTestId("result-sheet").getByRole("button", { name: "Details" }).click();
    else await page.getByRole("button", { name: "Details" }).click();
  }
  if (state === "inspect") {
    // Hover the brick on the board: its tile lights up and its silhouette is outlined.
    if (compact) await page.getByTestId("result-sheet").locator('[data-region="payments"] > button').click();
    else await page.locator('[data-board-brick="payments"]').hover();
  }
  // Compact: "built" is the bricks screen with the built app in the bar; "sheet" keeps the app sheet open.
  if (compact && (state === "full" || state === "toast" || state === "built")) await page.keyboard.press("Escape");
  if (state === "full" || state === "toast") await page.locator('button[data-lego="validity"]').click();
  if (state === "present" || state === "present-recipes") await page.locator("body").press("p");
  if (state === "present-recipes") await page.getByTestId("present-drawer").getByTestId("recipes").click();
  await page.waitForTimeout(1000);
}

const DESK: [number, number][] = [
  [1440, 900],
  [1920, 1080],
];
const PHONES: [number, number][] = [
  [390, 844],
  [320, 640],
];
const ALL: [number, number, string, string][] = [
  ...[...DESK, [1280, 720] as [number, number]].flatMap(([w, h]) =>
    SCHEMES.flatMap((s) => (["empty", "built", "present"] as const).map((st): [number, number, string, string] => [w, h, s, st])),
  ),
  ...PHONES.flatMap(([w, h]) => SCHEMES.flatMap((s) => (["empty", "bin", "built", "sheet"] as const).map((st): [number, number, string, string] => [w, h, s, st]))),
  [1440, 900, "light", "present-recipes"],
  [1440, 900, "dark", "present-recipes"],
  [1440, 900, "light", "recipe-pay-a-name"],
  [1440, 900, "dark", "recipe-pay-a-name"],
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

// 200% browser zoom on a 1440x900 laptop = a 720x450 CSS viewport at 2x.
for (const state of ["empty", "built"] as const) {
  test(`zoom200 light ${state}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 720, height: 450 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
    const page = await context.newPage();
    await open(page, 720, state);
    await page.screenshot({ path: join(DIR, `zoom200-1440x900-light-${state}.png`) });
    await context.close();
  });
}
