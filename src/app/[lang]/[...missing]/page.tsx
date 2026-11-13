import { notFound } from "next/navigation";

// Die Seite rendert nie, sie löst nur die Fehlerseite aus. Ohne den Schalter
// meldet `next dev` bei jedem Aufruf, dass sich `instant` nicht prüfen lässt.
export const instant = false;

/**
 * Fängt jede Adresse unter einer Sprache ab, die keine Seite hat, und zeigt die
 * Fehlerseite aus ../not-found.tsx in der Sprache der Adresse (Status 404).
 */
export default function MissingPage(): never {
  notFound();
}
