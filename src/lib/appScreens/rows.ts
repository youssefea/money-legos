import type { LegoId } from "../types";
import type { Archetype } from "./archetype";

/** Line icons drawn in src/components/phone/screens/Icons.tsx. */
export type IconName =
  | "send"
  | "request"
  | "contactless"
  | "sprout"
  | "bell"
  | "scan"
  | "back"
  | "chevron"
  | "close"
  | "star"
  | "shield"
  | "bolt"
  | "home"
  | "card"
  | "percent"
  | "person"
  | "chart"
  | "doc"
  | "faceid"
  | "swap"
  | "clock"
  | "lock"
  | "pause"
  | "eyeoff"
  | "key"
  | "wallet"
  | "qr"
  | "search"
  | "check"
  | "plus"
  | "people"
  | "split"
  | "receipt"
  | "refund"
  | "tag"
  | "bridge"
  | "code"
  | "agent"
  | "sparkle"
  | "gauge"
  | "layers"
  | "book"
  | "flask"
  | "grid"
  | "more"
  | "repeat"
  | "hold"
  | "badge"
  | "drop"
  | "scale";

/**
 * A list row a brick adds to a screen. `activity` rows go into the screen's activity list (avatar,
 * title, subtitle, amount and time); `position` rows into a holdings list; `notice` rows are a
 * bordered card row (icon, title, subtitle, a check, chip, meter or chevron on the right).
 */
export type RowSpec = {
  kind: "activity" | "position" | "notice";
  /** A letter avatar, or an icon in a circle. */
  letter?: string;
  icon?: IconName;
  /** Icon circle fill: grey (default), blue (white icon) or dark. */
  tone?: "grey" | "blue" | "dark";
  title: string;
  sub: string;
  /** A blue bolt + this text after the subtitle ("Paid · ⚡0.2s"). */
  bolt?: string;
  /** A small grey chip after the title ("Memo", "On hold"). */
  tag?: string;
  amount?: string;
  /** The amount is money in (shown with a "+"; green where the contrast allows). */
  positive?: boolean;
  time?: string;
  /** Right side when there is no amount. */
  trail?: { chip?: string; check?: boolean; chevron?: boolean; pill?: string; toggle?: boolean; meter?: number };
};

const R = (r: RowSpec) => r;

/** Every brick's row form: the region it adds to any screen that has no better place for it. */
export const ROWS: Readonly<Record<LegoId, RowSpec>> = {
  b20: R({ kind: "position", letter: "B", tone: "blue", title: "BLOX", sub: "Your token · 1,200 BLOX", amount: "$2,977.80", time: "+$134.76", positive: true }),
  payments: R({ kind: "activity", letter: "N", title: "Northside Market", sub: "Paid · Order #1042", amount: "-$12.00", time: "10:24 AM" }),
  financing: R({ kind: "notice", icon: "sprout", title: "Savings · 4.12% APY", sub: "Variable rate · $300.00 saving", trail: { chevron: true } }),
  validity: R({ kind: "notice", icon: "doc", title: "Limit order", sub: "Buy 500 BLOX at $2.40", trail: { chip: "Open" } }),
  speed: R({ kind: "activity", letter: "C", title: "Corner Coffee", sub: "Paid", bolt: "0.2s", amount: "-$4.50", time: "9:12 AM" }),
  "base-pay": R({ kind: "activity", icon: "qr", tone: "dark", title: "Scan to pay", sub: "Base Pay · Corner Coffee", amount: "-$10.50", time: "8:40 AM" }),
  escrow: R({ kind: "activity", letter: "O", title: "Oak & Thread", sub: "Held until delivery", tag: "On hold", amount: "$48.00", time: "Today" }),
  subscriptions: R({ kind: "activity", icon: "repeat", title: "Pro plan", sub: "Upcoming · Renews Jun 1", amount: "$5.00", time: "Monthly" }),
  refunds: R({ kind: "activity", icon: "refund", title: "Receipt #1041", sub: "Refunded", amount: "$8.40", positive: true, time: "Yesterday" }),
  payouts: R({ kind: "activity", icon: "people", title: "Payout", sub: "Northside Studio · May", amount: "$420.00", positive: true, time: "Fri" }),
  splits: R({ kind: "notice", icon: "split", title: "Split payment", sub: "Seller 90% · Platform 10%", trail: { meter: 90 } }),
  reconcile: R({ kind: "notice", icon: "receipt", title: "Today", sub: "24 paid · 1 refunded", amount: "$1,180.40" }),
  memos: R({ kind: "activity", letter: "J", title: "Jordan Lee", sub: "Invoice INV-1042", tag: "Memo", amount: "$120.00", positive: true, time: "Yesterday" }),
  "private-ledgers": R({ kind: "notice", icon: "eyeoff", title: "Private balance", sub: "Only you can see it", amount: "$••••" }),
  allowlist: R({ kind: "notice", icon: "badge", title: "Approved holder", sub: "On the holder allowlist", trail: { check: true } }),
  freeze: R({ kind: "notice", icon: "lock", title: "Block and recover", sub: "Freeze a lost account in one tap", trail: { toggle: true } }),
  pause: R({ kind: "notice", icon: "pause", title: "Pause transfers", sub: "Stops all sends until you resume", trail: { toggle: true } }),
  multiplier: R({ kind: "position", letter: "O", title: "ORBT", sub: "2-for-1 split · 240 shares", amount: "$2,983.20", time: "+$41.10", positive: true }),
  swaps: R({ kind: "notice", icon: "swap", title: "Swap", sub: "0.10 ETH → 341.26 USDC", trail: { chevron: true } }),
  borrow: R({ kind: "notice", icon: "gauge", title: "Credit line", sub: "$400.00 of $1,000.00 · Safe", trail: { meter: 40 } }),
  stocks: R({ kind: "position", letter: "S", tone: "dark", title: "Stock A", sub: "Tokenized stock · 10 shares", amount: "$124.00", time: "+$1.20", positive: true }),
  verify: R({ kind: "notice", icon: "shield", tone: "blue", title: "Verified", sub: "Real person · nothing else shared", trail: { check: true } }),
  "verify-onchain": R({ kind: "notice", icon: "drop", tone: "blue", title: "Airdrop", sub: "1 claim per verified person", trail: { pill: "Claim" } }),
  basenames: R({ kind: "activity", letter: "a", title: "alice.base.eth", sub: "Sent by name", amount: "-$25.00", time: "Mon" }),
  "connect-wallet": R({ kind: "notice", icon: "wallet", title: "Wallet connected", sub: "Signed in as Alex", trail: { check: true } }),
  "batch-calls": R({ kind: "notice", icon: "layers", title: "Approve and pay", sub: "Two steps in one tap", trail: { chip: "1 tap" } }),
  "sponsored-gas": R({ kind: "notice", icon: "sparkle", title: "No network fees", sub: "Gas is covered for you", amount: "$0.00" }),
  bridge: R({ kind: "notice", icon: "bridge", title: "Add funds", sub: "Move USDC from another chain", trail: { chevron: true } }),
  flashblocks: R({ kind: "activity", letter: "G", title: "Green Market", sub: "Pre-confirmed", bolt: "0.2s", amount: "-$32.18", time: "Just now" }),
  basetime: R({ kind: "notice", icon: "clock", title: "Session time", sub: "Billed to the millisecond", amount: "00:12.345" }),
  builder: R({ kind: "notice", icon: "code", title: "Activity credited", sub: "Your builder code · this month", amount: "1,024 txs" }),
  "live-stream": R({ kind: "activity", letter: "N", title: "Order #1043", sub: "Paid · updated just now", amount: "$12.00", positive: true, time: "Now" }),
  "x402-api": R({ kind: "notice", icon: "code", title: "Price per call", sub: "GET /v1/quotes · x402", amount: "$0.01" }),
  "usage-billing": R({ kind: "notice", icon: "gauge", title: "Usage", sub: "$3.20 of $5.00 held", trail: { meter: 64 } }),
  "agent-spend": R({ kind: "notice", icon: "agent", title: "Agent allowance", sub: "$1.00 a session · $0.62 used", trail: { meter: 62 } }),
  "agent-codes": R({ kind: "activity", icon: "agent", tone: "dark", title: "Shop Agent", sub: "Credited · GET /v1/quotes", tag: "Agent", amount: "$0.01", positive: true, time: "9:41 AM" }),
  "docs-mcp": R({ kind: "notice", icon: "book", title: "Ask the docs", sub: "How do I issue B20?", trail: { chevron: true } }),
  skills: R({ kind: "notice", icon: "sparkle", title: "Agent skills", sub: "Deploy and Attribute added", trail: { check: true } }),
  "local-devnet": R({ kind: "notice", icon: "flask", title: "Test mode", sub: "Running on a local devnet", trail: { chip: "Local" } }),
};

/** A few bricks read better with screen-specific copy (the payroll speed row is a person paid in 0.2s). */
const OVERRIDES: Partial<Record<Archetype, Partial<Record<LegoId, RowSpec>>>> = {
  payroll: {
    speed: R({ kind: "activity", letter: "S", title: "Sam Rivera", sub: "Paid", bolt: "0.2s", amount: "$380.00", time: "Fri" }),
    memos: R({ kind: "activity", letter: "J", title: "Jordan Lee", sub: "Memo · May payroll", tag: "Memo", amount: "$420.00", time: "Fri" }),
    flashblocks: R({ kind: "activity", letter: "P", title: "Priya Shah", sub: "Pre-confirmed", bolt: "0.2s", amount: "$400.00", time: "Fri" }),
    builder: R({ kind: "notice", icon: "code", title: "Payouts credited", sub: "Your builder code · this month", amount: "36 txs" }),
  },
  agent: {
    speed: R({ kind: "activity", icon: "agent", tone: "dark", title: "Research Agent", sub: "Paid", bolt: "0.2s", amount: "$0.01", positive: true, time: "9:41 AM" }),
    flashblocks: R({ kind: "activity", icon: "agent", tone: "dark", title: "Price Bot", sub: "Pre-confirmed", bolt: "0.2s", amount: "$0.01", positive: true, time: "9:40 AM" }),
    payments: R({ kind: "activity", icon: "agent", tone: "dark", title: "Data Agent", sub: "Paid · GET /v1/prices", amount: "$0.05", positive: true, time: "9:38 AM" }),
  },
  checkout: {
    escrow: R({ kind: "notice", icon: "hold", title: "Held in escrow", sub: "Released on delivery", trail: { chip: "On hold" } }),
    refunds: R({ kind: "notice", icon: "refund", title: "Refunds to your balance", sub: "Return it within 30 days", trail: { check: true } }),
    subscriptions: R({ kind: "notice", icon: "repeat", title: "Subscribe monthly", sub: "Upcoming · Renews Jun 1", trail: { toggle: true } }),
    verify: R({ kind: "notice", icon: "shield", tone: "blue", title: "Verified buyer", sub: "Age 18+ checked · nothing else shared", trail: { check: true } }),
    "live-stream": R({ kind: "notice", icon: "receipt", title: "Order updates", sub: "Paid · updated just now", trail: { chip: "Now" } }),
    "batch-calls": R({ kind: "notice", icon: "layers", title: "Approve and pay", sub: "Two steps in one tap", trail: { chip: "1 tap" } }),
  },
  earn: {
    speed: R({ kind: "activity", icon: "percent", title: "Interest", sub: "Paid out", bolt: "0.2s", amount: "$0.38", positive: true, time: "Today" }),
  },
};

export function rowFor(id: LegoId, arch: Archetype): RowSpec {
  return OVERRIDES[arch]?.[id] ?? ROWS[id];
}

/**
 * Plain rows that fill each screen's list after the brick rows (no brick, no connector). They hide
 * whole rows when space runs out, never half a row.
 */
export const FILLERS: Readonly<Partial<Record<Archetype, readonly RowSpec[]>>> = {
  neobank: [
    R({ kind: "activity", icon: "percent", title: "Earn interest", sub: "Savings", amount: "$0.24", positive: true, time: "This week" }),
    R({ kind: "activity", letter: "J", title: "Jordan Lee", sub: "Received", amount: "$120.00", positive: true, time: "Yesterday" }),
    R({ kind: "activity", letter: "G", title: "Green Market", sub: "Paid", amount: "-$32.18", time: "Yesterday" }),
    R({ kind: "activity", letter: "M", title: "Metro Transit", sub: "Paid", amount: "-$2.75", time: "Mon" }),
    R({ kind: "activity", letter: "S", title: "Sam Rivera", sub: "Sent", amount: "-$40.00", time: "Sun" }),
  ],
  earn: [
    R({ kind: "activity", icon: "percent", title: "Interest", sub: "This week", amount: "$0.38", positive: true, time: "Today" }),
    R({ kind: "activity", icon: "plus", title: "Deposit", sub: "From USDC balance", amount: "$100.00", positive: true, time: "Mon" }),
    R({ kind: "activity", icon: "percent", title: "Interest", sub: "Last week", amount: "$0.31", positive: true, time: "May 27" }),
    R({ kind: "activity", icon: "plus", title: "Deposit", sub: "From USDC balance", amount: "$200.00", positive: true, time: "May 20" }),
  ],
  payroll: [
    R({ kind: "activity", letter: "J", title: "Jordan Lee", sub: "Designer · May", amount: "$420.00", time: "Fri" }),
    R({ kind: "activity", letter: "S", title: "Sam Rivera", sub: "Engineer · May", amount: "$380.00", time: "Fri" }),
    R({ kind: "activity", letter: "P", title: "Priya Shah", sub: "Writer · May", amount: "$400.00", time: "Fri" }),
  ],
  agent: [
    R({ kind: "activity", icon: "agent", tone: "dark", title: "Shop Agent", sub: "GET /v1/quotes", amount: "$0.01", positive: true, time: "9:41 AM" }),
    R({ kind: "activity", icon: "agent", tone: "dark", title: "Price Bot", sub: "GET /v1/prices", amount: "$0.01", positive: true, time: "9:40 AM" }),
    R({ kind: "activity", icon: "agent", tone: "dark", title: "Research Agent", sub: "GET /v1/quotes", amount: "$0.01", positive: true, time: "9:39 AM" }),
    R({ kind: "activity", icon: "agent", tone: "dark", title: "Data Agent", sub: "GET /v1/prices", amount: "$0.01", positive: true, time: "9:37 AM" }),
  ],
  trade: [R({ kind: "position", letter: "U", tone: "blue", title: "USDC", sub: "Cash", amount: "$1,240.00", time: "$0.00" })],
};
