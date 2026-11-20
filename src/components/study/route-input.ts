import { maxDarts, type Check } from "@/lib/darts/judge";
import type { Ring } from "@/lib/darts/model";

/**
 * Eingabe eines Wegs über das Tastenfeld, ohne React, damit testbar.
 * Der Ring startet auf S und steht nach jedem Dart wieder auf S, damit das
 * Tastenfeld keinen Hinweis auf den Weg gibt. Löschen stellt den Ring wieder
 * her, der vor dem gelöschten Dart gewählt war.
 */
export type InputState = {
  ring: Ring;
  darts: string[];
  /** Je Dart der Ring, der vor ihm gewählt war (für Löschen). */
  ringsBefore: Ring[];
  rest: number;
  max: 1 | 2 | 3;
};

export type InputAction =
  | { type: "ring"; ring: Ring }
  /** 1 bis 20 mit dem gewählten Ring. */
  | { type: "number"; n: number }
  /** „25“ (Single Bull), unabhängig vom Ring. */
  | { type: "outer" }
  /** „Bull“ (Doppel), unabhängig vom Ring. */
  | { type: "bull" }
  | { type: "undo" };

export function initInput(check: Check): InputState {
  // Jede Karte beginnt auf Single, auch wenn der Rest ein direktes Doppel ist.
  return { ring: "S", darts: [], ringsBefore: [], rest: check.rest, max: maxDarts(check) };
}

export function isFull(s: InputState): boolean {
  return s.darts.length >= s.max;
}

function add(s: InputState, dart: string): InputState {
  if (isFull(s)) return s;
  return { ...s, ring: "S", darts: [...s.darts, dart], ringsBefore: [...s.ringsBefore, s.ring] };
}

export function inputReducer(s: InputState, a: InputAction): InputState {
  switch (a.type) {
    case "ring":
      return s.ring === a.ring ? s : { ...s, ring: a.ring };
    case "number":
      return add(s, `${s.ring}${a.n}`);
    case "outer":
      return add(s, "25");
    case "bull":
      return add(s, "Bull");
    case "undo":
      if (s.darts.length === 0) return s;
      return {
        ...s,
        darts: s.darts.slice(0, -1),
        ringsBefore: s.ringsBefore.slice(0, -1),
        ring: s.ringsBefore[s.ringsBefore.length - 1],
      };
  }
}
