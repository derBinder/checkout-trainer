import { cn } from "@/lib/utils";

/**
 * Bausteine der Lernseite, die Sitzung und Skeleton gemeinsam nutzen, damit beide
 * dieselben Maße haben. Rein darstellend, ohne Datenzugriff. Das Schließen-Kreuz
 * liegt in study-close-link.tsx, weil es die Sprache aus dem Client-Kontext braucht.
 */

/** Kopfzeile: Schließen-Kreuz und Zähler, darunter die Fortschrittslinie. */
export const STUDY_HEADER = "flex flex-col gap-1 px-page pt-inset-top";
export const STUDY_HEADER_ROW = "flex items-center justify-between";
/** Zähler „7 / 20" rechts in der Kopfzeile. */
export const STUDY_COUNTER = "text-sm font-semibold text-muted-foreground tabular-nums";
/** Fläche der Karte zwischen Kopf- und Fußzeile. */
export const STUDY_CONTENT = "flex flex-1 flex-col overflow-y-auto px-page py-4 outline-none";
/** Fußzeile mit „Nicht checkbar“, „Prüfen“, „Ohne Eingabe aufdecken“ bzw. den Bewertungen. */
export const STUDY_FOOTER = "flex touch-manipulation flex-col gap-3 px-page pt-3 pb-inset-bottom";

/** Ganze Bildschirmfläche über dem App-Rahmen: diese Seite hat keine Navigation. */
export function StudySurface({
  className,
  busy = false,
  children,
}: {
  className?: string;
  /** Skeleton: kennzeichnet die Fläche für Screenreader als ladend. */
  busy?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-20 bg-background">
      <div aria-busy={busy || undefined} className={cn("mx-auto flex h-full w-full max-w-md flex-col", className)}>
        {children}
      </div>
    </div>
  );
}
