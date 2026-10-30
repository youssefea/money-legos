import { describe, expect, it } from "vitest";
import {
  BRICK_COLORS,
  BY_ID,
  COMBOS,
  COMBO_BY_KEY,
  DENIM_SHORT,
  DENIM_STATUS,
  GLOSSARY,
  DOCS,
  HERO_LEGOS,
  LEGOS,
  MORE_LEGOS,
  RECIPES,
  RES,
  RISK_FOOTER,
  fallback,
  flowOrder,
  generate,
  keyOf,
  nextLevel,
  parseHash,
  recipeHash,
  recipeSlug,
  surprise,
  toHash,
  toPlacedBricks,
  type GenerateResult,
  type LegoId,
} from "./index";

const ALL_IDS = LEGOS.map((l) => l.id);

function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  items.forEach((x, i) => {
    for (const rest of combinations(items.slice(i + 1), k - 1)) out.push([x, ...rest]);
  });
  return out;
}

const ALL_COMBOS = [2, 3, 4].flatMap((k) => combinations(ALL_IDS, k));

/** Every user-visible string a result can produce. */
function textOf(r: GenerateResult): string {
  return [
    r.name,
    r.pitch,
    r.prompt,
    ...r.steps.flatMap((s) => [s.why, s.lego.title, s.lego.kicker, s.lego.blurb, s.lego.what, s.lego.status, s.lego.example]),
    ...r.docs.map((d) => d.label),
  ].join("\n");
}

function allContentText(): string {
  return [
    ...LEGOS.flatMap((l) => [l.kicker, l.title, l.blurb, l.what, l.status, l.example, l.role, l.build, l.adj, l.noun, l.verb, l.short, l.tag, l.step, l.note ?? ""]),
    ...COMBOS.flatMap((c) => [c.name, c.pitch, ...Object.values(c.why ?? {})]),
    ...Object.values(DOCS).map((d) => d.label),
    RISK_FOOTER,
  ].join("\n");
}

describe("Lego registry", () => {
  it("has 13 Legos with unique ids, 5 hero first then 8 more", () => {
    expect(LEGOS).toHaveLength(13);
    expect(new Set(ALL_IDS).size).toBe(13);
    expect(LEGOS.slice(0, 5).every((l) => l.tier === "featured")).toBe(true);
    expect(HERO_LEGOS).toHaveLength(5);
    expect(MORE_LEGOS).toHaveLength(8);
  });

  it("maps the hero verbs to the right Lego names", () => {
    expect(HERO_LEGOS.map((l) => [l.kicker, l.title])).toEqual([
      ["Issue", "B20"],
      ["Pay", "Accept payments"],
      ["Grow", "Financing"],
      ["Trade", "Validity transactions"],
      ["Speed", "200ms blocks"],
    ]);
  });

  it("gives hero bricks the spec colours and labels", () => {
    expect(HERO_LEGOS.map((l) => [l.brick.id, l.brick.hex, l.brick.label])).toEqual([
      ["issue", "#0000FF", "#FFFFFF"],
      ["pay", "#3C8AFF", "#0A0B0D"],
      ["grow", "#66C800", "#0A0B0D"],
      ["trade", "#FFD12F", "#0A0B0D"],
      ["speed", "#FEA8CD", "#0A0B0D"],
    ]);
    for (const l of HERO_LEGOS) expect(l.size).toEqual([4, 2]);
  });

  it("cycles secondary bricks through the spec colours", () => {
    expect(MORE_LEGOS.map((l) => l.brick.id)).toEqual([
      "lime",
      "tan",
      "white",
      "gray-light",
      "gray",
      "gray-dark",
      "lime",
      "tan",
    ]);
    for (const l of MORE_LEGOS) expect(l.size).toEqual([2, 2]);
  });

  it("uses only brand palette colours, no red, and white labels only on blue / dark gray", () => {
    const palette = new Set(["#0000FF", "#3C8AFF", "#B8A581", "#FFD12F", "#66C800", "#B6F569", "#FEA8CD", "#FFFFFF", "#EEF0F3", "#DEE1E7", "#B1B7C3", "#717886", "#5B616E", "#32353D", "#0A0B0D"]);
    for (const c of Object.values(BRICK_COLORS)) {
      expect(palette.has(c.hex)).toBe(true);
      expect(palette.has(c.label)).toBe(true);
      expect(c.hex).not.toBe("#FC401F");
      if (c.label === "#FFFFFF") expect(["#0000FF", "#32353D", "#0A0B0D"]).toContain(c.hex);
    }
  });

  it("has unique prio and flow values", () => {
    expect(new Set(LEGOS.map((l) => l.prio)).size).toBe(LEGOS.length);
    expect(new Set(LEGOS.map((l) => l.flow)).size).toBe(LEGOS.length);
  });

  it("only references docs that exist in the registry, all https", () => {
    for (const l of LEGOS) {
      expect(l.docs.length).toBeGreaterThan(0);
      for (const d of l.docs) {
        expect(DOCS[d], `${l.id} -> ${d}`).toBeDefined();
      }
    }
    for (const d of Object.values(DOCS)) expect(d.url).toMatch(/^https:\/\/(docs\.base\.org|github\.com\/base)\//);
    for (const u of Object.values(RES)) expect(u).toMatch(/^https:\/\//);
  });
});

describe("short copy for the set box and tray", () => {
  it("every Lego has a one-line short (<= 60 chars), a tray tag (<= 20) and a build step (<= 28)", () => {
    for (const l of LEGOS) {
      expect(l.short.length, l.id).toBeGreaterThan(8);
      expect(l.short.length, `${l.id}: ${l.short}`).toBeLessThanOrEqual(60);
      expect(l.tag.length, `${l.id}: ${l.tag}`).toBeLessThanOrEqual(20);
      expect(l.step.length, `${l.id}: ${l.step}`).toBeLessThanOrEqual(28);
      expect(l.short).toMatch(/\.$/);
    }
  });

  it("only Speed carries a status note, and it is the short Denim line", () => {
    expect(BY_ID.speed.note).toBe(DENIM_SHORT);
    for (const l of LEGOS) if (l.id !== "speed") expect(l.note).toBeUndefined();
  });

  it("glossary explains B20 and x402 plainly", () => {
    expect(GLOSSARY.map((g) => g.term)).toEqual(["B20", "x402"]);
    for (const g of GLOSSARY) expect(g.gloss.length).toBeLessThanOrEqual(32);
  });
});

describe("Denim / 200ms wording", () => {
  it("the short Denim line says the same thing as the full one, minus the date", () => {
    expect(DENIM_SHORT).toBe("Live on Base Sepolia; mainnet targeting November 2026");
    expect(DENIM_STATUS.startsWith("Live on Base Sepolia")).toBe(true);
    expect(DENIM_STATUS.endsWith("; mainnet targeting November 2026")).toBe(true);
  });

  it("always uses the exact Denim status line", () => {
    expect(DENIM_STATUS).toBe("Live on Base Sepolia since Oct 21, 2026; mainnet targeting November 2026");
    const speed = BY_ID.speed;
    expect(speed.status).toBe(DENIM_STATUS);
    expect(speed.statusKind).toBe("testnet");
    expect(speed.what).toContain(DENIM_STATUS);
    expect(speed.role).toContain(DENIM_STATUS);
    expect(speed.build).toContain(DENIM_STATUS);
  });

  it("puts the Denim status in every prompt and every speed step that uses 200ms blocks", () => {
    for (const ids of ALL_COMBOS.filter((c) => c.includes("speed"))) {
      const r = generate(ids)!;
      expect(r.prompt).toContain(DENIM_STATUS);
      const step = r.steps.find((s) => s.lego.id === "speed")!;
      expect(step.why).toContain(DENIM_STATUS);
    }
  });

  it("never claims 200ms blocks or Denim are on mainnet", () => {
    const text = allContentText();
    expect(text).not.toMatch(/(200ms|denim)[^.\n]{0,60}live on (base )?mainnet/i);
    expect(text).not.toMatch(/live on (base )?mainnet[^.\n]{0,60}(200ms|denim)/i);
  });
});

describe("generate", () => {
  it("covers all 1079 combos of 2 to 4 Legos with a name, pitch, steps and prompt", () => {
    expect(ALL_COMBOS).toHaveLength(1079);
    for (const ids of ALL_COMBOS) {
      const r = generate(ids);
      expect(r, ids.join(",")).not.toBeNull();
      const res = r!;
      expect(res.name.trim().length).toBeGreaterThan(2);
      expect(res.pitch.trim()).toMatch(/[.]$/);
      expect(res.steps).toHaveLength(ids.length);
      expect(res.ids.slice().sort()).toEqual(ids.slice().sort());
      expect(res.prompt).toContain(`"${res.name}"`);
      expect(res.prompt).toContain(res.pitch);
      for (const s of res.steps) {
        expect(s.why.length).toBeGreaterThan(0);
        expect(s.docs.length).toBeGreaterThan(0);
        expect(res.prompt).toContain(s.lego.build);
      }
      if (ids.includes("financing")) expect(res.prompt).toContain("yield is variable, not guaranteed");
      if (ids.includes("stocks")) expect(res.prompt).toContain("outside the US");
    }
  });

  it("is deterministic and order-independent", () => {
    for (const ids of ALL_COMBOS.slice(0, 200)) {
      const a = generate(ids)!;
      const b = generate(ids.slice().reverse())!;
      expect(b).toEqual(a);
    }
  });

  it("returns null for fewer than 2 or more than 4 valid Legos, and ignores unknown or duplicate ids", () => {
    expect(generate([])).toBeNull();
    expect(generate(null)).toBeNull();
    expect(generate(["b20"])).toBeNull();
    expect(generate(["b20", "b20"])).toBeNull();
    expect(generate(["b20", "nope"])).toBeNull();
    expect(generate(["b20", "payments", "speed", "validity", "financing"])).toBeNull();
    expect(generate(["b20", "payments", "nope"])!.ids).toEqual(["b20", "payments"]);
  });

  it("uses curated names, flow order and why overrides", () => {
    const r = generate(["speed", "payments", "b20"])!;
    expect(r.curated).toBe(true);
    expect(r.name).toBe("Real-time stablecoin payments");
    expect(r.ids).toEqual(["b20", "payments", "speed"]);
    const nb = generate(["financing", "payments", "b20", "verify"])!;
    expect(nb.name).toBe("Neobank");
    expect(nb.recipe).toBe("Neobank");
    expect(nb.ids).toEqual(["verify", "b20", "payments", "financing"]);
    expect(nb.steps[1]!.why).toBe(COMBOS[0]!.why!.b20);
    expect(nb.steps[0]!.why).toBe(BY_ID.verify.role);
  });

  it("falls back to a generated name and pitch for uncurated combos", () => {
    const ids: LegoId[] = ["verify", "builder"];
    expect(COMBO_BY_KEY.has(keyOf(ids))).toBe(false);
    const r = generate(ids)!;
    expect(r.curated).toBe(false);
    expect(r.name).toBe("Attributed member portal");
    expect(r.pitch).toBe("An app that gates steps to verified users and attributes activity with Builder Codes.");
    expect(fallback(["payments", "verify", "speed"]).name).toBe("Instant verified checkout");
    expect(fallback(["payments", "speed"]).name).toBe("Instant checkout");
  });

  it("dedupes docs across steps", () => {
    const r = generate(["payments", "escrow", "refunds"])!;
    const urls = r.docs.map((d) => d.url);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls).toEqual([DOCS.pay.url, DOCS.cpp.url]);
  });

  it("orders by flow", () => {
    expect(flowOrder(["speed", "verify", "payments"])).toEqual(["verify", "payments", "speed"]);
  });
});

describe("curated combos and recipes", () => {
  it("has 44 curated combos and 5 recipes, all 2 to 4 known Legos", () => {
    expect(COMBOS).toHaveLength(44);
    expect(COMBO_BY_KEY.size).toBe(COMBOS.length);
    expect(RECIPES.map((r) => r.recipe)).toEqual([
      "Neobank",
      "Neobroker",
      "Agent-paid API",
      "Streaming payroll",
      "Stablecoin checkout",
    ]);
    for (const c of COMBOS) {
      expect(c.ids.length).toBeGreaterThanOrEqual(2);
      expect(c.ids.length).toBeLessThanOrEqual(4);
      for (const id of Object.keys(c.why ?? {})) expect(c.ids).toContain(id);
    }
  });

  it("surprise picks a curated combo different from the board", () => {
    const keys = new Set(COMBOS.map((c) => keyOf(c.ids)));
    for (let i = 0; i < 100; i++) {
      const rand = () => i / 100;
      const pick = surprise(["b20", "payments"], rand);
      expect(keys.has(keyOf(pick))).toBe(true);
      expect(keyOf(pick)).not.toBe(keyOf(["b20", "payments"]));
      expect(pick).toEqual(flowOrder(pick));
    }
    expect(surprise([], () => 0.999999)).toHaveLength(COMBOS[COMBOS.length - 1]!.ids.length);
  });
});

describe("URL hash", () => {
  it("parses id lists and recipes", () => {
    expect(parseHash("#b20,payments,speed")).toEqual(["b20", "payments", "speed"]);
    expect(parseHash("b20+Payments")).toEqual(["b20", "payments"]);
    expect(parseHash("#b20,nope,b20,%20speed")).toEqual(["b20", "speed"]);
    expect(parseHash("#b20,payments,speed,validity,financing")).toHaveLength(4);
    expect(parseHash("#recipe=neobroker")).toEqual(["stocks", "swaps", "validity", "speed"]);
    expect(parseHash("#recipe=Agent-paid%20API")).toEqual(["payments", "builder", "speed"]);
    expect(parseHash("#recipe=unknown")).toEqual([]);
    expect(parseHash("")).toEqual([]);
    expect(parseHash(null)).toEqual([]);
    expect(parseHash("#%E0%A4%A")).toEqual([]);
  });

  it("round-trips every combo through toHash/parseHash", () => {
    for (const ids of ALL_COMBOS) {
      const r = generate(ids)!;
      const hash = toHash(r.ids);
      expect(hash).toBe("#" + r.ids.join(","));
      expect(parseHash(hash)).toEqual(r.ids);
      expect(generate(parseHash(hash))).toEqual(r);
    }
    expect(toHash([])).toBe("");
  });

  it("round-trips every recipe through recipeHash/parseHash", () => {
    expect(recipeHash("Neobroker")).toBe("#recipe=neobroker");
    expect(recipeSlug("Agent-paid API")).toBe("agent-paid-api");
    for (const r of RECIPES) {
      expect(parseHash(recipeHash(r.recipe))).toEqual(flowOrder(r.ids));
      expect(generate(parseHash(recipeHash(r.recipe)))!.name).toBe(r.name);
    }
  });
});

describe("copy rules", () => {
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
    /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
  ];

  it("has no banned words in any content or any generated result", () => {
    const corpus = allContentText();
    for (const re of BANNED) expect(corpus, String(re)).not.toMatch(re);
    for (const ids of ALL_COMBOS) {
      const t = textOf(generate(ids)!);
      for (const re of BANNED) expect(t, `${ids.join(",")} ${re}`).not.toMatch(re);
    }
  });

  it("says yield is variable wherever earn or yield is pitched", () => {
    for (const c of COMBOS) {
      if (/\bearn\b/i.test(c.pitch) && c.ids.includes("financing")) {
        expect(c.pitch + " " + Object.values(c.why ?? {}).join(" "), c.name).toMatch(
          /yield is variable, not guaranteed/i,
        );
      }
    }
    expect(BY_ID.financing.what).toContain("Yield is variable, not guaranteed.");
  });

  it("keeps the risk footer text", () => {
    expect(RISK_FOOTER).toBe(
      "Crypto products and NFTs are unregulated and can be highly risky. There may be no regulatory recourse for any loss from such transactions.",
    );
  });
});

describe("placed bricks", () => {
  it("stacks bottom-up in plates and maps colours and labels", () => {
    const bricks = toPlacedBricks(["b20", "swaps"]);
    expect(bricks).toEqual([
      {
        id: "b20",
        legoId: "b20",
        color: "#0000FF",
        labelColor: "#FFFFFF",
        size: [4, 2],
        kind: "brick",
        level: 0,
        label: { verb: "Issue", name: "B20" },
      },
      {
        id: "swaps",
        legoId: "swaps",
        color: "#B6F569",
        labelColor: "#0A0B0D",
        size: [2, 2],
        kind: "brick",
        level: 3,
        label: { verb: "Swap", name: "Swaps" },
      },
    ]);
    expect(nextLevel(0)).toBe(0);
    expect(nextLevel(3)).toBe(9);
    expect(nextLevel(4)).toBeNull();
  });
});
