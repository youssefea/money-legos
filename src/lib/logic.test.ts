import { describe, expect, it } from "vitest";
import recipesJson from "../data/recipes.json";
import {
  ALL_BRICKS,
  BRAND_PALETTE,
  BRICK_COLORS,
  BY_ID,
  CATEGORIES,
  COMBOS,
  COMBO_BY_KEY,
  DENIM_SHORT,
  DENIM_STATUS,
  DOCS,
  GLOSSARY,
  HERO_LEGOS,
  ID_ALIASES,
  LEGOS,
  MORE_LEGOS,
  RECIPES,
  RES,
  RISK_FOOTER,
  WHITE_LABEL_HEXES,
  bricksByCategory,
  buildFakeApp,
  cleanIds,
  describeFakeApp,
  tileRoles,
  wireLabel,
  flowOrder,
  generate,
  keyOf,
  nextLevel,
  parseHash,
  recipeHash,
  recipeSlug,
  resolveId,
  stackFootprint,
  surprise,
  tileStrings,
  toHash,
  toPlacedBricks,
  type GenerateResult,
  type LegoId,
} from "./index";

const ALL_IDS = LEGOS.map((l) => l.id);
const OLD_IDS: LegoId[] = [
  "b20",
  "payments",
  "financing",
  "validity",
  "speed",
  "swaps",
  "stocks",
  "verify",
  "builder",
  "memos",
  "subscriptions",
  "escrow",
  "refunds",
];
const HERO_IDS: LegoId[] = ["b20", "payments", "financing", "validity", "speed"];

/** Small seeded PRNG (mulberry32) so the random samples are the same on every run. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(rand: () => number, n: number, min = 2, max = 4): LegoId[][] {
  const out: LegoId[][] = [];
  for (let i = 0; i < n; i++) {
    const k = min + Math.floor(rand() * (max - min + 1));
    const pool = ALL_IDS.slice();
    const pick: LegoId[] = [];
    while (pick.length < k) pick.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
    out.push(pick);
  }
  return out;
}

const SAMPLE = sample(rng(40), 2000);

/** Every user-visible string a result can produce. */
function textOf(r: GenerateResult): string {
  return [
    r.name,
    r.pitch,
    r.prompt,
    ...r.steps.flatMap((s) => [s.why, s.lego.name, s.lego.verb, s.lego.short, s.lego.what, s.lego.status.label, s.lego.example]),
    ...r.docs.map((d) => d.label),
  ].join("\n");
}

function allContentText(): string {
  return [
    ...LEGOS.flatMap((l) => [
      l.verb,
      l.name,
      l.tag,
      l.short,
      l.what,
      l.status.label,
      l.example,
      l.role,
      l.build,
      l.adj,
      l.noun,
      l.does,
      l.step,
      l.note ?? "",
      ...tileStrings(l.ui),
    ]),
    ...COMBOS.flatMap((c) => [c.name, c.pitch, ...Object.values(c.why ?? {})]),
    ...RECIPES.map((r) => r.idea),
    ...Object.values(DOCS).map((d) => d.label),
    RISK_FOOTER,
  ].join("\n");
}

const BANNED: RegExp[] = [
  /₹/,
  /\bseamless(ly)?\b/i,
  /\bleverag(e|ing)\b/i,
  /\bunlock(s|ing)?\b/i,
  /\brevolutioni[sz]e/i,
  /\bgame[- ]chang/i,
  /\bempower/i,
  /\bcutting[- ]edge\b/i,
  /\bdelve\b/i,
  /\bsupercharg/i,
  /\bnext[- ]gen/i,
  /\bsynerg/i,
  /\bguaranteed (yield|returns?)\b/i,
  /\brisk[- ]free\b/i,
  /\bpayments built in\b/i,
  /\bPolicyRegistry\b/,
  /\bLEGO\b/,
  /\bMVP\b/,
  /\bkeeper\b/i,
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
];

describe("Lego registry", () => {
  it("has 40 Legos with unique ids, the 5 heroes first", () => {
    expect(LEGOS).toHaveLength(40);
    expect(new Set(ALL_IDS).size).toBe(40);
    expect(LEGOS.slice(0, 5).map((l) => l.id)).toEqual(HERO_IDS);
    expect(HERO_LEGOS.map((l) => l.id)).toEqual(HERO_IDS);
    expect(MORE_LEGOS).toHaveLength(35);
  });

  it("keeps all 13 original ids", () => {
    for (const id of OLD_IDS) expect(BY_ID[id], id).toBeDefined();
  });

  it("keeps hero verbs, names, 2x4 size and the spec colours", () => {
    const want: [LegoId, string, string, string][] = [
      ["b20", "Issue", "B20", "#0000FF"],
      ["payments", "Pay", "Accept payments", "#3C8AFF"],
      ["financing", "Grow", "Financing", "#66C800"],
      ["validity", "Trade", "Validity transactions", "#FFD12F"],
      ["speed", "Speed", "200ms blocks", "#FEA8CD"],
    ];
    for (const [id, verb, name, hex] of want) {
      const l = BY_ID[id];
      expect([l.verb, l.kicker, l.name, l.title, l.brick.hex, l.tier], id).toEqual([verb, verb, name, name, hex, "hero"]);
      expect(l.size, id).toEqual([4, 2]);
    }
  });

  it("puts every Lego in one of the 8 categories, in tray order", () => {
    expect(CATEGORIES).toEqual(["Money", "Identity", "Wallet", "Speed", "Trade", "Data", "Agents", "Apps"]);
    for (const l of LEGOS) expect(CATEGORIES, l.id).toContain(l.category);
    const listed = CATEGORIES.flatMap((c) => bricksByCategory[c].map((l) => l.id));
    expect(listed.slice().sort()).toEqual(ALL_IDS.slice().sort());
    for (const c of CATEGORIES) expect(bricksByCategory[c].length, c).toBeGreaterThan(0);
  });

  it("uses only valid footprints; only heroes are 2x4", () => {
    const ok = ["4x2", "3x2", "2x2", "4x1", "2x1"];
    for (const l of LEGOS) {
      expect(ok, l.id).toContain(l.size.join("x"));
      expect(l.size.join("x") === "4x2", l.id).toBe(l.tier === "hero");
    }
  });

  it("has unique prio and flow values", () => {
    expect(new Set(LEGOS.map((l) => l.prio)).size).toBe(40);
    expect(new Set(LEGOS.map((l) => l.flow)).size).toBe(40);
  });
});

describe("brick colours", () => {
  it("uses only the 16 brand colours, never red", () => {
    expect(BRAND_PALETTE).toHaveLength(16);
    for (const l of LEGOS) {
      expect(BRAND_PALETTE, l.id).toContain(l.brick.hex);
      expect(BRAND_PALETTE, l.id).toContain(l.brick.label);
      expect(l.brick.hex, l.id).not.toBe("#FC401F");
      expect(l.brick).toEqual(BRICK_COLORS[l.brick.id]);
    }
  });

  it("puts white labels only on #0000FF, #32353D and #0A0B0D; #0A0B0D text everywhere else", () => {
    for (const l of LEGOS) {
      const want = WHITE_LABEL_HEXES.includes(l.brick.hex) ? "#FFFFFF" : "#0A0B0D";
      expect(l.brick.label, l.id).toBe(want);
    }
  });
});

describe("copy for the tray, tooltip and set box", () => {
  it("keeps short <= 42, tag <= 28, step <= 28 and verb <= 10 chars", () => {
    for (const l of LEGOS) {
      expect(l.short.length, l.id).toBeLessThanOrEqual(42);
      expect(l.tag.length, l.id).toBeLessThanOrEqual(28);
      expect(l.step.length, l.id).toBeLessThanOrEqual(28);
      expect(l.verb.length, l.id).toBeLessThanOrEqual(10);
      expect(l.blurb).toBe(l.short);
      for (const s of [l.what, l.example, l.role, l.build, l.adj, l.noun, l.does]) expect(s.length, l.id).toBeGreaterThan(0);
    }
  });

  it("links well-formed docs from docs.base.org or github.com/base", () => {
    const urls = Object.values(DOCS).map((d) => d.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const u of urls) expect(u).toMatch(/^https:\/\/(docs\.base\.org\/[a-z0-9/_.-]+|github\.com\/base\/[a-z0-9_.-]+)$/);
    for (const l of LEGOS) {
      expect(l.docs.length, l.id).toBeGreaterThan(0);
      expect(l.links).toEqual(l.docs.map((d) => DOCS[d]));
    }
  });

  it("glossary explains B20 and x402 plainly", () => {
    expect(GLOSSARY.map((g) => g.term)).toEqual(expect.arrayContaining(["B20", "x402"]));
  });
});

describe("statuses", () => {
  it("uses the exact Denim line for 200ms blocks and BaseTime, and the short one as their note", () => {
    expect(DENIM_STATUS).toBe("Live on Base Sepolia since Oct 21, 2026; mainnet targeting November 2026");
    expect(DENIM_SHORT).toBe(DENIM_STATUS.replace(" since Oct 21, 2026", ""));
    for (const id of ["speed", "basetime"] as const) {
      expect(BY_ID[id].status).toEqual({ kind: "testnet", label: DENIM_STATUS });
      expect(BY_ID[id].note).toBe(DENIM_SHORT);
    }
    expect(LEGOS.filter((l) => l.note).map((l) => l.id)).toEqual(["speed", "basetime"]);
  });

  it("marks Base Transactions bricks as announced and Base Ledgers as early access", () => {
    for (const id of ["batch-calls", "sponsored-gas"] as const) {
      expect(BY_ID[id].status).toEqual({ kind: "announced", label: "Announced with Everest; dates to be announced" });
    }
    expect(BY_ID["private-ledgers"].status.label).toBe("Early access: request access");
    expect(BY_ID.vibenet.statusKind).toBe("testnet");
    expect(BY_ID.flashblocks.status.label).toMatch(/replaced by 200ms blocks with Denim/);
  });

  it("splits Refunds and Payouts into two bricks", () => {
    expect(BY_ID.refunds.name).toBe("Refunds");
    expect(BY_ID.payouts.name).toBe("Payouts");
    expect(BY_ID.refunds.role + BY_ID.refunds.build).not.toMatch(/payout/i);
  });

  it("never claims 200ms blocks, BaseTime or Denim are on mainnet", () => {
    const re = /(200ms|Denim|BaseTime)[^.;\n]*\b(live|is) on mainnet\b/i;
    expect(allContentText()).not.toMatch(re);
    for (const ids of SAMPLE) expect(generate(ids)!.prompt, ids.join(",")).not.toMatch(re);
  });

  it("says yield is variable wherever earn is pitched", () => {
    expect(BY_ID.financing.what).toMatch(/yield is variable, not guaranteed/i);
    for (const c of COMBOS) {
      if (/\bearn\b/i.test(c.pitch) && c.ids.includes("financing")) {
        expect(c.pitch + " " + Object.values(c.why ?? {}).join(" "), c.name).toMatch(/yield is variable, not guaranteed/i);
      }
    }
  });
});

describe("generate", () => {
  it("gives every one of 2000 random 2-4 Lego picks a name, pitch, steps and an honest prompt", () => {
    for (const ids of SAMPLE) {
      const r = generate(ids);
      const tag = ids.join(",");
      expect(r, tag).not.toBeNull();
      expect(r!.name.length, tag).toBeGreaterThan(0);
      expect(r!.name.length, tag).toBeLessThanOrEqual(48);
      expect(r!.pitch, tag).toMatch(/\.$/);
      expect(r!.steps.map((s) => s.lego.id).sort(), tag).toEqual(ids.slice().sort());
      expect(r!.ids, tag).toEqual(flowOrder(ids));
      const p = r!.prompt;
      for (const d of r!.docs) expect(p, tag).toContain(d.url);
      for (const s of r!.steps) for (const d of s.lego.links) expect(p, tag).toContain(d.url);
      for (const s of [RES.mcp, RES.ai, RES.vibenet, "Base Sepolia", "Vibenet"]) expect(p, tag).toContain(s);
      for (const s of r!.steps) {
        if (s.lego.id === "speed" || s.lego.id === "basetime") expect(p, tag).toContain(DENIM_STATUS);
        else expect(p, tag).toContain(`${s.lego.name}: ${s.lego.status.label}.`);
      }
      if (r!.steps.some((s) => s.lego.statusKind === "announced")) expect(p, tag).toMatch(/announced but not released/);
      if (ids.includes("financing")) expect(p, tag).toContain("yield is variable, not guaranteed");
      if (ids.includes("stocks")) expect(p, tag).toContain("outside the US only");
      if (ids.includes("private-ledgers")) expect(p, tag).toContain("request access");
      const text = textOf(r!);
      for (const re of BANNED) expect(text, `${tag} ${re}`).not.toMatch(re);
    }
  });

  it("is deterministic and order-independent", () => {
    for (const ids of SAMPLE.slice(0, 200)) {
      const a = generate(ids)!;
      const b = generate(ids.slice().reverse())!;
      expect(b).toEqual(a);
    }
  });

  it("returns null for fewer than 2 or more than 4 valid Legos, and ignores unknown or duplicate ids", () => {
    expect(generate([])).toBeNull();
    expect(generate(["b20"])).toBeNull();
    expect(generate(["b20", "b20"])).toBeNull();
    expect(generate(["b20", "nope"])).toBeNull();
    expect(generate(["b20", "payments", "speed", "memos", "swaps"])).toBeNull();
    expect(generate(["b20", "payments", "nope"])!.ids).toEqual(flowOrder(["b20", "payments"]));
    expect(cleanIds(["denim", "b20", "speed"])).toEqual(["speed", "b20"]);
  });

  it("uses curated names and why overrides", () => {
    const r = generate(["financing", "payments", "b20", "verify"])!;
    expect(r.curated).toBe(true);
    expect(r.name).toBe("Neobank");
    expect(r.recipe).toBe("Neobank");
    expect(r.steps.find((s) => s.lego.id === "financing")!.why).toMatch(/variable, not guaranteed/);
  });

  it("builds fallback names from fragments without repeating a word", () => {
    for (const ids of SAMPLE) {
      const r = generate(ids)!;
      if (r.curated) continue;
      const w = r.name.toLowerCase().split(/[\s-]+/);
      expect(new Set(w).size, r.name).toBe(w.length);
    }
  });

  it("surprise picks a curated combo different from the board", () => {
    const cur = ["b20", "payments"];
    for (let i = 0; i < 50; i++) {
      const ids = surprise(cur, () => i / 50);
      expect(COMBO_BY_KEY.has(keyOf(ids))).toBe(true);
      expect(keyOf(ids)).not.toBe(keyOf(cur));
    }
  });
});

describe("curated combos and recipes", () => {
  it("has curated combos of 2 to 4 known Legos, all unique", () => {
    expect(COMBOS.length).toBe(56);
    expect(COMBO_BY_KEY.size).toBe(COMBOS.length);
    for (const c of COMBOS) {
      expect(c.ids.length, c.name).toBeGreaterThanOrEqual(2);
      expect(c.ids.length, c.name).toBeLessThanOrEqual(4);
      for (const id of c.ids) expect(BY_ID[id], `${c.name} ${id}`).toBeDefined();
      expect(generate(c.ids)!.name).toBe(c.name);
    }
  });

  it("has the 5 original recipes plus the 12 from recipes.json", () => {
    expect(RECIPES).toHaveLength(17);
    expect(RECIPES.slice(0, 5).map((r) => r.recipe)).toEqual([
      "Neobank",
      "Neobroker",
      "Agent-paid API",
      "Streaming payroll",
      "Stablecoin checkout",
    ]);
    for (const j of recipesJson) {
      const r = RECIPES.find((x) => x.id === j.id);
      expect(r, j.id).toBeDefined();
      expect(r!.recipe).toBe(j.name);
      expect(r!.ids).toEqual(j.bricks);
    }
    expect(new Set(RECIPES.map((r) => r.id)).size).toBe(17);
    for (const r of RECIPES) {
      expect(r.idea.length, r.id).toBeLessThanOrEqual(60);
      expect(r.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("URL hash", () => {
  it("parses old links, new ids and aliases", () => {
    expect(parseHash("#b20,payments,speed")).toEqual(["b20", "payments", "speed"]);
    expect(parseHash("#B20+Payments")).toEqual(["b20", "payments"]);
    expect(parseHash("#base-pay,x402-api,private-ledgers")).toEqual(["base-pay", "x402-api", "private-ledgers"]);
    expect(parseHash("#denim,x402,ledgers")).toEqual(["speed", "x402-api", "private-ledgers"]);
    expect(parseHash("#speed,denim")).toEqual(["speed"]);
    expect(parseHash("#nope,b20")).toEqual(["b20"]);
    expect(parseHash("#a,b20,payments,speed,memos,swaps")).toEqual(["b20", "payments", "speed", "memos"]);
    expect(parseHash("")).toEqual([]);
    expect(parseHash("#recipe=Agent-paid%20API")).toEqual(flowOrder(["payments", "speed", "builder"]));
    expect(parseHash("#recipe=safe-stablecoin-desk")).toEqual(flowOrder(["b20", "freeze", "pause", "memos"]));
    expect(parseHash("#recipe=stablecoin-ops-desk")).toEqual(flowOrder(["b20", "freeze", "pause", "memos"]));
  });

  it("round-trips every id and every alias", () => {
    for (const id of ALL_IDS) expect(parseHash(toHash([id]))).toEqual([id]);
    for (const [alias, id] of Object.entries(ID_ALIASES)) {
      expect(BY_ID[id], alias).toBeDefined();
      expect(ALL_IDS, alias).not.toContain(alias);
      expect(resolveId(alias)).toBe(id);
      expect(parseHash("#" + alias)).toEqual([id]);
    }
  });

  it("round-trips random boards and every combo", () => {
    for (const ids of SAMPLE.slice(0, 300)) expect(parseHash(toHash(ids))).toEqual(ids);
    for (const c of COMBOS) expect(parseHash(toHash(c.ids))).toEqual(c.ids);
  });

  it("round-trips every recipe through recipeHash/parseHash", () => {
    for (const r of RECIPES) {
      expect(recipeHash(r.recipe)).toBe("#recipe=" + r.id);
      expect(parseHash(recipeHash(r.recipe))).toEqual(flowOrder(r.ids));
      expect(parseHash("#recipe=" + recipeSlug(r.recipe))).toEqual(flowOrder(r.ids));
    }
  });
});

describe("fake app", () => {
  const REAL_NAMES = /\b(Coinbase|USDC|Visa|Mastercard|Stripe|PayPal|Apple|Google|Amazon|Base|Morpho|Aave|Tesla)\b/;

  function checkTile(t: ReturnType<typeof buildFakeApp>["tiles"][number], tag: string) {
    const strings = tileStrings(t);
    expect(strings.length, tag).toBeGreaterThanOrEqual(1);
    expect(strings.length, tag).toBeLessThanOrEqual(3);
    expect(t.title.length, tag).toBeLessThanOrEqual(22);
    if (t.value) expect(t.value.length, tag).toBeLessThanOrEqual(20);
    if (t.cta) expect(t.cta.length, tag).toBeLessThanOrEqual(14);
    if (t.chip) expect(t.chip.length, tag).toBeLessThanOrEqual(12);
    for (const [a, b] of t.rows ?? []) {
      expect(a.length, tag).toBeLessThanOrEqual(14);
      expect(b.length, tag).toBeLessThanOrEqual(12);
    }
    for (const s of strings) {
      expect(s, tag).not.toMatch(REAL_NAMES);
      for (const re of BANNED) expect(s, tag).not.toMatch(re);
    }
    expect(t.accent, tag).toBe(BY_ID[t.legoId].brick.id);
  }

  it("gives every brick exactly one tile", () => {
    const templates = new Set<string>();
    for (const id of ALL_IDS) {
      const app = buildFakeApp([id]);
      expect(app.tiles).toHaveLength(1);
      expect(app.tiles[0]).toMatchObject({ legoId: id, order: 0 });
      expect(app.brand.startsWith("Acme")).toBe(true);
      checkTile(app.tiles[0]!, id);
      templates.add(app.tiles[0]!.template);
    }
    expect(templates.size).toBe(15);
  });

  it("matches the spec examples for the hero tiles", () => {
    expect(BY_ID.b20.ui).toMatchObject({ template: "balance", title: "ACME USD", value: "$1,240.00" });
    expect(BY_ID.payments.ui).toMatchObject({ template: "checkout", cta: "Pay $12.00" });
    expect(BY_ID.speed.ui).toMatchObject({ template: "toast", title: "Confirmed on Sepolia", chip: "200ms" });
    expect(BY_ID.financing.ui).toMatchObject({ template: "earn", value: "Variable APY" });
    expect(BY_ID.validity.ui).toMatchObject({ template: "order", cta: "Place order" });
    expect(BY_ID["sponsored-gas"].ui.title).toBe("No gas fee");
    expect(BY_ID.verify.ui.title).toBe("Verified");
  });

  it("stacks tiles top brick first for 300 random boards, with a short brand", () => {
    for (const ids of sample(rng(300), 300, 1, 4)) {
      const app = buildFakeApp(ids);
      const tag = ids.join(",");
      expect(app.tiles, tag).toHaveLength(ids.length);
      expect(app.tiles.map((t) => t.order), tag).toEqual(ids.map((_, i) => i));
      expect(app.tiles.map((t) => t.legoId), tag).toEqual(ids.slice().reverse());
      expect(app.brand.length, tag).toBeLessThanOrEqual(18);
      expect(app.brand, tag).toMatch(/^Acme( [A-Za-z]+)?$/);
      expect(buildFakeApp(ids.slice().reverse()).brand, tag).toBe(app.brand);
      expect(buildFakeApp(ids), tag).toEqual(app);
      for (const t of app.tiles) checkTile(t, tag);
      expect(describeFakeApp(app)).toContain(app.brand);
    }
  });

  it("makes the top tile the dominant module, confirmations status rows, the rest compact", () => {
    const roles = (ids: string[]) => {
      const app = buildFakeApp(ids);
      return Object.fromEntries(app.tiles.map((t, i) => [t.legoId, tileRoles(app.tiles)[i]]));
    };
    expect(roles(["b20", "payments", "speed", "validity"])).toEqual({ validity: "hero", speed: "status", payments: "row", b20: "row" });
    expect(roles(["payments", "financing"])).toEqual({ financing: "hero", payments: "row" });
    // A status on top is the hero too (a big confirmation card).
    expect(roles(["verify", "speed"])).toEqual({ speed: "hero", verify: "row" });
    for (const ids of sample(rng(7), 300, 1, 4)) {
      const r = tileRoles(buildFakeApp(ids).tiles);
      expect(r.filter((x) => x === "hero").length, ids.join(",")).toBe(1);
      expect(r[0], ids.join(",")).toBe("hero");
    }
    expect(wireLabel(BY_ID.payments.ui)).toBe("Checkout");
    expect(wireLabel(BY_ID.b20.ui)).toBe("Balance");
  });

  it("writes every amount with a currency", () => {
    for (const l of LEGOS) {
      const strings = [l.ui.value, l.ui.cta, ...(l.ui.rows ?? []).map((r) => r[1])].filter(Boolean) as string[];
      for (const s of strings) if (/\d+\.\d{2}\b/.test(s)) expect(s, l.id).toMatch(/\$\d/);
    }
  });

  it("handles empty boards, unknown ids and aliases", () => {
    expect(buildFakeApp([])).toEqual({ brand: "Acme", tiles: [] });
    expect(buildFakeApp(["nope", "denim"]).tiles.map((t) => t.legoId)).toEqual(["speed"]);
  });
});

describe("placed bricks", () => {
  it("stacks bottom-up in plates and maps colours, labels and mixed sizes", () => {
    const bricks = toPlacedBricks(["b20", "swaps", "payouts", "memos"]);
    expect(bricks[0]).toEqual({
      id: "b20",
      legoId: "b20",
      color: "#0000FF",
      labelColor: "#FFFFFF",
      size: [4, 2],
      kind: "brick",
      level: 0,
      label: { verb: "Issue", name: "B20" },
    });
    expect(bricks.map((b) => b.size)).toEqual([
      [4, 2],
      [2, 2],
      [4, 1],
      [2, 1],
    ]);
    expect(bricks.map((b) => b.level)).toEqual([0, 3, 6, 9]);
    expect(stackFootprint(bricks)).toEqual([4, 2]);
    expect(toPlacedBricks(["denim", "nope", "speed"]).map((b) => b.id)).toEqual(["speed"]);
    expect(nextLevel(0)).toBe(0);
    expect(nextLevel(3)).toBe(9);
    expect(nextLevel(4)).toBeNull();
  });

  it("lists all 40 bricks for the sprite baker", () => {
    expect(ALL_BRICKS.map((b) => b.id)).toEqual(ALL_IDS);
    for (const b of ALL_BRICKS) {
      expect(b.size).toEqual(BY_ID[b.id].size);
      expect(b.hero).toBe(HERO_IDS.includes(b.id));
    }
  });
});

describe("copy rules", () => {
  it("has no banned words in any content", () => {
    const corpus = allContentText();
    for (const re of BANNED) expect(corpus, String(re)).not.toMatch(re);
  });

  it("keeps the risk footer text", () => {
    expect(RISK_FOOTER).toBe(
      "Crypto products and NFTs are unregulated and can be highly risky. There may be no regulatory recourse for any loss from such transactions.",
    );
  });
});
