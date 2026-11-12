/**
 * Bausteine der Einstellungen, die Inhalt und Skeleton gemeinsam nutzen, damit beide
 * dieselben Maße haben. Rein darstellend, ohne Datenzugriff.
 */

/** Spalte unter dem Titel: ein Abschnitt je Einstellung. */
export const SETTINGS_BODY = "flex flex-col gap-12";
/** Ein Abschnitt: Überschrift, darunter das Formular. */
export const SETTINGS_SECTION = "flex flex-col gap-5";
export const SECTION_TITLE = "text-xl font-extrabold font-stretch-semi-expanded";

export function SettingsSection({
  title,
  titleId,
  children,
}: {
  title: string;
  titleId?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={SETTINGS_SECTION}>
      <h2 id={titleId} className={SECTION_TITLE}>
        {title}
      </h2>
      {children}
    </section>
  );
}
