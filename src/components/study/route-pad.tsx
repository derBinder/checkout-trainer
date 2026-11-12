import { Delete } from "lucide-react";
import { useDictionary } from "@/i18n/client";
import type { Ring } from "@/lib/darts/model";
import { cn } from "@/lib/utils";
import { isFull, type InputAction, type InputState } from "./route-input";

/** Maße des Tastenfelds; das Skeleton der Fragenansicht nutzt sie mit. */
export const RING_BAR = "grid grid-cols-3 gap-1 rounded-field bg-muted p-1";
export const RING_SEGMENT = "h-9 rounded-cell";
export const PAD_GRID = "grid grid-cols-5 gap-1.5";
export const PAD_KEY = "h-10 rounded-cell";
/** Tasten im Raster: 20 Zahlen, „25“ und „Bull“ je zwei Spalten breit, Löschen. */
export const PAD_KEY_SPANS = [...Array<number>(20).fill(1), 2, 2, 1];

const RINGS: Ring[] = ["S", "D", "T"];

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1);

const KEY =
  "flex items-center justify-center font-heading text-base font-bold tabular-nums outline-ring transition select-none focus-visible:outline-2 active:scale-97 disabled:opacity-40";

/**
 * Ring-Umschalter S / D / T und Tastenfeld 1–20, 25, Bull, Löschen. Rein
 * darstellend: Zustand und Logik liegen in route-input.ts.
 */
export function RoutePad({ state, onAction }: { state: InputState; onAction: (a: InputAction) => void }) {
  const t = useDictionary().study.pad;
  const full = isFull(state);
  const ringName = t.rings[state.ring];
  return (
    // touch-manipulation: ein schneller zweiter Tipp (T20 · T20) zoomt nicht.
    <div className="flex touch-manipulation flex-col gap-2">
      <div role="radiogroup" aria-label={t.ring} className={RING_BAR}>
        {RINGS.map((ring) => {
          const on = state.ring === ring;
          return (
            <button
              key={ring}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={t.rings[ring]}
              className={cn(
                KEY,
                RING_SEGMENT,
                on ? "bg-primary text-primary-foreground" : "hover:bg-secondary-hover",
              )}
              onClick={() => onAction({ type: "ring", ring })}
            >
              {ring}
            </button>
          );
        })}
      </div>
      <div className={PAD_GRID}>
        {NUMBERS.map((n) => (
          <button
            key={n}
            type="button"
            disabled={full}
            aria-label={`${ringName} ${n}`}
            className={cn(KEY, PAD_KEY, "bg-muted hover:bg-secondary-hover")}
            onClick={() => onAction({ type: "number", n })}
          >
            {n}
          </button>
        ))}
        <button
          type="button"
          disabled={full}
          aria-label={t.singleBull}
          className={cn(KEY, PAD_KEY, "col-span-2 bg-muted hover:bg-secondary-hover")}
          onClick={() => onAction({ type: "outer" })}
        >
          25
        </button>
        <button
          type="button"
          disabled={full}
          className={cn(KEY, PAD_KEY, "col-span-2 bg-muted hover:bg-secondary-hover")}
          onClick={() => onAction({ type: "bull" })}
        >
          Bull
        </button>
        <button
          type="button"
          disabled={state.darts.length === 0}
          aria-label={t.deleteLast}
          className={cn(KEY, PAD_KEY, "bg-muted hover:bg-secondary-hover")}
          onClick={() => onAction({ type: "undo" })}
        >
          <Delete aria-hidden className="size-5" />
        </button>
      </div>
    </div>
  );
}
