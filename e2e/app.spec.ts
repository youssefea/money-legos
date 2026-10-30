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
    const gen = page.getByRole("button", { name: "Generate idea + prompt" });
    await expect(gen).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator("#generate-need")).toHaveText("Pick 2 or more Legos");
    await expect(page.getByText(/Set #00 · 0 of 4 pieces/i)).toBeVisible();
    // The first-action cue sits on the first tray brick; the board only says where the stack goes.
    await expect(page.getByTestId("start-here")).toBeVisible();
    await expect(page.getByText("Your stack builds here")).toBeVisible();
    // Every hero row shows plain text beside its sprite; the Denim line lives in the Speed popover.
    await expect(page.locator('[data-lego="b20"]')).toContainText("Your own dollar");
    await expect(page.locator('[data-lego="speed"]')).toContainText("Sepolia");
    await expect(page.getByText(/mainnet targeting/)).toHaveCount(0);
  });

  test("place via click, then click again to remove", async ({ page }) => {
    const issue = brick(page, "Issue", "B20");
    await issue.click();
    await expect(issue).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("board-count")).toHaveText("1 of 4");
    await expect(live(page)).toHaveText(/Issue added, 1 of 4/);
    await expect(page.locator("#generate-need")).toHaveText("1 more Lego needed");
    await expect(issue).toContainText("On board");
    await expect(issue).toContainText("Remove");
    await expect(page.getByTestId("start-here")).toHaveCount(0);
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
    await expect(page.getByRole("button", { name: "Generate idea + prompt" })).toHaveAttribute("aria-disabled", "false");
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
    await page.getByRole("button", { name: "Generate idea + prompt" }).click();
    const card = page.getByTestId("set-card");
    await expect(card).toBeVisible();
    await expect(card.getByText("Why each Lego matters")).toBeVisible();
    await expect(card.getByText("Build steps")).toBeVisible();
    await expect(card.locator("li", { hasText: "Your own branded B20" })).toBeVisible();
    await expect(card.locator("abbr", { hasText: "B20" })).toHaveAttribute("title", "Base’s native token standard");
    await expect(card.getByRole("link", { name: "Test on Vibenet" })).toBeVisible();
    await expect(card.getByRole("link", { name: "Docs MCP for your agent" })).toBeVisible();
    await expect(card.getByText("Paste it into your coding agent.")).toBeVisible();
    await expect(page.getByTestId("prompt")).toContainText("Build an MVP of");
    await expect(page.getByRole("button", { name: "Regenerate idea" })).toBeVisible();
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

test.describe("result card fits", () => {
  test.use({ reducedMotion: "reduce" });
  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`3-piece set shows every section without clipping at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/#b20,payments,validity");
      const card = page.getByTestId("set-card");
      await expect(card).toBeVisible();
      const r = await card.evaluate((c) => {
        const body = c.children[1] as HTMLElement;
        const box = c.getBoundingClientRect();
        const copy = [...c.querySelectorAll("button")].find((b) => b.textContent?.includes("Copy prompt"))!.getBoundingClientRect();
        return { overflow: body.scrollHeight - body.clientHeight, bottom: box.bottom, vh: innerHeight, copyH: copy.height, copyBottom: copy.bottom, page: document.documentElement.scrollHeight - innerHeight };
      });
      expect(r.overflow).toBeLessThanOrEqual(1);
      expect(r.bottom).toBeLessThanOrEqual(r.vh);
      expect(r.copyBottom).toBeLessThanOrEqual(r.bottom);
      expect(r.copyH).toBeGreaterThanOrEqual(44);
      expect(r.page).toBeLessThanOrEqual(0);
      // The prompt preview is whole lines only: its height is a multiple of the line height (+16px padding).
      const pre = await page.getByTestId("prompt").evaluate((el) => {
        const cs = getComputedStyle(el);
        return { h: el.clientHeight, lh: parseFloat(cs.lineHeight) };
      });
      expect((pre.h - 16) % pre.lh).toBe(0);
    });
  }

  test("a longer prompt says it scrolls and can be expanded", async ({ page }) => {
    await page.goto("/#recipe=neobroker");
    await expect(page.getByText("Scroll", { exact: true })).toBeVisible();
    const toggle = page.getByRole("button", { name: "Show all" });
    await toggle.click();
    await expect(page.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true");
  });
});

test.describe("accessibility", () => {
  test("reduced motion: no animations or transitions run", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/#b20,payments");
    await expect(page.getByTestId("set-card")).toBeVisible();
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll("*")]
        .map((el) => getComputedStyle(el))
        .flatMap((cs) => [cs.animationDuration, cs.transitionDuration])
        .flatMap((d) => d.split(",").map((x) => parseFloat(x)))
        .filter((n) => n > 0),
    );
    expect(durations).toEqual([]);
    await context.close();
  });

  test("keyboard focus order follows the page: header, tray, board, set box", async ({ page }) => {
    await page.goto("/#b20,payments");
    await expect(page.getByTestId("set-card")).toBeVisible();
    const order: string[] = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const tag = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el) return "";
        if (el.dataset.lego) return `lego:${el.dataset.lego}`;
        return (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40);
      });
      order.push(tag);
    }
    const at = (needle: string) => order.findIndex((t) => t.startsWith(needle));
    expect(at("Docs")).toBeGreaterThanOrEqual(0);
    expect(at("lego:b20")).toBeGreaterThan(at("Docs"));
    expect(at("lego:payments")).toBeGreaterThan(at("lego:b20"));
    expect(at("Regenerate idea")).toBeGreaterThan(at("lego:speed"));
    expect(at("Surprise me")).toBeGreaterThan(at("Regenerate idea"));
    expect(at("Neobank")).toBeGreaterThan(at("Surprise me"));
    // Then the set box: docs links, Show all, the prompt and Copy prompt.
    expect(at("Show all")).toBeGreaterThan(at("Neobank"));
    expect(at("Copy prompt")).toBeGreaterThan(at("Show all"));
    expect(at("Test on Vibenet")).toBeGreaterThan(at("Copy prompt"));
  });

  test("one polite live region announces every change", async ({ page }) => {
    await page.goto("/");
    const regions = page.locator('[aria-live="polite"]');
    await expect(regions).toHaveCount(1);
    await expect(regions).toHaveAttribute("role", "status");
    await brick(page, "Issue", "B20").click();
    await expect(live(page)).toHaveText(/Issue added, 1 of 4/);
    await brick(page, "Pay", "Accept payments").click();
    await page.getByRole("button", { name: "Generate idea + prompt" }).click();
    await expect(live(page)).toHaveText(/Set opened: .+\. 2 pieces\./);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(live(page)).toHaveText(/Board cleared, 0 of 4/);
  });
});

test.describe("tablet", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("Generate brings the set box into view and focuses its title", async ({ page }) => {
    await page.goto("/");
    await brick(page, "Issue", "B20").click();
    await brick(page, "Pay", "Accept payments").click();
    await page.getByRole("button", { name: "Generate idea + prompt" }).click();
    const title = page.getByTestId("set-card").getByRole("heading", { level: 2 });
    await expect(title).toBeFocused();
    await expect(title).toBeInViewport();
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

  test("first screen: the 5 hero Legos and + 8 more fit above the fold, choices before any big board", async ({ page }) => {
    await page.goto("/");
    for (const id of ["b20", "payments", "financing", "validity", "speed"]) {
      await expect(page.locator(`[data-lego="${id}"]`)).toBeInViewport({ ratio: 1 });
    }
    await expect(page.getByRole("button", { name: "+ 8 more Legos" })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("button", { name: "Surprise me" })).toBeInViewport({ ratio: 1 });
    const bar = await page.getByTestId("mobile-bar").boundingBox();
    expect(bar!.height).toBeLessThanOrEqual(116);
    await expect(page.getByTestId("mobile-bar").getByRole("button", { name: "Generate" })).toBeVisible();
  });

  test("recipe pill opens the sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Neobank" }).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});

void status;
