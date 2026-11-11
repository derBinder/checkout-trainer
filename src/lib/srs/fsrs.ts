import { createEmptyCard, fsrs, generatorParameters, type Card, type Grade } from "ts-fsrs";

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

// Fuzz off: scheduling must be deterministic. ts-fsrs v6 defaults to FSRS-7, which keeps
// an extra memory value (stabilityFast) that card_state has no column for, and its
// scheduler is async. The (deprecated) classic API runs FSRS-6, is synchronous and its
// card fits SrsState, so it is used here on purpose.
const scheduler = fsrs(generatorParameters({ enable_fuzz: false }));

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
    last_review: prev.lastReview ?? undefined,
  };
}

function elapsedDaysSince(prev: SrsState | null, now: Date): number {
  if (!prev?.lastReview) return 0;
  return Math.max(0, Math.floor((now.getTime() - prev.lastReview.getTime()) / DAY_MS));
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
  return toState(card, elapsedDaysSince(prev, now));
}

export function formatInterval(ms: number): string {
  if (ms < MINUTE_MS) return "< 1 Min";
  if (ms < HOUR_MS) return `${Math.round(ms / MINUTE_MS)} Min`;
  if (ms < DAY_MS) return `${Math.round(ms / HOUR_MS)} Std`;
  const days = Math.round(ms / DAY_MS);
  if (days < 30) return days === 1 ? "1 Tag" : `${days} Tage`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "1 Monat" : `${months} Monate`;
  }
  const years = Math.round((days / 365) * 10) / 10;
  return years === 1 ? "1 Jahr" : `${String(years).replace(".", ",")} Jahre`;
}

export function previewIntervals(prev: SrsState | null, now: Date): Record<Rating, string> {
  const preview = scheduler.repeat(toCard(prev, now), now);
  const out = {} as Record<Rating, string>;
  for (const r of RATINGS) {
    out[r] = formatInterval(preview[r as Grade].card.due.getTime() - now.getTime());
  }
  return out;
}
