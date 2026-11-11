// Nur zod/mini und Konstanten: Die Datei wird auch von Client-Formularen importiert.
import * as z from "zod/mini";
import {
  AUTH_MESSAGES,
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/constants";
import { MAX_NEW_PER_DAY } from "@/lib/settings";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

// Unicode Cc und Cf: Steuerzeichen (NUL, Zeilenumbruch), Richtungs- und
// unsichtbare Zeichen (RTL-Override, Nullbreite).
const FORBIDDEN_NAME_CHARACTERS = /[\p{Cc}\p{Cf}]/u;

// Gilt im Formular und auf dem Server (Auth-Hooks in src/lib/auth/index.ts).
export const nameSchema = z
  .string(AUTH_MESSAGES.nameRequired)
  .check(
    z.trim(),
    z.minLength(1, AUTH_MESSAGES.nameRequired),
    z.maxLength(MAX_NAME_LENGTH, AUTH_MESSAGES.nameTooLong),
    z.refine(
      (value) => !FORBIDDEN_NAME_CHARACTERS.test(value),
      AUTH_MESSAGES.nameInvalid,
    ),
  );

export const emailSchema = z
  .string("Bitte gib deine E-Mail-Adresse ein.")
  .check(
    z.trim(),
    z.minLength(1, "Bitte gib deine E-Mail-Adresse ein."),
    z.maxLength(MAX_EMAIL_LENGTH, AUTH_MESSAGES.emailTooLong),
    z.regex(
      EMAIL_PATTERN,
      "Das ist keine gültige E-Mail-Adresse, zum Beispiel name@beispiel.de.",
    ),
  );

// Passwörter werden nie getrimmt: Leerzeichen sind erlaubt.
export const passwordRequiredSchema = z
  .string("Bitte gib ein Passwort ein.")
  .check(z.minLength(1, "Bitte gib ein Passwort ein."));

export const currentPasswordSchema = z
  .string("Bitte gib dein aktuelles Passwort ein.")
  .check(z.minLength(1, "Bitte gib dein aktuelles Passwort ein."));

export const newPasswordSchema = z
  .string("Bitte gib ein Passwort ein.")
  .check(
    z.minLength(1, "Bitte gib ein Passwort ein."),
    z.minLength(
      MIN_PASSWORD_LENGTH,
      `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
    ),
    z.maxLength(
      MAX_PASSWORD_LENGTH,
      `Das Passwort darf höchstens ${MAX_PASSWORD_LENGTH} Zeichen haben.`,
    ),
  );

const NEW_PER_DAY_MESSAGE = `Gib eine ganze Zahl von 0 bis ${MAX_NEW_PER_DAY} ein.`;
const INTEGER_PATTERN = /^\d+$/;

// Das Formular liefert einen String, die Server Action eine Zahl.
export const newPerDaySchema = z.unknown().check(
  z.refine((value) => {
    const number =
      typeof value === "number"
        ? value
        : typeof value === "string" && INTEGER_PATTERN.test(value.trim())
          ? Number(value.trim())
          : Number.NaN;
    return Number.isInteger(number) && number >= 0 && number <= MAX_NEW_PER_DAY;
  }, NEW_PER_DAY_MESSAGE),
);

export type FieldSchema =
  | typeof nameSchema
  | typeof emailSchema
  | typeof passwordRequiredSchema
  | typeof currentPasswordSchema
  | typeof newPasswordSchema
  | typeof newPerDaySchema;

/** Erste Meldung oder null. Wirft nie, egal welcher Typ hereinkommt. */
export function validateField(
  schema: FieldSchema,
  value: unknown,
): string | null {
  try {
    const result = z.safeParse(schema, value);
    if (result.success) return null;
    return result.error.issues[0]?.message ?? "Ungültige Eingabe.";
  } catch {
    return "Ungültige Eingabe.";
  }
}

/** Getrimmter Name oder die erste Meldung. Wirft nie, egal welcher Typ hereinkommt. */
export function parseName(
  value: unknown,
): { ok: true; name: string } | { ok: false; message: string } {
  try {
    const result = z.safeParse(nameSchema, value);
    if (result.success) return { ok: true, name: result.data };
    return {
      ok: false,
      message: result.error.issues[0]?.message ?? AUTH_MESSAGES.nameInvalid,
    };
  } catch {
    return { ok: false, message: AUTH_MESSAGES.nameInvalid };
  }
}

export function normalizeEmail(value: string): string {
  return value.trim();
}
