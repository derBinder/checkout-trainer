import type { Rating } from "./fsrs";

export type SessionState = {
  queue: string[];
  revealed: boolean;
  done: number;
  total: number;
  unsynced: { cardId: string; rating: Rating; reps: number }[];
};

export type SessionAction =
  | { type: "reveal" }
  | { type: "rate"; rating: Rating; reps: number }
  | { type: "saved"; cardId: string }
  | { type: "saveFailed"; cardId: string };

const AGAIN_OFFSET = 3;

/** `doneBefore`: heute schon erledigte Karten, damit der Tagesfortschritt beim erneuten Öffnen bleibt. */
export function initSession(cardIds: string[], doneBefore = 0): SessionState {
  return { queue: [...cardIds], revealed: false, done: doneBefore, total: cardIds.length + doneBefore, unsynced: [] };
}

export function sessionReducer(s: SessionState, a: SessionAction): SessionState {
  switch (a.type) {
    case "reveal":
      return s.queue.length === 0 ? s : { ...s, revealed: true };
    case "rate": {
      if (!s.revealed || s.queue.length === 0) return s;
      const [cardId, ...rest] = s.queue;
      const unsynced = [...s.unsynced, { cardId, rating: a.rating, reps: a.reps }];
      if (a.rating === 1) {
        const queue = [...rest];
        queue.splice(Math.min(AGAIN_OFFSET, queue.length), 0, cardId);
        return { ...s, queue, revealed: false, total: s.total + 1, unsynced };
      }
      return { ...s, queue: rest, revealed: false, done: s.done + 1, unsynced };
    }
    case "saved": {
      const i = s.unsynced.findIndex((u) => u.cardId === a.cardId);
      if (i < 0) return s;
      return { ...s, unsynced: s.unsynced.filter((_, j) => j !== i) };
    }
    case "saveFailed":
      return s;
  }
}
