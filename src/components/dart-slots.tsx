import { cn } from "@/lib/utils";

type DartSlotsProps = {
  slots: (string | null)[];
  /** Gesetzt in der Auflösung: färbt die Würfe und zeigt nur so viele Felder, wie der Weg Darts hat. */
  tone?: "best" | "none";
  /** Felder, die ein Fehlwurf sind. */
  missSlots?: number[];
};

const SLOT_COUNT = 3;

/**
 * Dart-Felder als Pillen. In der Frage immer drei, offene mit „?“; in der
 * Auflösung nur die geworfenen Darts. Jedes Feld ist ein Drittel breit, auch
 * wenn weniger als drei zu sehen sind.
 */
export function DartSlots({ slots, tone, missSlots = [] }: DartSlotsProps) {
  const answer = tone !== undefined;
  const shown = Array.from({ length: SLOT_COUNT }, (_, i) => ({ i, dart: slots[i] ?? null })).filter(
    ({ dart }) => !answer || dart !== null,
  );
  return (
    <ol aria-label="Darts" className="flex justify-center gap-2">
      {shown.map(({ i, dart }) => {
        const miss = dart !== null && missSlots.includes(i);
        return (
          <li
            key={i}
            className={cn(
              "flex h-13 basis-1/3 items-center justify-center rounded-pill font-heading text-lg font-extrabold tabular-nums",
              dart === null && "border-2 border-dashed border-input/50 text-muted-foreground",
              dart !== null && "bg-muted text-foreground",
              dart !== null && tone === "best" && "bg-primary text-primary-foreground",
              miss && "bg-destructive text-destructive-foreground",
            )}
          >
            {dart === null ? (
              <>
                <span aria-hidden>?</span>
                <span className="sr-only">offen</span>
              </>
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
