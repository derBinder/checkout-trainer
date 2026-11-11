// Frei von Server-Abhängigkeiten, damit auch Client-Formulare es importieren können.

export const MIN_PASSWORD_LENGTH = 10;

// Entspricht dem Standardlimit von Better Auth (maxPasswordLength).
export const MAX_PASSWORD_LENGTH = 128;

export const MAX_NAME_LENGTH = 100;

// Höchstlänge einer Adresse nach RFC 5321.
export const MAX_EMAIL_LENGTH = 254;

/** Eigene Fehlermeldungen der Auth-Hooks; die Formulare zeigen sie unverändert. */
export const AUTH_MESSAGES = {
  operatorEmail: "Diese E-Mail-Adresse kann nicht registriert werden.",
  signUpClosed: "Die Registrierung ist zurzeit nicht möglich.",
  blocked: "Dieses Konto ist gesperrt.",
  operatorDelete: "Das Betreiberkonto kann nicht gelöscht werden.",
  nameRequired: "Bitte gib einen Namen ein.",
  nameTooLong: `Der Name darf höchstens ${MAX_NAME_LENGTH} Zeichen haben.`,
  nameInvalid: "Der Name enthält unzulässige Zeichen.",
  emailTooLong: "Die E-Mail-Adresse ist zu lang.",
  imageNotAllowed: "Ein Profilbild wird nicht unterstützt.",
  passwordRequired: "Bitte gib dein Passwort ein.",
} as const;
