"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";
import { judge, type Answer, type Check } from "@/lib/darts/judge";
import { submitReview } from "@/lib/review/actions";
import type { Rating } from "@/lib/srs/fsrs";
import { cn } from "@/lib/utils";
import type { CardView } from "./card-view";
import { initInput, inputReducer, type InputAction, type InputState } from "./route-input";
import { StudyCard } from "./study-card";
import {
  STUDY_CONTENT,
  STUDY_COUNTER,
  STUDY_FOOTER,
  STUDY_HEADER,
  STUDY_HEADER_ROW,
  StudySurface as Surface,
} from "./study-parts";
import { StudyCloseLink } from "./study-close-link";
import { QuestionFooter, StudyQuestion, fixedDarts } from "./study-question";
import { initStudy, isFinished, nextToSend, retryDelayMs, studyReducer } from "./study-state";

export type StudyItem = {
  id: string;
  view: CardView;
  /** Wogegen eine eingegebene Antwort geprüft wird. */
  check: Check;
  /** Gespeicherte Wiederholungen beim Laden der Seite. */
  reps: number;
  /** Abstände unter den Knöpfen, je weiterem „Nochmal“ ein Eintrag (siehe intervalLabelChain). */
  labels: Record<Rating, string>[];
};

const GOOD: Rating = 3;

const RATING_BUTTONS: { rating: Rating; label: string }[] = [
  { rating: 1, label: "Nochmal" },
  { rating: 2, label: "Schwer" },
  { rating: 3, label: "Gut" },
  { rating: 4, label: "Leicht" },
];

export function StudySession({ items }: { items: StudyItem[] }) {
  const router = useRouter();
  const localePath = useLocalePath();
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

  const currentId = session.queue[0];
  const current = currentId ? byId.get(currentId) : undefined;

  // Eingabe der aktuellen Runde. Jede Runde einer Karte (auch nach „Nochmal“) beginnt leer:
  // Wechselt der Rundenschlüssel, wird der Zustand noch während des Renderns neu gesetzt.
  const round = `${currentId}:${session.done}:${session.total}`;
  const [inputRound, setInputRound] = useState(round);
  const [input, setInput] = useState<InputState | null>(() => (current ? initInput(current.check) : null));
  if (inputRound !== round) {
    setInputRound(round);
    setInput(current ? initInput(current.check) : null);
  }
  const onInput = (a: InputAction) => setInput((s) => (s ? inputReducer(s, a) : s));
  const reveal = (answer?: Answer) => dispatch({ type: "reveal", at: performance.now(), answer });

  // Fokus auf den neuen Inhalt, damit Tastatur und Screenreader folgen.
  const contentRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    contentRef.current?.focus({ preventScroll: true });
    contentRef.current?.scrollTo({ top: 0 });
  }, [currentId, session.revealed, session.total]);

  function confirmClose(event: React.MouseEvent) {
    if (unsyncedCount > 0 && !window.confirm("Noch nicht alles gespeichert. Trotzdem schließen?")) {
      event.preventDefault();
    }
  }

  // Mitten in der Sitzung eine Zeile; die nächste Bewertung versucht es ohnehin erneut.
  const failedHint = state.failed && unsyncedCount > 0 && (
    <p role="status" className="text-center text-sm font-medium text-destructive">
      Nicht gespeichert, wird erneut versucht
    </p>
  );
  const skippedHint = state.skipped > 0 && (
    <p role="status" className="text-center text-sm text-muted-foreground">
      {state.skipped === 1
        ? "Eine Bewertung wurde nicht gezählt."
        : `${state.skipped} Bewertungen wurden nicht gezählt.`}
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
            Du wurdest abgemeldet.{" "}
            {unsyncedCount === 1
              ? "1 Bewertung wurde nicht gespeichert."
              : `${unsyncedCount} Bewertungen wurden nicht gespeichert.`}
          </p>
          <Button size="xl" className="w-full" onClick={() => router.replace(localePath(ROUTES.signIn))}>
            Zur Anmeldung
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
          <h1 className="type-display text-hero">Geschafft</h1>
          <p className="text-lg font-medium text-muted-foreground">
            {session.done === 1 ? "1 Karte" : `${session.done} Karten`} gelernt.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {skippedHint}
          {failedHint}
          {saved ? (
            <Link href={localePath(ROUTES.today)} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
              Zur Übersicht
            </Link>
          ) : (
            <>
              {state.failed ? (
                <Button variant="secondary" size="xl" className="w-full" onClick={() => dispatch({ type: "retry" })}>
                  Erneut versuchen
                </Button>
              ) : (
                <p role="status" className="text-center text-sm text-muted-foreground">
                  Speichere …
                </p>
              )}
              <Button size="xl" className="w-full" disabled>
                Zur Übersicht
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
  const position = Math.min(session.done + 1, session.total);

  return (
    <Surface>
      <header className={STUDY_HEADER}>
        <div className={STUDY_HEADER_ROW}>
          <StudyCloseLink onClick={confirmClose} />
          <p className={STUDY_COUNTER}>
            {position} / {session.total}
          </p>
        </div>
        <Progress
          value={session.done}
          max={session.total}
          aria-label="Fortschritt"
          getAriaValueText={() => `${session.done} von ${session.total} Karten gelernt`}
        />
      </header>

      <div
        ref={contentRef}
        tabIndex={-1}
        className={STUDY_CONTENT}
      >
        {/* my-auto statt justify-center: mittig in der freien Fläche, bei Überlänge oben beginnend. */}
        <div className="my-auto">
          {session.revealed ? (
            <StudyCard
              view={current.view}
              result={
                state.answer
                  ? {
                      verdict: judge(current.check, state.answer),
                      answer: state.answer,
                      fixed: fixedDarts(current.view),
                    }
                  : undefined
              }
            />
          ) : (
            input && <StudyQuestion view={current.view} input={input} onAction={onInput} />
          )}
        </div>
      </div>

      <footer className={STUDY_FOOTER}>
        {skippedHint}
        {failedHint}
        {session.revealed ? (
          // Eine durchgehende Leiste; „Gut“ ist als Normalfall gelb hervorgehoben.
          <div className="grid grid-cols-4 rounded-panel bg-muted p-1">
            {RATING_BUTTONS.map(({ rating, label }) => (
              <button
                key={rating}
                type="button"
                className={cn(
                  "group flex h-15 flex-col items-center justify-center gap-0.5 rounded-field px-1 outline-ring transition select-none focus-visible:outline-2 active:scale-97",
                  rating === GOOD
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-secondary-hover",
                )}
                onClick={() => dispatch({ type: "rate", rating, at: performance.now() })}
              >
                <span className="text-sm font-semibold">{label}</span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    rating === GOOD ? "text-accent-muted" : "text-muted-foreground",
                  )}
                >
                  {labels[rating]}
                </span>
              </button>
            ))}
          </div>
        ) : (
          input && <QuestionFooter check={current.check} input={input} onReveal={reveal} />
        )}
      </footer>
    </Surface>
  );
}
