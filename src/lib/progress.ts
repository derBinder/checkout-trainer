import type { Level } from "./stats";

/** Kleinste Breite in Prozent, damit auch ein einzelner Rest im Balken zu sehen ist. */
const MIN_VISIBLE = 2;

export type ProgressView = {
  /** Reste, die schon einmal gelernt wurden: im Lernen plus sicher. */
  started: number;
  known: number;
  total: number;
  /** Anteil der begonnenen Reste, gerundet. */
  percent: number;
  /** Breiten der beiden Balkenabschnitte in Prozent, zusammen höchstens 100. */
  knownWidth: number;
  learningWidth: number;
};

function width(count: number, total: number): number {
  if (count === 0 || total === 0) return 0;
  return Math.max((count / total) * 100, MIN_VISIBLE);
}

/** Fortschritt auf der Heute-Seite: begonnen (im Lernen) und sicher als zwei Abschnitte eines Balkens. */
export function progressView(counts: Record<Level, number>): ProgressView {
  const total = counts.new + counts.learning + counts.known;
  const started = counts.learning + counts.known;
  const knownWidth = Math.min(width(counts.known, total), 100);
  const learningWidth = Math.min(width(counts.learning, total), 100 - knownWidth);
  return {
    started,
    known: counts.known,
    total,
    percent: total === 0 ? 0 : Math.round((started / total) * 100),
    knownWidth,
    learningWidth,
  };
}
