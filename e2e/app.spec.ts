import { expect, test, type Page } from "@playwright/test";

const brick = (page: Page, id: string) => page.locator(`button[data-lego="${id}"]`);
const live = (page: Page) => page.locator('p[aria-live="polite"]');
const phone = (page: Page) => page.getByTestId("phone");
const tileIds = (page: Page) => phone(page).locator("[data-tile]").evaluateAll((els) => els.map((e) => e.getAttribute("data-tile")));
const generate = (page: Page) => page.getByTestId("generate");

test.describe("desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Hydrated (the live board is client-only), so later hash changes reach the app.
    await page.getByTestId("brick-stage").waitFor();
  });

  test("first screen: one H1, a short subline, an empty board and an empty phone", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Snap together a money app.");
    await expect(page.getByText("Pick Legos. Get an app and a prompt.")).toBeVisible();
    await expect(page.getByTestId("board-count")).toHaveText("0 of 4");
    await expect(generate(page)).toHaveText("Generate");
    await expect(generate(page)).toHaveAttribute("aria-disabled", "true");
    await expect(page.locator("#generate-need")).toHaveText("Pick 2+");
    await expect(page.getByTestId("board-caption")).toHaveText("Tap a Lego");
    await expect(phone(page)).toHaveAttribute("aria-label", /empty/);
    await expect(phone(page).locator("[data-slot]")).toHaveCount(3);
    await expect(page.getByTestId("copy")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByTestId("app-name")).toHaveText("Your app");
    // Text diet: no blurbs in the tray, the Denim line only lives in the Speed popover.
    await expect(page.getByText(/mainnet targeting/)).toHaveCount(0);
    await expect(page.locator("button[data-lego]")).toHaveCount(40);
  });

  test("place via click builds the phone tile by tile; click again removes", async ({ page }) => {
    await brick(page, "b20").click();
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("board-count")).toHaveText("1 of 4");
    await expect(live(page)).toHaveText(/Issue added, 1 of 4/);
    await expect(page.getByTestId("board-caption")).toHaveCount(0);
    expect(await tileIds(page)).toEqual(["b20"]);
    await expect(phone(page).locator("[data-slot]")).toHaveCount(2);
    await expect(page.getByTestId("phone-brand")).toHaveText(/^Acme/);
    // The check badge sits off the brick's printed label (top corner of the cell).
    const badge = (await brick(page, "b20").locator("span[aria-hidden]").last().boundingBox())!;
    const art = (await brick(page, "b20").locator("[data-sprite]").boundingBox())!;
    expect(badge.y).toBeLessThan(art.y + art.height * 0.4);
    await brick(page, "b20").click();
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "false");
    await expect(live(page)).toHaveText(/Issue removed, 0 of 4/);
    await expect(phone(page).locator("[data-tile]")).toHaveCount(0);
  });

  test("keyboard: arrow keys move through the bin, Enter and Space add", async ({ page }) => {
    await brick(page, "b20").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await expect(brick(page, "payments")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(page.getByTestId("board-count")).toHaveText("2 of 4");
    await expect(generate(page)).toHaveAttribute("aria-disabled", "false");
    await page.keyboard.press("ArrowDown");
    const focused = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.lego);
    expect(["b20", "payments", "financing", "validity", "speed"]).not.toContain(focused);
    // Roving tab stop: one Tab leaves the bin.
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.lego ?? null)).toBeNull();
  });

  test("place via drag and drop", async ({ page }) => {
    const grow = brick(page, "financing");
    const from = (await grow.boundingBox())!;
    const to = (await page.getByTestId("brick-stage").boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + from.width / 2 + 30, from.y + from.height / 2, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect(grow).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("board-count")).toHaveText("1 of 4");
  });

  test("category chips filter the bin", async ({ page }) => {
    const agents = page.getByRole("button", { name: "Agents", exact: true });
    await agents.click();
    await expect(agents).toHaveAttribute("aria-pressed", "true");
    await expect(brick(page, "b20")).toHaveCount(0);
    await expect(brick(page, "x402-api")).toBeVisible();
    await expect(brick(page, "agent-spend")).toBeVisible();
    const n = await page.locator("button[data-lego]").count();
    expect(n).toBeGreaterThan(2);
    expect(n).toBeLessThan(40);
    await page.getByRole("button", { name: "Speed", exact: true }).click();
    await expect(brick(page, "speed")).toBeVisible();
    await expect(brick(page, "flashblocks")).toBeVisible();
    await page.getByRole("button", { name: "All", exact: true }).click();
    await expect(page.locator("button[data-lego]")).toHaveCount(40);
  });

  test("tooltip: name, tag and status on keyboard focus and hover; Escape hides it", async ({ page }) => {
    await brick(page, "b20").focus();
    await page.keyboard.press("ArrowRight"); // keyboard focus is :focus-visible
    await page.keyboard.press("End");
    await page.keyboard.press("Home");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await expect(brick(page, "speed")).toBeFocused();
    const tip = page.getByRole("tooltip");
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("200ms blocks");
    await expect(tip).toContainText("Sepolia");
    await expect(tip).toContainText("mainnet targeting November 2026");
    await expect(brick(page, "speed")).toHaveAttribute("aria-describedby", "lego-tip");
    await page.keyboard.press("Escape");
    await expect(tip).toHaveCount(0);
    await expect(brick(page, "speed")).toBeFocused();
    await brick(page, "b20").hover();
    await expect(tip).toContainText("B20");
    await expect(tip).not.toContainText("mainnet targeting");
  });

  test("recipes popover: arrow keys, Escape returns focus, picking one loads and generates", async ({ page }) => {
    const trigger = page.getByTestId("recipes").locator("visible=true");
    await trigger.click();
    const pop = page.getByRole("dialog", { name: "Recipes" });
    await expect(pop).toBeVisible();
    const first = pop.getByRole("button").first();
    await expect(first).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(pop.getByRole("button").nth(1)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(pop).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await pop.getByRole("button", { name: /^Neobroker/ }).click();
    await expect(page.getByTestId("board-count")).toHaveText("4 of 4");
    await expect(page.getByTestId("app-name")).toHaveText("Neobroker");
    await expect(page).toHaveURL(/#recipe=neobroker$/);
  });

  test("generate names the app, enables Copy, and tiles follow the stack (top brick = top tile)", async ({ page }) => {
    await brick(page, "b20").click();
    await brick(page, "payments").click();
    await generate(page).click();
    await expect(page.getByTestId("app-name")).not.toHaveText("Your app");
    await expect(generate(page)).toHaveText("Regenerate");
    await expect(page.getByTestId("copy")).toHaveAttribute("aria-disabled", "false");
    expect(await tileIds(page)).toEqual(["payments", "b20"]);
    await expect(page.locator('[aria-label="Steps"] li').nth(1)).toHaveAttribute("data-state", "done");
    await expect(page).toHaveURL(/#b20,payments$/);
  });

  test("4-brick stack: tiles in order and dotted connectors that never cross", async ({ page }) => {
    await page.goto("/#b20,payments,speed,validity");
    await expect(phone(page).locator("[data-tile]")).toHaveCount(4);
    expect(await tileIds(page)).toEqual(["validity", "speed", "payments", "b20"]);
    const lines = page.getByTestId("connectors").locator("[data-line]");
    await expect(lines).toHaveCount(4);
    const ends = await lines.evaluateAll((gs) =>
      gs.map((g) => {
        const d = g.querySelector("path")!.getAttribute("d")!;
        const [, y0] = /^M[\d.]+ ([\d.]+)/.exec(d)!;
        const c = g.querySelectorAll("circle");
        return { id: g.getAttribute("data-line"), y0: Number(y0), y1: Number(c[1]!.getAttribute("cy")) };
      }),
    );
    const byStart = [...ends].sort((a, b) => a.y0 - b.y0).map((e) => e.id);
    const byEnd = [...ends].sort((a, b) => a.y1 - b.y1).map((e) => e.id);
    expect(byStart).toEqual(byEnd);
    expect(byEnd).toEqual(["validity", "speed", "payments", "b20"]);
  });

  test("copy prompt turns green, then resets", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/#recipe=agent-paid-api");
    await page.getByRole("button", { name: "Copy prompt" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain('Build a first working version of "Agent-paid API" on Base.');
    await expect(page.locator('[aria-label="Steps"] li').nth(2)).toHaveAttribute("data-state", "done");
    await expect(page.getByRole("button", { name: "Copy prompt" })).toBeVisible({ timeout: 4000 });
  });

  test("copy falls back to selecting the prompt in Details when the clipboard is blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) } });
    });
    await page.goto("/#recipe=neobank");
    await page.getByRole("button", { name: "Copy prompt" }).click();
    await expect(page.getByTestId("details")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? "")).toContain("Build a first working version of");
  });

  test("details drawer: words live here, focus is trapped, Escape returns focus", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    const details = page.getByRole("button", { name: "Details" });
    await details.click();
    const drawer = page.getByTestId("details");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(drawer.getByText("Why each Lego")).toBeVisible();
    await expect(drawer.getByText("Build steps")).toBeVisible();
    await expect(drawer.getByTestId("prompt")).toContainText("Build a first working version of");
    await expect(drawer).toContainText("mainnet targeting November 2026");
    await expect(drawer.getByRole("link", { name: "B20 token standard" })).toBeVisible();
    await expect(drawer.locator("dt", { hasText: "B20" })).toBeVisible();
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.activeElement?.closest("dialog"));
      // Chrome may park focus on the document between the last and first element of a modal dialog.
      const onBody = await page.evaluate(() => document.activeElement === document.body);
      expect(inside || onBody).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(details).toBeFocused();
  });

  test("max 4 Legos, then swap", async ({ page }) => {
    for (const id of ["b20", "payments", "financing", "validity"]) await brick(page, id).click();
    await expect(page.getByTestId("board-count")).toHaveText("4 of 4");
    await brick(page, "speed").click();
    await expect(brick(page, "speed")).toHaveAttribute("aria-pressed", "false");
    await expect(live(page)).toHaveText(/Max 4 Legos/);
    await brick(page, "financing").click();
    await brick(page, "speed").click();
    await expect(brick(page, "speed")).toHaveAttribute("aria-pressed", "true");
  });

  test("surprise me and clear", async ({ page }) => {
    await page.getByRole("button", { name: "Surprise me" }).click();
    await expect(page.getByTestId("board-count")).toHaveText(/[234] of 4/);
    await expect(page.getByTestId("app-name")).not.toHaveText("Your app");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByTestId("board-count")).toHaveText("0 of 4");
    await expect(page.getByTestId("app-name")).toHaveText("Your app");
    await expect(live(page)).toHaveText(/Board cleared/);
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe("deep links", () => {
  test("hash restores the board, including new ids", async ({ page }) => {
    await page.goto("/#basenames,base-pay,speed");
    for (const id of ["basenames", "base-pay", "speed"]) await expect(brick(page, id)).toHaveAttribute("aria-pressed", "true");
    await expect(phone(page).locator("[data-tile]")).toHaveCount(3);
    await expect(page.getByTestId("board-count")).toHaveText("3 of 4");
    expect(await tileIds(page)).toEqual(["speed", "base-pay", "basenames"]);
    await expect(page.getByTestId("app-name")).not.toHaveText("Your app");
  });

  test("aliases resolve", async ({ page }) => {
    await page.goto("/#x402,denim");
    await expect(brick(page, "x402-api")).toHaveAttribute("aria-pressed", "true");
    await expect(brick(page, "speed")).toHaveAttribute("aria-pressed", "true");
  });

  test("recipe hash restores", async ({ page }) => {
    await page.goto("/#recipe=agent-paid-api");
    await expect(page.getByTestId("app-name")).toHaveText("Agent-paid API");
  });
});

test.describe("fits one screen", () => {
  test.use({ reducedMotion: "reduce" });
  for (const [w, h] of [
    [1280, 800],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`no page scroll and the phone and Copy are in view at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/#b20,payments,speed,validity");
      await expect(phone(page).locator("[data-tile]")).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
      await expect(phone(page)).toBeInViewport({ ratio: 1 });
      const copy = page.getByTestId("copy");
      await expect(copy).toBeInViewport({ ratio: 1 });
      expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      // Every tile is inside the phone screen.
      const fit = await phone(page).evaluate((ph) => {
        const screen = ph.firstElementChild!.getBoundingClientRect();
        return [...ph.querySelectorAll("[data-tile]")].every((t) => {
          const r = t.getBoundingClientRect();
          return r.top >= screen.top - 1 && r.bottom <= screen.bottom + 1;
        });
      });
      expect(fit).toBe(true);
    });
  }
});

test.describe("accessibility", () => {
  test("reduced motion: no animations or transitions run", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/#b20,payments");
    await expect(phone(page).locator("[data-tile]")).toHaveCount(2);
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

  test("the phone is a labelled region summarising the app", async ({ page }) => {
    await page.goto("/#b20,payments");
    await expect(page.getByRole("region", { name: /^Acme .+ app: Order #1042, ACME USD$/ })).toBeVisible();
  });

  test("one polite live region announces every change", async ({ page }) => {
    await page.goto("/");
    const regions = page.locator('[aria-live="polite"]');
    await expect(regions).toHaveCount(1);
    await expect(regions).toHaveAttribute("role", "status");
    await brick(page, "b20").click();
    await expect(live(page)).toHaveText(/Issue added, 1 of 4/);
    await brick(page, "payments").click();
    await generate(page).click();
    await expect(live(page)).toHaveText(/ready\. Copy prompt to use it\./);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(live(page)).toHaveText(/Board cleared, 0 of 4/);
  });
});

test.describe("small laptop", () => {
  test.use({ viewport: { width: 1100, height: 900 } });

  test("three columns; generate fills the phone", async ({ page }) => {
    await page.goto("/");
    await brick(page, "b20").click();
    await brick(page, "payments").click();
    await generate(page).click();
    await expect(phone(page)).toBeVisible();
    await expect(page.getByTestId("copy")).toHaveAttribute("aria-disabled", "false");
    await expect(page.getByTestId("mobile-bar")).toBeHidden();
  });
});

test.describe("compact tablet", () => {
  test.use({ viewport: { width: 768, height: 1024 }, reducedMotion: "reduce" });

  test("Generate opens the phone sheet with Copy prompt pinned and Back to Legos", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByTestId("mobile-bar");
    await expect(bar).toBeVisible();
    await brick(page, "b20").click();
    await brick(page, "validity").click();
    await bar.getByRole("button", { name: "Generate" }).click();
    const sheet = page.getByTestId("result-sheet");
    await expect(sheet.getByRole("heading", { level: 2 })).toBeFocused();
    await expect(sheet.locator("[data-tile]")).toHaveCount(2);
    const copy = sheet.getByRole("button", { name: "Copy prompt" });
    await expect(copy).toBeInViewport({ ratio: 1 });
    const back = sheet.getByRole("button", { name: "Back to Legos" });
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await back.click();
    await expect(sheet).toBeHidden();
    await expect(bar.getByRole("button", { name: "Regenerate" })).toBeFocused();
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });

  test("first screen: compact bar, tools, chips and two hero columns", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByTestId("mobile-bar");
    await expect(bar).toContainText("0/4");
    expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(116);
    await expect(page.getByTestId("recipes").locator("visible=true")).toBeInViewport();
    await expect(page.getByRole("button", { name: "Surprise me" })).toBeInViewport();
    await expect(page.getByRole("button", { name: "All", exact: true })).toBeInViewport();
    const [a, b, c] = await Promise.all(["b20", "payments", "financing"].map((id) => brick(page, id).boundingBox()));
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2); // two per row
    expect(c!.y).toBeGreaterThan(a!.y + a!.height - 2);
    const chips = page.getByRole("group", { name: "Filter Legos" });
    expect(await chips.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });

  test("result opens as a bottom sheet; Details opens over it; Escape steps back", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByTestId("mobile-bar");
    await brick(page, "b20").tap();
    await brick(page, "payments").tap();
    await expect(bar).toContainText("2/4");
    await bar.getByRole("button", { name: "Generate" }).tap();
    const sheet = page.getByTestId("result-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("heading", { level: 2 })).toBeFocused();
    const copy = (await sheet.getByRole("button", { name: "Copy prompt" }).boundingBox())!;
    expect(copy.y + copy.height).toBeLessThanOrEqual(844);
    await sheet.getByRole("button", { name: "Details" }).tap();
    await expect(page.getByTestId("details")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("details")).toBeHidden();
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(bar.getByRole("button", { name: "Regenerate" })).toBeFocused();
  });

  test("recipes menu opens below its button; picking one opens the sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("recipes").locator("visible=true").tap();
    const pop = page.getByRole("dialog", { name: "Recipes" });
    await expect(pop).toBeVisible();
    await pop.getByRole("button", { name: /^Neobank/ }).tap();
    await expect(page.getByTestId("result-sheet")).toBeVisible();
  });

  test("long press shows the tooltip and does not add the brick", async ({ page }) => {
    await page.goto("/");
    const b = brick(page, "speed");
    await b.scrollIntoViewIfNeeded();
    const box = (await b.boundingBox())!;
    await b.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true, button: 0, clientX: box.x + 20, clientY: box.y + 20 });
    await page.waitForTimeout(600);
    await expect(page.getByRole("tooltip")).toContainText("200ms blocks");
    await b.dispatchEvent("pointerup", { pointerType: "touch", isPrimary: true });
    await b.dispatchEvent("click");
    await expect(b).toHaveAttribute("aria-pressed", "false");
  });
});
