import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import FakePhone from "@/components/phone/FakePhone";
import { buildFakeApp, LEGOS, type LegoId } from "@/lib";
import { RECIPES } from "@/lib/combos";
import { ARCHETYPES, HOME, anchorOf, archetypeOf, describeScreen, screenModel, type Archetype } from ".";
import { AppScreen } from "@/components/phone/screens/Screens";
import { ScreenCtx } from "@/components/phone/screens/Kit";

const ALL_IDS = LEGOS.map((l) => l.id);

/** Visible copy rules for the fake app: no placeholder brands, no network or availability wording, no demo label. */
const FORBIDDEN = /\b(Acme|Sepolia|testnet|Demo|available|availability|coming soon|beta|preview|mainnet|lorem)\b/i;
const REAL_COMPANIES = /\b(Coinbase|Visa|Mastercard|Stripe|PayPal|Apple|Google|Amazon|Morpho|Aave|Tesla|Revolut|Robinhood|Monzo|Wise|Cash App)\b/;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function renderScreen(ids: readonly string[], force?: Archetype, wire = false): string {
  const m = screenModel(ids, force);
  const brand = buildFakeApp(ids).brand;
  return renderToStaticMarkup(
    createElement(ScreenCtx.Provider, { value: { inspect: null, onInspect: () => {}, order: m.order, wire } }, createElement(AppScreen, { m, brand })),
  );
}

/** Visible text of rendered markup (tags and aria attributes stripped). */
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");

const regions = (html: string) => [...html.matchAll(/data-region="([^"]+)"/g)].map((r) => r[1]);

describe("app screens", () => {
  it("every brick renders exactly one region in every archetype (alone and with others)", () => {
    for (const arch of ARCHETYPES) {
      for (const id of ALL_IDS) {
        const html = renderScreen([id], arch);
        expect(regions(html), `${id} on ${arch}`).toEqual([id]);
        // With three companions, each brick still has exactly one region.
        const others = ALL_IDS.filter((x) => x !== id);
        const r = rng(ALL_IDS.indexOf(id) * 31 + ARCHETYPES.indexOf(arch));
        const ids = [id, ...Array.from({ length: 3 }, () => others[Math.floor(r() * others.length)]!)];
        const uniq = [...new Set(ids)];
        const got = regions(renderScreen(uniq, arch));
        expect(got.slice().sort(), `${uniq.join(",")} on ${arch}`).toEqual(uniq.slice().sort());
      }
    }
  });

  it("renders 500 random 2-4 brick stacks, built and before Build, without throwing", () => {
    const r = rng(500);
    for (let n = 0; n < 500; n++) {
      const k = 2 + Math.floor(r() * 3);
      const ids: LegoId[] = [];
      while (ids.length < k) {
        const id = ALL_IDS[Math.floor(r() * ALL_IDS.length)]!;
        if (!ids.includes(id)) ids.push(id);
      }
      const tag = ids.join(",");
      const html = renderScreen(ids);
      expect(regions(html).sort(), tag).toEqual(ids.slice().sort());
      expect(() => renderScreen(ids, undefined, true), tag).not.toThrow();
      const m = screenModel(ids);
      expect(m.order.slice().sort(), tag).toEqual(ids.slice().sort());
      // Order-free: the same set always makes the same screen.
      expect(screenModel(ids.slice().reverse()), tag).toEqual(m);
    }
  });

  it("never shows forbidden copy or real company names", () => {
    for (const arch of ARCHETYPES) {
      for (const id of ALL_IDS) {
        const t = text(renderScreen([id], arch));
        expect(t, `${id} on ${arch}`).not.toMatch(FORBIDDEN);
        expect(t, `${id} on ${arch}`).not.toMatch(REAL_COMPANIES);
      }
      expect(text(renderScreen([], arch))).not.toMatch(FORBIDDEN);
    }
  });

  it("renders the FakePhone (frame, label, screen) for empty, before Build and built", () => {
    for (const [ids, phase] of [
      [[], "wire"],
      [["b20", "payments"], "wire"],
      [["b20", "payments", "speed", "financing"], "live"],
      [["validity"], "live"],
    ] as const) {
      const html = renderToStaticMarkup(createElement(FakePhone, { app: buildFakeApp(ids), phase, boot: 1 }));
      expect(html).toContain('data-testid="phone"');
      expect(regions(html).sort()).toEqual(ids.slice().sort());
      if (!ids.length) expect(html).toContain("empty");
      if (phase === "wire") expect(html).toContain("data-skel");
    }
  });

  it("picks the screen by brick priority, order-free, and names the app after it", () => {
    const pick = (ids: LegoId[]) => [archetypeOf(ids), buildFakeApp(ids).brand];
    expect(pick(["b20", "payments", "speed", "financing"])).toEqual(["neobank", "Base Neobank"]);
    expect(pick(["validity", "b20", "speed"])).toEqual(["trade", "Base Trade"]);
    expect(pick(["payments", "speed", "verify"])).toEqual(["checkout", "Base Pay"]);
    expect(pick(["payouts", "memos"])).toEqual(["payroll", "Base Payroll"]);
    expect(pick(["x402-api", "agent-spend"])).toEqual(["agent", "Base API"]);
    expect(pick(["financing"])).toEqual(["earn", "Base Earn"]);
    expect(pick(["connect-wallet", "verify"])).toEqual(["identity", "Base Wallet"]);
    expect(pick(["speed"])).toEqual(["neobank", "Base Now"]);
    expect(pick(["payments", "sponsored-gas"])).toEqual(["checkout", "Base Pay"]);
    expect(pick(["verify", "sponsored-gas"])).toEqual(["identity", "Base ID"]);
    expect(archetypeOf([])).toBe("neobank");
    expect(anchorOf([])).toBeNull();
    const want: Record<string, Archetype> = {
      neobank: "neobank",
      neobroker: "trade",
      "agent-paid-api": "agent",
      "stablecoin-checkout": "checkout",
      "creator-payouts": "payroll",
      "pay-a-name": "checkout",
      "members-only-fund": "trade",
      "agent-data-market": "agent",
      "metered-ai-api": "agent",
      "private-payroll": "payroll",
      "escrow-marketplace": "checkout",
      "borrow-to-pay": "checkout",
      "gas-free-onboarding": "identity",
      "live-merchant-screen": "checkout",
      "safe-stablecoin-desk": "neobank",
    };
    for (const r of RECIPES) {
      if (want[r.id]) expect(archetypeOf(r.ids), r.id).toBe(want[r.id]);
      expect(archetypeOf(r.ids.slice().reverse()), r.id).toBe(archetypeOf(r.ids));
    }
    for (const id of ALL_IDS) expect(HOME[id], id).toBeDefined();
  });

  it("lays regions out in the screen's natural order, not stack order", () => {
    const m = screenModel(["financing", "speed", "payments", "b20"]);
    expect(m.order).toEqual(["b20", "payments", "financing", "speed"]);
    expect(screenModel(["b20", "payments", "speed", "financing"]).order).toEqual(m.order);
    const t = screenModel(["speed", "b20", "validity"]);
    expect(t.order).toEqual(["speed", "validity", "b20"]);
    const c = screenModel(["speed", "base-pay", "basenames"]);
    expect(c.slot).toMatchObject({ merchant: "basenames", footnote: "speed", cta: "base-pay" });
  });

  it("keeps the numbers consistent", () => {
    const nb = text(renderScreen(["b20", "payments", "speed", "financing"]));
    expect(nb).toContain("$1,240.00".replace(".00", ""));
    expect(nb).toContain("+$0.03 today"); // 4.12% of $300.00 a day
    const tr = text(renderScreen(["validity", "b20"]));
    expect(tr).toContain("$1,200.00"); // 500 x $2.40
    expect(tr).toContain("$2,977.80"); // 1,200 x $2.4815
    const co = text(renderScreen(["payments"]));
    expect(co).toContain("$4.50");
    expect(co).toContain("$7.50");
    expect(co).toContain("Pay $12.00");
  });

  it("summarises the screen for screen readers", () => {
    const m = screenModel(["b20", "payments", "speed", "financing"]);
    expect(describeScreen("Base Neobank", m)).toBe("Base Neobank app: balance, Send, Request and Pay, savings at a variable rate, Corner Coffee paid in 0.2s");
    expect(describeScreen("Base", screenModel([]))).toBe("Base app, empty");
  });
});
