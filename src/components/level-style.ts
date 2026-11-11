import type { Level } from "@/lib/stats";

export const LEVEL_LABEL: Record<Level, string> = {
  known: "sicher",
  learning: "im Lernen",
  new: "neu",
};

/** Farbe eines Rests nach Lernstand: neu Fläche, im Lernen Gelb, sicher voll in Schriftfarbe. */
export const LEVEL_CELL: Record<Level, string> = {
  new: "bg-level-new text-foreground",
  learning: "bg-level-learning text-accent-foreground",
  known: "bg-level-known text-background",
};

/** Kleines Farbfeld der Legende; der Rand hält „neu“ auf hellem Grund sichtbar. */
export const LEVEL_SWATCH = "size-3 shrink-0 rounded-pill ring-1 ring-inset ring-foreground/20";

/** Markierung der schwierigsten Reste. */
export const WEAK_RING = "ring-2 ring-inset ring-level-weak";
