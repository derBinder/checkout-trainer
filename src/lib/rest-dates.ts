import { cardById } from "@/lib/cards";
import { rate, type Rating, type SrsState } from "@/lib/srs/fsrs";
import { levelOf } from "@/lib/stats";
import { dayKey } from "@/lib/time";

/** Berliner Tage (`YYYY-MM-DD`): wann der Rest zuerst drankam und seit wann er lückenlos sicher ist. */
type RestDates = { learned: string; known?: string };

type RestDatesInput = {
  states: { cardId: string; state: number; scheduledDays: number; introducedAt: Date }[];
  logs: { cardId: string; rating: number; reviewedAt: Date }[];
};

/**
 * Ein Eintrag je Rest, dessen Rest- oder Bogey-Karte einen Lernstand hat. „Sicher seit“ entsteht aus
 * dem Verlauf: Die Bewertungen der Karte laufen durch rate(), ein Rückfall löscht den Tag. Passt das
 * Ergebnis nicht zum gespeicherten Stand, fehlt `known`, statt ein falsches Datum zu zeigen.
 * Ändern sich die FSRS-Parameter (src/lib/srs/fsrs.ts), verschieben sich diese Daten.
 */
export function restDates({ states, logs }: RestDatesInput): Record<number, RestDates> {
  const logsByCard = new Map<string, RestDatesInput["logs"]>();
  // Stabil nach Zeit sortiert: bei gleicher Zeit bleibt die Reihenfolge der Eingabe.
  for (const log of [...logs].sort((a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime())) {
    logsByCard.set(log.cardId, [...(logsByCard.get(log.cardId) ?? []), log]);
  }

  const dates: Record<number, RestDates> = {};
  for (const s of states) {
    const card = cardById(s.cardId);
    if (!card || (card.kind !== "rest" && card.kind !== "bogey")) continue;

    const entry: RestDates = { learned: dayKey(s.introducedAt) };
    let known: string | undefined;
    let replayed: SrsState | null = null;
    for (const log of logsByCard.get(s.cardId) ?? []) {
      replayed = rate(replayed, log.rating as Rating, log.reviewedAt);
      known = levelOf(replayed.state, replayed.scheduledDays) === "known" ? (known ?? dayKey(log.reviewedAt)) : undefined;
    }
    if (known && levelOf(s.state, s.scheduledDays) === "known") entry.known = known;
    dates[card.rest] = entry;
  }
  return dates;
}
