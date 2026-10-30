import { BY_ID, COMBOS, MAX_LEGOS, MIN_LEGOS, cleanIds, generate, keyOf } from "@/lib";
import type { GenerateResult, LegoId } from "@/lib";

/** One message for the polite live region. `n` changes on every message so repeats are read again. */
export type Announcement = { text: string; n: number };

/** The last capacity swap: a fifth brick replaced the oldest one. */
export type Swap = { added: LegoId; removed: LegoId; n: number };

/**
 * A transient toast (2.8s) after a change the user may want to take back: a capacity swap
 * ("Full · swapped Issue for Hold") or a brick removed from the board. Undo restores `prev`.
 */
export type Toast = { text: string; prev: { ids: LegoId[]; built: boolean; recipe: string | null }; n: number };

/** The app name types in once per Build (or recipe / Surprise me load): `n` is that Build's generation. */
export type Typing = { n: number; name: string };

export type State = {
  /** The stack on the baseplate, bottom brick first (max 4). */
  ids: LegoId[];
  /** Recipe name when the stack came from a recipe or a #recipe= hash. */
  recipe: string | null;
  /**
   * True after the first Build app (or a recipe, Surprise me or a shared link). From then on the app
   * is live: every change to the stack updates the phone, name, prompt and Details at once.
   * Only Clear turns it off again.
   */
  built: boolean;
  /** Bumps on every Build, so the phone plays its boot and the stack its settle bounce. */
  generation: number;
  /** True for 2s after Copy prompt (the green "Copied" button). */
  copied: boolean;
  /** True once the prompt was copied for the current stack (step 3 checks off). */
  copiedOnce: boolean;
  /** Last brick added by the user (for the drop animation and the sound). */
  lastAdded: LegoId | null;
  /** The last capacity swap (a fifth brick replaced the oldest), or null. */
  swap: Swap | null;
  /** The toast on screen (with Undo), or null. */
  toast: Toast | null;
  /** Set by a Build that should type the app name in (not by a shared link); cleared once it has played. */
  typing: Typing | null;
  announce: Announcement;
};

export type LoadSource = "recipe" | "surprise" | "link";

export type Action =
  | { type: "toggle"; id: LegoId }
  | { type: "add"; id: LegoId }
  | { type: "remove"; id: LegoId; toast?: boolean }
  | { type: "clear" }
  | { type: "build"; animate?: boolean }
  | { type: "undo" }
  | { type: "toastDone"; n: number }
  | { type: "typed" }
  | { type: "load"; ids: readonly string[]; recipe?: string | null; build: boolean; source: LoadSource }
  | { type: "copied" }
  | { type: "copyReset" };

export const initialState: State = {
  ids: [],
  recipe: null,
  built: false,
  generation: 0,
  copied: false,
  copiedOnce: false,
  lastAdded: null,
  swap: null,
  toast: null,
  typing: null,
  announce: { text: "", n: 0 },
};

function toastOf(state: State, text: string): Toast {
  return { text, prev: { ids: state.ids.slice(), built: state.built, recipe: state.recipe }, n: state.announce.n + 1 }; // always increases (a toast after Undo never reuses an id)
}

function say(state: State, text: string): Announcement {
  return { text, n: state.announce.n + 1 };
}

function names(ids: readonly LegoId[]): string {
  return ids.map((id) => BY_ID[id].kicker).join(", ");
}

/** The app is live: built once and 2 to 4 bricks on the board. */
export function isLive(state: Pick<State, "built" | "ids">): boolean {
  return state.built && state.ids.length >= MIN_LEGOS;
}

/** The result for the stack while the app is live, else null. Deterministic, so it never goes stale. */
export function resultOf(state: Pick<State, "built" | "ids">): GenerateResult | null {
  return isLive(state) ? generate(state.ids) : null;
}

/** Number shown for a curated combo, or null for a custom set. */
export function setNumber(result: GenerateResult): number | null {
  if (!result.curated) return null;
  const k = keyOf(result.ids);
  const i = COMBOS.findIndex((c) => keyOf(c.ids) === k);
  return i >= 0 ? i + 1 : null;
}

/** Live-region text after the stack changed: the count, and the app's new name when it is live. */
function changed(next: State, head: string): State {
  const r = resultOf(next);
  const tail = r ? `. App: ${r.name}` : "";
  return { ...next, announce: say(next, `${head}, ${next.ids.length} of ${MAX_LEGOS}${tail}`) };
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "toggle":
      return state.ids.includes(action.id) ? reducer(state, { type: "remove", id: action.id }) : reducer(state, { type: "add", id: action.id });

    case "add": {
      if (state.ids.includes(action.id)) return state;
      const base = { ...state, recipe: null, copied: false, copiedOnce: false, lastAdded: action.id };
      if (state.ids.length >= MAX_LEGOS) {
        // Full: the new brick replaces the oldest (bottom) one.
        const removed = state.ids[0]!;
        const ids = [...state.ids.slice(1), action.id];
        const swap = { added: action.id, removed, n: (state.swap?.n ?? 0) + 1 };
        const toast = toastOf(state, `Full · swapped ${BY_ID[removed].kicker} for ${BY_ID[action.id].kicker}`);
        return changed({ ...base, ids, swap, toast }, `Board full: ${BY_ID[action.id].kicker} replaced ${BY_ID[removed].kicker}`);
      }
      return changed({ ...base, ids: [...state.ids, action.id], swap: null }, `${BY_ID[action.id].kicker} added`);
    }

    case "remove": {
      if (!state.ids.includes(action.id)) return state;
      const ids = state.ids.filter((id) => id !== action.id);
      const toast = action.toast ? toastOf(state, `${BY_ID[action.id].kicker} removed`) : state.toast;
      return changed({ ...state, ids, recipe: null, copied: false, copiedOnce: false, lastAdded: null, swap: null, toast }, `${BY_ID[action.id].kicker} removed`);
    }

    case "clear":
      if (!state.ids.length && !state.built) return state;
      return { ...initialState, generation: state.generation, announce: say(state, "Board cleared, 0 of 4") };

    case "undo": {
      const t = state.toast;
      if (!t) return state;
      const next = { ...state, ids: t.prev.ids.slice(), built: t.prev.built, recipe: t.prev.recipe, copied: false, copiedOnce: false, lastAdded: null, swap: null, toast: null };
      return changed(next, "Undone");
    }

    case "toastDone":
      return state.toast && state.toast.n === action.n ? { ...state, toast: null } : state;

    case "typed":
      return state.typing ? { ...state, typing: null } : state;

    case "build": {
      const result = generate(state.ids);
      if (!result) {
        const need = MIN_LEGOS - state.ids.length;
        return { ...state, announce: say(state, need === 1 ? "1 more brick needed" : "Pick 2 or more bricks") };
      }
      return {
        ...state,
        built: true,
        generation: state.generation + 1,
        copied: false,
        swap: null,
        toast: null,
        typing: action.animate === false ? null : { n: state.generation + 1, name: result.name },
        announce: say(state, `App built: ${result.name}. Copy prompt to use it.`),
      };
    }

    case "load": {
      // Keep the given order: recipes and surprises arrive in flow order, links in the order written.
      const ids = cleanIds(action.ids).slice(0, MAX_LEGOS);
      if (!ids.length) {
        if (action.source !== "link") return state;
        // A link with no known bricks (or an empty hash after Back): show an empty board, never the old stack.
        if (!state.ids.length && !state.built) return state;
        return { ...initialState, generation: state.generation, announce: say(state, "No bricks in this link. Board cleared, 0 of 4") };
      }
      const next: State = {
        ...state,
        ids,
        recipe: action.recipe ?? null,
        built: false,
        copied: false,
        copiedOnce: false,
        lastAdded: null,
        swap: null,
        toast: null,
        typing: null,
        announce: say(state, `${names(ids)} on the board, ${ids.length} of ${MAX_LEGOS}`),
      };
      // A shared link shows the built app at once (no boot, no typing); recipes and Surprise me play the Build.
      return action.build && ids.length >= MIN_LEGOS ? reducer(next, { type: "build", animate: action.source !== "link" }) : next;
    }

    case "copied":
      return { ...state, copied: true, copiedOnce: true, announce: say(state, "Prompt copied") };

    case "copyReset":
      return state.copied ? { ...state, copied: false } : state;
  }
}

/** Three-step rail: 1 pick (2+ bricks), 2 build (app live), 3 copy (prompt copied). */
export type StepState = "done" | "current" | "todo";

export function stepStates(state: Pick<State, "ids" | "built" | "copiedOnce">): [StepState, StepState, StepState] {
  const live = isLive(state);
  const done = [state.ids.length >= MIN_LEGOS, live, live && state.copiedOnce];
  const current = done.indexOf(false);
  return done.map((d, i) => (d ? "done" : i === current ? "current" : "todo")) as [StepState, StepState, StepState];
}
