import { isDoubleOut, maxDarts, type Check } from "@/lib/darts/judge";
import { dartValue, parseDart, type Ring } from "@/lib/darts/model";

/**
 * Eingabe eines Wegs über das Tastenfeld, ohne React, damit testbar.
 * Der Ring bleibt gewählt, bis der Nutzer ihn wechselt. Ist der verbleibende
 * Rest mit einem Doppel direkt zu checken, springt er auf D (nie zurück).
 */
export type InputState = { ring: Ring; darts: string[]; rest: number; max: 1 | 2 | 3 };

export type InputAction =
  | { type: "ring"; ring: Ring }
  /** 1 bis 20 mit dem gewählten Ring. */
  | { type: "number"; n: number }
  /** „25“ (Single Bull), unabhängig vom Ring. */
  | { type: "outer" }
  /** „Bull“ (Doppel), unabhängig vom Ring. */
  | { type: "bull" }
  | { type: "undo" };

/** Startring: D bei direktem Doppel, über 60 T, sonst S. */
function startRing(rest: number): Ring {
  if (isDoubleOut(rest)) return "D";
  return rest > 60 ? "T" : "S";
}

export function initInput(check: Check): InputState {
  return { ring: startRing(check.rest), darts: [], rest: check.rest, max: maxDarts(check) };
}

export function remaining(s: InputState): number {
  return s.darts.reduce((left, d) => left - dartValue(parseDart(d)), s.rest);
}

export function isFull(s: InputState): boolean {
  return s.darts.length >= s.max;
}

function withDarts(s: InputState, darts: string[]): InputState {
  const next = { ...s, darts };
  return isDoubleOut(remaining(next)) ? { ...next, ring: "D" } : next;
}

function add(s: InputState, dart: string): InputState {
  return isFull(s) ? s : withDarts(s, [...s.darts, dart]);
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
      return s.darts.length === 0 ? s : withDarts(s, s.darts.slice(0, -1));
  }
}
