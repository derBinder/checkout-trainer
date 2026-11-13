import { describe, expect, it } from "vitest";
import { TAP_GUARD_MS } from "@/components/study/study-state";
import type { MathTask } from "@/lib/practice/math";
import { initMath, mathReducer, type MathAction, type MathState } from "./math-state";

const TASKS: MathTask[] = [
  { start: 211, throws: ["T20", "T19", "S5"], rest: 89 },
  { start: 219, throws: ["T20", "S20", "S5"], rest: 134 },
];

const run = (s: MathState, ...actions: MathAction[]) => actions.reduce(mathReducer, s);
const digit = (d: number): MathAction => ({ type: "digit", d });

describe("mathReducer", () => {
  it("beginnt bei der ersten Aufgabe mit leerer Eingabe", () => {
    expect(initMath(TASKS)).toMatchObject({ index: 0, input: "", revealed: false, correct: 0 });
  });

  it("nimmt keine führende Null und höchstens drei Ziffern an", () => {
    expect(run(initMath(TASKS), digit(0)).input).toBe("");
    expect(run(initMath(TASKS), digit(1), digit(0), digit(5), digit(7)).input).toBe("105");
  });

  it("löscht die letzte Ziffer", () => {
    expect(run(initMath(TASKS), digit(8), digit(9), { type: "delete" }).input).toBe("8");
    expect(run(initMath(TASKS), { type: "delete" }).input).toBe("");
  });

  it("prüft erst ab einer Ziffer", () => {
    const s = initMath(TASKS);
    expect(run(s, { type: "check" })).toBe(s);
  });

  it("zählt eine richtige Antwort und keine falsche", () => {
    expect(run(initMath(TASKS), digit(8), digit(9), { type: "check" })).toMatchObject({ revealed: true, correct: 1 });
    expect(run(initMath(TASKS), digit(9), digit(8), { type: "check" })).toMatchObject({ revealed: true, correct: 0 });
  });

  it("nimmt nach dem Prüfen keine Ziffern mehr an und prüft nicht doppelt", () => {
    const s = run(initMath(TASKS), digit(8), digit(9), { type: "check" });
    expect(run(s, digit(1), { type: "delete" }, { type: "check" })).toBe(s);
  });

  it("geht weiter erst nach dem Prüfen und nicht kurz nach dem Tipp auf „Prüfen“", () => {
    const fresh = initMath(TASKS);
    expect(run(fresh, { type: "next", at: 5000 })).toBe(fresh);
    const checked = run(fresh, digit(8), { type: "check", at: 1000 });
    expect(run(checked, { type: "next", at: 1000 + TAP_GUARD_MS - 1 })).toBe(checked);
    expect(run(checked, { type: "next", at: 1000 + TAP_GUARD_MS })).toMatchObject({
      index: 1,
      input: "",
      revealed: false,
    });
  });

  it("verwirft einen zweiten Tipp auf „Prüfen“ kurz nach „Weiter“", () => {
    const s = run(initMath(TASKS), digit(8), { type: "check", at: 0 }, { type: "next", at: 1000 }, digit(1));
    expect(run(s, { type: "check", at: 1000 + TAP_GUARD_MS - 1 })).toBe(s);
    expect(run(s, { type: "check", at: 1000 + TAP_GUARD_MS }).revealed).toBe(true);
  });

  it("ist nach der letzten Aufgabe fertig", () => {
    const s = run(
      initMath(TASKS),
      digit(8), digit(9), { type: "check" }, { type: "next" },
      digit(1), { type: "check" }, { type: "next" },
    );
    expect(s.index).toBe(2);
    expect(s.correct).toBe(1);
    expect(run(s, digit(1)).input).toBe("");
  });
});
