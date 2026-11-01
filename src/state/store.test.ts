import { describe, expect, it } from "vitest";
import { BY_ID, type LegoId } from "@/lib";
import { initialState, isLive, reducer, resultOf, setNumber, stepStates, type Action, type State } from "./store";

const run = (...actions: Action[]): State => actions.reduce(reducer, initialState);
const add = (id: LegoId): Action => ({ type: "add", id });

describe("store", () => {
  it("adds bricks bottom first and announces the count", () => {
    const s = run(add("b20"), add("payments"));
    expect(s.ids).toEqual(["b20", "payments"]);
    expect(s.announce.text).toBe("Payments added, 2 of 4");
    expect(isLive(s)).toBe(false);
    expect(resultOf(s)).toBeNull();
  });

  it("at 4 bricks a new one replaces the oldest (bottom) brick and says so", () => {
    const s = run(add("b20"), add("payments"), add("financing"), add("validity"), add("speed"));
    expect(s.ids).toEqual(["payments", "financing", "validity", "speed"]);
    expect(s.swap).toMatchObject({ added: "speed", removed: "b20" });
    expect(s.announce.text).toBe("Board full: Instant replaced Token, 4 of 4");
  });

  it("build needs 2 bricks, then the app is live", () => {
    const one = run(add("b20"), { type: "build" });
    expect(one.built).toBe(false);
    expect(one.announce.text).toBe("1 more brick needed");
    expect(run({ type: "build" }).announce.text).toBe("Pick 2 or more bricks");
    const s = run(add("b20"), add("payments"), { type: "build" });
    expect(s.built).toBe(true);
    expect(s.generation).toBe(1);
    expect(resultOf(s)?.name).toBeTruthy();
  });

  it("once built, every change updates the result at once (nothing goes stale)", () => {
    const built = run(add("b20"), add("payments"), { type: "build" });
    const more = reducer(built, add("speed"));
    expect(more.built).toBe(true);
    expect(resultOf(more)?.ids).toContain("speed");
    expect(more.announce.text).toMatch(/^Instant added, 3 of 4\. App: /);
    // Below 2 bricks there is no app any more: adding a second brick offers Build app again (not Replay).
    const low = reducer(reducer(more, { type: "remove", id: "speed" }), { type: "remove", id: "payments" });
    expect(resultOf(low)).toBeNull();
    expect(low.built).toBe(false);
    const again = reducer(low, add("financing"));
    expect(isLive(again)).toBe(false);
    expect(isLive(reducer(again, { type: "build" }))).toBe(true);
  });

  it("Undo reverses only the swap or removal that made the toast; any later edit drops it", () => {
    const full = run(add("b20"), add("payments"), add("speed"), add("financing"));
    const swapped = reducer(full, add("validity"));
    expect(swapped.toast?.text).toBe(`Full · swapped Token for ${BY_ID.validity.kicker}`);
    // Immediate Undo restores the board before the swap.
    expect(reducer(swapped, { type: "undo" }).ids).toEqual(full.ids);
    // swap -> remove (tray) -> Undo: the toast is gone, so Undo does nothing (Speed stays removed).
    const removed = reducer(swapped, { type: "remove", id: "speed" });
    expect(removed.toast).toBeNull();
    expect(reducer(removed, { type: "undo" }).ids).toEqual(removed.ids);
    // swap -> remove -> add -> Undo: same.
    const readded = reducer(removed, add("b20"));
    expect(readded.toast).toBeNull();
    expect(reducer(readded, { type: "undo" }).ids).toEqual(readded.ids);
    // A board removal makes its own toast; a later swap replaces it with the swap's own.
    const boardRemoved = reducer(full, { type: "remove", id: "speed", toast: true });
    expect(boardRemoved.toast?.text).toBe(`${BY_ID.speed.kicker} removed`);
    const added = reducer(boardRemoved, add("validity"));
    expect(added.toast).toBeNull();
    const twice = reducer(reducer(full, add("validity")), add("verify"));
    expect(twice.toast?.text).toBe(`Full · swapped Payments for ${BY_ID.verify.kicker}`);
    expect(reducer(twice, { type: "undo" }).ids).toEqual(reducer(full, add("validity")).ids);
    // Build, Clear, a recipe and Surprise me drop it too.
    for (const a of [{ type: "build" }, { type: "clear" }, { type: "load", ids: ["b20", "payments"], recipe: null, build: true, source: "surprise" }] as Action[]) {
      expect(reducer(swapped, a).toast).toBeNull();
    }
  });

  it("loads a recipe and builds it", () => {
    const s = run({ type: "load", ids: ["payments", "speed", "builder"], recipe: "Agent-paid API", build: true, source: "recipe" });
    const r = resultOf(s);
    expect(r?.name).toBe("Agent-paid API");
    expect(r && setNumber(r)).toBe(3);
  });

  it("a link with no known bricks clears the board", () => {
    const s = run(add("b20"), add("payments"), { type: "build" }, { type: "load", ids: ["nope"], build: true, source: "link" });
    expect(s.ids).toEqual([]);
    expect(s.built).toBe(false);
    expect(s.announce.text).toMatch(/Board cleared/);
    // A recipe with nothing valid is ignored.
    const kept = run(add("b20"), { type: "load", ids: ["nope"], build: true, source: "recipe" });
    expect(kept.ids).toEqual(["b20"]);
  });

  it("clear resets everything, including the built app", () => {
    const s = run(add("b20"), add("payments"), { type: "build" }, { type: "clear" });
    expect(s.ids).toEqual([]);
    expect(s.built).toBe(false);
    expect(s.announce.text).toBe("Board cleared, 0 of 4");
  });

  it("steps check off in order: pick, build, copy", () => {
    expect(stepStates(initialState)).toEqual(["current", "todo", "todo"]);
    const picked = run(add("b20"), add("payments"));
    expect(stepStates(picked)).toEqual(["done", "current", "todo"]);
    const g = reducer(picked, { type: "build" });
    expect(stepStates(g)).toEqual(["done", "done", "current"]);
    expect(stepStates(reducer(g, { type: "copied" }))).toEqual(["done", "done", "done"]);
  });
});
