import { PRACTICE_KINDS, RANGES, type PracticeKind, type RangeId } from "./filter";

/** Die zuletzt gewählte Übung samt Auswahl, gespeichert pro Gerät (localStorage). */

export const EXERCISES = ["routes", "math"] as const;
export type Exercise = (typeof EXERCISES)[number];

export type PracticeSelection = { exercise: Exercise; ranges: RangeId[]; kind: PracticeKind };

export const PRACTICE_STORAGE_KEY = "practice";

export const DEFAULT_SELECTION: PracticeSelection = {
  exercise: "routes",
  ranges: RANGES.map((r) => r.id),
  kind: "all",
};

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return list.includes(value as T);
}

/**
 * Prüft einen gespeicherten Wert: Nur bekannte Übungen, Bereiche und Kartenarten
 * gelten, alles andere fällt weg bzw. auf die Vorauswahl zurück. Eine leere
 * Bereichsliste bleibt leer, so hat der Nutzer die Seite verlassen.
 */
export function parsePracticeSelection(raw: string | null): PracticeSelection {
  if (raw === null) return DEFAULT_SELECTION;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return DEFAULT_SELECTION;
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) return DEFAULT_SELECTION;
  const { exercise, ranges, kind } = value as Record<string, unknown>;
  return {
    exercise: isOneOf(EXERCISES, exercise) ? exercise : DEFAULT_SELECTION.exercise,
    ranges: Array.isArray(ranges)
      ? RANGES.map((r) => r.id).filter((id) => ranges.includes(id))
      : DEFAULT_SELECTION.ranges,
    kind: isOneOf(PRACTICE_KINDS, kind) ? kind : DEFAULT_SELECTION.kind,
  };
}
