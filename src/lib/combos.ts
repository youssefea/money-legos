import { BY_ID, DENIM_STATUS } from "./legos";
import type { Combo, LegoId } from "./types";

/** Order-independent key for a set of Lego ids. */
export function keyOf(ids: readonly string[]): string {
  return ids.slice().sort().join("+");
}

/** Curated combos. `why` overrides the generic role for a Lego in this app. */
export const COMBOS: readonly Combo[] = [
  // Recipes
  {
    recipe: "Neobank",
    ids: ["verify", "b20", "payments", "financing"],
    name: "Neobank",
    pitch:
      "A stablecoin app people can be paid into, pay from, and opt in to earn with — behind a verified sign-up.",
    why: {
      b20: "Issues the app’s stablecoin with createB20, with allowlists and freeze built in.",
      financing: "Lets people opt in to an earn vault for idle balances — yield is variable, not guaranteed.",
    },
  },
  {
    recipe: "Neobroker",
    ids: ["stocks", "swaps", "validity", "speed"],
    name: "Neobroker",
    pitch:
      "Browse tokenized stocks, swap in-app, and place orders that go through only when your terms are met.",
    why: {
      validity: "Turns a signed order into a limit order with no keeper bot: it goes through only when its conditions are met.",
    },
  },
  {
    recipe: "Agent-paid API",
    ids: ["payments", "speed", "builder"],
    name: "Agent-paid API",
    pitch:
      "An API that apps and AI agents pay per call with x402, with usage-based settlement and every call attributed to you.",
    why: { payments: "x402 lets apps and AI agents pay per call, with usage-based and batched settlement." },
  },
  {
    recipe: "Streaming payroll",
    ids: ["b20", "payments", "speed", "memos"],
    name: "Pay-by-the-second payroll",
    pitch: "Pay contributors by the second in a stablecoin, settled in batches, with a memo on every transfer.",
    why: {
      b20: "Pays out in a B20 stablecoin, with roles and memos built in.",
      payments: "Usage-based, batched settlement turns time worked into regular payouts.",
      speed: `Five blocks per second make by-the-second pay feel continuous. Denim: ${DENIM_STATUS}.`,
    },
  },
  {
    recipe: "Stablecoin checkout",
    ids: ["payments", "memos", "refunds", "speed"],
    name: "Stablecoin checkout",
    pitch:
      "A checkout that takes stablecoin payments, matches each one to its order, and refunds from the same flow.",
    why: { memos: "Puts the order ID on every payment so the store’s books reconcile automatically." },
  },

  // Featured pairs
  {
    ids: ["b20", "payments"],
    name: "Own-token checkout",
    pitch: "Issue your app’s own B20 stablecoin and accept it at checkout, with refunds in the same flow.",
  },
  {
    ids: ["b20", "financing"],
    name: "Stablecoin with earn",
    pitch:
      "Issue a B20 stablecoin for your app and let holders opt in to an earn vault — yield is variable, not guaranteed.",
  },
  {
    ids: ["b20", "validity"],
    name: "Tokenized asset limit orders",
    pitch: "Issue a tokenized asset with B20 and let holders sign limit orders that go through only when their terms are met.",
  },
  {
    ids: ["b20", "speed"],
    name: "Instant stablecoin transfers",
    pitch: "Issue a B20 stablecoin and move it in 200ms blocks, so sending feels like messaging.",
  },
  {
    ids: ["payments", "financing"],
    name: "Merchant earn wallet",
    pitch:
      "Accept payments, then let merchants opt in to an earn vault for settled balances — yield is variable, not guaranteed.",
  },
  {
    ids: ["payments", "validity"],
    name: "Conditional payments",
    pitch: "Sign a payment now that goes through only when your conditions are met — say, a minimum balance or a block deadline.",
  },
  {
    ids: ["payments", "speed"],
    name: "Instant checkout",
    pitch: "A checkout where the payment confirms in a 200ms block, before the customer leaves the counter.",
  },
  {
    ids: ["financing", "validity"],
    name: "Conditional lending manager",
    pitch: "Sign a repay or withdraw now; it goes through only when the onchain conditions you set are met.",
  },
  {
    ids: ["financing", "speed"],
    name: "Live earn dashboard",
    pitch: "Earn and lending positions that update every 200ms block — yield is variable, not guaranteed.",
  },
  {
    ids: ["validity", "speed"],
    name: "Keeperless limit orders",
    pitch: "Limit orders you sign once that go through only when their conditions are met, on 200ms blocks — no keeper bot.",
  },

  // Featured triples
  {
    ids: ["b20", "payments", "speed"],
    name: "Real-time stablecoin payments",
    pitch: "Issue a B20 stablecoin, accept it anywhere in your app, and confirm every payment in a 200ms block.",
  },
  {
    ids: ["b20", "payments", "financing"],
    name: "Mini neobank",
    pitch:
      "Issue a stablecoin, accept payments in it, and let people opt in to earn on what they hold — yield is variable, not guaranteed.",
  },
  {
    ids: ["b20", "validity", "speed"],
    name: "Tokenized asset trading desk",
    pitch: "Issue tokenized assets with B20 and let holders sign conditional orders that settle in 200ms blocks.",
  },
  {
    ids: ["b20", "payments", "validity"],
    name: "Conditional invoicing",
    pitch:
      "Create an invoice in your own B20 stablecoin that customers can pay when its conditions are met.",
  },
  {
    ids: ["payments", "validity", "speed"],
    name: "Instant conditional payments",
    pitch: "Payments signed upfront that go through only when their conditions are met, confirmed in a 200ms block.",
  },
  {
    ids: ["payments", "financing", "speed"],
    name: "Real-time merchant wallet",
    pitch:
      "Take payments in 200ms blocks and let merchants opt in to earn on settled balances — yield is variable, not guaranteed.",
  },
  {
    ids: ["financing", "validity", "speed"],
    name: "Hands-off lending manager",
    pitch: "Lending and borrowing moves signed ahead of time that go through only when your conditions are met, on 200ms blocks.",
  },
  {
    ids: ["b20", "financing", "validity"],
    name: "Tokenized asset credit desk",
    pitch: "Issue a tokenized asset, connect lending and borrowing, and let holders sign conditional moves.",
  },
  {
    ids: ["b20", "financing", "speed"],
    name: "Real-time stablecoin earn app",
    pitch:
      "Issue a stablecoin and let holders opt in to earn, with balances that update every 200ms block — yield is variable, not guaranteed.",
  },
  {
    ids: ["payments", "financing", "validity"],
    name: "Smart merchant treasury",
    pitch: "Accept payments, opt in to earn on balances, and sign conditional withdrawals that wait for your terms — yield is variable, not guaranteed.",
  },

  // With secondary Legos
  {
    ids: ["swaps", "validity"],
    name: "Keeperless swap orders",
    pitch: "Swap via the 0x Swap API with orders you sign once that go through only when their conditions are met.",
  },
  {
    ids: ["stocks", "swaps"],
    name: "Tokenized stock swap app",
    pitch: "Browse tokenized stocks with the read-only API and swap into them in-app.",
  },
  {
    ids: ["stocks", "validity"],
    name: "Conditional stock orders",
    pitch: "Show tokenized stocks and let people sign orders that go through only when their conditions are met.",
  },
  {
    ids: ["b20", "stocks"],
    name: "Tokenized equity explorer",
    pitch: "Issue tokenized assets with B20 and show tokenized stock data side by side.",
  },
  {
    ids: ["payments", "subscriptions"],
    name: "Subscription billing",
    pitch: "Charge once or on a schedule from one payments integration.",
  },
  {
    ids: ["payments", "escrow"],
    name: "Marketplace escrow",
    pitch: "A marketplace that holds the buyer’s payment until the seller delivers, then captures.",
  },
  {
    ids: ["payments", "refunds"],
    name: "Checkout with returns",
    pitch: "Take payments and send refunds or payouts from the same flow.",
  },
  {
    ids: ["escrow", "refunds"],
    name: "Hold-and-return marketplace",
    pitch: "Hold funds until delivery, capture on success, and refund when an order falls through.",
  },
  {
    ids: ["payments", "memos"],
    name: "Invoice payments",
    pitch: "Accept payments that each carry the invoice number, so the books reconcile themselves.",
  },
  {
    ids: ["b20", "memos"],
    name: "Reconciled stablecoin",
    pitch: "Issue a B20 stablecoin where every transfer carries a memo for reconciliation.",
  },
  {
    ids: ["b20", "verify"],
    name: "Verified issuance",
    pitch: "Issue a B20 token with an allowlist, and add verified users to it with Base Verify.",
  },
  {
    ids: ["payments", "verify"],
    name: "Verified checkout",
    pitch: "Accept payments only from verified users, checked with Base Verify.",
  },
  {
    ids: ["payments", "builder"],
    name: "Attributed payments app",
    pitch: "Accept payments and attribute every transaction to your app with Builder Codes.",
  },
  {
    ids: ["subscriptions", "speed"],
    name: "Instant subscriptions",
    pitch: "Subscriptions that start the moment someone approves, confirmed in a 200ms block.",
  },
  {
    ids: ["payments", "swaps"],
    name: "Pay with any token",
    pitch: "Swap into the right stablecoin with the 0x Swap API, then pay — in one step.",
  },
  {
    ids: ["financing", "swaps"],
    name: "Swap-and-earn wallet",
    pitch: "Swap into a stablecoin and opt in to an earn vault in one flow — yield is variable, not guaranteed.",
  },
  {
    ids: ["b20", "payments", "memos"],
    name: "Stablecoin invoicing",
    pitch: "Issue a stablecoin, invoice in it, and reconcile every payment by memo.",
  },
  {
    ids: ["payments", "escrow", "refunds"],
    name: "Full-cycle marketplace",
    pitch: "Charge, hold until delivery, capture, and refund when needed — all in one payments integration.",
  },
  {
    ids: ["payments", "subscriptions", "speed"],
    name: "Real-time subscription billing",
    pitch: "One-off and recurring charges that confirm in a 200ms block.",
  },
];

export const COMBO_BY_KEY: ReadonlyMap<string, Combo> = (() => {
  const map = new Map<string, Combo>();
  for (const c of COMBOS) {
    for (const id of c.ids) if (!BY_ID[id]) throw new Error("Unknown Lego in combo: " + id);
    const k = keyOf(c.ids);
    if (map.has(k)) throw new Error("Duplicate combo: " + k);
    map.set(k, c);
  }
  return map;
})();

export type Recipe = Combo & { recipe: string };

export const RECIPES: readonly Recipe[] = COMBOS.filter((c): c is Recipe => typeof c.recipe === "string");

/** URL-safe recipe slug: "Agent-paid API" -> "agent-paid-api". */
export function recipeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export type { LegoId };
