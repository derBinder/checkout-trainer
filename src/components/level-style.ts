import type { Level } from "@/lib/stats";

export const LEVEL_LABEL: Record<Level, string> = {
  known: "sicher",
  learning: "im Lernen",
  new: "neu",
};

/**
 * Lernstand eines Rests, nicht nur über die Farbe unterscheidbar:
 *   neu        umrandet, ohne Füllung, Zahl in normaler Stärke
 *   im Lernen  gelbe Fläche
 *   sicher     Fläche in Schriftfarbe mit kurzem Strich unter der Zahl
 */
export const LEVEL_CELL: Record<Level, string> = {
  new: "border border-input bg-level-new font-normal text-foreground",
  learning: "bg-level-learning text-accent-foreground",
  known:
    "relative bg-level-known text-background after:absolute after:bottom-1 after:left-1/2 after:h-0.5 after:w-3 after:-translate-x-1/2 after:rounded-pill after:bg-background",
};

/** Muster der Legende: dieselbe Zelle in klein, damit Legende und Raster übereinstimmen. */
export const LEVEL_SAMPLE = "inline-block h-4 w-5 shrink-0 rounded-cell";

/** Markierung der schwierigsten Reste. */
export const WEAK_RING = "ring-2 ring-inset ring-level-weak";
