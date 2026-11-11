"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { submitReview } from "@/lib/review/actions";
import type { Rating } from "@/lib/srs/fsrs";
import { initSession, sessionReducer } from "@/lib/srs/session";
import { cn } from "@/lib/utils";
import type { CardView } from "./card-view";
import { StudyCard } from "./study-card";

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
  const [state, dispatch] = useReducer(sessionReducer, items, (list) =>
    initSession(list.map((item) => item.id)),
  );
  // Bewertungen dieser Sitzung je Karte; jede Bewertung erhöht reps auf dem Server um eins.
  const [ratedById, setRatedById] = useState<Record<string, number>>({});
  const [saveFailed, setSaveFailed] = useState(false);

  // Speichern läuft im Hintergrund, eine Bewertung nach der anderen in Reihenfolge:
  // eine spätere Bewertung derselben Karte setzt die frühere voraus.
  const inFlight = useRef(false);
  const retryAllowed = useRef(true);
  const [retryToken, retry] = useReducer((n: number) => n + 1, 0);
  const next = state.unsynced[0];

  useEffect(() => {
    if (!next || inFlight.current || !retryAllowed.current) return;
    inFlight.current = true;
    submitReview(next).then(
      (result) => {
        inFlight.current = false;
        if (!result.ok && result.reason === "auth") {
          router.replace("/anmelden");
          return;
        }
        // "stale" heißt: schon gespeichert (doppelt gesendet). "limit", "invalid"
        // und "unknown-card" kommen aus dieser Oberfläche nicht vor; sie werden
        // übersprungen, damit die Sitzung nie hängen bleibt.
        setSaveFailed(false);
        dispatch({ type: "saved", cardId: next.cardId });
      },
      () => {
        inFlight.current = false;
        retryAllowed.current = false;
        setSaveFailed(true);
        dispatch({ type: "saveFailed", cardId: next.cardId });
      },
    );
  }, [next, retryToken, router]);

  const finished = state.queue.length === 0;

  // Erneuter Versuch beim Sitzungsende.
  useEffect(() => {
    if (!finished) return;
    retryAllowed.current = true;
    retry();
  }, [finished]);

  const currentId = state.queue[0];
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
  }, [currentId, state.revealed, state.total]);

  function rate(rating: Rating) {
    if (!current) return;
    const rated = ratedById[current.id] ?? 0;
    retryAllowed.current = true; // erneuter Versuch bei der nächsten Bewertung
    retry();
    setRatedById({ ...ratedById, [current.id]: rated + 1 });
    dispatch({ type: "rate", rating, reps: current.reps + rated });
  }

  const saveHint = saveFailed && state.unsynced.length > 0 && (
    <p role="status" className="text-center text-sm text-destructive">
      Nicht gespeichert, wird erneut versucht
    </p>
  );

  if (finished || !current) {
    return (
      <Surface className="px-5 pt-[max(4rem,14dvh)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="text-[clamp(3rem,16vw,4.5rem)] leading-none font-extrabold font-stretch-condensed">
            Geschafft
          </h1>
          <p className="text-lg text-muted-foreground">
            {state.done === 1 ? "1 Karte" : `${state.done} Karten`} gelernt.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          {saveHint}
          <Link href="/heute" className={cn(buttonVariants({ size: "xl" }), "w-full")}>
            Zur Übersicht
          </Link>
        </div>
      </Surface>
    );
  }

  const rated = ratedById[current.id] ?? 0;
  const labels = current.labels[Math.min(rated, current.labels.length - 1)];
  const position = Math.min(state.done + 1, state.total);

  return (
    <Surface>
      <header className="flex flex-col gap-2 px-5 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <Link
            href="/heute"
            aria-label="Lernen beenden"
            className={cn(buttonVariants({ variant: "ghost", size: "icon-lg" }), "-ml-2 size-11")}
          >
            <X aria-hidden className="size-5" />
          </Link>
          <p className="font-heading text-sm font-semibold text-muted-foreground tabular-nums">
            {position} / {state.total}
          </p>
        </div>
        <Progress
          value={state.done}
          max={state.total}
          aria-label="Fortschritt"
          getAriaValueText={() => `${state.done} von ${state.total} Karten gelernt`}
        />
      </header>

      <div
        ref={contentRef}
        tabIndex={-1}
        className="flex-1 overflow-y-auto px-5 pt-8 pb-6 outline-none"
      >
        <StudyCard view={current.view} revealed={state.revealed} />
      </div>

      <footer className="flex flex-col gap-3 px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {saveHint}
        {state.revealed ? (
          <div className="grid grid-cols-4 gap-2">
            {RATING_BUTTONS.map(({ rating, label }) => (
              <Button
                key={rating}
                variant="secondary"
                size="xl"
                className="h-16 flex-col gap-0.5 px-1"
                onClick={() => rate(rating)}
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
