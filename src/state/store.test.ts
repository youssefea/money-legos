import { describe, expect, it } from "vitest";
import type { LegoId } from "@/lib";
import { initialState, isLive, reducer, resultOf, setNumber, stepStates, type Action, type State } from "./store";

const run = (...actions: Action[]): State => actions.reduce(reducer, initialState);
const add = (id: LegoId): Action => ({ type: "add", id });

describe("store", () => {
  it("adds bricks bottom first and announces the count", () => {
    const s = run(add("b20"), add("payments"));
    expect(s.ids).toEqual(["b20", "payments"]);
    expect(s.announce.text).toBe("Pay added, 2 of 4");
    expect(isLive(s)).toBe(false);
    expect(resultOf(s)).toBeNull();
  });

  it("at 4 bricks a new one replaces the oldest (bottom) brick and says so", () => {
    const s = run(add("b20"), add("payments"), add("financing"), add("validity"), add("speed"));
    expect(s.ids).toEqual(["payments", "financing", "validity", "speed"]);
    expect(s.swap).toMatchObject({ added: "speed", removed: "b20" });
    expect(s.announce.text).toBe("Board full: Speed replaced Issue, 4 of 4");
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
    expect(more.announce.text).toMatch(/^Speed added, 3 of 4\. App: /);
    // Below 2 bricks there is no app, but adding one back makes it live again without Build.
    const low = reducer(reducer(more, { type: "remove", id: "speed" }), { type: "remove", id: "payments" });
    expect(resultOf(low)).toBeNull();
    expect(resultOf(reducer(low, add("financing")))).not.toBeNull();
    expect(reducer(low, add("financing")).generation).toBe(built.generation);
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
