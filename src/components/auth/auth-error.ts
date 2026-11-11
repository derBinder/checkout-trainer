import { AUTH_MESSAGES } from "@/lib/auth/constants";

type AuthError = { status: number; code?: string; message?: string };

const BY_CODE: Record<string, string> = {
  USER_ALREADY_EXISTS: "Unter dieser E-Mail-Adresse gibt es schon ein Konto.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    "Unter dieser E-Mail-Adresse gibt es schon ein Konto.",
  INVALID_EMAIL_OR_PASSWORD: "E-Mail-Adresse oder Passwort stimmt nicht.",
  INVALID_EMAIL: "Diese E-Mail-Adresse ist ungültig.",
  PASSWORD_TOO_SHORT: "Das Passwort ist zu kurz.",
  PASSWORD_TOO_LONG: "Das Passwort ist zu lang.",
};

const OWN_MESSAGES = new Set<string>(Object.values(AUTH_MESSAGES));

/** Better Auth meldet Fehler auf Englisch; die Oberfläche zeigt nur deutsche Texte. */
export function authErrorMessage(error: AuthError): string {
  if (error.status === 429) {
    return "Zu viele Versuche. Warte ein paar Minuten und versuche es dann erneut.";
  }
  if (error.message && OWN_MESSAGES.has(error.message)) return error.message;
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code];
  return "Das hat nicht geklappt. Versuche es erneut.";
}
