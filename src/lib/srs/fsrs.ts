import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from "ts-fsrs";
import { dayKey } from "@/lib/time";

export type Rating = 1 | 2 | 3 | 4; // Nochmal, Schwer, Gut, Leicht

/** Stored scheduling state; mirrors the card_state columns. */
export type SrsState = {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: number;
  lastReview: Date | null;
};

const RATINGS: Rating[] = [1, 2, 3, 4];
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

// Short-term steps off: a new card rated Hard/Good/Easy is due days later, not minutes.
// Fuzz off: scheduling must be deterministic. ts-fsrs v6 defaults to FSRS-7, which keeps
// an extra memory value (stabilityFast) that card_state has no column for, and its
// scheduler is async. The (deprecated) classic API runs FSRS-6, is synchronous and its
// card fits SrsState, so it is used here on purpose.
//
// Die Statistik („sicher seit“, src/lib/rest-dates.ts) spielt review_log mit diesen Parametern
// neu ab. Ändert man sie, verschieben sich diese Daten, ohne dass etwas fehlschlägt.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false, enable_short_term: false }));

/**
 * Berliner Kalendertage seit der letzten Wiederholung. Die Tage als UTC-Mitternacht
 * gelesen (`YYYY-MM-DD`) liegen genau ganze 24 Stunden auseinander, auch über eine
 * Zeitumstellung; eine Formatierung je Datum statt einer Suche nach dem Tagesbeginn.
 */
function berlinDaysSince(prev: SrsState | null, now: Date): number {
  if (!prev?.lastReview) return 0;
  return Math.max(0, (Date.parse(dayKey(now)) - Date.parse(dayKey(prev.lastReview))) / DAY_MS);
}

function toCard(prev: SrsState | null, now: Date): Card {
  if (!prev) return createEmptyCard(now);
  return {
    due: prev.due,
    stability: prev.stability,
    difficulty: prev.difficulty,
    scheduled_days: prev.scheduledDays,
    learning_steps: prev.learningSteps,
    reps: prev.reps,
    lapses: prev.lapses,
    state: prev.state as Card["state"],
    // ts-fsrs zählt die vergangenen Tage als UTC-Kalendertage; sein Tag begänne also um
    // 1 bzw. 2 Uhr in Berlin. Um ganze UTC-Tage zurückgerechnet ergibt der Abstand genau
    // die Berliner Tage, wie die Tagesgrenze der Warteschlange. Gespeichert wird der echte
    // Zeitpunkt: Die Bibliothek setzt last_review der neuen Karte auf `now`.
    last_review: prev.lastReview ? new Date(now.getTime() - berlinDaysSince(prev, now) * DAY_MS) : undefined,
  };
}

function toState(card: Card, elapsedDays: number): SrsState {
  return {
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsedDays,
    scheduledDays: card.scheduled_days,
    learningSteps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    lastReview: card.last_review ?? null,
  };
}

export function rate(prev: SrsState | null, rating: Rating, now: Date): SrsState {
  const { card } = scheduler.next(toCard(prev, now), now, rating as Grade);
  const next = toState(card, berlinDaysSince(prev, now));
  // "Nochmal" stays due until it is passed; the other state fields are FSRS's.
  if (rating === 1) next.due = now;
  return next;
}

/**
 * Abstand bis zur nächsten Wiederholung als Daten; den Text („3 Tage“, „3 days“)
 * liefert das Wörterbuch (`study.interval`). `value` ist bei „now“ und „underMinute“ 0.
 */
export type IntervalLabel = {
  unit: "now" | "underMinute" | "minutes" | "hours" | "days" | "months" | "years";
  value: number;
};

export function describeInterval(ms: number): IntervalLabel {
  if (ms < MINUTE_MS) return { unit: "underMinute", value: 0 };
  if (ms < HOUR_MS) return { unit: "minutes", value: Math.round(ms / MINUTE_MS) };
  if (ms < DAY_MS) return { unit: "hours", value: Math.round(ms / HOUR_MS) };
  const days = Math.round(ms / DAY_MS);
  if (days < 30) return { unit: "days", value: days };
  if (days < 365) return { unit: "months", value: Math.round(days / 30) };
  return { unit: "years", value: Math.round((days / 365) * 10) / 10 };
}

export function previewIntervals(prev: SrsState | null, now: Date): Record<Rating, IntervalLabel> {
  const preview = scheduler.repeat(toCard(prev, now), now);
  const out = {} as Record<Rating, IntervalLabel>;
  for (const r of RATINGS) {
    if (r === 1) {
      out[r] = { unit: "now", value: 0 };
      continue;
    }
    out[r] = describeInterval(preview[r as Grade].card.due.getTime() - now.getTime());
  }
  return out;
}

const MAX_LABEL_CHAIN = 5;

const sameLabels = (a: Record<Rating, IntervalLabel>, b: Record<Rating, IntervalLabel>) =>
  RATINGS.every((r) => a[r].unit === b[r].unit && a[r].value === b[r].value);

/**
 * Button labels for the stored state, then for the state after each further
 * "Nochmal" in the same session, until they stop changing (at most five).
 * The client picks entry min(againCount, length - 1), so it needs no scheduler.
 */
export function intervalLabelChain(prev: SrsState | null, now: Date): Record<Rating, IntervalLabel>[] {
  const chain = [previewIntervals(prev, now)];
  let state = prev;
  while (chain.length < MAX_LABEL_CHAIN) {
    state = rate(state, 1, now);
    const next = previewIntervals(state, now);
    if (sameLabels(next, chain[chain.length - 1])) break;
    chain.push(next);
  }
  return chain;
}
