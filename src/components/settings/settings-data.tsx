import { cache } from "react";
import { getDictionary } from "@/i18n/server";
import { requireActiveUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { loadExtraCards } from "@/lib/extra-cards-db";
import { DeleteAccount } from "./delete-account";
import { ExtraCardsSwitches } from "./extra-cards-form";
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

/** Die Schalter stehen nicht in der Sitzung: zuerst der Zugriff, dann die Datenbank. */
const loadExtraCardSettings = cache(async () => {
  const user = await requireActiveUser();
  return loadExtraCards(db, user.id);
});

/** Die Schalter der Zusatzkarten mit dem gespeicherten Zustand. */
export async function ExtraCardsField() {
  return <ExtraCardsSwitches initial={await loadExtraCardSettings()} />;
}

/** „Konto löschen"; entfällt für das Betreiberkonto. */
export async function DeleteAccountSection() {
  const { operator } = await loadSettings();
  if (operator) return null;
  const t = await getDictionary();
  return (
    <SettingsSection title={t.settings.deleteAccount.title}>
      <DeleteAccount />
    </SettingsSection>
  );
}
