import { describe, expect, it } from "vitest";
import { initialState, reducer, requirementText, setNumber, stepStates, type Action, type State } from "./store";

const run = (...actions: Action[]): State => actions.reduce(reducer, initialState);

describe("store", () => {
  it("adds bricks bottom first and announces the count", () => {
    const s = run({ type: "add", id: "b20" }, { type: "add", id: "payments" });
    expect(s.ids).toEqual(["b20", "payments"]);
    expect(s.announce.text).toBe("Pay added, 2 of 4");
  });

  it("caps the stack at 4 and shows the swap hint", () => {
    const s = run(
      { type: "add", id: "b20" },
      { type: "add", id: "payments" },
      { type: "add", id: "financing" },
      { type: "add", id: "validity" },
      { type: "add", id: "speed" },
    );
    expect(s.ids).toHaveLength(4);
    expect(s.fullHint).toBe(true);
    expect(s.announce.text).toBe("Max 4 Legos. Click a placed brick to swap.");
  });

  it("toggle removes a placed brick and closes the set", () => {
    const s = run({ type: "add", id: "b20" }, { type: "add", id: "payments" }, { type: "generate" }, { type: "toggle", id: "b20" });
    expect(s.ids).toEqual(["payments"]);
    expect(s.result).toBeNull();
  });

  it("generate needs 2 Legos", () => {
    expect(run({ type: "add", id: "b20" }, { type: "generate" }).result).toBeNull();
    const s = run({ type: "add", id: "b20" }, { type: "add", id: "payments" }, { type: "generate" });
    expect(s.result?.name).toBeTruthy();
    expect(s.generation).toBe(1);
  });

  it("loads a recipe and generates", () => {
    const s = run({ type: "load", ids: ["payments", "speed", "builder"], recipe: "Agent-paid API", generate: true, source: "recipe" });
    expect(s.result?.name).toBe("Agent-paid API");
    expect(s.result && setNumber(s.result)).toBe(3);
  });

  it("clear resets everything", () => {
    const s = run({ type: "add", id: "b20" }, { type: "clear" });
    expect(s.ids).toEqual([]);
    expect(s.announce.text).toBe("Board cleared, 0 of 4");
  });

  it("steps check off in order", () => {
    expect(stepStates(initialState)).toEqual(["current", "todo", "todo"]);
    const g = run({ type: "add", id: "b20" }, { type: "add", id: "payments" }, { type: "generate" });
    expect(stepStates(g)).toEqual(["done", "done", "current"]);
    expect(stepStates(reducer(g, { type: "copied" }))).toEqual(["done", "done", "done"]);
  });

  it("requirement text", () => {
    expect(requirementText(0)).toBe("Pick 2 or more Legos");
    expect(requirementText(1)).toBe("1 more Lego needed");
    expect(requirementText(2)).toBe("");
  });
});
