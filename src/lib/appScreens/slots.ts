import { BY_ID, LEGOS, resolveId } from "../legos";
import type { LegoId } from "../types";
import { anchorOf, archetypeOf, type Archetype } from "./archetype";
import { FILLERS, rowFor, type RowSpec } from "./rows";

/**
 * Named places a brick can fill on a screen. Every slot but the lists holds one brick; candidates are
 * listed best first, and a brick that finds its slot taken falls back to its row form.
 */
export type Slot =
  | "hero"
  | "heroChip"
  | "actions"
  | "card"
  | "speedLine"
  | "merchant"
  | "summary"
  | "fee"
  | "summaryLine"
  | "payFrom"
  | "footnote"
  | "cta"
  | "name";

const SLOTS: Readonly<Record<Archetype, Partial<Record<Slot, readonly LegoId[]>>>> = {
  neobank: { hero: ["b20", "private-ledgers"], actions: ["payments"], card: ["financing", "borrow", "swaps"] },
  earn: { hero: ["financing"], heroChip: ["b20", "private-ledgers"], actions: ["payments"], card: ["borrow", "swaps"] },
  trade: { speedLine: ["speed", "flashblocks"], card: ["validity", "swaps"] },
  checkout: {
    merchant: ["basenames"],
    summary: ["payments"],
    fee: ["sponsored-gas"],
    summaryLine: ["memos", "splits"],
    payFrom: ["b20", "private-ledgers"],
    footnote: ["speed", "flashblocks"],
    cta: ["base-pay"],
  },
  payroll: { hero: ["payouts"], heroChip: ["private-ledgers", "b20"], card: ["splits", "reconcile"] },
  agent: { hero: ["x402-api"], heroChip: ["b20"], card: ["usage-billing", "agent-spend"] },
  identity: { cta: ["connect-wallet"], name: ["basenames"] },
};

/** Slots that take every candidate on the board (one line each), not just the first. */
const MULTI: ReadonlySet<Slot> = new Set(["summaryLine"]);

/** Screens with a holdings list take `position` rows there; elsewhere a position is a notice card. */
const HAS_POSITIONS: ReadonlySet<Archetype> = new Set(["trade"]);
/** Screens with an activity list; elsewhere an activity row is a notice card. */
const HAS_ACTIVITY: ReadonlySet<Archetype> = new Set(["neobank", "earn", "payroll", "agent"]);

/** Catalog order: the order rows from bricks take in a list (never stack order). */
const CATALOG_INDEX = new Map(LEGOS.map((l, i) => [l.id, i]));

export type ScreenRow = { id: LegoId; row: RowSpec };

export type ScreenModel = {
  archetype: Archetype;
  anchor: LegoId | null;
  /** The brick in each single slot. */
  slot: Partial<Record<Slot, LegoId>>;
  /** Bricks in a multi slot (summary lines), in catalog order. */
  multi: Partial<Record<Slot, LegoId[]>>;
  /** Rows by list: activity rows, positions and notice cards, each in catalog order. */
  activity: ScreenRow[];
  positions: ScreenRow[];
  notices: ScreenRow[];
  /** Filler rows for the screen's list (no brick), after the brick rows; duplicates of a brick row dropped. */
  fillers: RowSpec[];
  /** Every placed brick in screen order (top to bottom), for the boot stagger and the connectors. */
  order: LegoId[];
};

/** Slot order top to bottom on each screen (the screen's natural reading order). */
const FLOW: Readonly<Record<Archetype, readonly (Slot | "positions" | "notices" | "activity")[]>> = {
  neobank: ["hero", "actions", "card", "notices", "activity"],
  earn: ["hero", "heroChip", "actions", "card", "notices", "activity"],
  trade: ["speedLine", "card", "positions", "notices"],
  checkout: ["merchant", "summary", "summaryLine", "fee", "notices", "payFrom", "footnote", "cta"],
  payroll: ["hero", "heroChip", "card", "notices", "activity"],
  agent: ["hero", "heroChip", "card", "notices", "activity"],
  identity: ["name", "notices", "cta"],
};

function clean(ids: readonly string[]): LegoId[] {
  const out: LegoId[] = [];
  for (const raw of ids) {
    const id = resolveId(raw);
    if (id && !out.includes(id) && out.length < 4) out.push(id);
  }
  return out;
}

/**
 * Where each brick of a stack goes on its screen. Order-free: the same set of bricks always gives the
 * same screen. `force` renders the stack on another screen (tests, previews).
 */
export function screenModel(rawIds: readonly string[], force?: Archetype): ScreenModel {
  const ids = clean(rawIds).sort((a, b) => CATALOG_INDEX.get(a)! - CATALOG_INDEX.get(b)!);
  const archetype = force ?? archetypeOf(ids);
  const table = SLOTS[archetype];
  const slot: Partial<Record<Slot, LegoId>> = {};
  const multi: Partial<Record<Slot, LegoId[]>> = {};
  const placed = new Set<LegoId>();
  for (const [name, cands] of Object.entries(table) as [Slot, readonly LegoId[]][]) {
    for (const c of cands) {
      if (!ids.includes(c) || placed.has(c)) continue;
      if (MULTI.has(name)) {
        (multi[name] ??= []).push(c);
        placed.add(c);
      } else if (!slot[name]) {
        slot[name] = c;
        placed.add(c);
      }
    }
  }
  const activity: ScreenRow[] = [];
  const positions: ScreenRow[] = [];
  const notices: ScreenRow[] = [];
  for (const id of ids) {
    if (placed.has(id)) continue;
    const row = rowFor(id, archetype);
    if (row.kind === "activity" && HAS_ACTIVITY.has(archetype)) activity.push({ id, row });
    else if (row.kind === "position" && HAS_POSITIONS.has(archetype)) positions.push({ id, row });
    else notices.push({ id, row: { ...row, kind: "notice" } });
  }
  const taken = new Set([...activity, ...positions].map((r) => r.row.title));
  const fillers = (FILLERS[archetype] ?? []).filter((f) => !taken.has(f.title));
  const order: LegoId[] = [];
  for (const step of FLOW[archetype]) {
    if (step === "activity") order.push(...activity.map((r) => r.id));
    else if (step === "positions") order.push(...positions.map((r) => r.id));
    else if (step === "notices") order.push(...notices.map((r) => r.id));
    else if (MULTI.has(step)) order.push(...(multi[step] ?? []));
    else if (slot[step]) order.push(slot[step]!);
  }
  return { archetype, anchor: anchorOf(ids), slot, multi, activity, positions, notices, fillers, order };
}

const CARD_PHRASE: Partial<Record<LegoId, string>> = {
  financing: "savings at a variable rate",
  borrow: "credit line",
  swaps: "swap",
  validity: "limit order",
  splits: "revenue split",
  reconcile: "today's payments",
  "usage-billing": "usage meter",
  "agent-spend": "agent allowance",
};

/** One short phrase per brick region, for the phone's screen-reader summary. */
const PHRASE: Partial<Record<Slot, (id: LegoId) => string>> = {
  hero: (id) => (id === "payouts" ? "next payout" : id === "x402-api" ? "API revenue" : id === "financing" ? "savings" : "balance"),
  heroChip: (id) => (id === "private-ledgers" ? "private amounts" : "token balance"),
  actions: () => "Send, Request and Pay",
  card: (id) => CARD_PHRASE[id] ?? BY_ID[id].ui.title.toLowerCase(),
  speedLine: () => "0.2s price updates",
  merchant: () => "pay by name",
  summary: () => "order summary",
  fee: () => "no network fee",
  summaryLine: (id) => (id === "memos" ? "memo" : "split"),
  payFrom: () => "pay from balance",
  footnote: () => "confirms in 0.2s",
  cta: (id) => (id === "base-pay" ? "Base Pay button" : "connect wallet"),
  name: () => "your name",
};

/** "Base Neobank app: balance, Send, Request and Pay, savings, Corner Coffee paid in 0.2s". */
export function describeScreen(brand: string, m: ScreenModel): string {
  if (!m.order.length) return `${brand} app, empty`;
  const bySlot = new Map<LegoId, Slot>();
  for (const [k, v] of Object.entries(m.slot) as [Slot, LegoId][]) bySlot.set(v, k);
  for (const [k, v] of Object.entries(m.multi) as [Slot, LegoId[]][]) for (const id of v) bySlot.set(id, k);
  const rows = new Map([...m.activity, ...m.positions, ...m.notices].map((r) => [r.id, r.row]));
  const parts = m.order.map((id) => {
    const s = bySlot.get(id);
    if (s) return PHRASE[s]!(id);
    const r = rows.get(id)!;
    return `${r.title}${r.bolt ? ` ${r.sub.toLowerCase()} in ${r.bolt}` : r.tag ? ` (${r.tag.toLowerCase()})` : ""}`;
  });
  return `${brand} app: ${parts.join(", ")}`;
}
