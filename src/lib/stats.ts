import { State } from "ts-fsrs";
import { cardById } from "@/lib/cards";
import { dayKey, dayStart } from "@/lib/time";

export type Level = "new" | "learning" | "known";

export type Streak = { days: number; paused: boolean };

export type Stats = {
  counts: Record<Level, number>;
  /** Ein Eintrag für jeden Rest von 2 bis 170. */
  levels: Record<number, Level>;
  /**
   * Berliner Tage mit Bewertung, endend heute oder gestern. Ein Fehltag wird überbrückt, wenn der Tag davor
   * bewertet ist und die letzte Überbrückung mindestens 7 Tage zurückliegt. `paused`: heute und gestern
   * ohne Bewertung, gestern wird überbrückt.
   */
  streak: Streak;
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

export function levelOf(state: number, scheduledDays: number): Level {
  return state === State.Review && scheduledDays >= KNOWN_MIN_DAYS ? "known" : "learning";
}

function streakOf(logs: StatsInput["logs"], now: Date): Streak {
  const days = new Set(logs.map((l) => dayKey(l.reviewedAt)));
  const previousDay = (d: Date) => new Date(dayStart(d).getTime() - 1);
  let day = days.has(dayKey(now)) ? now : previousDay(now);
  let count = 0;
  let sinceBridge = Infinity; // Tage seit der letzten Überbrückung, in Schritten (Zeitumstellung)
  let paused = false;
  let first = true;
  while (true) {
    if (days.has(dayKey(day))) count++;
    else if (sinceBridge >= 7 && days.has(dayKey(previousDay(day)))) {
      sinceBridge = 0;
      paused = first;
    } else break;
    sinceBridge++;
    first = false;
    day = previousDay(day);
  }
  return { days: count, paused: paused && count > 0 };
}

export function summarize({ states, logs, now }: StatsInput): Stats {
  const levels: Record<number, Level> = {};
  for (let rest = MIN_REST; rest <= MAX_REST; rest++) levels[rest] = "new";
  for (const s of states) {
    const card = cardById(s.cardId);
    // Nur die Rest- oder Bogey-Karte bestimmt die Stufe, nicht Fehlwurf- oder Zwei-Dart-Karten.
    if (card && (card.kind === "rest" || card.kind === "bogey")) levels[card.rest] = levelOf(s.state, s.scheduledDays);
  }

  const counts: Record<Level, number> = { new: 0, learning: 0, known: 0 };
  for (const level of Object.values(levels)) counts[level]++;

  const validLogs = logs.filter((l) => cardById(l.cardId));

  const againByRest = new Map<number, number>();
  for (const l of validLogs) {
    const card = cardById(l.cardId);
    // Reste über 170 zeigt das Raster nicht, die Detailansicht kann sie nicht öffnen.
    if (!card || l.rating !== AGAIN || card.rest > MAX_REST) continue;
    againByRest.set(card.rest, (againByRest.get(card.rest) ?? 0) + 1);
  }
  const hardest = [...againByRest]
    .map(([rest, again]) => ({ rest, again }))
    .sort((a, b) => b.again - a.again || a.rest - b.rest)
    .slice(0, HARDEST_LIMIT);

  return { counts, levels, streak: streakOf(validLogs, now), hardest };
}
