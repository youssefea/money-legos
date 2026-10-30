import { test, type Page } from "@playwright/test";
import { join } from "node:path";

/**
 * Design QA screenshots (not a test). Run with:
 *   SHOTS=1 npx playwright test shots
 * Writes PNGs to SHOTS_DIR (default ../design/ui-shots-v6).
 */
const DIR = process.env.SHOTS_DIR ?? join(process.cwd(), "..", "design", "ui-shots-v6");
const SIZES = [
  [320, 640],
  [390, 844],
  [768, 1024],
  [1280, 720],
  [1440, 900],
  [1920, 1080],
] as const;
const SCHEMES = ["light", "dark"] as const;
/** empty; wire = 2 bricks placed, not built (wireframe tiles); built = a 4-brick link (the phone sheet on compact). */
const STATES = ["empty", "wire", "built"] as const;

test.skip(!process.env.SHOTS, "set SHOTS=1 to take design screenshots");

async function open(page: Page, w: number, state: string) {
  const compact = w < 1024;
  const built = ["built", "details", "inspect", "full", "toast", "present"].includes(state);
  await page.goto(built ? "/#b20,payments,speed,financing" : "/");
  await page.waitForTimeout(1200);
  if (state === "wire") {
    await page.locator('button[data-lego="b20"]').click();
    await page.locator('button[data-lego="payments"]').click();
  }
  if (state === "filter") {
    await page.getByRole("button", { name: "Agents", exact: true }).click();
    await page.locator('button[data-lego="x402-api"]').click();
  }
  if (state === "recipes") await page.getByTestId("recipes").locator("visible=true").click();
  if (state === "details") {
    if (compact) await page.getByTestId("result-sheet").getByRole("button", { name: "Details" }).click();
    else await page.getByRole("button", { name: "Details" }).click();
  }
  if (state === "inspect") {
    // Hover the brick on the board: its tile lights up and its silhouette is outlined.
    if (compact) await page.getByTestId("result-sheet").locator('[data-tile="payments"] button').click();
    else await page.locator('[data-board-brick="payments"]').hover();
  }
  if (compact && (state === "full" || state === "toast")) await page.keyboard.press("Escape");
  if (state === "full" || state === "toast") await page.locator('button[data-lego="validity"]').click();
  if (state === "present") await page.locator("body").press("p");
  await page.waitForTimeout(1000);
}

const EXTRA: [number, number, string, string][] = [
  [1440, 900, "light", "filter"],
  [1440, 900, "dark", "filter"],
  [1440, 900, "light", "recipes"],
  [1440, 900, "light", "details"],
  [1440, 900, "light", "inspect"],
  [1440, 900, "dark", "inspect"],
  [1440, 900, "light", "toast"],
  [1440, 900, "dark", "toast"],
  [1440, 900, "light", "present"],
  [1920, 1080, "light", "present"],
  [1920, 1080, "dark", "present"],
  [1920, 1080, "dark", "details"],
  [390, 844, "light", "inspect"],
  [390, 844, "light", "details"],
  [390, 844, "dark", "details"],
  [390, 844, "light", "toast"],
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
