import { CATALOG, DOCS } from "../data/catalog";
import { DENIM_SHORT, DENIM_STATUS } from "../data/status";
import type { BrickColor, BrickColorId, Category, Lego, LegoId } from "./types";

export { DOCS, DENIM_SHORT, DENIM_STATUS };

const D = "https://docs.base.org";

export const RES = {
  docs: D,
  mcp: D + "/mcp",
  ai: D + "/get-started/resources-for-ai-agents",
  guides: D + "/build-on-base/overview",
  vibenet: "https://chain.base.org/vibenet",
  faucet: "https://chain.base.org/vibenet/faucet",
} as const;

/** Plain-English glosses for jargon that shows up in a result. */
export const GLOSSARY: readonly { term: string; gloss: string }[] = [
  { term: "B20", gloss: "Base’s native token standard" },
  { term: "x402", gloss: "pay-per-call for APIs" },
  { term: "MCP", gloss: "a way for AI tools to read docs" },
];

/** Risk line shown in the footer on every screen. */
export const RISK_FOOTER =
  "Crypto products and NFTs are unregulated and can be highly risky. There may be no regulatory recourse for any loss from such transactions.";

/** The 16 colours in the Base brand guidelines. Bricks use 11 of them; red (#FC401F) never. */
export const BRAND_PALETTE: readonly string[] = [
  "#0000FF",
  "#3C8AFF",
  "#66C800",
  "#B6F569",
  "#FFD12F",
  "#FEA8CD",
  "#B8A581",
  "#FC401F",
  "#FFFFFF",
  "#EEF0F3",
  "#DEE1E7",
  "#B1B7C3",
  "#717886",
  "#5B616E",
  "#32353D",
  "#0A0B0D",
];

/** Only these brick colours may carry a white label (DESIGN-SPEC v2). */
export const WHITE_LABEL_HEXES: readonly string[] = ["#0000FF", "#32353D", "#0A0B0D"];

/** Brand-locked brick colours (DESIGN-SPEC v2). White labels only on #0000FF and #32353D. */
export const BRICK_COLORS: Record<BrickColorId, BrickColor> = {
  issue: { id: "issue", hex: "#0000FF", label: "#FFFFFF" },
  pay: { id: "pay", hex: "#3C8AFF", label: "#0A0B0D" },
  grow: { id: "grow", hex: "#66C800", label: "#0A0B0D" },
  trade: { id: "trade", hex: "#FFD12F", label: "#0A0B0D" },
  speed: { id: "speed", hex: "#FEA8CD", label: "#0A0B0D" },
  lime: { id: "lime", hex: "#B6F569", label: "#0A0B0D" },
  tan: { id: "tan", hex: "#B8A581", label: "#0A0B0D" },
  white: { id: "white", hex: "#FFFFFF", label: "#0A0B0D" },
  "gray-light": { id: "gray-light", hex: "#DEE1E7", label: "#0A0B0D" },
  gray: { id: "gray", hex: "#B1B7C3", label: "#0A0B0D" },
  "gray-dark": { id: "gray-dark", hex: "#32353D", label: "#FFFFFF" },
};

/** Tray filter chips in order (the UI adds "All" in front). */
export const CATEGORIES: readonly Category[] = ["Money", "Identity", "Wallet", "Speed", "Trade", "Data", "Agents", "Apps"];

/** All 40 Legos: the 5 heroes first, then the rest in catalog (category) order. */
export const LEGOS: readonly Lego[] = CATALOG.map((c): Lego => {
  const { fragments, color, ui, role, note, ...rest } = c;
  return {
    ...rest,
    kicker: c.verb,
    title: c.name,
    blurb: c.short,
    statusKind: c.status.kind,
    role: role ?? c.what,
    ...(note ? { note } : {}),
    links: c.docs.map((d) => DOCS[d]),
    adj: fragments.adj,
    noun: fragments.noun,
    does: fragments.does,
    ui: { ...ui, accent: color },
    brick: BRICK_COLORS[color],
    size: [c.size[0], c.size[1]] as Lego["size"],
  };
});

export const HERO_LEGOS: readonly Lego[] = LEGOS.filter((l) => l.tier === "hero");
export const MORE_LEGOS: readonly Lego[] = LEGOS.filter((l) => l.tier === "secondary");

export const BY_ID: Readonly<Record<LegoId, Lego>> = Object.fromEntries(LEGOS.map((l) => [l.id, l])) as Record<
  LegoId,
  Lego
>;

/** Legos per category, in tray order (heroes first within a category). */
export const bricksByCategory: Readonly<Record<Category, readonly Lego[]>> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat, LEGOS.filter((l) => l.category === cat)]),
) as unknown as Record<Category, readonly Lego[]>;

export function isLegoId(id: string): id is LegoId {
  return Object.prototype.hasOwnProperty.call(BY_ID, id);
}

/**
 * Other spellings that resolve to a Lego id in URL hashes. No original id was renamed, so every
 * old link still works as-is; these are friendly extras. Never point an alias at a different idea.
 */
export const ID_ALIASES: Readonly<Record<string, LegoId>> = {
  "200ms": "speed",
  denim: "speed",
  "200ms-blocks": "speed",
  x402: "x402-api",
  ledgers: "private-ledgers",
  "base-ledgers": "private-ledgers",
  "builder-codes": "builder",
  "base-verify": "verify",
  "base-pay-button": "base-pay",
  "split-payments": "splits",
  subscription: "subscriptions",
  refund: "refunds",
  payout: "payouts",
  memo: "memos",
  swap: "swaps",
};

/** Canonical id for an id or alias (case-insensitive), or null. */
export function resolveId(raw: string): LegoId | null {
  const id = raw.trim().toLowerCase();
  if (isLegoId(id)) return id;
  return Object.prototype.hasOwnProperty.call(ID_ALIASES, id) ? ID_ALIASES[id]! : null;
}
