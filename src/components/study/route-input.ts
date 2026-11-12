import { maxDarts, type Check } from "@/lib/darts/judge";
import { dartValue, parseDart, type Ring } from "@/lib/darts/model";

/**
 * Eingabe eines Wegs über das Tastenfeld, ohne React, damit testbar.
 * Der Ring startet auf S und bleibt gewählt, bis der Nutzer ihn wechselt. Bleibt
 * nach einem Dart ein Rest, der mit einem Doppel direkt zu checken ist, springt
 * er auf D. Löschen stellt den Ring wieder her, der vor dem gelöschten Dart
 * gewählt war.
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

/**
 * Rest, für den der Ring auf D springt: gerade 2 bis 40. Nicht 50, denn Bull
 * hat eine eigene Taste; sonst würde etwa auf 110 nach T20 aus T10 ein D10.
 */
export function isDoubleRest(rest: number): boolean {
  return rest % 2 === 0 && rest >= 2 && rest <= 40;
}

export function initInput(check: Check): InputState {
  // Jede Karte beginnt auf Single, auch wenn der Rest ein direktes Doppel ist.
  return { ring: "S", darts: [], ringsBefore: [], rest: check.rest, max: maxDarts(check) };
}

export function remaining(s: InputState): number {
  return s.darts.reduce((left, d) => left - dartValue(parseDart(d)), s.rest);
}

export function isFull(s: InputState): boolean {
  return s.darts.length >= s.max;
}

function add(s: InputState, dart: string): InputState {
  if (isFull(s)) return s;
  const next = { ...s, darts: [...s.darts, dart], ringsBefore: [...s.ringsBefore, s.ring] };
  return isDoubleRest(remaining(next)) ? { ...next, ring: "D" } : next;
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
