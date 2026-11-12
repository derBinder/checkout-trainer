import { cache } from "react";
import { requireActiveUser } from "@/lib/auth/guard";
import { DeleteAccount } from "./delete-account";
import { NewPerDayInput } from "./new-per-day-form";
import { SettingsSection } from "./settings-parts";

/**
 * Prüft zuerst den Zugriff und liefert, was die Einstellungen vom Konto brauchen.
 * cache(): Beide Datenbausteine der Seite teilen sich innerhalb einer Anfrage eine Abfrage.
 */
const loadSettings = cache(async () => {
  const user = await requireActiveUser();
  return { newPerDay: user.newPerDay, operator: user.role === "admin" };
});

/** Das Eingabefeld „Neue Karten pro Tag" mit dem gespeicherten Wert. */
export async function NewPerDayField() {
  const { newPerDay } = await loadSettings();
  return <NewPerDayInput initial={newPerDay} />;
}

/** „Konto löschen"; entfällt für das Betreiberkonto. */
export async function DeleteAccountSection() {
  const { operator } = await loadSettings();
  if (operator) return null;
  return (
    <SettingsSection title="Konto löschen">
      <DeleteAccount />
    </SettingsSection>
  );
}
