import type { Answer } from "@/lib/darts/judge";
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
  /** Bewertungen speichern (Lernen); ohne Speichern (Üben) bleibt `session.unsynced` leer. */
  save: boolean;
  confirmedReps: Record<string, number>;
  /** Der Kopf der Warteschlange ist unterwegs. */
  sending: boolean;
  /** Letzter Versuch schlug fehl; nächster Versuch erst nach `retry` oder einer Bewertung. */
  failed: boolean;
  /** Fehlversuche in Folge, für den Abstand bis zum nächsten automatischen Versuch. */
  failures: number;
  /** Bewertungen, die der Server nicht gezählt hat (limit, invalid, unknown-card). */
  skipped: number;
  /** Zeitpunkt des letzten angenommenen Aufdeckens oder Bewertens, für den Doppeltipp-Schutz. */
  lastFlipAt: number | null;
  /** Der Server meldete eine abgelaufene Anmeldung; nichts wird mehr gesendet oder bewertet. */
  signedOut: boolean;
  /** Eingegebene Antwort der aufgedeckten Karte; null, wenn ohne Eingabe aufgedeckt. */
  answer: Answer | null;
};

/**
 * Aufdecken und Bewerten liegen an derselben Stelle. So lange nach einem
 * Wechsel wird ein Tipp auf die jeweils andere Schaltfläche ignoriert, damit
 * ein Doppeltipp nicht gleich bewertet oder die nächste Antwort aufdeckt.
 */
export const TAP_GUARD_MS = 350;

export type SaveOutcome = "ok" | "stale" | "skipped";

export type StudyAction =
  /** `at`: Zeitpunkt des Tipps in ms (z. B. performance.now()); ohne Angabe kein Doppeltipp-Schutz. */
  | { type: "reveal"; at?: number; answer?: Answer }
  | { type: "rate"; rating: Rating; at?: number }
  | { type: "sending" }
  | { type: "result"; outcome: SaveOutcome }
  | { type: "failed" }
  | { type: "retry" }
  | { type: "signedOut" };

export type Outgoing = { cardId: string; rating: Rating; reps: number };

export function initStudy(
  cardIds: string[],
  reps: Record<string, number>,
  { save = true, doneBefore = 0 }: { save?: boolean; doneBefore?: number } = {},
): StudyState {
  return {
    session: initSession(cardIds, doneBefore),
    save,
    confirmedReps: { ...reps },
    sending: false,
    failed: false,
    failures: 0,
    skipped: 0,
    lastFlipAt: null,
    signedOut: false,
    answer: null,
  };
}

/** Ein Tipp kurz nach dem letzten Wechsel zwischen Aufdecken und Bewerten zählt nicht. */
function tooSoon(s: StudyState, at: number | undefined): boolean {
  return at !== undefined && s.lastFlipAt !== null && at - s.lastFlipAt < TAP_GUARD_MS;
}

const confirmed = (s: StudyState, cardId: string) => s.confirmedReps[cardId] ?? 0;

export function studyReducer(s: StudyState, a: StudyAction): StudyState {
  switch (a.type) {
    case "reveal": {
      if (s.signedOut || s.session.revealed || tooSoon(s, a.at)) return s;
      const session = sessionReducer(s.session, a);
      return session === s.session
        ? s
        : { ...s, session, lastFlipAt: a.at ?? null, answer: a.answer ?? null };
    }
    case "rate": {
      const cardId = s.session.queue[0];
      if (!cardId || !s.session.revealed || s.signedOut || tooSoon(s, a.at)) return s;
      // reps im Eintrag ist nur vorläufig; gesendet wird der Wert aus nextToSend.
      const rated = sessionReducer(s.session, {
        type: "rate",
        rating: a.rating,
        reps: confirmed(s, cardId),
      });
      // Üben: Reihenfolge und Zähler wie beim Lernen, aber nichts zum Senden.
      const session = s.save ? rated : { ...rated, unsynced: [] };
      // Jede Bewertung ist auch ein Anlass für einen neuen Versuch.
      return { ...s, session, failed: false, lastFlipAt: a.at ?? null, answer: null };
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
    case "signedOut":
      return { ...s, signedOut: true, sending: false };
  }
}

/** Was jetzt gesendet werden soll, oder null (nichts offen, schon unterwegs, oder Pause nach Fehler). */
export function nextToSend(s: StudyState): Outgoing | null {
  const head = s.session.unsynced[0];
  if (!head || s.sending || s.failed || s.signedOut) return null;
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

export type SendResult = { ok: true } | { ok: false; reason: string };

/** Antwort des Servers auf eine Bewertung als Aktion für studyReducer. */
export function resultAction(result: SendResult): StudyAction {
  if (result.ok) return { type: "result", outcome: "ok" };
  // Offene Bewertungen nicht stillschweigend verwerfen: erst Hinweis, dann Anmeldung.
  if (result.reason === "auth") return { type: "signedOut" };
  // "stale": schon gespeichert (doppelt gesendet), zählt als bestätigt.
  // "limit", "invalid", "unknown-card", "off" (Zusatzkarte inzwischen ausgeschaltet): nicht gezählt.
  return { type: "result", outcome: result.reason === "stale" ? "stale" : "skipped" };
}

/**
 * Sendet die offenen Bewertungen einer verborgenen oder verlassenen Lernsitzung
 * weiter, ohne React: Verbirgt Next.js die Seite (Zurück, Wischgeste), laufen ihre
 * Effekte nicht mehr, und ein neuer Aufruf der Seite verwirft die alte Sitzung.
 * Dieselbe Reihenfolge und Rechnung wie in der Sitzung (studyReducer, nextToSend);
 * schickt die Sitzung danach selbst weiter, antwortet der Server auf Doppeltes mit
 * "stale", und das zählt als gespeichert. Liefert eine Funktion zum Anhalten.
 */
export function drainDetached(snapshot: StudyState, send: (o: Outgoing) => Promise<SendResult>): () => void {
  let stopped = false;
  void (async () => {
    // Was beim Verbergen unterwegs war, kommt nur noch bei der Sitzung an: erneut senden.
    let s: StudyState = { ...snapshot, sending: false, failed: false };
    for (let next = nextToSend(s); next && !stopped; next = nextToSend(s)) {
      s = studyReducer(s, { type: "sending" });
      try {
        s = studyReducer(s, resultAction(await send(next)));
      } catch {
        s = studyReducer(s, { type: "failed" });
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs(s.failures)));
        s = studyReducer(s, { type: "retry" });
      }
    }
  })();
  return () => {
    stopped = true;
  };
}
