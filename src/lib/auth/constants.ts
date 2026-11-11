// Frei von Server-Abhängigkeiten, damit auch Client-Formulare es importieren können.

export const MIN_PASSWORD_LENGTH = 10;

/** Eigene Fehlermeldungen der Auth-Hooks; die Formulare zeigen sie unverändert. */
export const AUTH_MESSAGES = {
  operatorEmail: "Diese E-Mail-Adresse kann nicht registriert werden.",
  blocked: "Dieses Konto ist gesperrt.",
  operatorDelete: "Das Betreiberkonto kann nicht gelöscht werden.",
} as const;
