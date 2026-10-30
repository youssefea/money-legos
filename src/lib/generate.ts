import { COMBOS, COMBO_BY_KEY, keyOf } from "./combos";
import { BY_ID, resolveId } from "./legos";
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

function words(s: string): string[] {
  return s.toLowerCase().split(/[\s-]+/);
}

/**
 * Fallback name and pitch: the highest-priority Lego is the noun, the next one that does not repeat
 * a word of the noun lends an adjective, and 200ms blocks add "instant".
 */
export function fallback(ids: readonly LegoId[]): { name: string; pitch: string; why: Partial<Record<LegoId, string>> } {
  const byPrio = ids.slice().sort((a, b) => BY_ID[a].prio - BY_ID[b].prio);
  const anchor = BY_ID[byPrio[0]!];
  const nounWords = words(anchor.noun);
  const mod = byPrio
    .slice(1)
    .map((id) => BY_ID[id])
    .find((l) => !words(l.adj).some((w) => nounWords.includes(w)));
  const parts: string[] = [];
  if (mod) parts.push(mod.adj);
  if (anchor.id !== "speed" && mod?.id !== "speed" && ids.includes("speed") && !parts.includes(BY_ID.speed.adj)) {
    parts.unshift(BY_ID.speed.adj);
  }
  const name = capFirst(parts.concat([anchor.noun]).join(" "));
  const verbs = flowOrder(ids).map((id) => BY_ID[id].does);
  const pitch = `An app that ${joinList(verbs)}.`;
  return { name, pitch, why: {} };
}

function dedupeDocs(ids: readonly LegoId[]): DocLink[] {
  const seen = new Set<string>();
  const out: DocLink[] = [];
  for (const id of ids) {
    for (const d of BY_ID[id].links) {
      if (!seen.has(d.url)) {
        seen.add(d.url);
        out.push(d);
      }
    }
  }
  return out;
}

/** Keeps known ids (and aliases, mapped to their id), drops duplicates, preserves order. */
export function cleanIds(ids: readonly string[] | null | undefined): LegoId[] {
  const clean: LegoId[] = [];
  for (const raw of ids ?? []) {
    const id = resolveId(raw);
    if (id && !clean.includes(id)) clean.push(id);
  }
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
    return { lego, why: why[id] ?? lego.role, docs: lego.links };
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
