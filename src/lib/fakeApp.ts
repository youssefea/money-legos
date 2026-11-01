import { flowOrder } from "./generate";
import { anchorOf } from "./appScreens/archetype";
import { BY_ID, resolveId } from "./legos";
import type { FakeApp, FakeTile, LegoId, UiTemplate } from "./types";

/** Brand prefix on every fake-app screen: "Base Neobank", "Base Pay"... */
export const FAKE_BRAND = "Base";
export const MAX_BRAND_LENGTH = 16;

/** Keeps known ids (aliases resolved), drops duplicates, keeps order, caps at 4. */
function clean(ids: readonly string[]): LegoId[] {
  const out: LegoId[] = [];
  for (const raw of ids) {
    const id = resolveId(raw);
    if (id && !out.includes(id) && out.length < 4) out.push(id);
  }
  return out;
}

/**
 * "Base <word>" from the Lego that picks the app's screen (appScreens/archetype.ts: the strongest tier,
 * then the lowest prio), so the name matches the screen: B20 + Pay is "Base Neobank". Order-free.
 */
export function fakeBrand(ids: readonly LegoId[]): string {
  const anchor = anchorOf(ids);
  if (!anchor) return FAKE_BRAND;
  const brand = `${FAKE_BRAND} ${BY_ID[anchor].brand}`;
  return brand.length <= MAX_BRAND_LENGTH ? brand : FAKE_BRAND;
}

/**
 * The fake app assembled from the stack. `ids` are in stack order (slot 1 = bottom brick), so the
 * top brick gives the top tile (order 0) and the bottom brick the last tile. 0 ids = no tiles.
 */
export function buildFakeApp(ids: readonly string[]): FakeApp {
  const stack = clean(ids);
  const tiles: FakeTile[] = stack
    .slice()
    .reverse()
    .map((legoId, order) => ({ ...BY_ID[legoId].ui, legoId, order }));
  return { brand: fakeBrand(stack), tiles };
}

/** Same app, with the stack in money-flow order (for a generated result with no board order). */
export function buildFakeAppInFlowOrder(ids: readonly string[]): FakeApp {
  return buildFakeApp(flowOrder(clean(ids)).reverse());
}

/** Short screen-reader summary for the phone region: "Base Pay app: Order #1042, Confirmed in 0.2s". */
export function describeFakeApp(app: FakeApp): string {
  if (!app.tiles.length) return `${app.brand} app, empty`;
  return `${app.brand} app: ` + app.tiles.map((t) => t.title).join(", ");
}

/** Visible strings in a tile (title, value, cta, chip, one per row). Text diet: <= 3. */
export function tileStrings(t: Pick<FakeTile, "title" | "value" | "cta" | "chip" | "rows">): string[] {
  return [t.title, t.value, t.cta, t.chip, ...(t.rows ?? []).map((r) => `${r[0]} ${r[1]}`)].filter(
    (s): s is string => typeof s === "string" && s.length > 0,
  );
}

/**
 * How a tile sits in the fake app. One tile is the dominant `hero` module (112-144px, with the
 * primary blue action): the app's anchor financial task, i.e. the tile with the lowest catalog `prio`
 * among the task templates (balance, checkout, order, swap, earn, qr, rows, list, signin, input, meter),
 * wherever it sits in the stack. Confirmations, notices and badges (toast, pill, badge) stay compact
 * rows even on top, like a "Confirmed in 0.2s" toast above a big Checkout. Everything else is a compact
 * `row` (56px). Tiles keep their stack order (top brick = top tile), so connectors never cross.
 */
export type TileRole = "hero" | "row" | "status";

const STATUS_TEMPLATES: readonly UiTemplate[] = ["toast", "pill"];
export const HERO_TEMPLATES: readonly UiTemplate[] = ["balance", "checkout", "order", "swap", "earn", "qr", "rows", "list", "signin", "input", "meter"];

/**
 * Index of the hero tile: the lowest-prio task tile. With no task tile at all (a status-only stack such
 * as Speed + Verify + Sponsor), the most prominent tile is the hero instead: the largest brick footprint,
 * then the lowest prio, so the screen never shows only identical thin rows. Never -1 for 1+ tiles.
 */
export function heroIndex(tiles: readonly Pick<FakeTile, "template" | "legoId">[]): number {
  let best = -1;
  tiles.forEach((t, i) => {
    if (!HERO_TEMPLATES.includes(t.template)) return;
    if (best < 0 || BY_ID[t.legoId].prio < BY_ID[tiles[best]!.legoId].prio) best = i;
  });
  if (best >= 0) return best;
  const area = (id: LegoId) => BY_ID[id].size[0] * BY_ID[id].size[1];
  tiles.forEach((t, i) => {
    if (best < 0) {
      best = i;
      return;
    }
    const b = tiles[best]!.legoId;
    const d = area(t.legoId) - area(b);
    if (d > 0 || (d === 0 && BY_ID[t.legoId].prio < BY_ID[b].prio)) best = i;
  });
  return best;
}

/** One role per tile, in tile order. */
export function tileRoles(tiles: readonly Pick<FakeTile, "template" | "legoId">[]): TileRole[] {
  const hero = heroIndex(tiles);
  return tiles.map((t, i) => (i === hero ? "hero" : STATUS_TEMPLATES.includes(t.template) ? "status" : "row"));
}

const WIRE_LABEL: Partial<Record<UiTemplate, string>> = {
  balance: "Balance",
  checkout: "Checkout",
  toast: "Confirmation",
  earn: "Earn",
  order: "Limit order",
  swap: "Swap",
  signin: "Sign in",
  qr: "Pay by QR",
};

/** Short module title for the wireframe shown before Build app ("Checkout", "Balance"...). */
export function wireLabel(tile: Pick<FakeTile, "template" | "title">): string {
  return WIRE_LABEL[tile.template] ?? tile.title;
}

const CHIP_LABEL: Partial<Record<UiTemplate, string>> = {
  balance: "Balance",
  checkout: "Checkout",
  toast: "Confirm",
  earn: "Earn",
  order: "Order",
  swap: "Swap",
  signin: "Sign-in",
  qr: "QR pay",
};

/** One-word module name for the compact bar's preview chips ("Balance", "Checkout", "Confirm"...). */
export function chipLabel(tile: Pick<FakeTile, "template" | "title" | "legoId">): string {
  const fixed = CHIP_LABEL[tile.template];
  if (fixed) return fixed;
  const first = tile.title.split(/\s+/)[0] ?? "";
  return /^[A-Za-z][A-Za-z-]*$/.test(first) ? first : BY_ID[tile.legoId].verb;
}
