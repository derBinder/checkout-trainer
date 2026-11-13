import { useDictionary } from "@/i18n/client";
import { cn } from "@/lib/utils";

type DartSlotsProps = {
  slots: (string | null)[];
  /** Gesetzt in der Auflösung: färbt die Würfe und zeigt nur so viele Felder, wie der Weg Darts hat. */
  tone?: "best" | "none";
  /** Felder, die ein Fehlwurf sind. */
  missSlots?: number[];
  /** Beim Eingeben: das nächste offene Feld, mit durchgezogenem Rand hervorgehoben. */
  next?: number;
  /** Kleiner für zwei Reihen untereinander (Auflösung mit „Dein Weg“). */
  size?: "sm";
  /** Name der Reihe für Screenreader, wenn mehrere untereinander stehen; ohne Angabe „Darts“. */
  label?: string;
};

const SLOT_COUNT = 3;

/** Reihe der Felder; das Skeleton der Fragenansicht nutzt sie mit. */
export const SLOTS_ROW = "flex justify-center gap-2";
/** Form und Maße eines Felds; das Skeleton der Fragenansicht nutzt sie mit. */
export const SLOT_BOX =
  "flex h-13 basis-1/3 items-center justify-center rounded-pill font-heading text-lg font-extrabold tabular-nums";

/**
 * Dart-Felder als Pillen. In der Frage immer drei, offene mit „?“; in der
 * Auflösung nur die geworfenen Darts. Jedes Feld ist ein Drittel breit, auch
 * wenn weniger als drei zu sehen sind.
 */
export function DartSlots({ slots, tone, missSlots = [], next, size, label }: DartSlotsProps) {
  const t = useDictionary().study.slots;
  const answer = tone !== undefined;
  const shown = Array.from({ length: SLOT_COUNT }, (_, i) => ({ i, dart: slots[i] ?? null })).filter(
    ({ dart }) => !answer || dart !== null,
  );
  return (
    <ol aria-label={label ?? t.darts} className={SLOTS_ROW}>
      {shown.map(({ i, dart }) => {
        const miss = dart !== null && missSlots.includes(i);
        const isNext = dart === null && i === next;
        return (
          <li
            key={i}
            aria-current={isNext ? "step" : undefined}
            className={cn(
              SLOT_BOX,
              size === "sm" && "h-11 text-base",
              dart === null && "border-2 border-dashed border-input/50 text-muted-foreground",
              isNext && "border-solid border-foreground",
              dart !== null && "bg-muted text-foreground",
              dart !== null && tone === "best" && "bg-primary text-primary-foreground",
              miss && "bg-destructive text-destructive-foreground",
            )}
          >
            {dart === null ? (
              <>
                <span aria-hidden>?</span>
                <span className="sr-only">{t.open}</span>
              </>
            ) : (
              <>
                {dart}
                {miss && <span className="sr-only"> ({t.miss})</span>}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
