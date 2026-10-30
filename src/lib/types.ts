/** Shared data types for the Money Legos content and generator. */

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
  | "refunds";

export type DocKey =
  | "b20"
  | "stable"
  | "rwa"
  | "pay"
  | "cpp"
  | "defi"
  | "earn"
  | "lend"
  | "borrow"
  | "vtx"
  | "vtxBuild"
  | "denim"
  | "guides"
  | "stocks"
  | "verify"
  | "codes";

export type DocLink = { label: string; url: string };

export type StatusKind = "live" | "testnet" | "available";

export type Tier = "featured" | "secondary";

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

export type Lego = {
  id: LegoId;
  tier: Tier;
  /** Big verb printed on the brick (Issue, Pay, Grow, Trade, Speed...). */
  kicker: string;
  /** Lego name, small mono caps on the brick (B20, Accept payments...). */
  title: string;
  blurb: string;
  what: string;
  status: string;
  statusKind: StatusKind;
  example: string;
  role: string;
  build: string;
  docs: DocKey[];
  adj: string;
  noun: string;
  verb: string;
  prio: number;
  flow: number;
  brick: BrickColor;
  /** Studs: hero bricks are 2x4 ([4, 2]), secondary are 2x2. */
  size: [number, number];
};

export type Combo = {
  recipe?: string;
  ids: LegoId[];
  name: string;
  pitch: string;
  why?: Partial<Record<LegoId, string>>;
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
