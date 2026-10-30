import { BY_ID, DENIM_STATUS } from "./legos";
import type { Combo, LegoId, Recipe } from "./types";

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
      validity: "Turns a signed order into a limit order with no bot watching: it goes through only when its conditions are met.",
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

  // Recipes added with the 40-brick catalog (design/content/recipes.json)
  {
    recipe: "Creator payouts",
    ids: ["payouts", "splits", "builder", "memos"],
    name: "Creator payouts",
    pitch: "Pay every creator their weekly share in one transaction, with a memo on each payment and the activity credited to your app.",
  },
  {
    recipe: "Pay a name",
    ids: ["basenames", "base-pay", "speed"],
    name: "Pay a name",
    pitch: "Send USDC to alice.base.eth and see it confirmed in the next 200ms block on Base Sepolia.",
    why: { speed: `Shows the payment confirmed in the next 200ms block. Denim: ${DENIM_STATUS}.` },
  },
  {
    recipe: "Fair airdrop",
    ids: ["verify-onchain", "b20", "payouts"],
    name: "Fair airdrop",
    pitch: "Drop a new token to real people only: one claim per verified person, checked by the contract.",
  },
  {
    recipe: "Members-only fund",
    ids: ["b20", "allowlist", "multiplier", "stocks"],
    name: "Members-only fund",
    pitch: "A tokenized fund only approved investors can hold, whose balances update correctly for splits.",
  },
  {
    recipe: "Agent data market",
    ids: ["x402-api", "agent-spend", "agent-codes"],
    name: "Agent data market",
    pitch: "Sell data per call to AI agents that stay inside their spend limits, with every agent credited onchain.",
  },
  {
    recipe: "Metered AI API",
    ids: ["usage-billing", "basetime", "docs-mcp"],
    name: "Metered AI API",
    pitch: "An AI API that holds a maximum, then charges only for the exact usage, timed to the millisecond.",
    why: { basetime: `Times each request to the millisecond. BaseTime comes with Denim: ${DENIM_STATUS}.` },
  },
  {
    recipe: "Private payroll",
    ids: ["private-ledgers", "payouts", "memos"],
    name: "Private payroll",
    pitch: "Run payroll without publishing every salary, with each payment tagged to its pay period.",
    why: { "private-ledgers": "Keeps salaries off public explorers. Base Ledgers is early access, so request access first." },
  },
  {
    recipe: "Escrow marketplace",
    ids: ["escrow", "splits", "refunds", "verify"],
    name: "Escrow marketplace",
    pitch: "Verified buyers pay into escrow, sellers get paid on delivery with the platform fee split out, and returns refund in one click.",
  },
  {
    recipe: "Borrow to pay",
    ids: ["borrow", "swaps", "base-pay"],
    name: "Borrow to pay",
    pitch: "Borrow USDC against ETH, swap if needed, and pay a merchant without selling your ETH.",
  },
  {
    recipe: "Gas-free onboarding",
    ids: ["connect-wallet", "sponsored-gas", "batch-calls", "bridge"],
    name: "Gas-free onboarding",
    pitch: "New users connect, bring funds in, and make their first payment in one tap with the app paying fees (sponsorship arrives with Everest).",
    why: { "sponsored-gas": "Lets the app cover the first fees. Announced with Everest; dates to be announced.", "batch-calls": "Bundles the first steps into one tap. Announced with Everest; dates to be announced." },
  },
  {
    recipe: "Live merchant screen",
    ids: ["payments", "live-stream", "reconcile", "flashblocks"],
    name: "Live merchant screen",
    pitch: "A shop counter screen that flips to Paid the moment payment lands, with a clean end-of-day report.",
  },
  {
    recipe: "Stablecoin ops desk",
    ids: ["b20", "freeze", "pause", "memos"],
    name: "Stablecoin ops desk",
    pitch: "An issuer console to mint a stablecoin, put a hold on one account, pause in an incident, and match every move to its record.",
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
    pitch: "Limit orders you sign once that go through only when their conditions are met, on 200ms blocks, with no bot watching.",
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
    pitch: "Take payments and send refunds from the same flow.",
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

/** One-line ideas (<= 60 chars) and URL ids for every recipe, keyed by recipe name. */
const RECIPE_META: Readonly<Record<string, { id: string; idea: string }>> = {
  Neobank: { id: "neobank", idea: "Get paid, pay and opt in to earn, after a verified sign-up" },
  Neobroker: { id: "neobroker", idea: "Browse stocks, swap, and place orders that wait for a price" },
  "Agent-paid API": { id: "agent-paid-api", idea: "An API that AI agents pay per call, credited to you" },
  "Streaming payroll": { id: "streaming-payroll", idea: "Pay people by the second in a stablecoin, with memos" },
  "Stablecoin checkout": { id: "stablecoin-checkout", idea: "Take stablecoin payments, match orders, refund" },
  "Creator payouts": { id: "creator-payouts", idea: "Pay every creator their share in one transaction" },
  "Pay a name": { id: "pay-a-name", idea: "Send to a name and see it confirmed in 200ms" },
  "Fair airdrop": { id: "fair-airdrop", idea: "Drop a token to real people, one claim each" },
  "Members-only fund": { id: "members-only-fund", idea: "A fund only approved investors can hold" },
  "Agent data market": { id: "agent-data-market", idea: "Sell data per call to agents with spend limits" },
  "Metered AI API": { id: "metered-ai-api", idea: "An AI API that charges only for what was used" },
  "Private payroll": { id: "private-payroll", idea: "Run payroll without publishing every salary" },
  "Escrow marketplace": { id: "escrow-marketplace", idea: "Buyers pay into escrow; sellers get paid on delivery" },
  "Borrow to pay": { id: "borrow-to-pay", idea: "Borrow against ETH and pay without selling it" },
  "Gas-free onboarding": { id: "gas-free-onboarding", idea: "One-tap onboarding; batching and fee cover are announced" },
  "Live merchant screen": { id: "live-merchant-screen", idea: "A counter screen that flips to Paid the moment it lands" },
  "Stablecoin ops desk": { id: "safe-stablecoin-desk", idea: "Issue a stablecoin; hold, pause and match every move" },
};

/** The 17 named recipes (5 original + 12 from the catalog), in tray order. */
export const RECIPES: readonly Recipe[] = COMBOS.filter((c): c is Combo & { recipe: string } => typeof c.recipe === "string").map(
  (c) => {
    const meta = RECIPE_META[c.recipe];
    if (!meta) throw new Error("Recipe without an id and idea: " + c.recipe);
    return { ...c, ...meta };
  },
);

/** URL-safe recipe slug: "Agent-paid API" -> "agent-paid-api". */
export function recipeSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export type { LegoId };
