import { expect, test, type Page } from "@playwright/test";

const brick = (page: Page, verb: string, name: string) =>
  page.getByRole("button", { name: new RegExp(`^${verb} ${name}`) });
const status = (page: Page) => page.getByRole("status").filter({ hasText: /./ }).last();
const live = (page: Page) => page.locator('p[aria-live="polite"]');

test.describe("desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("first screen explains itself and Generate says what it needs", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Snap together a money app.");
    await expect(page.getByTestId("board-count")).toHaveText("0 of 4");
    const gen = page.getByRole("button", { name: "Generate app" });
    await expect(gen).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator("#generate-need")).toHaveText("Pick 2 or more Legos");
    await expect(page.getByText(/Set #00 · 0 of 4 pieces/i)).toBeVisible();
    await expect(page.getByText("Live on Base Sepolia · mainnet targeting Nov 2026")).toBeVisible();
  });

  test("place via click, then click again to remove", async ({ page }) => {
    const issue = brick(page, "Issue", "B20");
    await issue.click();
    await expect(issue).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("board-count")).toHaveText("1 of 4");
    await expect(live(page)).toHaveText(/Issue added, 1 of 4/);
    await expect(page.locator("#generate-need")).toHaveText("1 more Lego needed");
    await expect(issue).toContainText("On board");
    await issue.click();
    await expect(issue).toHaveAttribute("aria-pressed", "false");
    await expect(live(page)).toHaveText(/Issue removed, 0 of 4/);
  });

  test("place via keyboard (Enter and Space)", async ({ page }) => {
    await brick(page, "Issue", "B20").focus();
    await page.keyboard.press("Enter");
    await brick(page, "Pay", "Accept payments").focus();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("board-count")).toHaveText("2 of 4");
    await expect(page.getByRole("button", { name: "Generate app" })).toHaveAttribute("aria-disabled", "false");
  });

  test("place via drag and drop", async ({ page }) => {
    const grow = brick(page, "Grow", "Financing");
    const from = (await grow.boundingBox())!;
    const to = (await page.locator('[class*="drop"]').first().boundingBox())!;
    await page.mouse.move(from.x + 40, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 80, from.y + from.height / 2, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect(grow).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("board-count")).toHaveText("1 of 4");
  });

  test("generate opens the set box with steps, docs and the prompt", async ({ page }) => {
    await brick(page, "Issue", "B20").click();
    await brick(page, "Pay", "Accept payments").click();
    await page.getByRole("button", { name: "Generate app" }).click();
    const card = page.getByTestId("set-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Why each Lego matters")).toBeVisible();
    await expect(card.getByText("Build steps")).toBeVisible();
    await expect(page.getByTestId("prompt")).toContainText("Build an MVP of");
    await expect(page.locator('[aria-label="Steps"] li').nth(1)).toHaveAttribute("data-state", "done");
    await expect(page).toHaveURL(/#b20,payments$/);
  });

  test("recipe loads its stack and generates", async ({ page }) => {
    await page.getByRole("button", { name: "Neobroker" }).click();
    await expect(page.getByTestId("set-card").getByRole("heading", { level: 2 })).toHaveText("Neobroker");
    await expect(page.getByTestId("board-count")).toHaveText("4 of 4");
    await expect(page).toHaveURL(/#recipe=neobroker$/);
  });

  test("surprise me loads a curated set", async ({ page }) => {
    await page.getByRole("button", { name: "Surprise me" }).click();
    await expect(page.getByTestId("set-card")).toBeVisible();
    await expect(page.getByTestId("board-count")).toHaveText(/[234] of 4/);
  });

  test("clear empties the board and closes the set", async ({ page }) => {
    await page.getByRole("button", { name: "Neobank" }).click();
    await expect(page.getByTestId("set-card")).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByTestId("board-count")).toHaveText("0 of 4");
    await expect(page.getByTestId("set-card")).toHaveCount(0);
    await expect(live(page)).toHaveText(/Board cleared/);
    await expect(page).toHaveURL(/\/$/);
  });

  test("copy prompt turns green, then resets", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Agent-paid API" }).click();
    const copy = page.getByRole("button", { name: "Copy prompt" });
    await copy.click();
    const copied = page.getByRole("button", { name: "Copied" });
    await expect(copied).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain('Build an MVP of "Agent-paid API" on Base.');
    await expect(page.locator('[aria-label="Steps"] li').nth(2)).toHaveAttribute("data-state", "done");
    await expect(page.getByRole("button", { name: "Copy prompt" })).toBeVisible({ timeout: 4000 });
  });

  test("copy falls back to selecting the prompt when the clipboard is blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) } });
    });
    await page.goto("/#recipe=neobank");
    await page.getByRole("button", { name: "Copy prompt" }).click();
    await expect(page.getByText(/press Cmd\+C or Ctrl\+C/)).toBeVisible();
    const sel = await page.evaluate(() => window.getSelection()?.toString() ?? "");
    expect(sel).toContain("Build an MVP of");
  });

  test("max 4 Legos, then swap", async ({ page }) => {
    for (const [v, n] of [
      ["Issue", "B20"],
      ["Pay", "Accept payments"],
      ["Grow", "Financing"],
      ["Trade", "Validity transactions"],
    ]) {
      await brick(page, v!, n!).click();
    }
    await expect(page.getByTestId("board-count")).toHaveText("4 of 4");
    await brick(page, "Speed", "200ms blocks").click();
    await expect(brick(page, "Speed", "200ms blocks")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Max 4 Legos. Click a placed brick to swap.").first()).toBeVisible();
    await brick(page, "Grow", "Financing").click();
    await brick(page, "Speed", "200ms blocks").click();
    await expect(brick(page, "Speed", "200ms blocks")).toHaveAttribute("aria-pressed", "true");
  });

  test("more Legos disclosure", async ({ page }) => {
    const more = page.getByRole("button", { name: "+ 8 more Legos" });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await more.click();
    await expect(page.getByRole("button", { name: "Show fewer Legos" })).toHaveAttribute("aria-expanded", "true");
    await brick(page, "Swap", "Swaps").click();
    await expect(page.getByTestId("board-count")).toHaveText("1 of 4");
  });

  test("detail popover opens, closes on Escape and returns focus", async ({ page }) => {
    const info = page.getByRole("button", { name: "About Speed (200ms blocks)" });
    await info.click();
    const pop = page.getByRole("dialog", { name: /Speed/ });
    await expect(pop).toBeVisible();
    await expect(pop).toContainText("mainnet targeting November 2026");
    await expect(pop).toContainText("Testnet");
    await page.keyboard.press("Escape");
    await expect(pop).toHaveCount(0);
    await expect(info).toBeFocused();
  });
});

test("hash restores the board and opens the set", async ({ page }) => {
  await page.goto("/#b20,payments,speed");
  await expect(brick(page, "Issue", "B20")).toHaveAttribute("aria-pressed", "true");
  await expect(brick(page, "Speed", "200ms blocks")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("board-count")).toHaveText("3 of 4");
  await expect(page.getByTestId("set-card")).toBeVisible();
});

test("hash recipe restores", async ({ page }) => {
  await page.goto("/#recipe=agent-paid-api");
  await expect(page.getByTestId("set-card").getByRole("heading", { level: 2 })).toHaveText("Agent-paid API");
  await expect(page.getByRole("button", { name: "Agent-paid API" })).toHaveAttribute("aria-pressed", "true");
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("set box opens as a bottom sheet with focus management", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByTestId("mobile-bar");
    await expect(bar).toBeVisible();
    await expect(bar).toContainText("0/4");
    await brick(page, "Issue", "B20").tap();
    await brick(page, "Pay", "Accept payments").tap();
    await expect(bar).toContainText("2/4");
    await bar.getByRole("button", { name: "Generate" }).tap();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(sheet.getByRole("button", { name: "Copy prompt" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(bar.getByRole("button", { name: "Open set" })).toBeFocused();
    await bar.getByRole("button", { name: "Open set" }).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close set" }).tap();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("recipe pill opens the sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Neobank" }).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

void status;
