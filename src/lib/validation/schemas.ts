// Nur zod/mini und Konstanten: Die Datei wird auch von Client-Formularen importiert.
import * as z from "zod/mini";
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/constants";
import { MAX_NEW_PER_DAY } from "@/lib/settings";

/** Schlüssel der Prüfmeldungen; die Texte stehen im Wörterbuch (`validation`). */
export type ValidationKey =
  | "nameRequired"
  | "nameTooLong"
  | "nameInvalid"
  | "emailRequired"
  | "emailTooLong"
  | "emailInvalid"
  | "passwordRequired"
  | "currentPasswordRequired"
  | "passwordTooShort"
  | "passwordTooLong"
  | "newPerDayInvalid"
  | "invalid";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

// Unicode Cc und Cf: Steuerzeichen (NUL, Zeilenumbruch), Richtungs- und
// unsichtbare Zeichen (RTL-Override, Nullbreite).
const FORBIDDEN_NAME_CHARACTERS = /[\p{Cc}\p{Cf}]/u;

// Gilt im Formular und auf dem Server (Auth-Hooks in src/lib/auth/index.ts).
export const nameSchema = z
  .string("nameRequired")
  .check(
    z.trim(),
    z.minLength(1, "nameRequired"),
    z.maxLength(MAX_NAME_LENGTH, "nameTooLong"),
    z.refine(
      (value) => !FORBIDDEN_NAME_CHARACTERS.test(value),
      "nameInvalid",
    ),
  );

export const emailSchema = z
  .string("emailRequired")
  .check(
    z.trim(),
    z.minLength(1, "emailRequired"),
    z.maxLength(MAX_EMAIL_LENGTH, "emailTooLong"),
    z.regex(
      EMAIL_PATTERN,
      "emailInvalid",
    ),
  );

// Passwörter werden nie getrimmt: Leerzeichen sind erlaubt.
export const passwordRequiredSchema = z
  .string("passwordRequired")
  .check(z.minLength(1, "passwordRequired"));

export const currentPasswordSchema = z
  .string("currentPasswordRequired")
  .check(z.minLength(1, "currentPasswordRequired"));

export const newPasswordSchema = z
  .string("passwordRequired")
  .check(
    z.minLength(1, "passwordRequired"),
    z.minLength(MIN_PASSWORD_LENGTH, "passwordTooShort"),
    z.maxLength(MAX_PASSWORD_LENGTH, "passwordTooLong"),
  );

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
  }, "newPerDayInvalid"),
);

export type FieldSchema =
  | typeof nameSchema
  | typeof emailSchema
  | typeof passwordRequiredSchema
  | typeof currentPasswordSchema
  | typeof newPasswordSchema
  | typeof newPerDaySchema;

/** Schlüssel der ersten Meldung oder null. Wirft nie, egal welcher Typ hereinkommt. */
export function validateField(
  schema: FieldSchema,
  value: unknown,
): ValidationKey | null {
  try {
    const result = z.safeParse(schema, value);
    if (result.success) return null;
    return (result.error.issues[0]?.message as ValidationKey | undefined) ?? "invalid";
  } catch {
    return "invalid";
  }
}

/** Getrimmter Name oder der Schlüssel der ersten Meldung. Wirft nie, egal welcher Typ hereinkommt. */
export function parseName(
  value: unknown,
): { ok: true; name: string } | { ok: false; message: ValidationKey } {
  try {
    const result = z.safeParse(nameSchema, value);
    if (result.success) return { ok: true, name: result.data };
    return {
      ok: false,
      message:
        (result.error.issues[0]?.message as ValidationKey | undefined) ??
        "nameInvalid",
    };
  } catch {
    return { ok: false, message: "nameInvalid" };
  }
}

export function normalizeEmail(value: string): string {
  return value.trim();
}
