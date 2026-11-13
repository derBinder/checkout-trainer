import { TAP_GUARD_MS } from "@/components/study/study-state";
import type { MathTask } from "@/lib/practice/math";

/** Runde „Rechnen“ ohne React, damit testbar. */
export type MathState = {
  tasks: MathTask[];
  /** Aktuelle Aufgabe; gleich `tasks.length`, wenn die Runde vorbei ist. */
  index: number;
  /** Eingegebene Ziffern, höchstens drei, ohne führende Null. */
  input: string;
  revealed: boolean;
  /** Ob die geprüfte Antwort der aktuellen Aufgabe stimmt; null vor dem Prüfen. */
  right: boolean | null;
  correct: number;
  /** Zeitpunkt des letzten Prüfens oder Weitergehens, für den Doppeltipp-Schutz. */
  lastFlipAt: number | null;
};

export type MathAction =
  | { type: "digit"; d: number }
  | { type: "delete" }
  /** `at`: Zeitpunkt des Tipps in ms; ohne Angabe kein Doppeltipp-Schutz. */
  | { type: "check"; at?: number }
  | { type: "next"; at?: number };

const MAX_DIGITS = 3;

export function initMath(tasks: MathTask[]): MathState {
  return { tasks, index: 0, input: "", revealed: false, right: null, correct: 0, lastFlipAt: null };
}

/** „Prüfen“ und „Weiter“ liegen an derselben Stelle: Ein Tipp kurz nach dem Wechsel zählt nicht. */
function tooSoon(s: MathState, at: number | undefined): boolean {
  return at !== undefined && s.lastFlipAt !== null && at - s.lastFlipAt < TAP_GUARD_MS;
}

export function mathReducer(s: MathState, a: MathAction): MathState {
  const open = s.index < s.tasks.length && !s.revealed;
  switch (a.type) {
    case "digit":
      if (!open || s.input.length >= MAX_DIGITS || (s.input === "" && a.d === 0)) return s;
      return { ...s, input: s.input + String(a.d) };
    case "delete":
      return open && s.input !== "" ? { ...s, input: s.input.slice(0, -1) } : s;
    case "check": {
      if (!open || s.input === "" || tooSoon(s, a.at)) return s;
      const right = Number(s.input) === s.tasks[s.index].rest;
      return { ...s, revealed: true, right, correct: s.correct + (right ? 1 : 0), lastFlipAt: a.at ?? null };
    }
    case "next":
      if (!s.revealed || tooSoon(s, a.at)) return s;
      return { ...s, index: s.index + 1, input: "", revealed: false, right: null, lastFlipAt: a.at ?? null };
  }
}
