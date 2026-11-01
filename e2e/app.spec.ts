import { expect, test, type Page } from "@playwright/test";

const brick = (page: Page, id: string) => page.locator(`button[data-lego="${id}"]`);
const live = (page: Page) => page.locator('p[aria-live="polite"]');
const phone = (page: Page) => page.getByTestId("phone");
/** Brick regions on the app screen, top to bottom (screen order, not stack order). */
const regionIds = (page: Page) => phone(page).locator("[data-region]").evaluateAll((els) => els.map((e) => e.getAttribute("data-region")));
const build = (page: Page) => page.getByTestId("build");
const count = (page: Page) => page.getByTestId("board-count").locator("visible=true");

test.describe("desktop", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Hydrated (the live board is client-only), so later hash changes reach the app.
    await page.getByTestId("brick-stage").waitFor();
  });

  test("first screen: one H1, the subline, an empty board and an empty phone; no helper text", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Snap together a money app.");
    // The subline is shown on tall screens; on laptop heights (<= 960) the one-row header drops it (the rail says the same).
    await expect(page.getByText("Snap bricks. Preview an app. Copy the prompt.")).toBeAttached();
    await expect(count(page)).toHaveAttribute("aria-label", "0 of 4 bricks");
    await expect(build(page)).toHaveText("Build app");
    await expect(build(page)).toHaveAttribute("aria-disabled", "true");
    for (const gone of ["Pick 2+", "Tap a Lego", "Your board", "0 of 4"]) await expect(page.getByText(gone, { exact: true })).toHaveCount(0);
    await expect(phone(page)).toHaveAttribute("aria-label", /empty/);
    // An empty board shows a skeleton of an app (header, balance, round actions, list rows), no regions.
    await expect(phone(page)).toHaveAttribute("data-phase", "empty");
    await expect(phone(page).locator("[data-skel]")).toHaveCount(1);
    await expect(phone(page).locator("[data-region]")).toHaveCount(0);
    await expect(page.getByTestId("copy")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByTestId("app-name")).toHaveText("Your app");
    await expect(page.getByTestId("demo-label")).toHaveCount(0);
    await expect(page.getByText(/no real funds/i)).toHaveCount(0);
    await expect(page.locator('[aria-label="Steps"] li')).toHaveText(["1Pick", "2Build", "3Copy"]);
    // Every brick is presented as available: no status or test-network wording anywhere on the page.
    await expect(page.locator("body")).not.toContainText(/coming soon|announced|sepolia|testnet|early access|mainnet targeting|acme/i);
    await expect(page.locator("button[data-lego]")).toHaveCount(39);
    // No category chips: every brick in one bin, and a Recipes section under it (no Recipes popover on the board).
    await expect(page.getByRole("group", { name: "Filter bricks" })).toHaveCount(0);
    await expect(page.locator("button[data-chip]")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Recipes" })).toBeVisible();
    await expect(page.getByTestId("recipes")).toHaveCount(0);
  });

  test("bricks first in tab order: Docs, Present, Dark mode, then the bin", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit on macOS tabs to form fields only (Safari's default)");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.lego)).toBe("b20");
  });

  test("before Build app the phone shows a skeleton of the screen; Build app boots it; then it stays live", async ({ page }) => {
    await brick(page, "b20").click();
    await expect(count(page)).toHaveAttribute("aria-label", "1 of 4 bricks");
    await expect(live(page)).toHaveText(/Token added, 1 of 4/);
    expect(await regionIds(page)).toEqual(["b20"]);
    await expect(phone(page)).toHaveAttribute("data-phase", "wire");
    await expect(phone(page).locator("[data-skel]")).toHaveCount(1);
    await expect(phone(page).locator('[data-region="b20"]')).toContainText("Total balance");
    await brick(page, "payments").click();
    await expect(build(page)).toHaveAttribute("aria-disabled", "false");
    await expect(page.getByTestId("app-name")).toHaveText("Your app");
    // Copy is pressable at 2 bricks but quiet until the app is built.
    await expect(page.getByTestId("copy")).toHaveAttribute("aria-disabled", "false");
    await expect(page.getByTestId("copy")).toHaveAttribute("data-quiet", "true");
    await build(page).click();
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await expect(page.getByTestId("app-name")).not.toHaveText("Your app");
    // The Build button stays in its slot as Replay (the toolbar never jumps).
    await expect(build(page)).toHaveText("Replay");
    await expect(page.getByTestId("copy")).not.toHaveAttribute("data-quiet", "true");
    expect(await regionIds(page)).toEqual(["b20", "payments"]);
    await expect(phone(page).locator("[data-skel]")).toHaveCount(0);
    await expect(page.locator('[aria-label="Steps"] li').nth(1)).toHaveAttribute("data-state", "done");
    await expect(page).toHaveURL(/#b20,payments$/);
    // Live: adding a brick updates name and screen at once, no Regenerate.
    const before = await page.getByTestId("app-name").textContent();
    await brick(page, "speed").click();
    expect(await regionIds(page)).toEqual(["b20", "payments", "speed"]);
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await expect(page.getByTestId("app-name")).not.toHaveText(before!);
    await expect(page.getByRole("button", { name: "Details" })).toHaveAttribute("aria-disabled", "false");
    await expect(page.getByRole("button", { name: /Regenerate|Generate/ })).toHaveCount(0);
    // Removing one keeps it live.
    await brick(page, "speed").click();
    await expect(page.getByTestId("app-name")).toHaveText(before!);
  });

  test("placed bricks keep full colour with a ring and a check off the print; click again removes", async ({ page }) => {
    await brick(page, "b20").click();
    await brick(page, "swaps").click();
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "true");
    // Full colour (no fade), a 2px Base Blue ring.
    expect(await brick(page, "b20").locator("[data-sprite]").evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
    expect(await brick(page, "b20").evaluate((el) => getComputedStyle(el).boxShadow)).toMatch(/rgb\(0, 0, 255\).*inset|inset.*rgb\(0, 0, 255\)/);
    // One check position everywhere: the bottom-right corner of the front face (hero and small brick alike),
    // in the bottom quarter, inside the brick's cell.
    for (const id of ["b20", "swaps"]) {
      const check = (await brick(page, id).getByTestId("placed-check").boundingBox())!;
      const cell = (await brick(page, id).boundingBox())!;
      expect(check.y, id).toBeGreaterThan(cell.y + cell.height * 0.7);
      expect(check.x + check.width, id).toBeLessThanOrEqual(cell.x + cell.width + 1);
      expect(check.x, id).toBeGreaterThan(cell.x + cell.width * 0.45);
    }
    await expect.poll(async () => Math.round((await brick(page, "b20").getByTestId("placed-check").boundingBox())!.width)).toBe(16);
    await brick(page, "b20").click();
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "false");
    await expect(live(page)).toHaveText(/Token removed, 1 of 4/);
    await expect(phone(page).locator("[data-region]")).toHaveCount(1);
  });

  test("hero shelf: 3 + 2 above the bin, each hero its whole brick (no overlap), rows never overlap", async ({ page }) => {
    const shelf = page.getByTestId("hero-shelf");
    const heroes = shelf.locator("button[data-lego]");
    await expect(heroes).toHaveCount(5);
    const boxes = await heroes.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
    for (const b of boxes.slice(1, 3)) expect(Math.abs(b.y - boxes[0]!.y)).toBeLessThan(2);
    for (const b of boxes.slice(3)) expect(b.y).toBeGreaterThanOrEqual(boxes[0]!.y + boxes[0]!.height - 0.5);
    // Never larger than the bin's stud scale; the whole sprite (side face too) fits its own cell.
    const scale = (id: string) =>
      brick(page, id)
        .locator("img")
        .evaluate((el) => (el as HTMLImageElement).getBoundingClientRect().width / (el as HTMLImageElement).naturalWidth);
    expect(await scale("b20")).toBeLessThanOrEqual((await scale("swaps")) + 0.001);
    const sprites = await heroes.evaluateAll((els) => els.map((e) => [e.getBoundingClientRect().toJSON(), e.querySelector("[data-sprite]")!.getBoundingClientRect().toJSON()] as [DOMRect, DOMRect]));
    for (const [cell, sp] of sprites) expect(sp.right).toBeLessThanOrEqual(cell.right + 1);
    for (let i = 1; i < 3; i++) expect(boxes[i]!.x).toBeGreaterThanOrEqual(boxes[i - 1]!.x + boxes[i - 1]!.width - 0.5);
    // The bin under the shelf: row boxes never overlap vertically.
    const rows = await page.getByTestId("tray-scroll").locator("li").evaluateAll((els) => {
      const r = els.map((e) => e.getBoundingClientRect());
      const tops = [...new Set(r.map((x) => Math.round(x.top)))].sort((a, b) => a - b);
      return tops.map((t) => Math.max(...r.filter((x) => Math.round(x.top) === t).map((x) => x.bottom)) - t).map((h, i) => [tops[i]!, h] as const);
    });
    for (let i = 1; i < rows.length; i++) expect(rows[i]![0]).toBeGreaterThanOrEqual(rows[i - 1]![0] + rows[i - 1]![1] - 0.5);
    // Shelf over the hairline, above the bin; every hero fully inside the shelf.
    const sb = (await shelf.boundingBox())!;
    const bin = (await page.getByTestId("tray-scroll").boundingBox())!;
    expect(sb.y + sb.height).toBeLessThanOrEqual(bin.y + 1);
    for (const b of boxes) expect(b.x + b.width).toBeLessThanOrEqual(sb.x + sb.width + 0.5);
  });

  for (const [w, h] of [
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`tray print is legible at ${w}x${h}: verbs >= 12px on small bricks, >= 14px on heroes; the bin scrolls, not the page`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.getByTestId("tray-scroll").locator("img").first().waitFor();
      const sizes = await page.locator("button[data-lego][data-print]").evaluateAll((els) =>
        els.map((e) => ({
          id: e.getAttribute("data-lego")!,
          hero: !!e.closest('[data-testid="hero-shelf"]'),
          px: e.querySelector("[data-sprite]")!.getBoundingClientRect().width * Number(e.getAttribute("data-print")),
        })),
      );
      expect(sizes).toHaveLength(39);
      for (const s of sizes) expect(s.px, s.id).toBeGreaterThanOrEqual(s.hero ? 14 : 12);
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
      const sc = page.getByTestId("tray-scroll");
      expect(await sc.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
      expect(await sc.evaluate((el) => getComputedStyle(el).maskImage)).toContain("linear-gradient");
      await expect(page.getByTestId("hero-shelf")).toBeInViewport({ ratio: 1 });
    });
  }

  for (const [w, h, rows] of [
    [1280, 720, 4],
    [1440, 900, 4],
    [1920, 1080, 6],
  ] as const) {
    test(`left column at ${w}x${h}: bricks on top, Recipes below (about a third, >= ${rows} whole rows), each scrolls on its own; no page scroll`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.getByTestId("tray-scroll").locator("img").first().waitFor();
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
      const shelf = page.getByTestId("recipes-shelf");
      await expect(shelf.getByRole("heading", { name: "Recipes" })).toBeVisible();
      const g = await page.evaluate(() => {
        const col = document.querySelector('[data-testid="recipes-shelf"]')!.parentElement!.getBoundingClientRect();
        const shelf = document.querySelector('[data-testid="recipes-shelf"]')!;
        const sc = shelf.querySelector("div")!;
        const sr = sc.getBoundingClientRect();
        const bin = document.querySelector('[data-testid="tray-scroll"]')!.getBoundingClientRect();
        const items = [...sc.querySelectorAll("button[data-recipe]")].map((b) => b.getBoundingClientRect());
        return {
          share: shelf.getBoundingClientRect().height / col.height,
          whole: items.filter((r) => r.top >= sr.top - 1 && r.bottom <= sr.bottom + 1).length,
          below: shelf.getBoundingClientRect().top >= bin.bottom - 1,
          overflow: getComputedStyle(sc).overflowY,
          n: items.length,
        };
      });
      expect(g.n).toBeGreaterThanOrEqual(12);
      expect(g.whole).toBeGreaterThanOrEqual(rows);
      expect(g.share).toBeGreaterThanOrEqual(0.28);
      expect(g.share).toBeLessThanOrEqual(0.4);
      expect(g.below).toBe(true);
      expect(g.overflow).toBe("auto");
      // Each row: 3-4 mini glyphs in catalog colours, then the name.
      const first = shelf.locator("button[data-recipe]").first();
      expect(await first.locator("svg").count()).toBeGreaterThanOrEqual(3);
      await expect(page.locator("#brick-keys")).toHaveText(/Arrow keys/);
    });
  }

  test("keyboard: arrow keys move through the bin, Enter and Space add", async ({ page }) => {
    await brick(page, "b20").focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowRight");
    await expect(brick(page, "payments")).toBeFocused();
    await page.keyboard.press("Space");
    await expect(count(page)).toHaveAttribute("aria-label", "2 of 4 bricks");
    await page.keyboard.press("ArrowDown");
    const focused = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.lego);
    expect(focused).toBeTruthy();
    expect(focused).not.toBe("payments");
    // Roving tab stop: one Tab leaves the bin and lands on the Recipes section (one stop too).
    const recipe = () => page.evaluate(() => (document.activeElement as HTMLElement).dataset.recipe ?? null);
    await page.keyboard.press("Tab");
    expect(await recipe()).toBe("neobank");
    await page.keyboard.press("ArrowDown");
    expect(await recipe()).toBe("neobroker");
    await page.keyboard.press("ArrowUp");
    expect(await recipe()).toBe("neobank");
    await page.keyboard.press("Tab");
    expect(await recipe()).toBeNull();
    // Shift+Tab comes back to the same recipe, and once more to the bin's brick.
    await page.keyboard.press("Shift+Tab");
    expect(await recipe()).toBe("neobank");
    await page.keyboard.press("Shift+Tab");
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.lego ?? null)).toBe(focused);
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
    await expect(count(page)).toHaveAttribute("aria-label", "1 of 4 bricks");
  });

  test("one bin, no filters: all 39 bricks, heroes first, never dimmed", async ({ page }) => {
    await expect(page.getByRole("button", { name: "All", exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Agents", exact: true })).toHaveCount(0);
    await expect(page.getByTestId("tray-scroll").locator("button[data-lego]")).toHaveCount(34);
    await expect(page.getByTestId("hero-shelf").locator("button[data-lego]")).toHaveCount(5);
    await expect(page.locator("button[data-lego][data-dim]")).toHaveCount(0);
  });

  test("tooltip: name and tag only, no status line; stays on screen", async ({ page }) => {
    await brick(page, "b20").focus();
    await page.keyboard.press("ArrowRight"); // keyboard focus is :focus-visible
    await page.keyboard.press("Home");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await expect(brick(page, "speed")).toBeFocused();
    const tip = page.getByRole("tooltip");
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("200ms blocks");
    await expect(tip).not.toContainText(/sepolia|mainnet|announced|testnet/i);
    await expect(brick(page, "speed")).toHaveAttribute("aria-describedby", "brick-tip brick-keys");
    const box = (await tip.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(15);
    await page.keyboard.press("Escape");
    await expect(tip).toHaveCount(0);
    await expect(brick(page, "speed")).toBeFocused();
    await brick(page, "basetime").scrollIntoViewIfNeeded();
    await brick(page, "basetime").hover();
    await expect(tip).toContainText("BaseTime");
    await expect(tip).not.toContainText(/sepolia|mainnet|announced|testnet/i);
    await brick(page, "b20").hover();
    await expect(tip).toContainText("B20");
    await expect(tip).not.toContainText(/mainnet/i);
  });

  test("Recipes section: click or Enter loads and builds a recipe; the current one has aria-current", async ({ page }) => {
    const shelf = page.getByTestId("recipes-shelf");
    await expect(shelf.locator("[aria-current]")).toHaveCount(0);
    await shelf.getByRole("button", { name: /^Neobroker/ }).click();
    await expect(count(page)).toHaveAttribute("aria-label", "4 of 4 bricks");
    await expect(page.getByTestId("app-name")).toHaveText("Neobroker");
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await expect(page).toHaveURL(/#recipe=neobroker$/);
    await expect(shelf.locator("[aria-current]")).toHaveCount(1);
    await expect(shelf.getByRole("button", { name: /^Neobroker/ })).toHaveAttribute("aria-current", "true");
    // Enter on another recipe builds that one; the current mark moves.
    const pay = shelf.getByRole("button", { name: /^Pay a name/ });
    await pay.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#recipe=pay-a-name$/);
    await expect(pay).toHaveAttribute("aria-current", "true");
    await expect(shelf.locator("[aria-current]")).toHaveCount(1);
    // The current recipe is the section's Tab stop.
    await expect(pay).toHaveAttribute("tabindex", "0");
  });

  test("4-brick stack: one screen, one region per brick in screen order; each dotted line ends on its own region", async ({ page }) => {
    await page.goto("/#b20,payments,speed,validity");
    await expect(phone(page)).toHaveAttribute("data-archetype", "trade");
    await expect(phone(page).locator("[data-region]")).toHaveCount(4);
    // Screen order (price line, order card, positions, notices), not stack order.
    expect(await regionIds(page)).toEqual(["speed", "validity", "b20", "payments"]);
    const lines = page.getByTestId("connectors").locator("[data-line]");
    await expect(lines).toHaveCount(4);
    const ends = await page.evaluate(() => {
      const svg = document.querySelector('[data-testid="connectors"]')!.getBoundingClientRect();
      return [...document.querySelectorAll("[data-line]")].map((g) => {
        const c = g.querySelectorAll("circle")[1]!;
        const r = document.querySelector(`[data-testid="phone"] [data-region="${g.getAttribute("data-line")}"]`)!.getBoundingClientRect();
        return { id: g.getAttribute("data-line"), x: svg.left + Number(c.getAttribute("cx")), y: svg.top + Number(c.getAttribute("cy")), r: { left: r.left, top: r.top, bottom: r.bottom } };
      });
    });
    for (const e of ends) {
      // The disc sits just left of its region, level with it.
      expect(e.r.left - e.x, e.id!).toBeGreaterThanOrEqual(0);
      expect(e.r.left - e.x, e.id!).toBeLessThanOrEqual(14);
      expect(e.y, e.id!).toBeGreaterThanOrEqual(e.r.top - 1);
      expect(e.y, e.id!).toBeLessThanOrEqual(e.r.bottom + 1);
    }
  });

  test("inspect: hovering a region highlights its line and brick and dims the rest; hovering a placed brick highlights its region", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    await expect(phone(page).locator("[data-region]")).toHaveCount(3);
    await phone(page).locator('[data-region="payments"]').hover();
    await expect(page.getByTestId("connectors")).toHaveAttribute("data-inspect", "payments");
    await expect(page.getByTestId("connectors").locator('[data-line="b20"]')).toHaveAttribute("data-dim", "true");
    await expect(page.getByTestId("brick-ring")).toBeVisible();
    await expect(phone(page).locator('[data-region="payments"]')).toContainText("Made with");
    await brick(page, "b20").hover();
    await expect(phone(page).locator('[data-region="b20"]')).toHaveAttribute("data-inspect", "true");
  });

  test("every recipe opens on a full app screen: chrome, one region per brick, all inside the screen, no inner scroll", async ({ page }) => {
    for (const slug of ["neobank", "neobroker", "stablecoin-checkout", "creator-payouts", "pay-a-name", "agent-data-market", "escrow-marketplace", "gas-free-onboarding"]) {
      await page.goto(`/#recipe=${slug}`);
      await expect(phone(page), slug).toHaveAttribute("data-phase", "live");
      const n = await page.getByTestId("board-count").locator("visible=true").getAttribute("aria-label");
      expect((await regionIds(page)).length, slug).toBe(Number(/^(\d)/.exec(n!)![1]));
      const g = await phone(page).evaluate((ph) => {
        const screen = ph.querySelector("[data-screen]")!.getBoundingClientRect();
        const body = ph.querySelector<HTMLElement>("[data-body]")!;
        return {
          header: !!ph.querySelector("header"),
          inner: body.scrollHeight - body.clientHeight,
          inside: [...ph.querySelectorAll("[data-region]")].every((r) => {
            const b = r.getBoundingClientRect();
            return b.top >= screen.top - 1 && b.bottom <= screen.bottom + 1;
          }),
        };
      });
      expect(g.header, slug).toBe(true);
      expect(g.inner, slug).toBeLessThanOrEqual(1);
      expect(g.inside, slug).toBe(true);
    }
  });

  test("money values carry a currency and are never cut off", async ({ page }) => {
    await page.goto("/#b20,payments");
    await expect(phone(page)).toContainText("$1,240.00");
    await page.goto("/#payments,speed");
    await expect(phone(page)).toContainText("Pay $12.00");
    const cut = await phone(page).evaluate((ph) =>
      [...ph.querySelectorAll("span")].some((s) => /\$/.test(s.textContent ?? "") && s.children.length === 0 && s.scrollWidth > s.clientWidth + 1),
    );
    expect(cut).toBe(false);
  });

  test("copy prompt turns green, then resets", async ({ page, context, browserName }) => {
    test.skip(browserName === "webkit", "WebKit has no clipboard-write permission to grant");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/#recipe=agent-paid-api");
    await page.getByRole("button", { name: "Copy prompt" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain('Build a first working version of "Agent-paid API" on Base.');
    expect(text).not.toMatch(/\bLegos? to use\b/);
    await expect(page.locator('[aria-label="Steps"] li').nth(2)).toHaveAttribute("data-state", "done");
    await expect(page.getByRole("button", { name: "Copy prompt" })).toBeVisible({ timeout: 4000 });
  });

  test("Copy prompt before Build app builds first, then copies", async ({ page, context, browserName }) => {
    test.skip(browserName === "webkit", "WebKit has no clipboard-write permission to grant");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await brick(page, "b20").click();
    await brick(page, "payments").click();
    await page.getByTestId("copy").click();
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Build a first working version of");
  });

  test("copy falls back to selecting the prompt in Details when the clipboard is blocked", async ({ page, browserName }) => {
    test.skip(browserName === "webkit", "WebKit's navigator.clipboard cannot be stubbed from an init script");
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("blocked")) } });
    });
    await page.goto("/#recipe=neobank");
    await page.getByRole("button", { name: "Copy prompt" }).click();
    await expect(page.getByTestId("details")).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? "")).toContain("Build a first working version of");
  });

  test("details drawer: the dialog takes focus, words live here, focus is trapped, Escape returns focus", async ({ page, browserName }) => {
    await page.goto("/#b20,payments,speed");
    const details = page.getByRole("button", { name: "Details" });
    await details.click();
    const drawer = page.getByTestId("details");
    await expect(drawer).toBeVisible();
    await expect(drawer).toBeFocused();
    await expect(drawer.getByText("Why each brick")).toBeVisible();
    await expect(drawer.getByText("Build steps")).toBeVisible();
    await expect(drawer.getByTestId("prompt")).toContainText("Build a first working version of");
    await expect(drawer.getByText("Status", { exact: true })).toHaveCount(0);
    await expect(drawer).not.toContainText(/sepolia|testnet|vibenet|announced|early access|coming soon|acme/i);
    await expect(drawer.getByTestId("prompt")).toContainText("Target Base mainnet.");
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
    // (WebKit does not focus a clicked button, so there is no opener focus to restore.)
    if (browserName !== "webkit") await expect(details).toBeFocused();
  });

  test("full at 4: a fifth brick swaps out the bottom one with a toast and Undo; no permanent sentence", async ({ page }) => {
    for (const id of ["b20", "payments", "financing", "validity"]) await brick(page, id).click();
    await expect(count(page)).toHaveAttribute("aria-label", "4 of 4 bricks");
    await expect(page.getByText(/^Full/)).toHaveCount(0);
    await brick(page, "speed").click();
    await expect(brick(page, "speed")).toHaveAttribute("aria-pressed", "true");
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "false");
    const toast = page.getByTestId("toast");
    await expect(toast).toHaveAttribute("role", "status");
    await expect(toast).toContainText("Full · swapped Token for Instant");
    expect(await toast.evaluate((el) => getComputedStyle(el).fontSize)).toBe("13px");
    await expect(live(page)).toHaveText(/Board full: Instant replaced Token, 4 of 4/);
    expect((await regionIds(page)).sort()).toEqual(["speed", "validity", "financing", "payments"].sort());
    await toast.getByRole("button", { name: "Undo" }).click();
    await expect(toast).toHaveCount(0);
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "true");
    await expect(brick(page, "speed")).toHaveAttribute("aria-pressed", "false");
    expect((await regionIds(page)).sort()).toEqual(["validity", "financing", "payments", "b20"].sort());
    // It goes away by itself after 6s.
    await brick(page, "speed").click();
    await expect(toast).toBeVisible();
    await page.mouse.move(5, 5);
    await expect(toast).toHaveCount(0, { timeout: 8000 });
  });

  test("Undo only takes back the swap it names: a later edit drops the toast; Ctrl/Cmd+Z undoes while it shows", async ({ page }) => {
    for (const id of ["b20", "payments", "financing", "validity"]) await brick(page, id).click();
    await brick(page, "speed").click();
    const toast = page.getByTestId("toast");
    await expect(toast).toContainText("Full · swapped Token for Instant");
    await expect(page.getByTestId("toast-undo")).toHaveAttribute("aria-keyshortcuts", /Control\+Z/);
    expect((await page.getByTestId("toast-undo").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    // swap -> remove Pay from the tray: the toast goes; Ctrl+Z does nothing (Pay stays off, Issue stays off).
    await brick(page, "payments").click();
    await expect(toast).toHaveCount(0);
    await page.keyboard.press("Control+z");
    await expect(brick(page, "payments")).toHaveAttribute("aria-pressed", "false");
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "false");
    // swap again -> Ctrl+Z right away reverses exactly that swap.
    await brick(page, "b20").click();
    await brick(page, "verify").click();
    await expect(toast).toContainText(/Full · swapped/);
    await page.keyboard.press("Control+z");
    await expect(toast).toHaveCount(0);
    await expect(brick(page, "verify")).toHaveAttribute("aria-pressed", "false");
    await expect(count(page)).toHaveAttribute("aria-label", "4 of 4 bricks");
  });

  test("removing below 2 bricks after Build un-builds: a new second brick offers Build app, not Replay", async ({ page }) => {
    await page.goto("/#b20,payments");
    await expect(build(page)).toHaveAttribute("aria-label", "Replay the app build");
    await brick(page, "payments").click();
    await brick(page, "financing").click();
    await expect(build(page)).toHaveText("Build app");
  });

  test("surprise me builds; clear resets", async ({ page }) => {
    await page.getByRole("button", { name: "Surprise me" }).click();
    await expect(count(page)).toHaveAttribute("aria-label", /[234] of 4 bricks/);
    await expect(page.getByTestId("app-name")).not.toHaveText("Your app");
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(count(page)).toHaveAttribute("aria-label", "0 of 4 bricks");
    await expect(page.getByTestId("app-name")).toHaveText("Your app");
    await expect(live(page)).toHaveText(/Board cleared/);
    await expect(page).toHaveURL(/\/$/);
    await expect(build(page)).toHaveText("Build app");
  });
});

test.describe("theme: light for everyone, dark on request", () => {
  const theme = (page: Page) => page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  const bg = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const themeColor = (page: Page) => page.locator('meta[name="theme-color"]').getAttribute("content");

  test("an OS dark preference still renders light by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await page.getByTestId("brick-stage").waitFor();
    expect(await theme(page)).toBe("light");
    expect(await bg(page)).toBe("rgb(255, 255, 255)");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
    expect(await themeColor(page)).toBe("#ffffff");
    await expect(page.getByTestId("theme-toggle")).toHaveAttribute("aria-pressed", "false");
  });

  test("the toggle has an accessible name, switches to dark live (focus and the stack kept) and persists across reload", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    await expect(phone(page).locator("[data-region]")).toHaveCount(3);
    const toggle = page.getByRole("button", { name: "Dark mode" });
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await expect(toggle).toHaveAttribute("title", "Dark mode");
    await toggle.focus();
    await page.keyboard.press("Enter");
    expect(await theme(page)).toBe("dark");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveAttribute("title", "Light mode");
    await expect(toggle).toBeFocused();
    await expect(phone(page).locator("[data-region]")).toHaveCount(3);
    expect(await bg(page)).toBe("rgb(10, 11, 13)");
    expect(await themeColor(page)).toBe("#0a0b0d");
    expect(await page.evaluate(() => localStorage.getItem("ml-theme"))).toBe("dark");
    // The logo follows the theme, not the OS.
    await expect(page.locator('img[src*="Base_lockup_white"]')).toBeVisible();
    await expect(page.locator('img[src*="Base_lockup_2color"]')).toBeHidden();

    await page.reload();
    await page.getByTestId("brick-stage").waitFor();
    expect(await theme(page)).toBe("dark");
    expect(await themeColor(page)).toBe("#0a0b0d");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");

    await toggle.click();
    expect(await theme(page)).toBe("light");
    expect(await page.evaluate(() => localStorage.getItem("ml-theme"))).toBe("light");
    await expect(page.locator('img[src*="Base_lockup_2color"]')).toBeVisible();
  });

  test("no flash: a stored dark choice is on <html> before first paint (by DOMContentLoaded)", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("ml-theme", "dark");
      document.addEventListener("DOMContentLoaded", () => {
        (window as unknown as { __themeAtDCL: string | null }).__themeAtDCL = document.documentElement.getAttribute("data-theme");
      });
    });
    await page.goto("/");
    await page.waitForFunction(() => "__themeAtDCL" in window);
    expect(await page.evaluate(() => (window as unknown as { __themeAtDCL: string }).__themeAtDCL)).toBe("dark");
  });

  test("the toggle is in Present mode's toolbar", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("present-toggle").click();
    await expect(page.getByTestId("present-drawer")).toBeVisible();
    const toggle = page.getByTestId("theme-toggle");
    await expect(toggle).toBeVisible();
    expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(32);
    await toggle.click();
    expect(await theme(page)).toBe("dark");
    await expect(page.getByTestId("present-drawer")).toBeVisible();
  });

  for (const w of [320, 390]) {
    test(`the toggle fits the mobile header at ${w}px with a 44px target`, async ({ browser }) => {
      const context = await browser.newContext({ viewport: { width: w, height: 700 }, hasTouch: true, isMobile: true });
      const page = await context.newPage();
      await page.goto("/");
      const toggle = page.getByTestId("theme-toggle");
      await expect(toggle).toBeVisible();
      const b = (await toggle.boundingBox())!;
      expect(b.height).toBeGreaterThanOrEqual(44);
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.x + b.width).toBeLessThanOrEqual(w);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
      // Nothing in the header row overlaps.
      // "Money Legos" never runs into Docs.
      const gap = await page.evaluate(() => {
        const name = [...document.querySelectorAll("header span")].find((e) => e.textContent === "Money Legos")!.getBoundingClientRect();
        return document.querySelector("header nav a")!.getBoundingClientRect().left - name.right;
      });
      expect(gap).toBeGreaterThanOrEqual(0);
      await toggle.tap();
      expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
      await context.close();
    });
  }
});

test.describe("deep links", () => {
  test("hash restores the board and builds the app, including new ids", async ({ page }) => {
    await page.goto("/#basenames,base-pay,speed");
    for (const id of ["basenames", "base-pay", "speed"]) await expect(brick(page, id)).toHaveAttribute("aria-pressed", "true");
    await expect(phone(page).locator("[data-region]")).toHaveCount(3);
    await expect(count(page)).toHaveAttribute("aria-label", "3 of 4 bricks");
    expect((await regionIds(page)).sort()).toEqual(["speed", "base-pay", "basenames"].sort());
    await expect(page.getByTestId("app-name")).not.toHaveText("Your app");
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
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

  test("unknown ids are cleaned from the URL; an all-unknown link shows an empty board", async ({ page }) => {
    await page.goto("/#nope,b20,payments");
    await expect(count(page)).toHaveAttribute("aria-label", "2 of 4 bricks");
    await expect(page).toHaveURL(/#b20,payments$/);
    await page.goto("/#unknown");
    await page.getByTestId("brick-stage").waitFor();
    await expect(count(page)).toHaveAttribute("aria-label", "0 of 4 bricks");
    await expect(page).toHaveURL(/\/$/);
  });

  test("URL and screen agree after a valid link turns unknown, and after Back to an empty hash", async ({ page, browserName }) => {
    await page.goto("/");
    await page.getByTestId("brick-stage").waitFor();
    await page.evaluate(() => (window.location.hash = "#recipe=neobroker"));
    await expect(page.getByTestId("app-name")).toHaveText("Neobroker");
    await page.evaluate(() => (window.location.hash = "#unknown"));
    await expect(count(page)).toHaveAttribute("aria-label", "0 of 4 bricks");
    await expect(page.getByTestId("app-name")).toHaveText("Your app");
    // Let the app finish cleaning the URL before the next link (WebKit applies it a frame later).
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
    await page.evaluate(() => (window.location.hash = "#b20,payments"));
    await expect(count(page)).toHaveAttribute("aria-label", "2 of 4 bricks");
    // Back: to the cleaned (empty) entry the unknown link left, then to the recipe.
    await page.goBack();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
    await expect(count(page)).toHaveAttribute("aria-label", "0 of 4 bricks");
    // WebKit's back list skips entries a script added without a user gesture (the recipe hash here).
    if (browserName === "webkit") return;
    await page.goBack();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("#recipe=neobroker");
    await expect(page.getByTestId("app-name")).toHaveText("Neobroker");
    await expect(count(page)).toHaveAttribute("aria-label", "4 of 4 bricks");
  });
});

test.describe("fits one screen", () => {
  test.use({ reducedMotion: "reduce" });
  for (const [w, h] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`no page scroll; phone, every region and Copy in view at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/#b20,payments,speed,validity");
      await expect(phone(page).locator("[data-region]")).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
      await expect(phone(page)).toBeInViewport({ ratio: 1 });
      const copy = page.getByTestId("copy");
      await expect(copy).toBeInViewport({ ratio: 1 });
      expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      // Phone-shaped (height >= 1.55 x width), never a squat card, and a real phone's width.
      const box = (await phone(page).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(270);
      expect(box.height / box.width).toBeGreaterThanOrEqual(1.55);
      // Every region is inside the phone screen.
      const fit = await phone(page).evaluate((ph) => {
        const screen = ph.querySelector("[data-screen]")!.getBoundingClientRect();
        return [...ph.querySelectorAll("[data-region]")].every((t) => {
          const r = t.getBoundingClientRect();
          return r.top >= screen.top - 1 && r.bottom <= screen.bottom + 1;
        });
      });
      expect(fit).toBe(true);
      // Text floors: nothing in the page under 12px.
      const tiny = await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter((el) => el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent!.trim()))
          .filter((el) => (el as HTMLElement).offsetParent !== null && !el.closest("svg, .visually-hidden"))
          .map((el) => [el.textContent!.trim().slice(0, 20), parseFloat(getComputedStyle(el).fontSize)] as const)
          .filter(([, s]) => s < 12),
      );
      expect(tiny).toEqual([]);
    });
  }
});

test.describe("Present geometry", () => {
  test.use({ reducedMotion: "reduce" });
  for (const [w, h] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    for (const mode of ["present", "normal"] as const) {
      test(`${mode} ${w}x${h}: a phone-shaped phone with all 4 regions and their connectors in view, no inner scroll`, async ({ page }) => {
        await page.setViewportSize({ width: w, height: h });
        if (mode === "present") await page.addInitScript(() => sessionStorage.setItem("money-legos:present", "1"));
        await page.goto("/#recipe=neobank");
        await expect(phone(page).locator("[data-region]")).toHaveCount(4);
        if (mode === "present") await expect(page.getByTestId("present-drawer")).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
        const g = await phone(page).evaluate((ph) => {
          const body = ph.querySelector<HTMLElement>("[data-body]")!;
          const s = ph.querySelector("[data-screen]")!.getBoundingClientRect();
          const d = ph.getBoundingClientRect();
          return {
            w: d.width,
            h: d.height,
            inner: body.scrollHeight - body.clientHeight,
            inside: [...ph.querySelectorAll("[data-region]")].every((t) => {
              const r = t.getBoundingClientRect();
              return r.top >= s.top - 1 && r.bottom <= s.bottom + 1;
            }),
            tabbar: getComputedStyle(ph.querySelector('[class*="tabbar"]')!).display !== "none",
          };
        });
        expect(g.h / g.w).toBeGreaterThanOrEqual(1.55);
        expect(g.w).toBeGreaterThanOrEqual(260);
        expect(g.inner).toBeLessThanOrEqual(1);
        expect(g.inside).toBe(true);
        // A phone 420px or taller keeps its tab bar.
        if (g.h >= 420) expect(g.tabbar).toBe(true);
        await expect(page.getByTestId("connectors").locator("[data-line]")).toHaveCount(4);
        for (const t of await phone(page).locator("[data-region]").all()) await expect(t).toBeInViewport({ ratio: 1 });
        if (mode === "present") {
          // The drawer is a strip: 5 heroes + every other brick (no chips), a small Recipes button, every printed verb >= 12px.
          const drawer = page.getByTestId("present-drawer");
          expect((await drawer.boundingBox())!.height).toBeLessThanOrEqual(150);
          await expect(drawer.locator("button[data-lego]")).toHaveCount(39);
          await expect(drawer.locator("button[data-chip]")).toHaveCount(0);
          await expect(drawer.getByTestId("recipes")).toBeVisible();
          const verbs = await drawer.locator("button[data-lego][data-print]").evaluateAll((els) =>
            els.map((b) => b.querySelector("[data-sprite]")!.getBoundingClientRect().width * Number((b as HTMLElement).dataset.print)),
          );
          expect(Math.min(...verbs)).toBeGreaterThanOrEqual(12);
        }
      });
    }
  }

  test("P keeps keyboard focus: on the same tray brick in the drawer and back, else on the toggle", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("brick-stage").waitFor();
    const focused = () => page.evaluate(() => (document.activeElement as HTMLElement).dataset.lego ?? (document.activeElement as HTMLElement).dataset.testid ?? document.activeElement!.tagName);
    await brick(page, "escrow").focus();
    await page.keyboard.press("p");
    await expect(page.getByTestId("present-drawer")).toBeVisible();
    expect(await focused()).toBe("escrow");
    // The first Escape closes the brick's tooltip, the second leaves Present.
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("hero-shelf")).toBeVisible();
    expect(await focused()).toBe("escrow");
    await brick(page, "payments").focus();
    await page.keyboard.press("p");
    expect(await focused()).toBe("payments");
    await page.keyboard.press("p");
    expect(await focused()).toBe("payments");
    await page.getByTestId("present-toggle").click();
    expect(await focused()).toBe("present-toggle");
  });
});

test.describe("accessibility", () => {
  test("reduced motion: no animations or transitions run", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/#b20,payments");
    await expect(phone(page).locator("[data-region]")).toHaveCount(2);
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
    await expect(page.getByRole("region", { name: "Base Neobank app: balance, Send, Request and Pay" })).toBeVisible();
    // Fake controls are inert: the only buttons on the screen are the inspect overlays, one per region.
    const ph = phone(page);
    await expect(ph.locator("button")).toHaveCount(2);
    await expect(ph.locator("[data-region] > button")).toHaveCount(2);
    await expect(ph.locator("svg:not([aria-hidden='true'])")).toHaveCount(0);
  });

  test("one polite live region announces every change", async ({ page }) => {
    await page.goto("/");
    const regions = page.locator('[aria-live="polite"]');
    await expect(regions).toHaveCount(1);
    await expect(regions).toHaveAttribute("role", "status");
    await brick(page, "b20").click();
    await expect(live(page)).toHaveText(/Token added, 1 of 4/);
    await brick(page, "payments").click();
    await build(page).click();
    await expect(live(page)).toHaveText(/App built: .+\. Copy prompt to use it\./);
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(live(page)).toHaveText(/Board cleared, 0 of 4/);
  });

  test("no visible 'Lego' as a common noun in the UI", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    await page.getByRole("button", { name: "Details" }).click();
    const text = await page.evaluate(() => document.body.innerText.replace(/Money Legos/g, ""));
    expect(text).not.toMatch(/\bLegos?\b/);
    const labels = await page.evaluate(() => [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label")).join(" "));
    expect(labels.replace(/Money Legos/g, "")).not.toMatch(/\bLegos?\b/);
  });
});

test.describe("small laptop", () => {
  test.use({ viewport: { width: 1100, height: 900 } });

  test("three columns; Build app fills the phone", async ({ page }) => {
    await page.goto("/");
    await brick(page, "b20").click();
    await brick(page, "payments").click();
    await build(page).click();
    await expect(phone(page)).toBeVisible();
    await expect(page.getByTestId("copy")).toHaveAttribute("aria-disabled", "false");
    await expect(page.getByTestId("mobile-bar")).toBeHidden();
  });
});

test.describe("compact tablet", () => {
  test.use({ viewport: { width: 768, height: 1024 }, reducedMotion: "reduce" });

  test("Build app opens the app sheet with Copy prompt pinned and Back to bricks; then View app", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByTestId("mobile-bar");
    await expect(bar).toBeVisible();
    await brick(page, "b20").click();
    await brick(page, "validity").click();
    await bar.getByRole("button", { name: "Build app" }).click();
    const sheet = page.getByTestId("result-sheet");
    await expect(sheet).toBeFocused();
    await expect(sheet.locator("[data-region]")).toHaveCount(2);
    await expect(sheet.getByTestId("demo-label")).toHaveCount(0);
    const copy = sheet.getByRole("button", { name: "Copy prompt" });
    await expect(copy).toBeInViewport({ ratio: 1 });
    const back = sheet.getByRole("button", { name: "Back to bricks" });
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await back.click();
    await expect(sheet).toBeHidden();
    const view = bar.getByRole("button", { name: "View app" });
    await expect(view).toBeFocused();
    await view.click();
    await expect(sheet).toBeVisible();
  });
});

test.describe("phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });

  test("first screen: compact bar, tools and the hero shelf; no chips", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByTestId("mobile-bar");
    await expect(bar.getByTestId("board-count")).toHaveAttribute("aria-label", "0 of 4 bricks");
    expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(132);
    await expect(page.getByRole("button", { name: "Surprise me" })).toBeInViewport();
    await expect(page.getByTestId("hero-shelf")).toBeInViewport();
    await expect(page.locator("button[data-chip]")).toHaveCount(0);
    await expect(page.getByTestId("recipes")).toHaveCount(0);
    const heroIds = (await page.getByTestId("hero-shelf").locator("button[data-lego]").evaluateAll((els) => els.map((e) => e.getAttribute("data-lego")!)));
    const hb = await Promise.all(heroIds.map((id) => brick(page, id).boundingBox()));
    // 3 + 2, like desktop: three on the first row, two below, never overlapping.
    expect(Math.abs(hb[0]!.y - hb[1]!.y)).toBeLessThan(2);
    expect(Math.abs(hb[2]!.y - hb[0]!.y)).toBeLessThan(2);
    expect(hb[3]!.y).toBeGreaterThanOrEqual(hb[0]!.y + hb[0]!.height - 0.5);
    for (let i = 1; i < 3; i++) expect(hb[i]!.x).toBeGreaterThanOrEqual(hb[i - 1]!.x + hb[i - 1]!.width - 0.5);
  });

  test("a shared link opens straight on the app (frameless sheet)", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    const sheet = page.getByTestId("result-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("[data-region]")).toHaveCount(3);
    await expect(sheet.getByTestId("app-name")).not.toHaveText("Your app");
    // No device frame inside the sheet: the phone fills the sheet's width.
    const ph = (await sheet.getByTestId("phone").boundingBox())!;
    expect(ph.width).toBeGreaterThan(340);
    // One screen colour edge to edge; the fake tab bar sits at the end of the scroll, right above the action bar.
    expect(await sheet.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(238, 240, 243)");
    const tab = (await sheet.locator('[class*="tabbar"]').boundingBox())!;
    const actions = (await sheet.getByRole("button", { name: "Back to bricks" }).locator("..").boundingBox())!;
    expect(Math.abs(tab.y + tab.height - actions.y)).toBeLessThan(2);
    expect(actions.height).toBeGreaterThanOrEqual(72);
    // Tapping a region names its brick.
    await sheet.locator('[data-region="payments"] > button').tap();
    await expect(sheet.locator('[data-region="payments"]')).toContainText("Made with");
    await expect(sheet.locator('[data-region="payments"]')).toHaveAttribute("data-inspect", "true");
    // Tapping it again turns it off; tapping another region moves it; tapping the screen clears it.
    await sheet.locator('[data-region="payments"] > button').tap();
    await expect(sheet.locator("[data-region][data-inspect]")).toHaveCount(0);
    await sheet.locator('[data-region="speed"] > button').tap();
    await expect(sheet.locator('[data-region="speed"]')).toHaveAttribute("data-inspect", "true");
    await sheet.getByTestId("phone-brand").tap();
    await expect(sheet.locator("[data-region][data-inspect]")).toHaveCount(0);
  });

  test("the sheet shows the full app name at once (never typed in), on Build and on reopening", async ({ page }) => {
    await page.goto("/");
    for (const id of ["b20", "payments"]) await brick(page, id).tap();
    await page.getByTestId("mobile-bar").getByRole("button", { name: "Build app" }).tap();
    const sheet = page.getByTestId("result-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByTestId("app-name")).not.toHaveAttribute("data-typing", "true");
    expect(await sheet.getByTestId("app-name").locator("span span").count()).toBe(0);
  });

  test("result opens as a bottom sheet; Details opens over it; Escape steps back", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByTestId("mobile-bar");
    await brick(page, "b20").tap();
    await brick(page, "payments").tap();
    await expect(bar.getByTestId("board-count")).toHaveAttribute("aria-label", "2 of 4 bricks");
    await bar.getByRole("button", { name: "Build app" }).tap();
    const sheet = page.getByTestId("result-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet).toBeFocused();
    const copy = (await sheet.getByRole("button", { name: "Copy prompt" }).boundingBox())!;
    expect(copy.y + copy.height).toBeLessThanOrEqual(844);
    await sheet.getByRole("button", { name: "Details" }).tap();
    await expect(page.getByTestId("details")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("details")).toBeHidden();
    await expect(sheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(bar.getByRole("button", { name: "View app" })).toBeFocused();
  });

  test("Recipes below the bricks: a sideways row of cards (44px+ targets, swipes, never widens the page); a tap opens the sheet", async ({ page }) => {
    await page.goto("/");
    const shelf = page.getByTestId("recipes-shelf");
    await expect(shelf).toHaveAttribute("data-layout", "row");
    const bin = (await page.getByTestId("tray-scroll").boundingBox())!;
    const sb = (await shelf.boundingBox())!;
    expect(sb.y).toBeGreaterThanOrEqual(bin.y + bin.height - 1);
    const cards = shelf.locator("button[data-recipe]");
    expect(await cards.count()).toBeGreaterThanOrEqual(12);
    const boxes = await cards.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON() as DOMRect));
    for (const b of boxes) expect(b.height).toBeGreaterThanOrEqual(44);
    expect(new Set(boxes.map((b) => Math.round(b.y))).size).toBe(1);
    expect(await shelf.locator("div").first().evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await cards.first().scrollIntoViewIfNeeded();
    await cards.first().tap();
    await expect(page.getByTestId("result-sheet")).toBeVisible();
  });

  test("long press shows the tooltip inside the screen and does not add the brick", async ({ page }) => {
    await page.goto("/");
    const b = brick(page, "speed");
    await b.scrollIntoViewIfNeeded();
    const box = (await b.boundingBox())!;
    await b.dispatchEvent("pointerdown", { pointerType: "touch", isPrimary: true, button: 0, clientX: box.x + 20, clientY: box.y + 20 });
    await page.waitForTimeout(600);
    const tip = page.getByRole("tooltip");
    await expect(tip).toContainText("200ms blocks");
    const t = (await tip.boundingBox())!;
    expect(t.x).toBeGreaterThanOrEqual(15);
    expect(t.x + t.width).toBeLessThanOrEqual(390 - 15);
    await b.dispatchEvent("pointerup", { pointerType: "touch", isPrimary: true });
    await b.dispatchEvent("click");
    await expect(b).toHaveAttribute("aria-pressed", "false");
  });
});

test.describe("v6: Replay, inspect from the board, Present mode, the name", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("brick-stage").waitFor();
  });

  test("before 2 bricks Build is a quiet Gray 10 slab and Surprise me is a text button; then Build is the only filled button", async ({ page }) => {
    const b = build(page);
    const style = () => b.evaluate((el) => { const cs = getComputedStyle(el); return [cs.backgroundColor, cs.color, cs.borderTopColor]; });
    expect(await style()).toEqual(["rgb(238, 240, 243)", "rgb(91, 97, 110)", "rgb(238, 240, 243)"]);
    const surprise = page.getByTestId("surprise");
    expect(await surprise.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
    await brick(page, "b20").click();
    await brick(page, "payments").click();
    await expect.poll(async () => (await style())[0]).toBe("rgb(0, 0, 255)");
    expect(await surprise.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  });

  test("Build by keyboard moves focus to Copy prompt and announces; Replay keeps the slot and the focus", async ({ page, browserName }) => {
    await brick(page, "b20").click();
    await brick(page, "payments").click();
    const slot = (await build(page).boundingBox())!;
    await build(page).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("copy")).toBeFocused();
    await expect(live(page)).toHaveText(/^App built: /);
    await expect(build(page)).toHaveText("Replay");
    const again = (await build(page).boundingBox())!;
    expect(Math.abs(again.x - slot.x)).toBeLessThan(1);
    expect(Math.abs(again.y - slot.y)).toBeLessThan(1);
    // Replay by mouse: the boot plays again, focus stays on the button (never drops to <body>).
    await build(page).click();
    // (WebKit never focuses a clicked button, Safari's platform rule; Chromium must keep it there.)
    if (browserName !== "webkit") await expect(build(page)).toBeFocused();
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    if (browserName !== "webkit") expect(await page.evaluate(() => document.activeElement === document.body)).toBe(false);
  });

  test("the app name: typed on Build, crossfade on edits, no invisible trailing letters; a shared link shows it at once", async ({ page }) => {
    const hidden = () =>
      page.getByTestId("app-name").evaluate((h) => [...h.querySelectorAll("span")].filter((s) => parseFloat(getComputedStyle(s).opacity) < 0.99).length);
    await brick(page, "b20").click();
    await brick(page, "payments").click();
    await build(page).click();
    await expect(page.getByTestId("app-name")).toHaveAttribute("data-typing", "true");
    await expect.poll(hidden, { timeout: 3000 }).toBe(0);
    await expect(page.getByTestId("app-name")).not.toHaveAttribute("data-typing", "true", { timeout: 3000 });
    const before = await page.getByTestId("app-name").textContent();
    await brick(page, "speed").click();
    await expect(page.getByTestId("app-name")).not.toHaveText(before!);
    await expect(page.getByTestId("app-name")).not.toHaveAttribute("data-typing", "true");
    await expect.poll(hidden, { timeout: 1000 }).toBe(0);
    // One text node per name: no per-letter spans left over from typing.
    expect(await page.getByTestId("app-name").evaluate((h) => h.querySelectorAll("span span").length)).toBe(0);
    await page.goto("/#b20,payments,speed");
    await expect(page.getByTestId("app-name")).not.toHaveText("Your app");
    await expect(page.getByTestId("app-name")).not.toHaveAttribute("data-typing", "true");
    expect(await hidden()).toBe(0);
  });

  test("board bricks are controls: hover highlights the region and outlines the brick; click removes with Undo", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    await expect(phone(page).locator("[data-region]")).toHaveCount(3);
    const hit = page.locator('[data-board-brick="payments"]');
    await expect(hit).toHaveAttribute("aria-label", "Payments — remove");
    await hit.hover();
    await expect(phone(page).locator('[data-region="payments"]')).toHaveAttribute("data-inspect", "true");
    const ring = page.getByTestId("brick-ring");
    await expect(ring).toBeVisible();
    const shape = await ring.getAttribute("data-shape");
    expect(["hull", "rect"]).toContain(shape);
    if (shape === "hull") expect((await ring.getAttribute("points"))!.trim().split(/\s+/).length).toBeGreaterThanOrEqual(3);
    // "Made with" shows on the region, inside the screen.
    const made = (await phone(page).locator('[data-region="payments"]').getByText("Made with").boundingBox())!;
    const screen = (await phone(page).locator("[data-screen]").boundingBox())!;
    expect(made.x + made.width).toBeLessThanOrEqual(screen.x + screen.width);
    await hit.click();
    await expect(brick(page, "payments")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("toast")).toContainText("Payments removed");
    await page.getByTestId("toast-undo").click();
    await expect(brick(page, "payments")).toHaveAttribute("aria-pressed", "true");
    expect(await regionIds(page)).toEqual(["b20", "payments", "speed"]);
    // Keyboard: Enter on a focused board brick removes it too.
    await page.locator('[data-board-brick="speed"]').focus();
    await expect(phone(page).locator('[data-region="speed"]')).toHaveAttribute("data-inspect", "true");
    await page.keyboard.press("Enter");
    await expect(brick(page, "speed")).toHaveAttribute("aria-pressed", "false");
  });

  test("the ghost brick: a dashed volume with no numeral; gone once the stack is full", async ({ page }) => {
    const ghost = page.locator("[data-ghost-slot]");
    await expect(ghost.first()).toBeAttached();
    await expect(page.locator("[data-ghost-slot] text")).toHaveCount(0);
    for (const id of ["b20", "payments", "financing", "validity"]) await brick(page, id).click();
    await expect(count(page)).toHaveAttribute("aria-label", "4 of 4 bricks");
    await expect(ghost).toHaveCount(0);
    await brick(page, "speed").hover();
    await expect(ghost).toHaveCount(0);
  });

  test("Grow's dotted line is Gray 60 on the light surface; the toast never touches the footer or the board controls", async ({ page }) => {
    await page.goto("/#b20,financing");
    await expect(page.getByTestId("connectors").locator('[data-line="financing"] path').first()).toHaveAttribute("stroke", /#5B616E/i);
    await page.locator('[data-board-brick="b20"]').click();
    const t = (await page.getByTestId("toast").boundingBox())!;
    const f = (await page.locator("footer").boundingBox())!;
    const c = (await build(page).boundingBox())!;
    expect(t.y + t.height).toBeLessThanOrEqual(f.y - 4);
    expect(t.y + t.height).toBeLessThanOrEqual(c.y);
  });

  test("focus never drops to <body>: after a board removal (keyboard or click), after Undo", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    await expect(phone(page).locator("[data-region]")).toHaveCount(3);
    const focused = () => page.evaluate(() => {
      const a = document.activeElement as HTMLElement;
      return a.dataset.boardBrick ?? a.dataset.testid ?? a.tagName;
    });
    // Keyboard: Enter on Speed (top) -> focus the brick now on top (Pay).
    await page.locator('[data-board-brick="speed"]').focus();
    await page.keyboard.press("Enter");
    await expect.poll(focused).toBe("payments");
    // Undo from the toast (keyboard) -> focus the brick that came back.
    await page.getByTestId("toast-undo").focus();
    await page.keyboard.press("Enter");
    await expect.poll(focused).toBe("speed");
    // Click removal -> the board region.
    await page.locator('[data-board-brick="b20"]').click();
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "false");
    await expect.poll(focused).toBe("board");
    // Undo by click -> the restored brick.
    await page.getByTestId("toast-undo").click();
    await expect.poll(focused).toBe("b20");
  });

  test("Present mode: P or the toggle; the tray slides away, a drawer keeps the bricks; Esc leaves; remembered for the tab, not the URL", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/#b20,payments");
    await expect(phone(page).locator("[data-region]")).toHaveCount(2);
    const toggle = page.getByTestId("present-toggle");
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await page.locator("body").press("p");
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    const drawer = page.getByTestId("present-drawer");
    await expect(drawer).toBeVisible();
    await expect(page.getByTestId("hero-shelf")).toHaveCount(0);
    expect((await phone(page).boundingBox())!.width).toBeGreaterThanOrEqual(400);
    // Pick from the drawer with the keyboard.
    await drawer.locator('button[data-lego="speed"]').focus();
    await page.keyboard.press("Enter");
    await expect(count(page)).toHaveAttribute("aria-label", "3 of 4 bricks");
    await expect(page).not.toHaveURL(/present/);
    await page.reload();
    await expect(page.getByTestId("present-toggle")).toHaveAttribute("aria-pressed", "true");
    await page.locator("body").press("Escape");
    await expect(page.getByTestId("present-toggle")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("hero-shelf")).toBeVisible();
    await page.getByTestId("present-toggle").click();
    await expect(page.getByTestId("present-drawer")).toBeVisible();
    await page.getByTestId("present-toggle").click();
    await expect(page.getByTestId("present-drawer")).toHaveCount(0);
  });

  test("hovering a tray brick does not add it; the compact DOM is not mounted on desktop", async ({ page }) => {
    await brick(page, "swaps").hover();
    await expect(count(page)).toHaveAttribute("aria-label", "0 of 4 bricks");
    await expect(page.getByTestId("mobile-bar")).toHaveCount(0);
  });
});

for (const w of [320, 360, 390, 430]) {
  test.describe(`compact bar at ${w}px`, () => {
    test.use({ viewport: { width: w, height: 760 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });

    test("nothing overflows; module chips preview the app; no prose; 44px targets", async ({ page }) => {
      await page.goto("/");
      const bar = page.getByTestId("mobile-bar");
      await expect(bar).toBeVisible();
      for (const id of ["b20", "payments", "speed"]) await brick(page, id).tap();
      const mods = bar.getByTestId("mobile-modules").locator("li");
      await expect(mods).toHaveCount(3);
      const over = await bar.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return [...el.querySelectorAll("*")].filter((c) => {
          const b = c.getBoundingClientRect();
          return b.width > 0 && (b.left < r.left - 0.5 || b.right > r.right + 0.5);
        }).length + (el.scrollWidth > el.clientWidth + 1 ? 1 : 0);
      });
      expect(over).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(w);
      // One word per chip, no sentences.
      for (const t of await mods.allTextContents()) expect(t.trim().split(/\s+/).length).toBeLessThanOrEqual(2);
      expect((await bar.getByTestId("mobile-action").boundingBox())!.height).toBeGreaterThanOrEqual(44);
      for (const c of await page.getByTestId("recipes-shelf").locator("button[data-recipe]").all()) {
        expect(Math.round((await c.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
      }
      // A fifth brick: the swap is a toast, the bar stays prose-free.
      await brick(page, "financing").tap();
      await brick(page, "validity").tap();
      await expect(page.getByTestId("toast")).toContainText("Full · swapped");
      await expect(bar).not.toContainText("Full");
      // Four bricks: the four count studs never touch Build/View, and no module chip is cut mid-word
      // (all fit, or the row fades at its edge while it scrolls).
      const g = await bar.evaluate((el) => {
        const dots = el.querySelector('[data-testid="board-count"]')!.getBoundingClientRect();
        const act = el.querySelector('[data-testid="mobile-action"]')!.getBoundingClientRect();
        const mods = el.querySelector('[data-testid="mobile-modules"]') as HTMLElement;
        const mr = mods.getBoundingClientRect();
        const cut = [...mods.querySelectorAll("li")].some((li) => li.getBoundingClientRect().right > mr.right + 0.5);
        return { gap: act.left - dots.right, cut, faded: mods.hasAttribute("data-more") };
      });
      expect(g.gap).toBeGreaterThanOrEqual(2);
      if (g.cut) expect(g.faded).toBe(true);
      // Printed verbs >= 12px in the compact bin too.
      const verbs = await page.locator("button[data-lego][data-print]").evaluateAll((els) =>
        els.map((b) => b.querySelector("[data-sprite]")!.getBoundingClientRect().width * Number((b as HTMLElement).dataset.print)),
      );
      expect(Math.min(...verbs)).toBeGreaterThanOrEqual(12);
    });
  });
}

// ---------------------------------------------------------------- v8 cleanup pass
const focusedOn = (page: Page) =>
  page.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    if (!a || a === document.body) return "BODY";
    return a.dataset.lego ?? a.dataset.testid ?? a.tagName;
  });

/** Every visible button / role=button (not inside an aria-hidden subtree): its box, rounded. */
const targets = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("button, [role='button'], summary")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || getComputedStyle(e).visibility === "hidden" || e.closest("[aria-hidden='true'], .visually-hidden")) return false;
        // Inside the open modal only, when there is one (the page behind is inert).
        const d = document.querySelector("dialog[open]");
        return !d || d.contains(e);
      })
      .map((e) => ({ name: (e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 24), w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height })),
  );

test.describe("v8: compact focus, toast docking, targets", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, reducedMotion: "reduce" });

  test("compact Undo (tap or Ctrl+Z) focuses the restored brick's tray button, never <body>", async ({ page }) => {
    await page.goto("/#b20,payments,speed,financing");
    await expect(page.getByTestId("result-sheet")).toBeVisible();
    await page.keyboard.press("Escape");
    await brick(page, "validity").tap();
    await expect(page.getByTestId("toast")).toBeVisible();
    await page.getByTestId("toast-undo").tap();
    await expect(page.getByTestId("toast")).toHaveCount(0);
    await expect.poll(() => focusedOn(page)).toBe("b20");
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "true");
    // Keyboard: Ctrl+Z with focus nowhere also lands on the restored brick.
    await brick(page, "validity").tap();
    await expect(page.getByTestId("toast")).toBeVisible();
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press("Control+z");
    await expect(page.getByTestId("toast")).toHaveCount(0);
    await expect.poll(() => focusedOn(page)).toBe("b20");
  });

  test("resizing an open sheet to desktop moves focus to Copy prompt, not <body>", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    await expect(page.getByTestId("result-sheet")).toBeVisible();
    await page.getByTestId("sheet-copy").focus();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByTestId("result-sheet")).toHaveCount(0);
    await expect.poll(() => focusedOn(page)).toBe("copy");
  });

  test("touch targets are >= 44px: page, sheet (Copy prompt, Back to bricks) and Details", async ({ page }) => {
    await page.goto("/#b20,payments,speed,financing");
    const sheet = page.getByTestId("result-sheet");
    await expect(sheet).toBeVisible();
    for (const t of await targets(page)) expect(t.h, t.name).toBeGreaterThanOrEqual(44);
    expect((await sheet.getByTestId("sheet-copy").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await sheet.getByRole("button", { name: "Details" }).tap();
    await expect(page.getByRole("dialog", { name: /./ }).last()).toBeVisible();
    for (const t of await targets(page)) expect(t.h, t.name).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    for (const t of await targets(page)) expect(t.h, t.name).toBeGreaterThanOrEqual(44);
  });

  for (const [w, h] of [
    [320, 640],
    [390, 844],
  ] as const) {
    test(`${w}x${h}: the toast docks under the compact bar, clear of the footer risk line at the end of the page`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/#b20,payments,speed,financing");
      await page.keyboard.press("Escape");
      await brick(page, "validity").tap();
      const toast = page.getByTestId("toast");
      await expect(toast).toBeVisible();
      const hit = (a: { y: number; height: number }, b: { y: number; height: number }) => a.y < b.y + b.height && b.y < a.y + a.height;
      for (const end of [false, true]) {
        if (end) await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(150);
        const t = (await toast.boundingBox())!;
        const bar = (await page.getByTestId("mobile-bar").boundingBox())!;
        const foot = (await page.locator("footer").boundingBox())!;
        expect(hit(t, bar)).toBe(false);
        expect(hit(t, foot)).toBe(false);
        expect(t.y).toBeGreaterThanOrEqual(0);
        expect(t.y + t.height).toBeLessThanOrEqual(h);
      }
      expect((await page.getByTestId("toast-undo").boundingBox())!.height).toBeGreaterThanOrEqual(44);
    });
  }
});

test.describe("v8: desktop", () => {
  test.use({ reducedMotion: "reduce" });

  test("desktop targets are >= 32px: empty, built, Details, Present", async ({ page }) => {
    await page.goto("/#recipe=neobank");
    await expect(phone(page).locator("[data-region]")).toHaveCount(4);
    for (const t of await targets(page)) expect(t.h, t.name).toBeGreaterThanOrEqual(32);
    await page.getByRole("button", { name: "Details" }).click();
    for (const t of await targets(page)) expect(t.h, t.name).toBeGreaterThanOrEqual(32);
    await page.keyboard.press("Escape");
    await page.getByTestId("present-toggle").click();
    await expect(page.getByTestId("present-drawer")).toBeVisible();
    for (const t of await targets(page)) expect(t.h, t.name).toBeGreaterThanOrEqual(32);
  });

  test("P only fires with no field, dialog, menu or popover focused; the toggle documents it", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("brick-stage").waitFor();
    const toggle = page.getByTestId("present-toggle");
    await expect(toggle).toHaveAttribute("title", "Present (P)");
    await expect(toggle).toHaveAttribute("aria-keyshortcuts", "P");
    // Inside the Details dialog: nothing.
    await brick(page, "b20").click();
    await brick(page, "payments").click();
    await page.getByRole("button", { name: "Details" }).click();
    await page.keyboard.press("p");
    await expect(page.getByTestId("present-drawer")).toHaveCount(0);
    await page.keyboard.press("Escape");
    // A tray brick (a button, not a text field): P works.
    await brick(page, "speed").focus();
    await page.keyboard.press("p");
    await expect(page.getByTestId("present-drawer")).toBeVisible();
    await expect(toggle).toHaveAttribute("title", "Leave Present (P or Esc)");
    // Inside the drawer's Recipes popover (role=dialog): P does nothing, Escape closes it and focus goes back to its button.
    const trigger = page.getByTestId("present-drawer").getByTestId("recipes");
    await trigger.click();
    const pop = page.getByRole("dialog", { name: "Recipes" });
    await expect(pop).toBeVisible();
    await pop.locator("button").first().focus();
    await page.keyboard.press("p");
    await expect(page.getByTestId("present-drawer")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(pop).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page.getByTestId("present-drawer")).toBeVisible();
    // Picking a recipe from the drawer builds it.
    await trigger.click();
    await pop.getByRole("button", { name: /^Neobroker/ }).click();
    await expect(page).toHaveURL(/#recipe=neobroker$/);
  });

  test("a status-only stack (Speed + Verify + Sponsor) still makes a full screen with a primary action", async ({ page }) => {
    await page.goto("/#sponsored-gas,verify,speed");
    await expect(phone(page)).toHaveAttribute("data-archetype", "identity");
    await expect(phone(page).locator("[data-region]")).toHaveCount(3);
    await expect(phone(page).getByText("Continue", { exact: true })).toBeInViewport();
  });

  test("the screen is full: no empty band under the last region or list (2, 3 and 4 bricks, every archetype)", async ({ page }) => {
    for (const hash of ["#b20,payments", "#b20,payments,speed", "#recipe=pay-a-name", "#recipe=neobroker", "#recipe=creator-payouts", "#recipe=agent-data-market", "#recipe=gas-free-onboarding", "#financing,borrow"]) {
      await page.goto("/" + hash);
      await expect(phone(page)).toHaveAttribute("data-phase", "live");
      await page.waitForTimeout(100);
      const gap = await phone(page).evaluate((ph) => {
        const body = ph.querySelector<HTMLElement>("[data-body]")!;
        const br = body.getBoundingClientRect();
        const kids = [...body.children].filter((k) => getComputedStyle(k).display !== "none" && !k.querySelector("li"));
        // A filling list counts down to its last row in view (rows that do not fit wrap out of view).
        const rows = [...body.querySelectorAll("li")].filter((li) => {
          const r = li.getBoundingClientRect();
          return r.height > 0 && r.left < br.right - 1;
        });
        const bottoms = [...kids, ...rows].map((k) => k.getBoundingClientRect().bottom);
        return (br.bottom - Math.max(...bottoms)) / ph.getBoundingClientRect().height;
      });
      expect(gap, hash).toBeLessThanOrEqual(0.09);
    }
  });

  test("the bin is packed: no hole wider than a gap between neighbouring bricks in a row", async ({ page }) => {
    await page.goto("/");
    const rows = await page.locator('[data-testid="tray-scroll"] li').evaluateAll((els) => {
      const byRow = new Map<number, { l: number; r: number }[]>();
      for (const e of els) {
        const b = e.getBoundingClientRect();
        const k = Math.round(b.bottom);
        byRow.set(k, [...(byRow.get(k) ?? []), { l: b.left, r: b.right }]);
      }
      return [...byRow.values()].map((r) => r.sort((a, b) => a.l - b.l));
    });
    expect(rows.length).toBeGreaterThan(3);
    for (const r of rows) for (let i = 1; i < r.length; i++) expect(r[i]!.l - r[i - 1]!.r).toBeLessThanOrEqual(12);
  });

  test("pale grey and white bricks carry a contact shadow on the white surface", async ({ page }) => {
    await page.goto("/");
    const pale = page.locator("button[data-lego][data-pale] [data-sprite]");
    expect(await pale.count()).toBeGreaterThan(2);
    for (const f of await pale.evaluateAll((els) => els.map((e) => getComputedStyle(e).filter))) expect(f).toContain("drop-shadow");
  });

  test("the ghost hides over a built 3-brick app until the next brick is hovered", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    // (The board's live layer and its poster each draw one; only visible ones count.)
    const ghost = page.locator('[data-testid="board"] [data-ghost-slot]');
    const shown = ghost.locator("visible=true");
    await expect(ghost.first()).toBeAttached();
    await expect(shown).toHaveCount(0);
    await brick(page, "financing").hover();
    await expect(shown.first()).toBeVisible();
    await page.mouse.move(5, 5);
    await expect(shown).toHaveCount(0);
    // Two bricks: the ghost still invites the next one.
    await page.goto("/#b20,payments");
    await page.reload();
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await expect(page.locator('[data-testid="board"] [data-ghost-slot]').locator("visible=true").first()).toBeVisible();
  });
});

test.describe("v8: Present uses the screen", () => {
  test.use({ reducedMotion: "reduce" });
  for (const [w, h] of [
    [1280, 720],
    [1440, 900],
    [1920, 1080],
  ] as const) {
    test(`${w}x${h}: no header row, a one-line name, a bigger phone, a toolbar on one row`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/#recipe=neobank");
      await expect(phone(page).locator("[data-region]")).toHaveCount(4);
      const normal = (await phone(page).boundingBox())!;
      await page.keyboard.press("p");
      await expect(page.getByTestId("present-drawer")).toBeVisible();
      await page.waitForTimeout(400);
      const pres = (await phone(page).boundingBox())!;
      expect(pres.width).toBeGreaterThanOrEqual(Math.min(normal.width + 20, 460));
      expect(pres.height / pres.width).toBeGreaterThanOrEqual(1.6 - 0.01);
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
      for (const t of await phone(page).locator("[data-region]").all()) await expect(t).toBeInViewport({ ratio: 1 });
      // The toolbar (lockup, Docs, Present) is one row and sits above the stage, not in a header row.
      const bar = await page.locator("header:has([data-testid=present-toggle])").evaluate((el) => {
        const kids = [...el.querySelectorAll("a, button, svg")].map((k) => k.getBoundingClientRect()).filter((r) => r.width > 0);
        return { h: el.getBoundingClientRect().height, spread: Math.max(...kids.map((r) => r.top + r.height / 2)) - Math.min(...kids.map((r) => r.top + r.height / 2)) };
      });
      expect(bar.h).toBeLessThanOrEqual(48);
      expect(bar.spread).toBeLessThanOrEqual(4);
      const main = (await page.locator("main").boundingBox())!;
      // The stage starts at the top of the page (no header row above it); the phone near its top.
      expect(main.y).toBeLessThanOrEqual(40);
      expect(pres.y - main.y).toBeLessThanOrEqual(100);
      // The name is one line.
      const name = await page.locator("#app-name").evaluate((el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).fontSize));
      expect(name).toBeLessThan(1.5);
      // A long name shrinks to fit on that line rather than being cut.
      await page.goto("/#b20,payments,speed,financing");
      await expect(page.locator("#app-name")).toHaveText("Instant tokenized checkout");
      const fit = await page.locator("#app-name").evaluate((el) => ({ cut: el.scrollWidth > el.clientWidth + 1, lines: el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).fontSize), fs: parseFloat(getComputedStyle(el).fontSize) }));
      expect(fit.cut).toBe(false);
      expect(fit.lines).toBeLessThan(1.5);
      expect(fit.fs).toBeGreaterThanOrEqual(18);
    });
  }

  test("the drawer never hard-clips a brick: edge fade, snap to whole bricks, a visible ›", async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("money-legos:present", "1"));
    await page.goto("/");
    const drawer = page.getByTestId("present-drawer");
    await expect(drawer).toBeVisible();
    const strip = drawer.getByTestId("tray-scroll");
    const st = await strip.evaluate((el) => ({ snap: getComputedStyle(el).scrollSnapType, mask: getComputedStyle(el).maskImage || getComputedStyle(el).webkitMaskImage }));
    expect(st.snap).toContain("mandatory");
    expect(st.mask).toContain("gradient");
    const next = drawer.getByTestId("strip-next");
    await expect(next).toBeVisible();
    await next.click();
    await expect(drawer.getByTestId("strip-prev")).toBeVisible();
    // Comes to rest on a whole brick's left edge.
    await expect
      .poll(() =>
        strip.evaluate((el) => {
          const x = el.getBoundingClientRect().left;
          return [...el.querySelectorAll("li")].some((li) => Math.abs(li.getBoundingClientRect().left - x) < 2);
        }),
      )
      .toBe(true);
  });
});
