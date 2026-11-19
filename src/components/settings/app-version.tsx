// Nur in Serverkomponenten verwenden: Der Import von package.json soll nicht ins Browser-Bundle.
import { version } from "../../../package.json";

/** Version des laufenden Stands, ganz unten in den Einstellungen. */
export function AppVersion({ label }: { label: (v: string) => string }) {
  return <p className="text-sm text-muted-foreground">{label(version)}</p>;
}
