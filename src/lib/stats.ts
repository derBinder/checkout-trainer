import { State } from "ts-fsrs";
import { cardById } from "@/lib/cards";
import { dayKey, dayStart } from "@/lib/time";

export type Level = "new" | "learning" | "known";

export type Stats = {
  counts: Record<Level, number>;
  /** Ein Eintrag für jeden Rest von 2 bis 170. */
  levels: Record<number, Level>;
  /** Aufeinanderfolgende Berliner Tage mit Bewertung, endend heute oder gestern. */
  streak: number;
  /** Bis zu fünf Reste mit den meisten „Nochmal“, absteigend. */
  hardest: { rest: number; again: number }[];
};

export type StatsInput = {
  states: { cardId: string; state: number; scheduledDays: number }[];
  logs: { cardId: string; rating: number; reviewedAt: Date }[];
  now: Date;
};

export const MIN_REST = 2;
export const MAX_REST = 170;
const KNOWN_MIN_DAYS = 21;
const HARDEST_LIMIT = 5;
const AGAIN = 1;

function levelOf(state: number, scheduledDays: number): Level {
  return state === State.Review && scheduledDays >= KNOWN_MIN_DAYS ? "known" : "learning";
}

function streakOf(logs: StatsInput["logs"], now: Date): number {
  const days = new Set(logs.map((l) => dayKey(l.reviewedAt)));
  const previousDay = (d: Date) => new Date(dayStart(d).getTime() - 1);
  let day = days.has(dayKey(now)) ? now : previousDay(now);
  let streak = 0;
  while (days.has(dayKey(day))) {
    streak++;
    day = previousDay(day);
  }
  return streak;
}

export function summarize({ states, logs, now }: StatsInput): Stats {
  const levels: Record<number, Level> = {};
  for (let rest = MIN_REST; rest <= MAX_REST; rest++) levels[rest] = "new";
  for (const s of states) {
    const card = cardById(s.cardId);
    // Nur die Rest- oder Bogey-Karte bestimmt die Stufe, nicht die Fehlwurf-Karten.
    if (card && card.kind !== "miss") levels[card.rest] = levelOf(s.state, s.scheduledDays);
  }

  const counts: Record<Level, number> = { new: 0, learning: 0, known: 0 };
  for (const level of Object.values(levels)) counts[level]++;

  const validLogs = logs.filter((l) => cardById(l.cardId));

  const againByRest = new Map<number, number>();
  for (const l of validLogs) {
    const card = cardById(l.cardId);
    if (!card || l.rating !== AGAIN) continue;
    againByRest.set(card.rest, (againByRest.get(card.rest) ?? 0) + 1);
  }
  const hardest = [...againByRest]
    .map(([rest, again]) => ({ rest, again }))
    .sort((a, b) => b.again - a.again || a.rest - b.rest)
    .slice(0, HARDEST_LIMIT);

  return { counts, levels, streak: streakOf(validLogs, now), hardest };
}
