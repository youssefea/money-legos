import { expect, test, type Page } from "@playwright/test";

const brick = (page: Page, id: string) => page.locator(`button[data-lego="${id}"]`);
const live = (page: Page) => page.locator('p[aria-live="polite"]');
const phone = (page: Page) => page.getByTestId("phone");
const tileIds = (page: Page) => phone(page).locator("[data-tile]").evaluateAll((els) => els.map((e) => e.getAttribute("data-tile")));
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
    await expect(page.getByText("Snap bricks. Preview an app. Copy the prompt.")).toBeVisible();
    await expect(count(page)).toHaveAttribute("aria-label", "0 of 4 bricks");
    await expect(build(page)).toHaveText("Build app");
    await expect(build(page)).toHaveAttribute("aria-disabled", "true");
    for (const gone of ["Pick 2+", "Tap a Lego", "Your board", "0 of 4"]) await expect(page.getByText(gone, { exact: true })).toHaveCount(0);
    await expect(phone(page)).toHaveAttribute("aria-label", /empty/);
    await expect(phone(page).locator("[data-slot]")).toHaveCount(3);
    await expect(page.getByTestId("copy")).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByTestId("app-name")).toHaveText("Your app");
    await expect(page.getByTestId("demo-label")).toHaveText("Demo · no real funds");
    await expect(page.locator('[aria-label="Steps"] li')).toHaveText(["1Pick", "2Build", "3Copy"]);
    // Text diet: no blurbs in the tray, the Denim line only lives in the Speed and BaseTime tooltips.
    await expect(page.getByText(/mainnet targeting/)).toHaveCount(0);
    await expect(page.locator("button[data-lego]")).toHaveCount(40);
    // Brick copy, not "Lego", in the bin's names.
    await expect(page.getByRole("group", { name: "Filter bricks" })).toBeVisible();
  });

  test("bricks first in tab order: Docs, Sound, then the bin", async ({ page }) => {
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.lego)).toBe("b20");
  });

  test("before Build app the phone shows wireframes; Build app boots it; then it stays live", async ({ page }) => {
    await brick(page, "b20").click();
    await expect(count(page)).toHaveAttribute("aria-label", "1 of 4 bricks");
    await expect(live(page)).toHaveText(/Issue added, 1 of 4/);
    expect(await tileIds(page)).toEqual(["b20"]);
    await expect(phone(page)).toHaveAttribute("data-phase", "wire");
    await expect(phone(page).locator("[data-tile]").first()).toHaveAttribute("data-wire", "true");
    await expect(phone(page).locator("[data-tile]").first()).toContainText("Balance");
    await brick(page, "payments").click();
    await expect(build(page)).toHaveAttribute("aria-disabled", "false");
    await expect(page.getByTestId("app-name")).toHaveText("Your app");
    // Copy is pressable at 2 bricks but quiet until the app is built.
    await expect(page.getByTestId("copy")).toHaveAttribute("aria-disabled", "false");
    await expect(page.getByTestId("copy")).toHaveAttribute("data-quiet", "true");
    await build(page).click();
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await expect(page.getByTestId("app-name")).not.toHaveText("Your app");
    await expect(build(page)).toHaveCount(0);
    await expect(page.getByTestId("copy")).not.toHaveAttribute("data-quiet", "true");
    expect(await tileIds(page)).toEqual(["payments", "b20"]);
    await expect(page.locator('[aria-label="Steps"] li').nth(1)).toHaveAttribute("data-state", "done");
    await expect(page).toHaveURL(/#b20,payments$/);
    // Live: adding a brick updates name and tiles at once, no Regenerate.
    const before = await page.getByTestId("app-name").textContent();
    await brick(page, "speed").click();
    expect(await tileIds(page)).toEqual(["speed", "payments", "b20"]);
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await expect(page.getByTestId("app-name")).not.toHaveText(before!);
    await expect(page.getByRole("button", { name: "Details" })).toHaveAttribute("aria-disabled", "false");
    await expect(page.getByRole("button", { name: /Regenerate|Generate/ })).toHaveCount(0);
    // Removing one keeps it live.
    await brick(page, "speed").click();
    await expect(page.getByTestId("app-name")).toHaveText(before!);
  });

  test("placed bricks fade with a check on the front face; click again removes", async ({ page }) => {
    await brick(page, "b20").click();
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "true");
    const check = (await brick(page, "b20").getByTestId("placed-check").boundingBox())!;
    const art = (await brick(page, "b20").locator("[data-sprite]").boundingBox())!;
    // Bottom half of the brick, not on the studs.
    expect(check.y).toBeGreaterThan(art.y + art.height * 0.5);
    await expect.poll(async () => Math.round((await brick(page, "b20").getByTestId("placed-check").boundingBox())!.width)).toBe(16);
    await brick(page, "b20").click();
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "false");
    await expect(live(page)).toHaveText(/Issue removed, 0 of 4/);
    await expect(phone(page).locator("[data-tile]")).toHaveCount(0);
  });

  test("one stud scale: a hero 2x4 is about twice a small 2x2", async ({ page }) => {
    const hero = (await brick(page, "b20").locator("[data-sprite]").boundingBox())!;
    const small = (await brick(page, "swaps").locator("[data-sprite]").boundingBox())!;
    expect(hero.height).toBeCloseTo(small.height, 0);
    expect(hero.width).toBeGreaterThan(small.width * 1.5);
  });

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
    // Roving tab stop: one Tab leaves the bin and lands on the category chips (one stop too).
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.chip ?? null)).toBe("Money");
    await page.keyboard.press("ArrowRight");
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.chip ?? null)).toBe("Identity");
    await page.keyboard.press("Tab");
    expect(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.chip ?? null)).toBeNull();
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

  test("category chips filter the small bricks; heroes stay, dimmed; no All chip", async ({ page }) => {
    await expect(page.getByRole("button", { name: "All", exact: true })).toHaveCount(0);
    const agents = page.getByRole("button", { name: "Agents", exact: true });
    await agents.click();
    await expect(agents).toHaveAttribute("aria-pressed", "true");
    await expect(brick(page, "b20")).toBeVisible();
    await expect(brick(page, "b20")).toHaveAttribute("data-dim", "true");
    await expect(brick(page, "x402-api")).toBeVisible();
    await expect(brick(page, "swaps")).toHaveCount(0);
    const n = await page.locator("button[data-lego]").count();
    expect(n).toBeGreaterThan(7);
    expect(n).toBeLessThan(40);
    await page.getByRole("button", { name: "Speed", exact: true }).click();
    await expect(brick(page, "speed")).not.toHaveAttribute("data-dim", "true");
    await expect(brick(page, "flashblocks")).toBeVisible();
    // Pressing the active chip again shows everything.
    await page.getByRole("button", { name: "Speed", exact: true }).click();
    await expect(page.locator("button[data-lego]")).toHaveCount(40);
  });

  test("tooltip: name, tag and status (with the Denim line for Speed and BaseTime); stays on screen", async ({ page }) => {
    await brick(page, "b20").focus();
    await page.keyboard.press("ArrowRight"); // keyboard focus is :focus-visible
    await page.keyboard.press("Home");
    for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowRight");
    await expect(brick(page, "speed")).toBeFocused();
    const tip = page.getByRole("tooltip");
    await expect(tip).toBeVisible();
    await expect(tip).toContainText("200ms blocks");
    await expect(tip).toContainText("Live on Base Sepolia; mainnet targeting November 2026");
    await expect(brick(page, "speed")).toHaveAttribute("aria-describedby", "brick-tip");
    const box = (await tip.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(15);
    await page.keyboard.press("Escape");
    await expect(tip).toHaveCount(0);
    await expect(brick(page, "speed")).toBeFocused();
    await brick(page, "basetime").scrollIntoViewIfNeeded();
    await brick(page, "basetime").hover();
    await expect(tip).toContainText("mainnet targeting November 2026");
    await brick(page, "b20").hover();
    await expect(tip).toContainText("B20");
    await expect(tip).not.toContainText("mainnet targeting");
  });

  test("recipes popover: brick glyph rows, arrow keys, Escape returns focus, picking one builds it", async ({ page }) => {
    const trigger = page.getByTestId("recipes").locator("visible=true");
    await trigger.click();
    const pop = page.getByRole("dialog", { name: "Recipes" });
    await expect(pop).toBeVisible();
    const first = pop.getByRole("button").first();
    await expect(first).toBeFocused();
    expect(await first.locator("svg").count()).toBeGreaterThanOrEqual(2);
    await page.keyboard.press("ArrowDown");
    await expect(pop.getByRole("button").nth(1)).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(pop).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await pop.getByRole("button", { name: /^Neobroker/ }).click();
    await expect(count(page)).toHaveAttribute("aria-label", "4 of 4 bricks");
    await expect(page.getByTestId("app-name")).toHaveText("Neobroker");
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await expect(page).toHaveURL(/#recipe=neobroker$/);
  });

  test("4-brick stack: tiles in order, one dominant module, dotted connectors that never cross", async ({ page }) => {
    await page.goto("/#b20,payments,speed,validity");
    await expect(phone(page).locator("[data-tile]")).toHaveCount(4);
    expect(await tileIds(page)).toEqual(["validity", "speed", "payments", "b20"]);
    await expect(phone(page).locator('[data-role="hero"]')).toHaveCount(1);
    await expect(phone(page).locator('[data-role="hero"]')).toHaveAttribute("data-tile", "b20");
    await expect(phone(page).locator('[data-role="status"]')).toHaveAttribute("data-tile", "speed");
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

  test("inspect: hovering a tile highlights its line and brick; hovering a placed brick highlights its tile", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    await expect(phone(page).locator("[data-tile]")).toHaveCount(3);
    await phone(page).locator('[data-tile="payments"]').hover();
    await expect(page.getByTestId("connectors")).toHaveAttribute("data-inspect", "payments");
    await expect(page.getByTestId("brick-ring")).toBeVisible();
    await expect(phone(page).locator('[data-tile="payments"]')).toContainText("Made with");
    await brick(page, "b20").hover();
    await expect(phone(page).locator('[data-tile="b20"]')).toHaveAttribute("data-inspect", "true");
  });

  test("money values carry a currency and are never cut off", async ({ page }) => {
    await page.goto("/#b20,payments");
    await expect(phone(page)).toContainText("$1,240.00");
    await expect(phone(page)).toContainText("$12.00");
    const cut = await phone(page).evaluate((ph) =>
      [...ph.querySelectorAll("span")].some((s) => /\$/.test(s.textContent ?? "") && s.children.length === 0 && s.scrollWidth > s.clientWidth + 1),
    );
    expect(cut).toBe(false);
  });

  test("copy prompt turns green, then resets", async ({ page, context }) => {
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

  test("Copy prompt before Build app builds first, then copies", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await brick(page, "b20").click();
    await brick(page, "payments").click();
    await page.getByTestId("copy").click();
    await expect(phone(page)).toHaveAttribute("data-phase", "live");
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("Build a first working version of");
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

  test("details drawer: the dialog takes focus, words live here, focus is trapped, Escape returns focus", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    const details = page.getByRole("button", { name: "Details" });
    await details.click();
    const drawer = page.getByTestId("details");
    await expect(drawer).toBeVisible();
    await expect(drawer).toBeFocused();
    await expect(drawer.getByText("Why each brick")).toBeVisible();
    await expect(drawer.getByText("Build steps")).toBeVisible();
    await expect(drawer.getByTestId("prompt")).toContainText("Build a first working version of");
    await expect(drawer).toContainText("Live on Base Sepolia since Oct 21, 2026; mainnet targeting November 2026");
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

  test("full at 4: a fifth brick replaces the bottom one and the board says so", async ({ page }) => {
    for (const id of ["b20", "payments", "financing", "validity"]) await brick(page, id).click();
    await expect(count(page)).toHaveAttribute("aria-label", "4 of 4 bricks");
    await expect(page.getByTestId("board-full")).toHaveText("Full. A new brick swaps out the bottom one.");
    await brick(page, "speed").click();
    await expect(brick(page, "speed")).toHaveAttribute("aria-pressed", "true");
    await expect(brick(page, "b20")).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByTestId("board-full")).toHaveText("Full. Speed swapped in for Issue.");
    await expect(live(page)).toHaveText(/Board full: Speed replaced Issue, 4 of 4/);
    expect(await tileIds(page)).toEqual(["speed", "validity", "financing", "payments"]);
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
    await expect(build(page)).toBeVisible();
  });
});

test.describe("deep links", () => {
  test("hash restores the board and builds the app, including new ids", async ({ page }) => {
    await page.goto("/#basenames,base-pay,speed");
    for (const id of ["basenames", "base-pay", "speed"]) await expect(brick(page, id)).toHaveAttribute("aria-pressed", "true");
    await expect(phone(page).locator("[data-tile]")).toHaveCount(3);
    await expect(count(page)).toHaveAttribute("aria-label", "3 of 4 bricks");
    expect(await tileIds(page)).toEqual(["speed", "base-pay", "basenames"]);
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

  test("URL and screen agree after a valid link turns unknown, and after Back to an empty hash", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("brick-stage").waitFor();
    await page.evaluate(() => (window.location.hash = "#recipe=neobroker"));
    await expect(page.getByTestId("app-name")).toHaveText("Neobroker");
    await page.evaluate(() => (window.location.hash = "#unknown"));
    await expect(count(page)).toHaveAttribute("aria-label", "0 of 4 bricks");
    await expect(page.getByTestId("app-name")).toHaveText("Your app");
    await page.evaluate(() => (window.location.hash = "#b20,payments"));
    await expect(count(page)).toHaveAttribute("aria-label", "2 of 4 bricks");
    // Back: to the cleaned (empty) entry the unknown link left, then to the recipe.
    await page.goBack();
    await expect.poll(() => page.evaluate(() => window.location.hash)).toBe("");
    await expect(count(page)).toHaveAttribute("aria-label", "0 of 4 bricks");
    await page.goBack();
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
    test(`no page scroll; phone, its dominant module and Copy in view at ${w}x${h}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/#b20,payments,speed,validity");
      await expect(phone(page).locator("[data-tile]")).toHaveCount(4);
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight)).toBeLessThanOrEqual(0);
      await expect(phone(page)).toBeInViewport({ ratio: 1 });
      const copy = page.getByTestId("copy");
      await expect(copy).toBeInViewport({ ratio: 1 });
      expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect((await phone(page).boundingBox())!.width).toBeGreaterThanOrEqual(300);
      // Every tile is inside the phone screen.
      const fit = await phone(page).evaluate((ph) => {
        const screen = ph.querySelector("ol")!.getBoundingClientRect();
        return [...ph.querySelectorAll("[data-tile]")].every((t) => {
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
    await build(page).click();
    await expect(live(page)).toHaveText(/built\. Copy prompt to use it\./);
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
    await expect(sheet.locator("[data-tile]")).toHaveCount(2);
    await expect(sheet.getByTestId("demo-label")).toBeVisible();
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

  test("first screen: compact bar, tools, chips and two hero columns", async ({ page }) => {
    await page.goto("/");
    const bar = page.getByTestId("mobile-bar");
    await expect(bar.getByTestId("board-count")).toHaveAttribute("aria-label", "0 of 4 bricks");
    expect((await bar.boundingBox())!.height).toBeLessThanOrEqual(116);
    await expect(page.getByTestId("recipes").locator("visible=true")).toBeInViewport();
    await expect(page.getByRole("button", { name: "Surprise me" })).toBeInViewport();
    await expect(page.getByRole("button", { name: "Money", exact: true })).toBeInViewport();
    const [a, b, c] = await Promise.all(["b20", "payments", "financing"].map((id) => brick(page, id).boundingBox()));
    expect(Math.abs(a!.y - b!.y)).toBeLessThan(2); // two per row
    expect(c!.y).toBeGreaterThan(a!.y + a!.height * 0.8);
    const chips = page.getByRole("group", { name: "Filter bricks" });
    expect(await chips.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
  });

  test("a shared link opens straight on the app (frameless sheet)", async ({ page }) => {
    await page.goto("/#b20,payments,speed");
    const sheet = page.getByTestId("result-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet.locator("[data-tile]")).toHaveCount(3);
    await expect(sheet.getByTestId("app-name")).not.toHaveText("Your app");
    // No device frame inside the sheet: the phone fills the sheet's width.
    const ph = (await sheet.getByTestId("phone").boundingBox())!;
    expect(ph.width).toBeGreaterThan(340);
    // Tapping a tile names its brick.
    await sheet.locator('[data-tile="payments"] button').tap();
    await expect(sheet.locator('[data-tile="payments"]')).toContainText("Made with Pay");
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

  test("recipes menu opens below its button; picking one opens the sheet", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("recipes").locator("visible=true").tap();
    const pop = page.getByRole("dialog", { name: "Recipes" });
    await expect(pop).toBeVisible();
    await pop.getByRole("button", { name: /^Neobank/ }).tap();
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
