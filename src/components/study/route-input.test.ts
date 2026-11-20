import { describe, expect, it } from "vitest";
import { cardById } from "@/lib/cards";
import { checkFor, type Check } from "@/lib/darts/judge";
import { initInput, inputReducer, isFull, type InputAction, type InputState } from "./route-input";

const check = (id: string) => checkFor(cardById(id)!);
const restCheck = (rest: number): Check => ({ kind: "rest", rest, best: [], good: [] });
const run = (s: InputState, ...actions: InputAction[]) => actions.reduce(inputReducer, s);
const num = (n: number): InputAction => ({ type: "number", n });
const T: InputAction = { type: "ring", ring: "T" };

describe("initInput", () => {
  it("always starts on S", () => {
    expect(initInput(check("r-121"))).toEqual({ ring: "S", darts: [], ringsBefore: [], rest: 121, max: 3 });
    expect([57, 32, 50, 170].map((rest) => initInput(restCheck(rest)).ring)).toEqual(["S", "S", "S", "S"]);
  });

  it("uses the new rest and the darts left on a miss card, also starting on S", () => {
    expect(initInput(check("m-121-0"))).toEqual({ ring: "S", darts: [], ringsBefore: [], rest: 101, max: 2 });
  });
});

describe("inputReducer", () => {
  it("returns to S after every dart", () => {
    const s = run(initInput(restCheck(121)), T, num(20));
    expect(s.ring).toBe("S");
    expect(run(s, num(11)).darts).toEqual(["T20", "S11"]);
  });

  it("stays on S when the rest is a direct double-out", () => {
    // 33: S1 lässt 32, 100: T20 lässt 40, 110: T20 lässt 50
    expect(run(initInput(restCheck(33)), num(1)).ring).toBe("S");
    expect(run(initInput(restCheck(100)), T, num(20)).ring).toBe("S");
    const s = run(initInput(restCheck(110)), T, num(20));
    expect(s.darts).toEqual(["T20"]);
    expect(s.ring).toBe("S");
  });

  it("returns to S after 25 and Bull too", () => {
    expect(run(initInput(restCheck(121)), T, { type: "outer" }).ring).toBe("S");
    expect(run(initInput(restCheck(121)), { type: "ring", ring: "D" }, { type: "bull" }).ring).toBe("S");
  });

  it("enters 25 and Bull regardless of the ring", () => {
    const s = run(initInput(restCheck(121)), { type: "bull" }, { type: "outer" });
    expect(s.darts).toEqual(["Bull", "25"]);
  });

  it("ignores further darts once full", () => {
    const full = run(initInput(restCheck(170)), T, num(20), num(20), { type: "bull" });
    expect(isFull(full)).toBe(true);
    expect(inputReducer(full, num(1))).toBe(full);
    expect(inputReducer(full, { type: "outer" })).toBe(full);
    expect(inputReducer(full, { type: "bull" })).toBe(full);
  });

  it("respects the darts left on a miss card", () => {
    const s = run(initInput(check("m-121-0")), T, num(17), { type: "bull" });
    expect(isFull(s)).toBe(true);
  });

  it("undo removes the last dart and does nothing when empty", () => {
    const empty = initInput(restCheck(121));
    expect(inputReducer(empty, { type: "undo" })).toBe(empty);
    expect(run(empty, T, num(20), num(11), { type: "undo" }).darts).toEqual(["T20"]);
  });

  it("undo restores the ring that was set before the removed dart", () => {
    // 121: T20, versehentlich T19 → Ring steht auf S; Löschen → wieder T
    const s = run(initInput(restCheck(121)), T, num(20), T, num(19));
    expect(s.darts).toEqual(["T20", "T19"]);
    expect(s.ring).toBe("S");
    expect(run(s, { type: "undo" }).ring).toBe("T");
    // 60: S20, Nutzer wählt T, Löschen → Ring vor S20 war S
    const t = run(initInput(restCheck(60)), num(20), T, { type: "undo" });
    expect(t.ring).toBe("S");
    // 40: Nutzer wählt T, T5, Löschen → T (vor T5 gewählt)
    const u = run(initInput(restCheck(40)), T, num(5), { type: "undo" });
    expect(u.ring).toBe("T");
    // Bull mit gewähltem D, Löschen → D
    const v = run(initInput(restCheck(121)), { type: "ring", ring: "D" }, { type: "bull" }, { type: "undo" });
    expect(v.ring).toBe("D");
  });
});
