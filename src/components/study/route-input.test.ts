import { describe, expect, it } from "vitest";
import { cardById } from "@/lib/cards";
import { checkFor, type Check } from "@/lib/darts/judge";
import { initInput, inputReducer, isFull, remaining, type InputAction, type InputState } from "./route-input";

const check = (id: string) => checkFor(cardById(id)!);
const restCheck = (rest: number): Check => ({ kind: "rest", rest, best: [], good: [] });
const run = (s: InputState, ...actions: InputAction[]) => actions.reduce(inputReducer, s);
const num = (n: number): InputAction => ({ type: "number", n });

describe("initInput", () => {
  it("starts a high rest on T", () => {
    expect(initInput(check("r-121"))).toEqual({ ring: "T", darts: [], rest: 121, max: 3 });
  });

  it("starts a rest up to 60 on S", () => {
    expect(initInput(restCheck(57)).ring).toBe("S");
  });

  it("starts a direct double-out on D", () => {
    expect(initInput(restCheck(32)).ring).toBe("D");
  });

  it("uses the new rest and the darts left on a miss card", () => {
    expect(initInput(check("m-121-0"))).toEqual({ ring: "T", darts: [], rest: 101, max: 2 });
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

  it("re-applies the switch to D after undo", () => {
    // 60: S20 lässt 40 (D); Ring auf S, Löschen → wieder 60, Ring bleibt S
    const s = run(initInput(restCheck(60)), num(20));
    expect(s.ring).toBe("D");
    const back = run(s, { type: "ring", ring: "S" }, { type: "undo" });
    expect(back.ring).toBe("S");
    // 72: T16 lässt 24 → D; Löschen lässt 72, Ring bleibt D (nur Wechsel zu D)
    const t = run(initInput(restCheck(72)), num(16), { type: "undo" });
    expect(t.ring).toBe("D");
    // 80: S20 lässt 60, dann T1 und Löschen → 60, kein Double-Out, Ring bleibt T
    const u = run(initInput(restCheck(80)), { type: "ring", ring: "S" }, num(20), { type: "ring", ring: "T" }, num(1), { type: "undo" });
    expect(remaining(u)).toBe(60);
    expect(u.ring).toBe("T");
    // 40: Ring auf T, T5 lässt 25, Löschen → wieder 40 → D
    const v = run(initInput(restCheck(40)), { type: "ring", ring: "T" }, num(5), { type: "undo" });
    expect(v.ring).toBe("D");
  });
});
