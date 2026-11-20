import type { Card } from "@/lib/darts/cards";
import { BOGEYS, isBogey, MAX_REST, MIN_REST } from "@/lib/darts/checkouts";
import { dartValue, parseDart } from "@/lib/darts/model";
import type { Rng } from "./filter";

/**
 * Übung „Rechnen“: Rest vor der Aufnahme, drei Würfe, was bleibt? Kurz vor dem
 * Checkout, mit Bogey-Zahlen. Reine Logik; der Zufall kommt von außen (testbar).
 */

/** Realistische Würfe rund um die 20 und die 19. */
export const THROW_POOL = ["S20", "T20", "S1", "T1", "S5", "T5", "S19", "T19", "S3", "T3", "S7", "T7"] as const;

export type MathTask = { start: number; throws: [string, string, string]; rest: number };

export const MATH_ROUND_SIZE = 10;

const MIN_START = 171;
const MAX_START = 230;
const BOGEY_SHARE = 0.25;

type Triple = { throws: [string, string, string]; sum: number };

/** Alle geordneten Dreier aus dem Vorrat (12³). */
const TRIPLES: Triple[] = THROW_POOL.flatMap((a) =>
  THROW_POOL.flatMap((b) =>
    THROW_POOL.map((c) => ({
      throws: [a, b, c] as [string, string, string],
      sum: [a, b, c].reduce((s, d) => s + dartValue(parseDart(d)), 0),
    })),
  ),
);

const pick = <T>(list: readonly T[], rng: Rng): T => list[Math.floor(rng() * list.length)];

/**
 * Etwa jede vierte Aufgabe lässt eine Bogey-Zahl: erst die Bogey-Zahl, dann ein
 * passender Dreier samt Startrest. Sonst erst der Startrest, dann ein Dreier, der
 * einen checkbaren Rest lässt. Beide Listen sind nie leer (siehe Tests).
 */
export function mathTask(rng: Rng): MathTask {
  if (rng() < BOGEY_SHARE) {
    const rest = pick(BOGEYS, rng);
    const fitting = TRIPLES.filter((t) => rest + t.sum >= MIN_START && rest + t.sum <= MAX_START);
    const { throws, sum } = pick(fitting, rng);
    return { start: rest + sum, throws, rest };
  }
  const start = MIN_START + Math.floor(rng() * (MAX_START - MIN_START + 1));
  const fitting = TRIPLES.filter((t) => {
    const rest = start - t.sum;
    return rest >= MIN_REST && rest <= MAX_REST && !isBogey(rest);
  });
  const { throws, sum } = pick(fitting, rng);
  return { start, throws, rest: start - sum };
}

export function mathRound(rng: Rng, n: number = MATH_ROUND_SIZE): MathTask[] {
  return Array.from({ length: n }, () => mathTask(rng));
}

/** Auflösung eines Rests: bester Weg der Rest-Karte bzw. Stellwurf der Bogey-Karte. */
export type MathSolution =
  | { kind: "finish"; route: string[] }
  | { kind: "bogey"; throws: string[]; leaves: number };

export function mathSolutions(cards: readonly Card[]): Record<number, MathSolution> {
  const solutions: Record<number, MathSolution> = {};
  for (const card of cards) {
    if (card.kind === "rest") solutions[card.rest] = { kind: "finish", route: card.best };
    if (card.kind === "bogey") solutions[card.rest] = { kind: "bogey", ...card.setup };
  }
  return solutions;
}
