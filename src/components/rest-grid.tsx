import { isBogey } from "@/lib/darts/checkouts";
import { MAX_REST, MIN_REST, type Level } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { LEVEL_CELL, LEVEL_LABEL, WEAK_RING } from "./level-style";

const RESTS = Array.from({ length: MAX_REST - MIN_REST + 1 }, (_, i) => MIN_REST + i);

export const CELL_BASE =
  "flex items-center justify-center rounded-cell font-heading font-bold tabular-nums outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring";

/** Maße einer Rasterzelle; eingefärbtes und neutrales Raster teilen sie. */
const CELL_SIZE = "h-11 w-full text-sm md:text-base";

/**
 * Zehnerreihen (2 bis 9, 10 bis 19, …); cell rendert den Inhalt je Rest.
 * placeholder: Platzhalter, für Screenreader versteckt.
 */
function RestCells({
  cell,
  placeholder = false,
}: {
  cell: (rest: number) => React.ReactNode;
  placeholder?: boolean;
}) {
  return (
    <ol
      aria-label="Alle Reste von 2 bis 170"
      aria-hidden={placeholder || undefined}
      className="grid grid-cols-10 gap-1"
    >
      {RESTS.map((rest) => (
        // Reste unter 10 beginnen in der dritten Spalte, damit jede Reihe bei einer Zehnerzahl anfängt.
        <li key={rest} className={cn(rest === MIN_REST && "col-start-3")}>
          {cell(rest)}
        </li>
      ))}
    </ol>
  );
}

/**
 * Alle Reste von 2 bis 170, eingefärbt nach Lernstand. Jede Zelle trägt data-rest;
 * das Öffnen übernimmt RestSheet.
 */
export function RestGrid({ levels, weak }: { levels: Record<number, Level>; weak: Set<number> }) {
  return (
    <RestCells
      cell={(rest) => {
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
          <button
            type="button"
            data-rest={rest}
            aria-label={label}
            className={cn(CELL_BASE, CELL_SIZE, LEVEL_CELL[level], hard && WEAK_RING)}
          >
            {rest}
          </button>
        );
      }}
    />
  );
}

/**
 * Das Raster im Gerüst, solange die Lernstände laden: alle Felder in der Darstellung
 * „neu", ohne Antipp-Funktion und ohne Nutzerdaten. Für Screenreader versteckt, damit
 * die 169 Zahlen nicht vor dem echten Raster ein zweites Mal vorgelesen werden.
 */
export function NeutralRestGrid() {
  return (
    <RestCells
      placeholder
      cell={(rest) => <span className={cn(CELL_BASE, CELL_SIZE, LEVEL_CELL.new)}>{rest}</span>}
    />
  );
}
