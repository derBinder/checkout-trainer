// Frei von Server-Abhängigkeiten, damit auch Client-Formulare es importieren können.

export const MIN_PASSWORD_LENGTH = 10;

// Entspricht dem Standardlimit von Better Auth (maxPasswordLength).
export const MAX_PASSWORD_LENGTH = 128;

export const MAX_NAME_LENGTH = 100;

// Höchstlänge einer Adresse nach RFC 5321.
export const MAX_EMAIL_LENGTH = 254;

/**
 * Eigene Fehler der Auth-Hooks. Die Meldung des `APIError` ist der Schlüssel selbst;
 * die Oberfläche übersetzt ihn über das Wörterbuch (`auth.errors`).
 */
export const AUTH_ERRORS = {
  operatorEmail: "operatorEmail",
  signUpClosed: "signUpClosed",
  blocked: "blocked",
  operatorDelete: "operatorDelete",
  nameRequired: "nameRequired",
  nameTooLong: "nameTooLong",
  nameInvalid: "nameInvalid",
  emailTooLong: "emailTooLong",
  imageNotAllowed: "imageNotAllowed",
  passwordRequired: "passwordRequired",
} as const;

export type AuthErrorKey = keyof typeof AUTH_ERRORS;
