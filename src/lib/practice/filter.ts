import type { Card } from "@/lib/darts/cards";
import type { ExtraCards } from "@/lib/extra-cards";

/**
 * Auswahl der Übung „Wege“: feste Bereiche nach dem Rest, mit dem eine Karte
 * beginnt, und Gruppen nach Kartenart. Reine Logik, in Client und Server nutzbar.
 */

export const RANGES = [
  { id: "2-40", from: 2, to: 40 },
  { id: "41-60", from: 41, to: 60 },
  { id: "61-80", from: 61, to: 80 },
  { id: "81-100", from: 81, to: 100 },
  { id: "101-120", from: 101, to: 120 },
  { id: "121-140", from: 121, to: 140 },
  { id: "141-170", from: 141, to: 170 },
  // Nur mit dem Schalter „Reste über 170“ (availableRanges).
  { id: "171-230", from: 171, to: 230 },
] as const;

export type RangeId = (typeof RANGES)[number]["id"];

const OVER_170: RangeId = "171-230";

/** Die Bereiche, die ein Nutzer wählen kann: 171–230 nur mit dem Schalter „Reste über 170“. */
export function availableRanges(extras: ExtraCards): RangeId[] {
  return RANGES.map((r) => r.id).filter((id) => id !== OVER_170 || extras.over170);
}

export const PRACTICE_KINDS = ["all", "ways", "misses", "setups"] as const;
export type PracticeKind = (typeof PRACTICE_KINDS)[number];

/** Kartenarten außer „Alle“; eine Fehlwurf-Karte mit Stellwurf gehört zu zwei Gruppen. */
export type PracticeGroup = Exclude<PracticeKind, "all">;

export type PracticeFilter = { ranges: readonly RangeId[]; kind: PracticeKind };

/** Höchstens so viele Karten je Runde. */
export const ROUND_SIZE = 20;

/** Zufallszahl in [0, 1), wie Math.random. */
export type Rng = () => number;

export function practiceGroups(card: Card): PracticeGroup[] {
  switch (card.kind) {
    case "rest":
      return ["ways"];
    case "bogey":
    case "over":
      return ["setups"];
    case "two":
      return card.follow.kind === "finish" ? ["ways"] : ["setups"];
    case "miss":
      return card.follow.kind === "setup" ? ["misses", "setups"] : ["misses"];
  }
}

export function matchesFilter(
  card: { rest: number; groups: readonly PracticeGroup[] },
  filter: PracticeFilter,
): boolean {
  const inRange = RANGES.some(
    (r) => filter.ranges.includes(r.id) && card.rest >= r.from && card.rest <= r.to,
  );
  return inRange && (filter.kind === "all" || card.groups.includes(filter.kind));
}

/** Höchstens `max` Einträge in zufälliger Reihenfolge (Fisher-Yates), ohne die Eingabe zu ändern. */
export function drawRound<T>(items: readonly T[], rng: Rng, max: number = ROUND_SIZE): T[] {
  const list = [...items];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, max);
}
