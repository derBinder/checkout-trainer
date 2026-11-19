// Nur in Serverkomponenten: package.json soll nicht ins Browser-Bundle. Ein Import aus
// einer Client-Komponente bricht dank server-only den Bau ab.
import "server-only";
import { version } from "../../../package.json";

/** Version des laufenden Stands, ganz unten in den Einstellungen. */
export function AppVersion({ label }: { label: (v: string) => string }) {
  return <p className="text-sm text-muted-foreground">{label(version)}</p>;
}
