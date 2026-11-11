import { cn } from "@/lib/utils";

type DartSlotsProps = {
  slots: (string | null)[];
  /** Gesetzt in der Auflösung: färbt die Würfe, leere Felder bleiben ohne Fragezeichen. */
  tone?: "best" | "none";
  /** Felder, die ein Fehlwurf sind. */
  missSlots?: number[];
};

const SLOT_COUNT = 3;

/** Immer drei Dart-Felder; null ist ein leeres Feld (in der Frage mit „?“). */
export function DartSlots({ slots, tone, missSlots = [] }: DartSlotsProps) {
  const answer = tone !== undefined;
  return (
    <ol aria-label="Darts" className="grid grid-cols-3 gap-2">
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const dart = slots[i] ?? null;
        const miss = dart !== null && missSlots.includes(i);
        return (
          <li
            key={i}
            className={cn(
              "flex h-14 items-center justify-center rounded-lg font-heading text-xl font-bold tabular-nums font-stretch-semi-condensed",
              dart === null && "border border-dashed border-input text-muted-foreground",
              dart !== null && "bg-muted text-foreground",
              dart !== null && tone === "best" && "bg-route-best/15 text-route-best",
              miss && "bg-route-miss/15 text-route-miss",
            )}
          >
            {dart === null ? (
              answer ? (
                <span className="sr-only">leer</span>
              ) : (
                <>
                  <span aria-hidden>?</span>
                  <span className="sr-only">offen</span>
                </>
              )
            ) : (
              <>
                {dart}
                {miss && <span className="sr-only"> (Fehlwurf)</span>}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
