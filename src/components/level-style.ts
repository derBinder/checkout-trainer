import type { Level } from "@/lib/stats";

export const LEVEL_LABEL: Record<Level, string> = {
  known: "sicher",
  learning: "im Lernen",
  new: "neu",
};

/** Farbe eines Rests nach Lernstand: neu grau, im Lernen getönt, sicher voll. */
export const LEVEL_CELL: Record<Level, string> = {
  new: "bg-level-new text-foreground/75",
  learning: "bg-level-learning/45 text-foreground",
  known: "bg-level-known text-background",
};

/** Markierung der schwierigsten Reste. */
export const WEAK_RING = "ring-2 ring-inset ring-level-weak";
