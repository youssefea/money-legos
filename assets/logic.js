/* Money Legos: data and deterministic generation logic. No DOM access here, so node can test it. */
var D = 'https://docs.base.org';
var DOCS = {
  b20: { label: 'B20 token standard', url: D + '/upgrades/beryl/b20' },
  stable: { label: 'Issue stablecoins', url: D + '/get-started/issue-stablecoins' },
  rwa: { label: 'Issue tokenized assets', url: D + '/get-started/issue-rwa' },
  pay: { label: 'Accept payments', url: D + '/get-started/accept-payments' },
  cpp: { label: 'Commerce Payments Protocol on GitHub', url: 'https://github.com/base/commerce-payments' },
  defi: { label: 'Integrate DeFi', url: D + '/get-started/integrate-defi' },
  earn: { label: 'Integrate an earn product', url: D + '/build-on-base/integrate-defi/integrate-earn-product' },
  lend: { label: 'Integrate lending', url: D + '/build-on-base/integrate-defi/integrate-lending' },
  borrow: { label: 'Integrate borrowing', url: D + '/build-on-base/integrate-defi/integrate-borrowing' },
  vtx: { label: 'Validity transactions', url: D + '/upgrades/cobalt/validity-transactions' },
  vtxBuild: { label: 'Build a validity transaction', url: D + '/specifications/build-transaction/build-a-validity-transaction' },
  denim: { label: 'Denim upgrade overview', url: D + '/upgrades/denim/overview' },
  guides: { label: 'Build on Base guides', url: D + '/build-on-base/overview' },
  stocks: { label: 'Tokenized Stocks API', url: D + '/sdks/tokenized-stocks/overview' },
  verify: { label: 'Base Verify', url: D + '/sdks/base-verify/overview' },
  codes: { label: 'Builder Codes for app developers', url: D + '/specifications/builder-codes/for-app-developers' }
};
var RES = {
  mcp: D + '/mcp',
  ai: D + '/get-started/resources-for-ai-agents',
  guides: D + '/build-on-base/overview',
  vibenet: 'https://chain.base.org/vibenet',
  faucet: 'https://chain.base.org/vibenet/faucet'
};

var STATUS = { live: 'live', testnet: 'testnet', available: 'available' };

/* tier: featured | secondary. adj/noun/verb feed the fallback name and pitch. */
var LEGOS = [
  {
    id: 'b20', tier: 'featured', kicker: 'Issue', title: 'B20',
    blurb: 'Issue stablecoins and tokenized assets with one call.',
    what: 'B20 is Base’s native token standard. Issue stablecoins and tokenized assets (RWAs, equities) with one createB20 call — no contract to write or audit. Roles, allowlists, freeze and memos are built in.',
    status: 'Live on mainnet since Beryl (June 25, 2026)', statusKind: STATUS.live,
    example: 'A team issues a dollar stablecoin for its app with createB20, turns on an allowlist, and attaches a memo to every transfer.',
    role: 'Issues the app’s token with one createB20 call, with roles, allowlists and freeze built in — no contract to audit.',
    build: 'Issue the token with createB20; configure roles and an allowlist.',
    docs: ['b20', 'stable', 'rwa'],
    adj: 'tokenized', noun: 'issuance desk', verb: 'issues its own token with B20', prio: 2, flow: 2
  },
  {
    id: 'payments', tier: 'featured', kicker: 'Pay', title: 'Accept payments',
    blurb: 'Charge, hold, refund and subscribe, or pay per call with x402.',
    what: 'The Commerce Payments Protocol covers charge, escrow (hold, then capture), refunds and subscriptions. x402 adds pay-per-call for APIs used by apps and AI agents, with usage-based and batched settlement.',
    status: 'Available now: Commerce Payments Protocol and x402', statusKind: STATUS.available,
    example: 'A shop holds a payment at checkout, captures it when the order ships, and refunds from the same flow.',
    role: 'Moves money in: charge, hold-then-capture, refunds, subscriptions or x402 pay-per-call.',
    build: 'Accept payments with the Commerce Payments Protocol (or x402 for pay-per-call).',
    docs: ['pay', 'cpp'],
    adj: 'paid', noun: 'checkout', verb: 'accepts payments', prio: 1, flow: 5
  },
  {
    id: 'financing', tier: 'featured', kicker: 'Grow', title: 'Financing',
    blurb: 'Earn vaults, lending and borrowing via Morpho and Aave.',
    what: 'Add earn vaults, lending and borrowing to your app with the Morpho and Aave integration guides for Base. Yield is variable, not guaranteed.',
    status: 'Available now: Morpho and Aave guides', statusKind: STATUS.available,
    example: 'A wallet lets people opt in to an earn vault for an idle stablecoin balance, and shows that the rate is variable before they confirm.',
    role: 'Adds earn vaults, lending or borrowing through Morpho or Aave — yield is variable, not guaranteed.',
    build: 'Integrate an earn vault, lending or borrowing via Morpho or Aave; label yield as variable, not guaranteed.',
    docs: ['defi', 'earn', 'lend', 'borrow'],
    adj: 'earn-enabled', noun: 'earn app', verb: 'offers earn vaults, lending or borrowing', prio: 4, flow: 11
  },
  {
    id: 'validity', tier: 'featured', kicker: 'Trade', title: 'Validity transactions',
    blurb: 'Sign now; included only while your conditions hold.',
    what: 'Sign a transaction now, and the sequencer includes it only while your onchain conditions hold — balance, nonce, storage or block number. Limit and conditional orders work without a keeper bot. Pair them with swaps via the 0x Swap API.',
    status: 'Live on mainnet since Cobalt (Sep 30, 2026)', statusKind: STATUS.live,
    example: 'Someone signs a limit order once; it is included only while the onchain conditions they set still hold, with no keeper bot watching.',
    role: 'Lets people sign once and be included only while their onchain conditions hold — no keeper bot.',
    build: 'Build validity transactions with conditions on balance, nonce, storage or block number.',
    docs: ['vtx', 'vtxBuild'],
    adj: 'conditional', noun: 'order desk', verb: 'lets people sign conditional orders', prio: 3, flow: 10
  },
  {
    id: 'speed', tier: 'featured', kicker: 'Speed', title: '200ms blocks',
    blurb: 'Five canonical blocks per second, arriving with Denim.',
    what: 'With the Denim upgrade, Base produces native 200ms blocks: five canonical blocks per second, 10x faster than 2s blocks. It replaces Flashblocks.',
    status: 'Arriving with Denim — live on Base Sepolia since Oct 21, 2026; mainnet targeting November 2026', statusKind: STATUS.testnet,
    example: 'A checkout on Base Sepolia shows the payment confirmed in the next 200ms block, before the customer puts their phone away.',
    role: 'Confirms each step in a 200ms block so the app feels instant — arriving with Denim, live on Base Sepolia.',
    build: 'Design the UX around 200ms blocks (Denim, live on Base Sepolia).',
    docs: ['denim'],
    adj: 'instant', noun: 'real-time app', verb: 'confirms in 200ms blocks', prio: 13, flow: 13
  },
  {
    id: 'swaps', tier: 'secondary', kicker: 'Swap', title: 'Swaps',
    blurb: 'Swap tokens in-app with the 0x Swap API.',
    what: 'Swap between tokens inside your app with the 0x Swap API. Pairs well with validity transactions for conditional orders.',
    status: 'Available via the 0x Swap API', statusKind: STATUS.available,
    example: 'A wallet lets someone swap into a stablecoin before paying, in one screen.',
    role: 'Swaps between tokens in-app via the 0x Swap API.',
    build: 'Add in-app swaps with the 0x Swap API.',
    docs: ['guides'],
    adj: 'swap-enabled', noun: 'swap app', verb: 'swaps tokens in-app', prio: 6, flow: 4
  },
  {
    id: 'stocks', tier: 'secondary', kicker: 'Data', title: 'Tokenized Stocks API',
    blurb: 'Read-only, no key. Eligible jurisdictions outside the US.',
    what: 'A read-only API for tokenized stock data on Base, with no API key. Available in eligible jurisdictions outside the US only.',
    status: 'Read-only API — eligible jurisdictions outside the US only', statusKind: STATUS.available,
    example: 'An app lists tokenized stocks with their details, read from the API with no key.',
    role: 'Reads tokenized stock data with a read-only, no-key API (eligible jurisdictions outside the US only).',
    build: 'Read tokenized stock data from the read-only Tokenized Stocks API (no key; eligible jurisdictions outside the US only).',
    docs: ['stocks'],
    adj: 'stock-aware', noun: 'stock explorer', verb: 'shows tokenized stock data', prio: 5, flow: 3
  },
  {
    id: 'verify', tier: 'secondary', kicker: 'Verify', title: 'Base Verify',
    blurb: 'Check a user is verified before a step.',
    what: 'Base Verify lets your app check that a user is verified before they reach a feature.',
    status: 'SDK available', statusKind: STATUS.available,
    example: 'A claim page checks with Base Verify before letting someone claim.',
    role: 'Gates sensitive steps to verified users with Base Verify.',
    build: 'Gate the key step with Base Verify.',
    docs: ['verify'],
    adj: 'verified', noun: 'member portal', verb: 'gates steps to verified users', prio: 10, flow: 1
  },
  {
    id: 'builder', tier: 'secondary', kicker: 'Attribute', title: 'Builder Codes',
    blurb: 'Attribute onchain activity to your app.',
    what: 'Builder Codes attribute onchain activity to your app, so the transactions it drives are credited to it.',
    status: 'Spec for app developers', statusKind: STATUS.available,
    example: 'Every transaction an app sends carries its Builder Code, so its activity is attributed to it.',
    role: 'Attributes every transaction the app sends with a Builder Code.',
    build: 'Add a Builder Code to every transaction the app sends.',
    docs: ['codes'],
    adj: 'attributed', noun: 'attribution dashboard', verb: 'attributes activity with Builder Codes', prio: 12, flow: 12
  },
  {
    id: 'memos', tier: 'secondary', kicker: 'Reconcile', title: 'Memos',
    blurb: 'Tag B20 transfers for reconciliation.',
    what: 'Memos ride along with B20 transfers, so each payment can carry an order or invoice reference for reconciliation.',
    status: 'Built into B20 — live on mainnet since Beryl', statusKind: STATUS.live,
    example: 'Each payment carries the invoice number as a memo, so the books match the chain.',
    role: 'Tags each B20 transfer with an order or invoice reference for reconciliation.',
    build: 'Attach a memo with the order or invoice ID to every B20 transfer.',
    docs: ['b20'],
    adj: 'reconciled', noun: 'reconciliation tool', verb: 'tags transfers with memos', prio: 11, flow: 8
  },
  {
    id: 'subscriptions', tier: 'secondary', kicker: 'Recur', title: 'Subscriptions',
    blurb: 'Charge on a schedule.',
    what: 'Recurring charges with the Commerce Payments Protocol: approve once, get charged on a schedule.',
    status: 'Part of the Commerce Payments Protocol', statusKind: STATUS.available,
    example: 'A newsletter charges subscribers monthly after a single approval.',
    role: 'Charges on a schedule after a single approval.',
    build: 'Set up recurring charges with the Commerce Payments Protocol.',
    docs: ['pay', 'cpp'],
    adj: 'recurring', noun: 'billing app', verb: 'bills on a schedule', prio: 7, flow: 6
  },
  {
    id: 'escrow', tier: 'secondary', kicker: 'Hold', title: 'Escrow',
    blurb: 'Hold funds, then capture.',
    what: 'Hold funds at checkout, then capture when the order is fulfilled — hold-then-capture in the Commerce Payments Protocol.',
    status: 'Part of the Commerce Payments Protocol', statusKind: STATUS.available,
    example: 'A marketplace holds payment until the seller ships, then captures.',
    role: 'Holds funds until the order is fulfilled, then captures.',
    build: 'Use hold-then-capture (escrow) from the Commerce Payments Protocol.',
    docs: ['pay', 'cpp'],
    adj: 'escrowed', noun: 'marketplace', verb: 'holds funds until capture', prio: 8, flow: 7
  },
  {
    id: 'refunds', tier: 'secondary', kicker: 'Return', title: 'Refunds and payouts',
    blurb: 'Send money back out.',
    what: 'Send refunds and payouts from the same payments flow you charge with.',
    status: 'Part of the Commerce Payments Protocol', statusKind: STATUS.available,
    example: 'A store refunds a returned order from its admin screen in one click.',
    role: 'Sends refunds and payouts from the same payments flow.',
    build: 'Support refunds and payouts with the Commerce Payments Protocol.',
    docs: ['pay', 'cpp'],
    adj: 'refundable', noun: 'payout console', verb: 'sends refunds and payouts', prio: 9, flow: 9
  }
];

var BY_ID = {};
LEGOS.forEach(function (l) { BY_ID[l.id] = l; });

function keyOf(ids) { return ids.slice().sort().join('+'); }

/* Curated combos. why overrides the generic role for a Lego in this app. */
var COMBOS = [
  // Recipes
  { recipe: 'Neobank', ids: ['verify', 'b20', 'payments', 'financing'], name: 'Neobank',
    pitch: 'A stablecoin app people can be paid into, pay from, and opt in to earn with — behind a verified sign-up.',
    why: { b20: 'Issues the app’s stablecoin with createB20, with allowlists and freeze built in.', financing: 'Lets people opt in to an earn vault for idle balances — yield is variable, not guaranteed.' } },
  { recipe: 'Neobroker', ids: ['stocks', 'swaps', 'validity', 'speed'], name: 'Neobroker',
    pitch: 'Browse tokenized stocks, swap in-app, and place conditional orders that are included only while your terms hold.',
    why: { validity: 'Turns a signed order into a limit order with no keeper bot — included only while its conditions hold.' } },
  { recipe: 'Agent-paid API', ids: ['payments', 'speed', 'builder'], name: 'Agent-paid API',
    pitch: 'An API that apps and AI agents pay per call with x402, with usage-based settlement and every call attributed to you.',
    why: { payments: 'x402 lets apps and AI agents pay per call, with usage-based and batched settlement.' } },
  { recipe: 'Streaming payroll', ids: ['b20', 'payments', 'speed', 'memos'], name: 'Pay-by-the-second payroll',
    pitch: 'Pay contributors by the second in a stablecoin, settled in batches, with a memo on every transfer.',
    why: { b20: 'Pays out in a B20 stablecoin, with roles and memos built in.', payments: 'Usage-based, batched settlement turns time worked into regular payouts.', speed: 'Five blocks per second make by-the-second pay feel continuous — arriving with Denim.' } },
  { recipe: 'Stablecoin checkout', ids: ['payments', 'memos', 'refunds', 'speed'], name: 'Stablecoin checkout',
    pitch: 'A checkout that takes stablecoin payments, matches each one to its order, and refunds from the same flow.',
    why: { memos: 'Puts the order ID on every payment so the store’s books reconcile automatically.' } },

  // Featured pairs
  { ids: ['b20', 'payments'], name: 'Own-token checkout', pitch: 'Issue your app’s own B20 stablecoin and accept it at checkout, with refunds in the same flow.' },
  { ids: ['b20', 'financing'], name: 'Stablecoin with earn', pitch: 'Issue a B20 stablecoin for your app and let holders opt in to an earn vault — yield is variable, not guaranteed.' },
  { ids: ['b20', 'validity'], name: 'Tokenized asset limit orders', pitch: 'Issue a tokenized asset with B20 and let holders sign limit orders that are included only while their terms hold.' },
  { ids: ['b20', 'speed'], name: 'Instant stablecoin transfers', pitch: 'Issue a B20 stablecoin and move it in 200ms blocks, so sending feels like messaging.' },
  { ids: ['payments', 'financing'], name: 'Merchant earn wallet', pitch: 'Accept payments, then let merchants opt in to an earn vault for settled balances — yield is variable, not guaranteed.' },
  { ids: ['payments', 'validity'], name: 'Conditional payments', pitch: 'Sign a payment now that is included only while your conditions hold — say, a minimum balance or a block deadline.' },
  { ids: ['payments', 'speed'], name: 'Instant checkout', pitch: 'A checkout where the payment confirms in a 200ms block, before the customer leaves the counter.' },
  { ids: ['financing', 'validity'], name: 'Conditional lending manager', pitch: 'Sign a repay or withdraw now, included only while the onchain conditions you set still hold.' },
  { ids: ['financing', 'speed'], name: 'Live earn dashboard', pitch: 'Earn and lending positions that update every 200ms block — yield is variable, not guaranteed.' },
  { ids: ['validity', 'speed'], name: 'Keeperless limit orders', pitch: 'Limit orders signed once and included only while their conditions hold, on 200ms blocks — no keeper bot.' },

  // Featured triples
  { ids: ['b20', 'payments', 'speed'], name: 'Real-time stablecoin payments', pitch: 'Issue a B20 stablecoin, accept it anywhere in your app, and confirm every payment in a 200ms block.' },
  { ids: ['b20', 'payments', 'financing'], name: 'Mini neobank', pitch: 'Issue a stablecoin, accept payments in it, and let people opt in to earn on what they hold.' },
  { ids: ['b20', 'validity', 'speed'], name: 'Tokenized asset trading desk', pitch: 'Issue tokenized assets with B20 and let holders sign conditional orders, included on 200ms blocks.' },
  { ids: ['b20', 'payments', 'validity'], name: 'Conditional invoicing', pitch: 'Invoice in your own B20 stablecoin and let payers sign a payment that is included only while their conditions hold.' },
  { ids: ['payments', 'validity', 'speed'], name: 'Instant conditional payments', pitch: 'Payments signed upfront, included only while their conditions hold, and confirmed in a 200ms block.' },
  { ids: ['payments', 'financing', 'speed'], name: 'Real-time merchant wallet', pitch: 'Take payments in 200ms blocks and let merchants opt in to earn on settled balances — yield is variable, not guaranteed.' },
  { ids: ['financing', 'validity', 'speed'], name: 'Hands-off lending manager', pitch: 'Lending and borrowing moves signed ahead of time, included only while your conditions hold, on 200ms blocks.' },
  { ids: ['b20', 'financing', 'validity'], name: 'Tokenized asset credit desk', pitch: 'Issue a tokenized asset, connect lending and borrowing, and let holders sign conditional moves.' },
  { ids: ['b20', 'financing', 'speed'], name: 'Real-time stablecoin earn app', pitch: 'Issue a stablecoin and let holders opt in to earn, with balances that update every 200ms block.' },
  { ids: ['payments', 'financing', 'validity'], name: 'Smart merchant treasury', pitch: 'Accept payments, opt in to earn on balances, and sign conditional withdrawals that wait for your terms.' },

  // With secondary Legos
  { ids: ['swaps', 'validity'], name: 'Keeperless swap orders', pitch: 'Swap via the 0x Swap API with orders signed once and included only while their conditions hold.' },
  { ids: ['stocks', 'swaps'], name: 'Tokenized stock swap app', pitch: 'Browse tokenized stocks with the read-only API and swap into them in-app.' },
  { ids: ['stocks', 'validity'], name: 'Conditional stock orders', pitch: 'Show tokenized stocks and let people sign orders that are included only while their conditions hold.' },
  { ids: ['b20', 'stocks'], name: 'Tokenized equity explorer', pitch: 'Issue tokenized assets with B20 and show tokenized stock data side by side.' },
  { ids: ['payments', 'subscriptions'], name: 'Subscription billing', pitch: 'Charge once or on a schedule from one payments integration.' },
  { ids: ['payments', 'escrow'], name: 'Marketplace escrow', pitch: 'A marketplace that holds the buyer’s payment until the seller delivers, then captures.' },
  { ids: ['payments', 'refunds'], name: 'Checkout with returns', pitch: 'Take payments and send refunds or payouts from the same flow.' },
  { ids: ['escrow', 'refunds'], name: 'Hold-and-return marketplace', pitch: 'Hold funds until delivery, capture on success, and refund when an order falls through.' },
  { ids: ['payments', 'memos'], name: 'Invoice payments', pitch: 'Accept payments that each carry the invoice number, so the books reconcile themselves.' },
  { ids: ['b20', 'memos'], name: 'Reconciled stablecoin', pitch: 'Issue a B20 stablecoin where every transfer carries a memo for reconciliation.' },
  { ids: ['b20', 'verify'], name: 'Verified issuance', pitch: 'Issue a B20 token with an allowlist, and add verified users to it with Base Verify.' },
  { ids: ['payments', 'verify'], name: 'Verified checkout', pitch: 'Accept payments only from verified users, checked with Base Verify.' },
  { ids: ['payments', 'builder'], name: 'Attributed payments app', pitch: 'Accept payments and attribute every transaction to your app with Builder Codes.' },
  { ids: ['subscriptions', 'speed'], name: 'Instant subscriptions', pitch: 'Subscriptions that start the moment someone approves, confirmed in a 200ms block.' },
  { ids: ['payments', 'swaps'], name: 'Pay with any token', pitch: 'Swap into the right stablecoin with the 0x Swap API, then pay — in one step.' },
  { ids: ['financing', 'swaps'], name: 'Swap-and-earn wallet', pitch: 'Swap into a stablecoin and opt in to an earn vault in one flow — yield is variable, not guaranteed.' },
  { ids: ['b20', 'payments', 'memos'], name: 'Stablecoin invoicing', pitch: 'Issue a stablecoin, invoice in it, and reconcile every payment by memo.' },
  { ids: ['payments', 'escrow', 'refunds'], name: 'Full-cycle marketplace', pitch: 'Charge, hold until delivery, capture, and refund when needed — all in one payments integration.' },
  { ids: ['payments', 'subscriptions', 'speed'], name: 'Real-time subscription billing', pitch: 'One-off and recurring charges that confirm in a 200ms block.' }
];

var COMBO_BY_KEY = {};
COMBOS.forEach(function (c) {
  c.ids.forEach(function (id) { if (!BY_ID[id]) throw new Error('Unknown Lego in combo: ' + id); });
  var k = keyOf(c.ids);
  if (COMBO_BY_KEY[k]) throw new Error('Duplicate combo: ' + k);
  COMBO_BY_KEY[k] = c;
});

var RECIPES = COMBOS.filter(function (c) { return c.recipe; });

function capFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function joinList(items) {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return items[0] + ' and ' + items[1];
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

function flowOrder(ids) {
  return ids.slice().sort(function (a, b) { return BY_ID[a].flow - BY_ID[b].flow; });
}

/* Fallback: the highest-priority Lego is the noun, the next one or two lend adjectives. */
function fallback(ids) {
  var byPrio = ids.slice().sort(function (a, b) { return BY_ID[a].prio - BY_ID[b].prio; });
  var anchor = BY_ID[byPrio[0]];
  var mods = byPrio.slice(1);
  var parts = [];
  if (mods.length) parts.push(BY_ID[mods[0]].adj);
  if (anchor.id !== 'speed' && mods[0] !== 'speed' && ids.indexOf('speed') !== -1) parts.unshift(BY_ID.speed.adj);
  var name = capFirst(parts.concat([anchor.noun]).join(' '));
  var verbs = flowOrder(ids).map(function (id) { return BY_ID[id].verb; });
  var pitch = 'An app that ' + joinList(verbs) + '.';
  return { name: name, pitch: pitch, why: {} };
}

function dedupeDocs(ids) {
  var seen = {}, out = [];
  ids.forEach(function (id) {
    BY_ID[id].docs.forEach(function (d) {
      if (!seen[d]) { seen[d] = 1; out.push(DOCS[d]); }
    });
  });
  return out;
}

function buildPrompt(r) {
  var lines = [];
  lines.push('Build an MVP of "' + r.name + '" on Base.');
  lines.push(r.pitch);
  lines.push('');
  lines.push('Money Legos to use, in flow order:');
  r.steps.forEach(function (s, i) {
    lines.push((i + 1) + '. ' + s.lego.title + ' — ' + s.lego.build);
    s.docs.forEach(function (d) { lines.push('   Docs: ' + d.url); });
  });
  lines.push('');
  lines.push('Flow: ' + r.steps.map(function (s) { return s.lego.title; }).join(' → '));
  lines.push('');
  lines.push('How to work:');
  lines.push('- Connect the Base docs MCP (' + RES.mcp + ') and read every docs page above before writing code. Do not rely on memory for APIs.');
  lines.push('- More for coding agents: ' + RES.ai + ' · Build guides: ' + RES.guides);
  lines.push('- Test on Base Sepolia only. Use the Vibenet hub (' + RES.vibenet + ') and faucet (' + RES.faucet + ') for test funds.');
  var ids = r.ids;
  if (ids.indexOf('speed') !== -1) lines.push('- 200ms blocks arrive with the Denim upgrade: live on Base Sepolia, mainnet targeting November 2026.');
  if (ids.indexOf('financing') !== -1) lines.push('- Show in the UI that yield is variable, not guaranteed.');
  if (ids.indexOf('stocks') !== -1) lines.push('- The Tokenized Stocks API is read-only, needs no key, and is for eligible jurisdictions outside the US only.');
  lines.push('- Keep scope to one happy-path flow, with a simple web UI and clear error states.');
  lines.push('- Write a README with setup, environment variables, and how to run against Base Sepolia.');
  return lines.join('\n');
}

/* Returns a full result for 2–4 valid Lego ids, or null. Deterministic. */
function generate(ids) {
  var clean = [];
  (ids || []).forEach(function (id) { if (BY_ID[id] && clean.indexOf(id) === -1) clean.push(id); });
  if (clean.length < 2 || clean.length > 4) return null;
  var curated = COMBO_BY_KEY[keyOf(clean)];
  var base = curated || fallback(clean);
  var order = curated ? flowOrder(curated.ids) : flowOrder(clean);
  var why = base.why || {};
  var steps = order.map(function (id) {
    var lego = BY_ID[id];
    return { lego: lego, why: why[id] || lego.role, docs: lego.docs.map(function (d) { return DOCS[d]; }) };
  });
  var r = { ids: order, name: base.name, pitch: base.pitch, curated: !!curated, steps: steps, docs: dedupeDocs(order) };
  r.prompt = buildPrompt(r);
  return r;
}

/* rand: a function returning [0, 1). Picks a curated combo that differs from the current board. */
function surprise(currentIds, rand) {
  var cur = keyOf(currentIds || []);
  var pool = COMBOS.filter(function (c) { return keyOf(c.ids) !== cur; });
  var pick = pool[Math.floor((rand || Math.random)() * pool.length) % pool.length];
  return flowOrder(pick.ids);
}

function parseHash(hash) {
  var h = String(hash || '').replace(/^#/, '');
  if (!h) return [];
  var m = /^recipe=(.+)$/.exec(h);
  if (m) {
    var want = decodeURIComponent(m[1]).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    for (var i = 0; i < RECIPES.length; i++) {
      if (RECIPES[i].recipe.toLowerCase().replace(/[^a-z0-9]+/g, '-') === want) return flowOrder(RECIPES[i].ids);
    }
    return [];
  }
  var out = [];
  h.split(/[,+]/).forEach(function (id) {
    id = decodeURIComponent(id).trim().toLowerCase();
    if (BY_ID[id] && out.indexOf(id) === -1 && out.length < 4) out.push(id);
  });
  return out;
}

var MoneyLegos = {
  LEGOS: LEGOS, BY_ID: BY_ID, DOCS: DOCS, RES: RES, COMBOS: COMBOS, RECIPES: RECIPES,
  generate: generate, surprise: surprise, parseHash: parseHash, keyOf: keyOf, flowOrder: flowOrder, fallback: fallback
};
if (typeof module !== 'undefined' && module.exports) module.exports = MoneyLegos;
