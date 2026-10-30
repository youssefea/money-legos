import { BY_ID, COMBOS, MAX_LEGOS, MIN_LEGOS, cleanIds, generate, keyOf } from "@/lib";
import type { GenerateResult, LegoId } from "@/lib";

/** One message for the polite live region. `n` changes on every message so repeats are read again. */
export type Announcement = { text: string; n: number };

export type State = {
  /** The stack on the baseplate, bottom brick first (max 4). */
  ids: LegoId[];
  /** Recipe name when the stack came from a recipe chip or #recipe= hash. */
  recipe: string | null;
  /** The open set box, or null while the box is still closed. */
  result: GenerateResult | null;
  /** Bumps on each Generate, so the 3D stack can play its settle bounce. */
  generation: number;
  /** True for 2s after Copy prompt (the green COPIED button). */
  copied: boolean;
  /** True once the prompt was copied for the current result (step 3 checks off). */
  copiedOnce: boolean;
  /** Last brick added by the user (for the drop animation and the sound). */
  lastAdded: LegoId | null;
  /** Shown under the tray when someone tries to add a fifth brick. */
  fullHint: boolean;
  announce: Announcement;
};

export type Action =
  | { type: "toggle"; id: LegoId }
  | { type: "add"; id: LegoId }
  | { type: "remove"; id: LegoId }
  | { type: "clear" }
  | { type: "generate" }
  | { type: "load"; ids: readonly string[]; recipe?: string | null; generate: boolean; source: "recipe" | "surprise" | "link" }
  | { type: "copied" }
  | { type: "copyReset" };

export const initialState: State = {
  ids: [],
  recipe: null,
  result: null,
  generation: 0,
  copied: false,
  copiedOnce: false,
  lastAdded: null,
  fullHint: false,
  announce: { text: "", n: 0 },
};

function say(state: State, text: string): Announcement {
  return { text, n: state.announce.n + 1 };
}

function names(ids: readonly LegoId[]): string {
  return ids.map((id) => BY_ID[id].kicker).join(", ");
}

/** Number shown on the set box: the curated combo's position, or null for a custom set. */
export function setNumber(result: GenerateResult): number | null {
  if (!result.curated) return null;
  const k = keyOf(result.ids);
  const i = COMBOS.findIndex((c) => keyOf(c.ids) === k);
  return i >= 0 ? i + 1 : null;
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "toggle":
      return state.ids.includes(action.id) ? reducer(state, { type: "remove", id: action.id }) : reducer(state, { type: "add", id: action.id });

    case "add": {
      if (state.ids.includes(action.id)) return state;
      if (state.ids.length >= MAX_LEGOS) {
        return { ...state, fullHint: true, announce: say(state, "Max 4 Legos. Click a placed brick to swap.") };
      }
      const ids = [...state.ids, action.id];
      return {
        ...state,
        ids,
        recipe: null,
        result: null,
        copied: false,
        copiedOnce: false,
        lastAdded: action.id,
        fullHint: false,
        announce: say(state, `${BY_ID[action.id].kicker} added, ${ids.length} of ${MAX_LEGOS}`),
      };
    }

    case "remove": {
      if (!state.ids.includes(action.id)) return state;
      const ids = state.ids.filter((id) => id !== action.id);
      return {
        ...state,
        ids,
        recipe: null,
        result: null,
        copied: false,
        copiedOnce: false,
        lastAdded: null,
        fullHint: false,
        announce: say(state, `${BY_ID[action.id].kicker} removed, ${ids.length} of ${MAX_LEGOS}`),
      };
    }

    case "clear":
      if (!state.ids.length && !state.result) return state;
      return { ...initialState, generation: state.generation, announce: say(state, "Board cleared, 0 of 4") };

    case "generate": {
      const result = generate(state.ids);
      if (!result) {
        const need = MIN_LEGOS - state.ids.length;
        return { ...state, announce: say(state, need === 1 ? "1 more Lego needed" : "Pick 2 or more Legos") };
      }
      return {
        ...state,
        result,
        generation: state.generation + 1,
        copied: false,
        copiedOnce: false,
        fullHint: false,
        announce: say(state, `${result.name} ready. Copy prompt to use it.`),
      };
    }

    case "load": {
      // Keep the given order: recipes and surprises arrive in flow order, links in the order written.
      const ids = cleanIds(action.ids).slice(0, MAX_LEGOS);
      if (!ids.length) return state;
      const next: State = {
        ...state,
        ids,
        recipe: action.recipe ?? null,
        result: null,
        copied: false,
        copiedOnce: false,
        lastAdded: null,
        fullHint: false,
        announce: say(state, `${names(ids)} on the board, ${ids.length} of ${MAX_LEGOS}`),
      };
      return action.generate ? reducer(next, { type: "generate" }) : next;
    }

    case "copied":
      return { ...state, copied: true, copiedOnce: true, announce: say(state, "Prompt copied") };

    case "copyReset":
      return state.copied ? { ...state, copied: false } : state;
  }
}

/** Three-step rail: 1 pick (2+ Legos), 2 snap (set opened), 3 copy (prompt copied). */
export type StepState = "done" | "current" | "todo";

export function stepStates(state: Pick<State, "ids" | "result" | "copiedOnce">): [StepState, StepState, StepState] {
  const done = [state.ids.length >= MIN_LEGOS, !!state.result, !!state.result && state.copiedOnce];
  const current = done.indexOf(false);
  return done.map((d, i) => (d ? "done" : i === current ? "current" : "todo")) as [StepState, StepState, StepState];
}

/** What Generate still needs, or "" once it can run. */
export function requirementText(count: number): string {
  if (count >= MIN_LEGOS) return "";
  return count === 1 ? "1 more Lego needed" : "Pick 2 or more Legos";
}
