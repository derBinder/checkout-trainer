/**
 * Deutsches Wörterbuch, nach Namensräumen gegliedert. Werte sind Texte oder
 * Funktionen für Texte mit Werten (`(n: number) => string`). Es gibt den Typ
 * vor: Das englische Wörterbuch muss genau dieselben Einträge haben.
 */

import {
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  type AuthErrorKey,
} from "@/lib/auth/constants";
import { MAX_NEW_PER_DAY } from "@/lib/settings";
import type { ValidationKey } from "@/lib/validation/schemas";

export const de = {
  common: {
    appName: "Checkout-Trainer",
    titleSuffix: " · Checkout-Trainer",
    description: "Checkout-Wege im Darts mit Karteikarten lernen.",
  },
  // Prüfmeldungen der Schemas (src/lib/validation/schemas.ts), gezeigt unter den Feldern.
  validation: {
    nameRequired: "Bitte gib einen Namen ein.",
    nameTooLong: `Der Name darf höchstens ${MAX_NAME_LENGTH} Zeichen haben.`,
    nameInvalid: "Der Name enthält unzulässige Zeichen.",
    emailRequired: "Bitte gib deine E-Mail-Adresse ein.",
    emailTooLong: "Die E-Mail-Adresse ist zu lang.",
    emailInvalid:
      "Das ist keine gültige E-Mail-Adresse, zum Beispiel name@beispiel.de.",
    passwordRequired: "Bitte gib ein Passwort ein.",
    currentPasswordRequired: "Bitte gib dein aktuelles Passwort ein.",
    passwordTooShort: `Das Passwort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
    passwordTooLong: `Das Passwort darf höchstens ${MAX_PASSWORD_LENGTH} Zeichen haben.`,
    newPerDayInvalid: `Gib eine ganze Zahl von 0 bis ${MAX_NEW_PER_DAY} ein.`,
    invalid: "Ungültige Eingabe.",
  } satisfies Record<ValidationKey, string>,
  auth: {
    // Eigene Fehler der Auth-Hooks (AUTH_ERRORS), nach Schlüssel.
    errors: {
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
    } satisfies Record<AuthErrorKey, string>,
    // Fehlercodes von Better Auth, das selbst nur Englisch meldet.
    byCode: {
      USER_ALREADY_EXISTS: "Unter dieser E-Mail-Adresse gibt es schon ein Konto.",
      USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
        "Unter dieser E-Mail-Adresse gibt es schon ein Konto.",
      INVALID_EMAIL_OR_PASSWORD: "E-Mail-Adresse oder Passwort stimmt nicht.",
      INVALID_EMAIL: "Diese E-Mail-Adresse ist ungültig.",
      PASSWORD_TOO_SHORT: "Das Passwort ist zu kurz.",
      PASSWORD_TOO_LONG: "Das Passwort ist zu lang.",
      INVALID_PASSWORD: "Das Passwort stimmt nicht.",
      CREDENTIAL_ACCOUNT_NOT_FOUND: "Dieses Konto hat kein Passwort.",
      SESSION_EXPIRED: "Die Sitzung ist zu alt. Melde dich neu an.",
    } as Record<string, string>,
    tooManyAttempts:
      "Zu viele Versuche. Warte ein paar Minuten und versuche es dann erneut.",
    fallback: "Das hat nicht geklappt. Versuche es erneut.",
    noConnection: "Keine Verbindung. Versuche es erneut.",
    signOut: "Abmelden",
    signOutNoConnection: "Keine Verbindung. Du bist noch angemeldet.",
  },
  form: {
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort verbergen",
    strength: {
      prefix: "Stärke: ",
      levels: { 0: "Schwach", 1: "Mittel", 2: "Gut", 3: "Stark" },
      minimum: (min: number) => `Mindestens ${min} Zeichen.`,
      remaining: (count: number) => `Noch ${count} Zeichen bis zum Minimum.`,
      stronger: "Länger oder gemischter wird stärker.",
    },
  },
  signIn: {
    metaTitle: "Anmelden",
    title: "Anmelden",
    email: "E-Mail",
    password: "Passwort",
    submit: "Anmelden",
    forgotPassword:
      "Passwort vergessen? Wende dich an den Betreiber, er setzt dir ein neues.",
    noAccount: "Noch kein Konto?",
    signUpLink: "Registrieren",
  },
  signUp: {
    metaTitle: "Registrieren",
    title: "Registrieren",
    name: "Name",
    email: "E-Mail",
    password: "Passwort",
    submit: "Registrieren",
    haveAccount: "Schon ein Konto?",
    signInLink: "Anmelden",
  },
  pending: {
    metaTitle: "Freischaltung",
    blocked: "Dein Konto ist gesperrt.",
    waiting: "Dein Konto wartet auf Freischaltung durch den Betreiber.",
  },
  language: {
    label: "Sprache",
    // Sprachnamen werden nie übersetzt.
    names: { de: "Deutsch", en: "English" },
    short: { de: "DE", en: "EN" },
  },
} as const;

/** Weitet Literal-Strings zu `string`; Funktionen und Aufbau bleiben. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : { readonly [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof de>;
