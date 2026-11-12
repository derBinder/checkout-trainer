/**
 * Bausteine der Heute-Seite, die Inhalt und Skeleton gemeinsam nutzen, damit
 * beide dieselben Maße haben. Rein darstellend, ohne Datenzugriff.
 */

/** Spalte unter dem Titel: Zahlen, Fortschritt, Knopf. */
export const TODAY_BODY = "flex flex-col gap-8";

/** Lage des Knopfs „Lernen" (Höhe und Form kommen von buttonVariants size xl). */
export const LEARN_BUTTON_LAYOUT = "mt-4 w-full sm:w-auto sm:self-start sm:px-10";

export function Counts({ children }: { children: React.ReactNode }) {
  return <dl className="flex gap-10">{children}</dl>;
}

/**
 * Feste Spaltenbreite für bis zu drei Ziffern, damit „neu" unabhängig von der Stellenzahl
 * der fälligen Karten und vom Skeleton immer an derselben Stelle steht.
 */
export function Count({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-36 flex-col gap-2">
      <dt className="type-label order-2">{label}</dt>
      <dd className="type-display text-6xl tabular-nums">{children}</dd>
    </div>
  );
}

/** Fortschrittstext mit Prozent und darunter der Balken; children füllen den Balken. */
export function ProgressLine({
  label,
  percent,
  children,
}: {
  label: React.ReactNode;
  percent: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        {/* div statt span: Die Plätze nehmen auch die Skeletons (Blockelemente) auf. */}
        <div className="font-bold tabular-nums">{label}</div>
        <div className="font-medium text-muted-foreground tabular-nums">{percent}</div>
      </div>
      {/* Der Text darüber sagt dasselbe, der Balken ist nur Bild: links sicher, daneben im Lernen. */}
      <div aria-hidden className="flex h-2.5 overflow-hidden rounded-pill bg-muted">
        {children}
      </div>
    </div>
  );
}
