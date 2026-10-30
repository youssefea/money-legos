import { flowOrder } from "./generate";
import { BY_ID, resolveId } from "./legos";
import type { FakeApp, FakeTile, LegoId, UiTemplate } from "./types";

/** Invented brand used on every fake-app screen. Never a real company. */
export const FAKE_BRAND = "Acme";
export const MAX_BRAND_LENGTH = 18;

/** Keeps known ids (aliases resolved), drops duplicates, keeps order, caps at 4. */
function clean(ids: readonly string[]): LegoId[] {
  const out: LegoId[] = [];
  for (const raw of ids) {
    const id = resolveId(raw);
    if (id && !out.includes(id) && out.length < 4) out.push(id);
  }
  return out;
}

/** "Acme <word>" from the Lego that names the app (lowest prio). Deterministic and order-free. */
export function fakeBrand(ids: readonly LegoId[]): string {
  if (!ids.length) return FAKE_BRAND;
  const anchor = ids.slice().sort((a, b) => BY_ID[a].prio - BY_ID[b].prio)[0]!;
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

/** Short screen-reader summary for the phone region: "Acme Pay app: Order #1042, Confirmed in 0.2s". */
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
 * How a tile sits in the fake app. One dominant `hero` module (the first balance, checkout, earn,
 * order or swap tile, by that priority; else the first non-status tile), confirmations and notices as
 * slim `status` rows, everything else as compact `row` modules.
 */
export type TileRole = "hero" | "row" | "status";

const HERO_PRIORITY: readonly UiTemplate[] = ["balance", "checkout", "earn", "order", "swap"];
const STATUS_TEMPLATES: readonly UiTemplate[] = ["toast", "pill"];

/** One role per tile, in tile order. */
export function tileRoles(tiles: readonly Pick<FakeTile, "template">[]): TileRole[] {
  let hero = -1;
  for (const t of HERO_PRIORITY) {
    hero = tiles.findIndex((x) => x.template === t);
    if (hero >= 0) break;
  }
  if (hero < 0) hero = tiles.findIndex((x) => !STATUS_TEMPLATES.includes(x.template));
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
