import { LEVEL_CELL, LEVEL_SAMPLE } from "@/components/level-style";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Level } from "@/lib/stats";
import { cn } from "@/lib/utils";

/**
 * Bausteine der Statistik, die Inhalt und Skeleton gemeinsam nutzen, damit beide
 * dieselben Maße haben. Rein darstellend, ohne Datenzugriff.
 */

/** Spalte unter dem Titel: Zähler, Raster, schwierigste Reste. */
export const STATS_BODY = "flex flex-col gap-10";

/** Zähler mit der Prognosezeile darunter. */
export const STATS_COUNTS = "flex flex-col gap-4";

/** Die Prognosezeile; das Skeleton hat dieselbe Zeilenhöhe (h-5 zu text-sm). */
export const FORECAST_LINE = "text-sm text-muted-foreground";

const COUNT_ORDER: Level[] = ["known", "learning", "new"];

/** Die drei Zähler, zugleich die Legende des Rasters; value rendert die Zahl je Lernstand. */
export function LevelCounts({
  value,
  t,
}: {
  value: (level: Level) => React.ReactNode;
  t: Dictionary["stats"];
}) {
  return (
    <dl className="grid grid-cols-3 gap-2">
      {COUNT_ORDER.map((level) => (
        <div key={level} className="flex flex-col gap-2">
          <dt className="type-label order-2 flex items-center gap-1.5 whitespace-nowrap">
            <span aria-hidden className={cn(LEVEL_SAMPLE, LEVEL_CELL[level])} />
            {t.levels[level]}
          </dt>
          <dd className="type-display text-5xl tabular-nums">{value(level)}</dd>
        </div>
      ))}
    </dl>
  );
}
