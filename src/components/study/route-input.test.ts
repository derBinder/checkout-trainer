import { describe, expect, it } from "vitest";
import { cardById } from "@/lib/cards";
import { checkFor, type Check } from "@/lib/darts/judge";
import { initInput, inputReducer, isDoubleRest, isFull, remaining, type InputAction, type InputState } from "./route-input";

const check = (id: string) => checkFor(cardById(id)!);
const restCheck = (rest: number): Check => ({ kind: "rest", rest, best: [], good: [] });
const run = (s: InputState, ...actions: InputAction[]) => actions.reduce(inputReducer, s);
const num = (n: number): InputAction => ({ type: "number", n });

describe("initInput", () => {
  it("starts a high rest on T", () => {
    expect(initInput(check("r-121"))).toEqual({ ring: "T", darts: [], ringsBefore: [], rest: 121, max: 3 });
  });

  it("starts a rest up to 60 on S", () => {
    expect(initInput(restCheck(57)).ring).toBe("S");
  });

  it("starts a direct double-out on D", () => {
    expect(initInput(restCheck(32)).ring).toBe("D");
  });

  it("does not start 50 on D, Bull is its own key", () => {
    expect(initInput(restCheck(50)).ring).toBe("S");
  });

  it("uses the new rest and the darts left on a miss card", () => {
    expect(initInput(check("m-121-0"))).toEqual({ ring: "T", darts: [], ringsBefore: [], rest: 101, max: 2 });
  });
});

describe("inputReducer", () => {
  it("keeps the ring for the next dart", () => {
    expect(run(initInput(restCheck(121)), num(20), num(11)).darts).toEqual(["T20", "T11"]);
  });

  it("switches to D once the rest is a direct double-out", () => {
    const s = run(initInput(restCheck(121)), num(20), num(11));
    expect(remaining(s)).toBe(28);
    expect(s.ring).toBe("D");
    expect(run(initInput(restCheck(100)), num(20)).ring).toBe("D");
  });

  it("only ever switches to D, never away from the chosen ring", () => {
    const s = run(initInput(restCheck(121)), { type: "ring", ring: "S" }, num(1));
    expect(remaining(s)).toBe(120);
    expect(s.ring).toBe("S");
  });

  it("enters 25 and Bull regardless of the ring", () => {
    const s = run(initInput(restCheck(121)), { type: "bull" }, { type: "outer" });
    expect(s.darts).toEqual(["Bull", "25"]);
  });

  it("ignores further darts once full", () => {
    const full = run(initInput(restCheck(170)), num(20), num(20), { type: "bull" });
    expect(isFull(full)).toBe(true);
    expect(inputReducer(full, num(1))).toBe(full);
    expect(inputReducer(full, { type: "outer" })).toBe(full);
    expect(inputReducer(full, { type: "bull" })).toBe(full);
  });

  it("respects the darts left on a miss card", () => {
    const s = run(initInput(check("m-121-0")), num(17), { type: "bull" });
    expect(isFull(s)).toBe(true);
  });

  it("undo removes the last dart and does nothing when empty", () => {
    const empty = initInput(restCheck(121));
    expect(inputReducer(empty, { type: "undo" })).toBe(empty);
    expect(run(empty, num(20), num(11), { type: "undo" }).darts).toEqual(["T20"]);
  });

  it("does not switch to D when 50 is left", () => {
    // 110: T20 lässt 50, der Ring bleibt T für T10 · D10
    const s = run(initInput(restCheck(110)), num(20));
    expect(remaining(s)).toBe(50);
    expect(s.ring).toBe("T");
  });

  it("undo restores the ring that was set before the removed dart", () => {
    // 121: T20, versehentlich T19 → Rest 4, Ring springt auf D; Löschen → wieder T
    const s = run(initInput(restCheck(121)), num(20), num(19));
    expect(s.ring).toBe("D");
    expect(run(s, { type: "undo" }).ring).toBe("T");
    // 60: S20 → D; Nutzer wählt S, Löschen → Ring vor S20 war S
    const t = run(initInput(restCheck(60)), num(20), { type: "ring", ring: "S" }, { type: "undo" });
    expect(t.ring).toBe("S");
    // 40: Start auf D, Nutzer wählt T, T5, Löschen → T (vor T5 gewählt)
    const u = run(initInput(restCheck(40)), { type: "ring", ring: "T" }, num(5), { type: "undo" });
    expect(u.ring).toBe("T");
  });
});

describe("isDoubleRest", () => {
  it("is true for even rests from 2 to 40", () => {
    expect([2, 32, 40].map(isDoubleRest)).toEqual([true, true, true]);
  });

  it("is false otherwise, also for 50", () => {
    expect([1, 33, 42, 0, 25, 50].map(isDoubleRest)).toEqual([false, false, false, false, false, false]);
  });
});
