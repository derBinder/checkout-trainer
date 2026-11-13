import type { Dictionary } from "@/i18n/dictionaries";
import { AUTH_ERRORS } from "@/lib/auth/constants";

type AuthError = { status: number; code?: string; message?: string };

const OWN_KEYS = new Set<string>(Object.values(AUTH_ERRORS));

/**
 * Better Auth meldet Fehler auf Englisch; die Oberfläche zeigt nur Texte aus dem
 * Wörterbuch. Eigene Fehler der Auth-Hooks tragen einen Schlüssel als Meldung.
 */
export function authErrorMessage(error: AuthError, t: Dictionary["auth"]): string {
  if (error.status === 429) return t.tooManyAttempts;
  if (error.message && OWN_KEYS.has(error.message)) {
    return t.errors[error.message as keyof typeof AUTH_ERRORS];
  }
  if (error.code && t.byCode[error.code]) return t.byCode[error.code];
  return t.fallback;
}
