import type { Rating } from "@/lib/srs/fsrs";
import { initSession, sessionReducer, type SessionState } from "@/lib/srs/session";

/**
 * Lernsitzung plus Hintergrund-Speichern, ohne React, damit testbar.
 *
 * Warteschlange: `session.unsynced` (älteste zuerst). Gesendet wird immer nur
 * der Kopf, eine Bewertung nach der anderen. `reps` wird erst beim Senden
 * bestimmt: gespeicherte Wiederholungen beim Laden plus die vom Server
 * bestätigten Bewertungen dieser Sitzung (`ok` oder `stale`), nicht die Anzahl
 * der Tipps. Eine übersprungene Bewertung zählt deshalb nicht mit.
 */
export type StudyState = {
  session: SessionState;
  confirmedReps: Record<string, number>;
  /** Der Kopf der Warteschlange ist unterwegs. */
  sending: boolean;
  /** Letzter Versuch schlug fehl; nächster Versuch erst nach `retry` oder einer Bewertung. */
  failed: boolean;
  /** Fehlversuche in Folge, für den Abstand bis zum nächsten automatischen Versuch. */
  failures: number;
  /** Bewertungen, die der Server nicht gezählt hat (limit, invalid, unknown-card). */
  skipped: number;
};

export type SaveOutcome = "ok" | "stale" | "skipped";

export type StudyAction =
  | { type: "reveal" }
  | { type: "rate"; rating: Rating }
  | { type: "sending" }
  | { type: "result"; outcome: SaveOutcome }
  | { type: "failed" }
  | { type: "retry" };

export type Outgoing = { cardId: string; rating: Rating; reps: number };

export function initStudy(cardIds: string[], reps: Record<string, number>): StudyState {
  return {
    session: initSession(cardIds),
    confirmedReps: { ...reps },
    sending: false,
    failed: false,
    failures: 0,
    skipped: 0,
  };
}

const confirmed = (s: StudyState, cardId: string) => s.confirmedReps[cardId] ?? 0;

export function studyReducer(s: StudyState, a: StudyAction): StudyState {
  switch (a.type) {
    case "reveal":
      return { ...s, session: sessionReducer(s.session, a) };
    case "rate": {
      const cardId = s.session.queue[0];
      if (!cardId || !s.session.revealed) return s;
      // reps im Eintrag ist nur vorläufig; gesendet wird der Wert aus nextToSend.
      const session = sessionReducer(s.session, {
        type: "rate",
        rating: a.rating,
        reps: confirmed(s, cardId),
      });
      // Jede Bewertung ist auch ein Anlass für einen neuen Versuch.
      return { ...s, session, failed: false };
    }
    case "sending":
      return s.session.unsynced.length === 0 ? s : { ...s, sending: true };
    case "result": {
      const head = s.session.unsynced[0];
      if (!head) return { ...s, sending: false };
      const session = sessionReducer(s.session, { type: "saved", cardId: head.cardId });
      const base = { ...s, session, sending: false, failed: false, failures: 0 };
      if (a.outcome === "skipped") return { ...base, skipped: s.skipped + 1 };
      return {
        ...base,
        confirmedReps: { ...s.confirmedReps, [head.cardId]: confirmed(s, head.cardId) + 1 },
      };
    }
    case "failed": {
      const head = s.session.unsynced[0];
      const session = head
        ? sessionReducer(s.session, { type: "saveFailed", cardId: head.cardId })
        : s.session;
      return { ...s, session, sending: false, failed: true, failures: s.failures + 1 };
    }
    case "retry":
      return s.failed ? { ...s, failed: false } : s;
  }
}

/** Was jetzt gesendet werden soll, oder null (nichts offen, schon unterwegs, oder Pause nach Fehler). */
export function nextToSend(s: StudyState): Outgoing | null {
  const head = s.session.unsynced[0];
  if (!head || s.sending || s.failed) return null;
  return { cardId: head.cardId, rating: head.rating, reps: confirmed(s, head.cardId) };
}

/** Alle Karten bewertet und alle Bewertungen beim Server angekommen. */
export function isFinished(s: StudyState): boolean {
  return s.session.queue.length === 0 && s.session.unsynced.length === 0;
}

/** Abstand bis zum nächsten automatischen Versuch nach `failures` Fehlversuchen in Folge. */
export function retryDelayMs(failures: number): number {
  return Math.min(15000, 1000 * 2 ** failures);
}
