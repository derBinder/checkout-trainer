import { cn } from "@/lib/utils";

/**
 * Bausteine der Übungsseite, die Auswahl und Skeleton gemeinsam nutzen, damit
 * beide dieselben Maße haben. Rein darstellend, ohne Datenzugriff.
 */

/** Spalte unter dem Titel: Umschalter, Einstellungen, Knopf. */
export const PRACTICE_BODY = "flex flex-col gap-6";
/** Abschnitt mit Beschriftung und Chips. */
export const PRACTICE_SECTION = "flex flex-col gap-2";
/** Segmentleiste „Wege | Rechnen“, wie die Darstellungswahl. */
export const SEGMENT_BAR = "grid grid-cols-2 rounded-panel bg-muted p-1";
export const SEGMENT_HEIGHT = "h-12";
/** Chips in vier Spalten (Bereiche in zwei Reihen, Kartenart in einer). */
export const CHIP_GRID = "grid grid-cols-4 gap-2";
export const CHIP = "flex h-10 items-center justify-center rounded-pill px-1 text-sm font-semibold tabular-nums";
/** Statuszeile über „Los“ und der Knopf selbst (Höhe und Form von buttonVariants size xl). */
export const START_AREA = "flex flex-col gap-3";
export const STATUS_LINE = "text-sm text-muted-foreground";
export const START_BUTTON_LAYOUT = "w-full sm:w-auto sm:self-start sm:px-10";

/** Beschriftung eines Abschnitts; `id` verbindet sie mit der Gruppe darunter. */
export function SectionLabel({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <p id={id} className={cn("type-label", className)}>
      {children}
    </p>
  );
}
