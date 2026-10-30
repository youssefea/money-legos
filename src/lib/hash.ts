import { RECIPES, recipeSlug } from "./combos";
import { MAX_LEGOS, flowOrder } from "./generate";
import { isLegoId } from "./legos";
import type { LegoId } from "./types";

/**
 * Reads a URL hash into Lego ids. Two formats:
 *   #b20,payments,speed   (also "+" separated; unknown ids ignored; max 4)
 *   #recipe=neobroker     (recipe slug, case and punctuation insensitive)
 */
export function parseHash(hash: string | null | undefined): LegoId[] {
  const h = String(hash ?? "").replace(/^#/, "");
  if (!h) return [];
  const m = /^recipe=(.+)$/.exec(h);
  if (m) {
    const want = recipeSlug(safeDecode(m[1]!));
    const hit = RECIPES.find((r) => recipeSlug(r.recipe) === want);
    return hit ? flowOrder(hit.ids) : [];
  }
  const out: LegoId[] = [];
  for (const raw of h.split(/[,+]/)) {
    const id = safeDecode(raw).trim().toLowerCase();
    if (isLegoId(id) && !out.includes(id) && out.length < MAX_LEGOS) out.push(id);
  }
  return out;
}

/** Hash for a board: "#b20,payments,speed" (empty string for an empty board). */
export function toHash(ids: readonly LegoId[]): string {
  return ids.length ? "#" + ids.join(",") : "";
}

/** Hash for a named recipe: "#recipe=neobroker". */
export function recipeHash(recipe: string): string {
  return "#recipe=" + recipeSlug(recipe);
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
