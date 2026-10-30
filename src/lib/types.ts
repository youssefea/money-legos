/** Shared data types for the Money Legos content, the generator and the fake app. */
import type { DOCS } from "../data/catalog";

/** All 40 Lego ids. The first 13 are the original ids and must keep working in URLs. */
export type LegoId =
  | "b20"
  | "payments"
  | "financing"
  | "validity"
  | "speed"
  | "swaps"
  | "stocks"
  | "verify"
  | "builder"
  | "memos"
  | "subscriptions"
  | "escrow"
  | "refunds"
  | "base-pay"
  | "payouts"
  | "splits"
  | "reconcile"
  | "private-ledgers"
  | "allowlist"
  | "freeze"
  | "pause"
  | "multiplier"
  | "borrow"
  | "verify-onchain"
  | "basenames"
  | "connect-wallet"
  | "batch-calls"
  | "sponsored-gas"
  | "bridge"
  | "flashblocks"
  | "basetime"
  | "live-stream"
  | "x402-api"
  | "usage-billing"
  | "agent-spend"
  | "agent-codes"
  | "docs-mcp"
  | "skills"
  | "vibenet"
  | "local-devnet";

/** Key of a docs page in DOCS (src/data/catalog.ts). */
export type DocKey = keyof typeof DOCS;

export type DocLink = { label: string; url: string };

/** live = on mainnet; testnet = Base Sepolia or a preview network; announced = dates not set yet. */
export type StatusKind = "live" | "testnet" | "available" | "announced";

export type LegoStatus = { kind: StatusKind; label: string };

/** hero = the 5 big 2x4 bricks pinned on top of the tray. */
export type Tier = "hero" | "secondary";

/** Tray filter chips, in display order (without "All"). */
export type Category = "Money" | "Identity" | "Wallet" | "Speed" | "Trade" | "Data" | "Agents" | "Apps";

/** Brick colour ids from DESIGN-SPEC v2. Each maps to a CSS token `--brick-<id>`. */
export type BrickColorId =
  | "issue"
  | "pay"
  | "grow"
  | "trade"
  | "speed"
  | "lime"
  | "tan"
  | "white"
  | "gray-light"
  | "gray"
  | "gray-dark";

export type BrickColor = {
  id: BrickColorId;
  /** Locked brand hex for the brick body. */
  hex: string;
  /** Hex for the printed label on the brick's front face. */
  label: string;
};

/** Brick footprints in studs, [w, d] (w faces the viewer): 2x4, 2x3, 2x2, 1x4, 2x1. */
export type BrickSize = [4, 2] | [3, 2] | [2, 2] | [4, 1] | [2, 1];

/** Layout of one tile in the fake app. Each brick on the board contributes one tile. */
export type UiTemplate =
  | "balance"
  | "checkout"
  | "toast"
  | "earn"
  | "order"
  | "swap"
  | "badge"
  | "signin"
  | "pill"
  | "rows"
  | "input"
  | "list"
  | "qr"
  | "meter"
  | "stat";

/**
 * Data for one fake-app tile. Text diet: at most 3 short strings (title, value, cta, chip and
 * each row count as one). Numbers are obviously fake and the brand is always "Acme".
 */
export type UiTile = {
  template: UiTemplate;
  title: string;
  value?: string;
  cta?: string;
  chip?: string;
  rows?: [string, string][];
  /** Brick colour id, for the tile's edge, studs and connector line. */
  accent: BrickColorId;
};

/** One brick as written in src/data/catalog.ts. */
export type CatalogEntry = {
  id: LegoId;
  verb: string;
  name: string;
  category: Category;
  tier: Tier;
  tag: string;
  short: string;
  what: string;
  status: LegoStatus;
  example: string;
  docs: DocKey[];
  size: BrickSize;
  color: BrickColorId;
  fragments: { adj: string; noun: string; does: string };
  step: string;
  role?: string;
  build: string;
  note?: string;
  prio: number;
  flow: number;
  brand: string;
  uiModule: string;
  ui: Omit<UiTile, "accent">;
};

export type Lego = {
  id: LegoId;
  tier: Tier;
  category: Category;
  /** Big verb printed on the brick (Issue, Pay, Grow, Trade, Speed...). */
  verb: string;
  /** Same as `verb` (older name, kept for existing components). */
  kicker: string;
  /** Lego name, small mono caps on the brick (B20, Accept payments...). */
  name: string;
  /** Same as `name` (older name, kept for existing components). */
  title: string;
  /** Tray tooltip caption (<= 28 chars). */
  tag: string;
  /** One line for "why each Lego" (<= 42 chars). */
  short: string;
  /** Same as `short` (older name). */
  blurb: string;
  /** Build-step tile text (<= 28 chars). */
  step: string;
  /** Short status line for one-line UI spots (Speed and BaseTime: the short Denim line). */
  note?: string;
  what: string;
  status: LegoStatus;
  /** Same as `status.kind`. */
  statusKind: StatusKind;
  example: string;
  /** What this Lego does in a generated app (step "why"). */
  role: string;
  /** Instruction line for the coding-agent prompt. */
  build: string;
  docs: DocKey[];
  /** `docs` resolved to labels and URLs. */
  links: DocLink[];
  /** Name fragments for generated app names and pitches. */
  adj: string;
  noun: string;
  /** Verb phrase for pitches: "An app that <does> and <does>." */
  does: string;
  /** Lower = more likely to name the app (the noun). */
  prio: number;
  /** Position in a money flow (sign in first, attribution and speed last). */
  flow: number;
  /** One word for the fake app brand: "Acme <brand>". */
  brand: string;
  /** Catalog description of the tile, for reference. */
  uiModule: string;
  ui: UiTile;
  brick: BrickColor;
  /** Studs [w, d]: hero bricks are 2x4 ([4, 2]). */
  size: BrickSize;
};

export type Combo = {
  recipe?: string;
  ids: LegoId[];
  name: string;
  pitch: string;
  why?: Partial<Record<LegoId, string>>;
};

export type Recipe = Combo & {
  /** URL slug, used by #recipe=<id>. */
  id: string;
  /** Recipe label on chips and in #recipe= links (the app `name` can be longer). */
  recipe: string;
  /** One-line idea (<= 60 chars). */
  idea: string;
};

export type Step = { lego: Lego; why: string; docs: DocLink[] };

export type GenerateResult = {
  ids: LegoId[];
  name: string;
  pitch: string;
  curated: boolean;
  /** Recipe name when this combo is a named recipe. */
  recipe?: string;
  steps: Step[];
  docs: DocLink[];
  prompt: string;
};

/** A tile placed in the fake app. `order` 0 is the top tile (the top brick). */
export type FakeTile = UiTile & { legoId: LegoId; order: number };

export type FakeApp = {
  /** Invented brand, e.g. "Acme Pay" (<= 18 chars). */
  brand: string;
  /** Top brick first. */
  tiles: FakeTile[];
};
