import { BY_ID } from "../legos";
import type { LegoId } from "../types";

/**
 * The seven fake-app screens. The stack picks ONE, deterministically and order-free, and every brick
 * then fills one region inside it (see slots.ts).
 */
export type Archetype = "neobank" | "checkout" | "trade" | "earn" | "payroll" | "agent" | "identity";

export const ARCHETYPES: readonly Archetype[] = ["neobank", "checkout", "trade", "earn", "payroll", "agent", "identity"];

/**
 * Each brick's home screen and how strongly it pulls the app there. Tier 1 bricks are the app's task
 * (a trade desk, payroll, an API); tier 2 bricks name an app only when no task brick is on the board
 * (B20 makes a neobank, Pay makes a checkout); tier 3 bricks are features that fit any screen and pick
 * their home only when they are alone with other tier 3 bricks.
 */
export const HOME: Readonly<Record<LegoId, readonly [Archetype, 1 | 2 | 3]>> = {
  b20: ["neobank", 2],
  payments: ["checkout", 3],
  financing: ["earn", 2],
  validity: ["trade", 1],
  speed: ["neobank", 3],
  "base-pay": ["checkout", 1],
  escrow: ["checkout", 1],
  subscriptions: ["checkout", 2],
  refunds: ["checkout", 1],
  payouts: ["payroll", 1],
  splits: ["payroll", 1],
  reconcile: ["payroll", 3],
  memos: ["checkout", 3],
  "private-ledgers": ["payroll", 1],
  allowlist: ["trade", 2],
  freeze: ["neobank", 3],
  pause: ["neobank", 3],
  multiplier: ["trade", 2],
  swaps: ["trade", 1],
  borrow: ["earn", 2],
  stocks: ["trade", 1],
  verify: ["identity", 2],
  "verify-onchain": ["identity", 1],
  basenames: ["identity", 2],
  "connect-wallet": ["identity", 1],
  "batch-calls": ["checkout", 2],
  "sponsored-gas": ["identity", 2],
  bridge: ["identity", 1],
  flashblocks: ["neobank", 3],
  basetime: ["agent", 2],
  builder: ["agent", 2],
  "live-stream": ["neobank", 3],
  "x402-api": ["agent", 1],
  "usage-billing": ["agent", 1],
  "agent-spend": ["agent", 1],
  "agent-codes": ["agent", 2],
  "docs-mcp": ["agent", 2],
  skills: ["agent", 2],
  "local-devnet": ["agent", 2],
};

/**
 * The brick that decides the screen (and the "Base <brand>" name): the strongest tier on the board,
 * then the lowest catalog prio, then the id. Order-free. null for an empty board.
 */
export function anchorOf(ids: readonly LegoId[]): LegoId | null {
  let best: LegoId | null = null;
  for (const id of ids) {
    if (!best) {
      best = id;
      continue;
    }
    const [, t] = HOME[id];
    const [, bt] = HOME[best];
    const p = BY_ID[id].prio;
    const bp = BY_ID[best].prio;
    if (t < bt || (t === bt && (p < bp || (p === bp && id < best)))) best = id;
  }
  return best;
}

/** The screen for a stack; an empty board shows the neobank skeleton. */
export function archetypeOf(ids: readonly LegoId[]): Archetype {
  const a = anchorOf(ids);
  return a ? HOME[a][0] : "neobank";
}
