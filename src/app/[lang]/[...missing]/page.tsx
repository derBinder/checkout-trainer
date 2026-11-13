import { notFound } from "next/navigation";

/**
 * Fängt jede Adresse unter einer Sprache ab, die keine Seite hat, und zeigt die
 * Fehlerseite aus ../not-found.tsx in der Sprache der Adresse (Status 404).
 */
export default function MissingPage(): never {
  notFound();
}
