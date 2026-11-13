"use client";

import { useRoundActive } from "./practice-round-store";

/**
 * Überschrift der Übungsseite. Während einer Runde liegt die Runde über der Seite;
 * dann ist die Überschrift auch für Screenreader weg, die Runde hat ihre eigene.
 */
export function PracticeTitle({ children }: { children: React.ReactNode }) {
  const roundActive = useRoundActive();
  return (
    <h1 hidden={roundActive} className="type-display text-3xl">
      {children}
    </h1>
  );
}
