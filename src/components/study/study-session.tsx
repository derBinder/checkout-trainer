"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { submitReview } from "@/lib/review/actions";
import type { Rating } from "@/lib/srs/fsrs";
import { cn } from "@/lib/utils";
import type { CardView } from "./card-view";
import { StudyCard } from "./study-card";
import { initStudy, isFinished, nextToSend, retryDelayMs, studyReducer } from "./study-state";

export type StudyItem = {
  id: string;
  view: CardView;
  /** Gespeicherte Wiederholungen beim Laden der Seite. */
  reps: number;
  /** Abstände unter den Knöpfen, je weiterem „Nochmal“ ein Eintrag (siehe intervalLabelChain). */
  labels: Record<Rating, string>[];
};

const RATING_BUTTONS: { rating: Rating; label: string }[] = [
  { rating: 1, label: "Nochmal" },
  { rating: 2, label: "Schwer" },
  { rating: 3, label: "Gut" },
  { rating: 4, label: "Leicht" },
];

export function StudySession({ items }: { items: StudyItem[] }) {
  const router = useRouter();
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
          router.replace("/anmelden");
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
  }, [toSend, router]);

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
    <p role="status" className="text-center text-sm text-destructive">
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

  if (!current) {
    const saved = isFinished(state);
    return (
      <Surface className="px-5 pt-[max(4rem,14dvh)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="text-[clamp(3rem,16vw,4.5rem)] leading-none font-extrabold font-stretch-condensed">
            Geschafft
          </h1>
          <p className="text-lg text-muted-foreground">
            {session.done === 1 ? "1 Karte" : `${session.done} Karten`} gelernt.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {skippedHint}
          {failedHint}
          {saved ? (
            <Link href="/heute" className={cn(buttonVariants({ size: "xl" }), "w-full")}>
              Zur Übersicht
            </Link>
          ) : (
            <>
              {state.failed ? (
                <Button variant="outline" size="xl" className="w-full" onClick={() => dispatch({ type: "retry" })}>
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
      <header className="flex flex-col gap-2 px-5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Link
            href="/heute"
            aria-label="Lernen beenden"
            onClick={confirmClose}
            className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "-ml-2 size-11")}
          >
            <X aria-hidden className="size-5" />
          </Link>
          <p className="font-heading text-sm font-semibold text-muted-foreground tabular-nums">
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
        className="flex-1 overflow-y-auto px-5 pt-8 pb-6 outline-none"
      >
        <StudyCard view={current.view} revealed={session.revealed} />
      </div>

      <footer className="flex flex-col gap-3 px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {skippedHint}
        {failedHint}
        {session.revealed ? (
          <div className="grid grid-cols-4 gap-2">
            {RATING_BUTTONS.map(({ rating, label }) => (
              <Button
                key={rating}
                variant="secondary"
                size="xl"
                className="h-16 flex-col gap-0.5 px-1"
                onClick={() => dispatch({ type: "rate", rating })}
              >
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-xs font-normal text-muted-foreground tabular-nums">
                  {labels[rating]}
                </span>
              </Button>
            ))}
          </div>
        ) : (
          <Button size="xl" className="w-full" onClick={() => dispatch({ type: "reveal" })}>
            Weg zeigen
          </Button>
        )}
      </footer>
    </Surface>
  );
}

/** Ganze Bildschirmfläche über dem App-Rahmen: diese Seite hat keine Navigation. */
function Surface({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-20 bg-background">
      <div className={cn("mx-auto flex h-full w-full max-w-md flex-col", className)}>{children}</div>
    </div>
  );
}
