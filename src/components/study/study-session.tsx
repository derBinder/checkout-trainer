"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { useDictionary, useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";
import type { Answer } from "@/lib/darts/judge";
import { submitReview } from "@/lib/review/actions";
import type { IntervalLabel, Rating } from "@/lib/srs/fsrs";
import { cn } from "@/lib/utils";
import { SessionScreen, type SessionCard } from "./session-screen";
import { StudySurface as Surface } from "./study-parts";
import { StudyCloseLink } from "./study-close-link";
import { initStudy, isFinished, nextToSend, retryDelayMs, studyReducer } from "./study-state";

export type StudyItem = SessionCard & {
  /** Gespeicherte Wiederholungen beim Laden der Seite. */
  reps: number;
  /** Abstände unter den Knöpfen, je weiterem „Nochmal“ ein Eintrag (siehe intervalLabelChain). */
  labels: Record<Rating, IntervalLabel>[];
};

const GOOD: Rating = 3;

const RATINGS: Rating[] = [1, 2, 3, 4];

export function StudySession({ items }: { items: StudyItem[] }) {
  const router = useRouter();
  const localePath = useLocalePath();
  const t = useDictionary().study;
  const [byId] = useState(() => new Map(items.map((item) => [item.id, item])));
  const [state, dispatch] = useReducer(studyReducer, items, (list) =>
    initStudy(
      list.map((item) => item.id),
      Object.fromEntries(list.map((item) => [item.id, item.reps])),
    ),
  );
  const { session } = state;
  const unsyncedCount = session.unsynced.length;
  const toSend = nextToSend(state);

  // Speichern im Hintergrund: immer nur der Kopf der Warteschlange (siehe study-state.ts).
  // Der Ref verhindert ein doppeltes Senden, wenn React den Effekt zweimal ausführt.
  const inFlight = useRef(false);
  useEffect(() => {
    if (!toSend || inFlight.current) return;
    inFlight.current = true;
    dispatch({ type: "sending" });
    submitReview(toSend).then(
      (result) => {
        inFlight.current = false;
        if (!result.ok && result.reason === "auth") {
          // Offene Bewertungen nicht stillschweigend verwerfen: erst Hinweis, dann Anmeldung.
          dispatch({ type: "signedOut" });
          return;
        }
        // "stale": schon gespeichert (doppelt gesendet), zählt als bestätigt.
        // "limit", "invalid", "unknown-card": nicht gezählt, die Sitzung läuft weiter.
        const outcome = result.ok ? "ok" : result.reason === "stale" ? "stale" : "skipped";
        dispatch({ type: "result", outcome });
      },
      () => {
        inFlight.current = false;
        dispatch({ type: "failed" });
      },
    );
  }, [toSend]);

  // Nach einem Fehler automatisch erneut versuchen, mit wachsendem Abstand.
  useEffect(() => {
    if (!state.failed) return;
    const timer = setTimeout(() => dispatch({ type: "retry" }), retryDelayMs(state.failures));
    return () => clearTimeout(timer);
  }, [state.failed, state.failures]);

  // Seite verlassen (neu laden, Tab schließen) nur mit Rückfrage, solange etwas offen ist.
  useEffect(() => {
    if (unsyncedCount === 0) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsyncedCount]);

  const current = session.queue[0] ? byId.get(session.queue[0]) : undefined;
  const reveal = (answer?: Answer) => dispatch({ type: "reveal", at: performance.now(), answer });

  function confirmClose(event: React.MouseEvent) {
    if (unsyncedCount > 0 && !window.confirm(t.session.confirmClose)) {
      event.preventDefault();
    }
  }

  // Mitten in der Sitzung eine Zeile; die nächste Bewertung versucht es ohnehin erneut.
  const failedHint = state.failed && unsyncedCount > 0 && (
    <p role="status" className="text-center text-sm font-medium text-destructive">
      {t.session.saveFailed}
    </p>
  );
  const skippedHint = state.skipped > 0 && (
    <p role="status" className="text-center text-sm text-muted-foreground">
      {t.session.skipped(state.skipped)}
    </p>
  );

  // Abgemeldet wird nur beim Senden der ältesten offenen Bewertung; sie bleibt
  // offen, es gibt hier also immer mindestens eine nicht gespeicherte.
  if (state.signedOut) {
    return (
      <Surface className="px-page pt-screen-top pb-inset-bottom">
        <div className="flex-1" />
        <div className="flex flex-col gap-4">
          <p role="alert" className="text-center text-sm font-medium text-destructive">
            {t.session.signedOut} {t.session.notSaved(unsyncedCount)}
          </p>
          <Button size="xl" className="w-full" onClick={() => router.replace(localePath(ROUTES.signIn))}>
            {t.session.toSignIn}
          </Button>
        </div>
      </Surface>
    );
  }

  if (!current) {
    const saved = isFinished(state);
    return (
      <Surface className="px-page pt-screen-top pb-inset-bottom">
        <div className="flex flex-1 flex-col gap-5">
          <h1 className="type-display text-hero">{t.session.finished}</h1>
          <p className="text-lg font-medium text-muted-foreground">
            {t.session.cardsStudied(session.done)}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {skippedHint}
          {failedHint}
          {saved ? (
            <Link href={localePath(ROUTES.today)} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
              {t.session.toOverview}
            </Link>
          ) : (
            <>
              {state.failed ? (
                <Button variant="secondary" size="xl" className="w-full" onClick={() => dispatch({ type: "retry" })}>
                  {t.session.retry}
                </Button>
              ) : (
                <p role="status" className="text-center text-sm text-muted-foreground">
                  {t.session.saving}
                </p>
              )}
              <Button size="xl" className="w-full" disabled>
                {t.session.toOverview}
              </Button>
            </>
          )}
        </div>
      </Surface>
    );
  }

  const ratedHere =
    (state.confirmedReps[current.id] ?? 0) -
    current.reps +
    session.unsynced.filter((u) => u.cardId === current.id).length;
  const labels = current.labels[Math.min(ratedHere, current.labels.length - 1)];

  return (
    <SessionScreen
      current={current}
      session={session}
      answer={state.answer}
      close={<StudyCloseLink onClick={confirmClose} />}
      progressText={t.session.progressText}
      hints={
        <>
          {skippedHint}
          {failedHint}
        </>
      }
      onReveal={reveal}
      revealedFooter={
        // Eine durchgehende Leiste; „Gut“ ist als Normalfall gelb hervorgehoben.
        <div className="grid grid-cols-4 rounded-panel bg-muted p-1">
          {RATINGS.map((rating) => (
            <button
              key={rating}
              type="button"
              className={cn(
                "group flex h-15 flex-col items-center justify-center gap-0.5 rounded-field px-1 outline-ring transition select-none focus-visible:outline-2 active:scale-97",
                rating === GOOD ? "bg-accent text-accent-foreground" : "hover:bg-secondary-hover",
              )}
              onClick={() => dispatch({ type: "rate", rating, at: performance.now() })}
            >
              <span className="text-sm font-semibold">{t.session.ratings[rating]}</span>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  rating === GOOD ? "text-accent-muted" : "text-muted-foreground",
                )}
              >
                {t.interval(labels[rating])}
              </span>
            </button>
          ))}
        </div>
      }
    />
  );
}
