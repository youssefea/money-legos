import { COMBOS, COMBO_BY_KEY, keyOf } from "./combos";
import { BY_ID, DOCS, isLegoId } from "./legos";
import { buildPrompt } from "./prompt";
import type { DocLink, GenerateResult, LegoId } from "./types";

export const MIN_LEGOS = 2;
export const MAX_LEGOS = 4;

function capFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
}

/** Sort ids by where they sit in a money flow (verify first, attribution and speed last). */
export function flowOrder(ids: readonly LegoId[]): LegoId[] {
  return ids.slice().sort((a, b) => BY_ID[a].flow - BY_ID[b].flow);
}

/** Fallback name and pitch: the highest-priority Lego is the noun, the next one lends an adjective. */
export function fallback(ids: readonly LegoId[]): { name: string; pitch: string; why: Partial<Record<LegoId, string>> } {
  const byPrio = ids.slice().sort((a, b) => BY_ID[a].prio - BY_ID[b].prio);
  const anchor = BY_ID[byPrio[0]!];
  const mods = byPrio.slice(1);
  const parts: string[] = [];
  if (mods.length) parts.push(BY_ID[mods[0]!].adj);
  if (anchor.id !== "speed" && mods[0] !== "speed" && ids.includes("speed")) parts.unshift(BY_ID.speed.adj);
  const name = capFirst(parts.concat([anchor.noun]).join(" "));
  const verbs = flowOrder(ids).map((id) => BY_ID[id].verb);
  const pitch = `An app that ${joinList(verbs)}.`;
  return { name, pitch, why: {} };
}

function dedupeDocs(ids: readonly LegoId[]): DocLink[] {
  const seen = new Set<string>();
  const out: DocLink[] = [];
  for (const id of ids) {
    for (const d of BY_ID[id].docs) {
      if (!seen.has(d)) {
        seen.add(d);
        out.push(DOCS[d]);
      }
    }
  }
  return out;
}

/** Keeps known ids, drops duplicates, preserves order. */
export function cleanIds(ids: readonly string[] | null | undefined): LegoId[] {
  const clean: LegoId[] = [];
  for (const id of ids ?? []) if (isLegoId(id) && !clean.includes(id)) clean.push(id);
  return clean;
}

/** Full result for 2–4 valid Lego ids, or null. Deterministic. */
export function generate(ids: readonly string[] | null | undefined): GenerateResult | null {
  const clean = cleanIds(ids);
  if (clean.length < MIN_LEGOS || clean.length > MAX_LEGOS) return null;
  const curated = COMBO_BY_KEY.get(keyOf(clean));
  const base = curated ?? fallback(clean);
  const order = flowOrder(curated ? curated.ids : clean);
  const why = base.why ?? {};
  const steps = order.map((id) => {
    const lego = BY_ID[id];
    return { lego, why: why[id] ?? lego.role, docs: lego.docs.map((d) => DOCS[d]) };
  });
  const r: Omit<GenerateResult, "prompt"> = {
    ids: order,
    name: base.name,
    pitch: base.pitch,
    curated: !!curated,
    ...(curated?.recipe ? { recipe: curated.recipe } : {}),
    steps,
    docs: dedupeDocs(order),
  };
  return { ...r, prompt: buildPrompt(r) };
}

/** rand returns [0, 1). Picks a curated combo that differs from the current board. */
export function surprise(currentIds: readonly string[] | null | undefined, rand: () => number = Math.random): LegoId[] {
  const cur = keyOf(currentIds ?? []);
  const pool = COMBOS.filter((c) => keyOf(c.ids) !== cur);
  const pick = pool[Math.floor(rand() * pool.length) % pool.length]!;
  return flowOrder(pick.ids);
}
