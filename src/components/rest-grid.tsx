import { isBogey } from "@/lib/darts/checkouts";
import { MAX_REST, MIN_REST, type Level } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { LEVEL_CELL, LEVEL_LABEL, WEAK_RING } from "./level-style";

const RESTS = Array.from({ length: MAX_REST - MIN_REST + 1 }, (_, i) => MIN_REST + i);

export const CELL_BASE =
  "flex items-center justify-center rounded-cell font-heading font-bold tabular-nums outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring";

/**
 * Alle Reste von 2 bis 170 in Zehnerreihen (2 bis 9, 10 bis 19, …), eingefärbt
 * nach Lernstand. Jede Zelle trägt data-rest; das Öffnen übernimmt RestSheet.
 */
export function RestGrid({ levels, weak }: { levels: Record<number, Level>; weak: Set<number> }) {
  return (
    <ol aria-label="Alle Reste von 2 bis 170" className="grid grid-cols-10 gap-1">
      {RESTS.map((rest) => {
        const level = levels[rest];
        const hard = weak.has(rest);
        const label = [
          rest,
          LEVEL_LABEL[level],
          isBogey(rest) && "nicht checkbar",
          hard && "schwierig",
        ]
          .filter(Boolean)
          .join(", ");
        return (
          // Reste unter 10 beginnen in der dritten Spalte, damit jede Reihe bei einer Zehnerzahl anfängt.
          <li key={rest} className={cn(rest === MIN_REST && "col-start-3")}>
            <button
              type="button"
              data-rest={rest}
              aria-label={label}
              className={cn(CELL_BASE, "h-11 w-full text-sm md:text-base", LEVEL_CELL[level], hard && WEAK_RING)}
            >
              {rest}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
