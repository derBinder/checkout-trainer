import { Delete } from "lucide-react";
import { useDictionary } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Form und Schrift einer Taste des Zahlenfelds. */
const KEY =
  "flex h-12 items-center justify-center rounded-cell font-heading text-xl font-bold tabular-nums outline-ring transition select-none focus-visible:outline-2 active:scale-97 disabled:opacity-40";

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Zahlenfeld der Übung „Rechnen“: 1–9, Löschen, 0, Prüfen. Keine Bildschirmtastatur.
 * Rein darstellend: Was gesperrt ist, sagt die Runde.
 */
export function MathPad({
  digitsDisabled,
  zeroDisabled,
  deleteDisabled,
  checkDisabled,
  onDigit,
  onDelete,
  onCheck,
}: {
  digitsDisabled: boolean;
  zeroDisabled: boolean;
  deleteDisabled: boolean;
  checkDisabled: boolean;
  onDigit: (d: number) => void;
  onDelete: () => void;
  onCheck: () => void;
}) {
  const t = useDictionary().practice.math;
  const digit = (d: number, disabled: boolean) => (
    <button
      key={d}
      type="button"
      disabled={disabled}
      className={cn(KEY, "bg-muted hover:bg-secondary-hover")}
      onClick={() => onDigit(d)}
    >
      {d}
    </button>
  );
  return (
    // touch-manipulation: ein schneller zweiter Tipp (8, 8) zoomt nicht.
    <div className="grid touch-manipulation grid-cols-3 gap-1.5">
      {DIGITS.map((d) => digit(d, digitsDisabled))}
      <button
        type="button"
        disabled={deleteDisabled}
        aria-label={t.deleteLast}
        className={cn(KEY, "bg-muted hover:bg-secondary-hover")}
        onClick={onDelete}
      >
        <Delete aria-hidden className="size-5" />
      </button>
      {digit(0, zeroDisabled)}
      <button
        type="button"
        disabled={checkDisabled}
        className={cn(KEY, "bg-primary text-base text-primary-foreground hover:bg-primary/85")}
        onClick={onCheck}
      >
        {t.check}
      </button>
    </div>
  );
}
