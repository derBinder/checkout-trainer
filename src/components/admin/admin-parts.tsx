/**
 * Bausteine der Verwaltung, die Nutzerliste und Skeleton gemeinsam nutzen, damit
 * beide dieselben Maße haben. Rein darstellend, ohne Datenzugriff.
 */

/** Spalte der Seite: Titel, darunter die Nutzerliste. */
export const ADMIN_BODY = "flex flex-col gap-8";
export const USER_LIST = "flex flex-col gap-3";
/** Eine Nutzerzeile: Angaben oben, darunter die Aktionen. */
export const USER_ROW = "flex flex-col gap-4 rounded-card bg-muted p-4";
/** Die Knöpfe einer Nutzerzeile. */
export const USER_ACTIONS_ROW = "flex flex-wrap gap-2";

/** Name, E-Mail-Adresse und Status mit Registrierdatum, je eine Zeile. */
export function UserRowDetails({
  name,
  email,
  meta,
}: {
  name: React.ReactNode;
  email: React.ReactNode;
  meta: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-bold break-words">{name}</div>
      <div className="text-sm break-all text-muted-foreground">{email}</div>
      <div className="text-sm text-muted-foreground">{meta}</div>
    </div>
  );
}
