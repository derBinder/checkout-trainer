/**
 * Deutsches Wörterbuch, nach Namensräumen gegliedert. Werte sind Texte oder
 * Funktionen für Texte mit Werten (`(n: number) => string`). Es gibt den Typ
 * vor: Das englische Wörterbuch muss genau dieselben Einträge haben.
 */

import type { Reason } from "@/lib/darts/cards";
import type { VerdictCode, VerdictDetail } from "@/lib/darts/judge";
import type { IntervalLabel } from "@/lib/srs/fsrs";
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
  study: {
    reason: (r: Reason): string => {
      switch (r.kind) {
        case "only":
          return "Der einzige Weg.";
        case "direct":
          return "Direkt auf das Doppel.";
        case "split":
          return `Zwischen ${r.a} und ${r.b} gezielt lässt jedes der beiden Felder ein Doppel.`;
        case "singleFinish":
          return r.bull
            ? `Bleibt bei Single ${r.field} auf Bull-Finish.`
            : `Bleibt bei Single ${r.field} auf einem Finish.`;
        case "halving":
          return `Endet auf ${r.double}, das sich ${["", "einmal", "zweimal", "dreimal", "viermal"][r.times]} halbieren lässt.`;
        case "chart":
          return "Der übliche Weg nach Tabelle.";
      }
    },
    metaTitle: "Lernen",
    closeLabel: "Lernen beenden",
    // Frage und Auflösung einer Karte (card-view.ts).
    card: {
      score: "Rest",
      scoreWas: (rest: number) => `Rest war ${rest}`,
      scoreOf: (rest: number) => `Rest ${rest}`,
      newScore: "Neuer Rest",
      notCheckable: "Nicht checkbar",
      missHint: (aimed: string, field: string) => `Ziel war ${aimed}, getroffen: Single ${field}`,
      why: "Warum",
      setupShot: "Stellwurf",
      alternative: "Alternative",
      alternatives: "Alternativen",
      or: "oder",
      twoDarts: "Mit 2 Darts",
      only: (hit: string) => `Nur ${hit}`,
      setUp: (text: string) => `Stellen: ${text}`,
      setupShort: (throws: string, leaves: number) => `${throws}, Rest ${leaves}`,
      afterwards: (leaves: number) => `Danach Rest ${leaves}`,
      bogeySetup: (leaves: number) => `Kein Finish möglich. Stellen auf Rest ${leaves}.`,
    },
    // Eingegebener Weg in der Auflösung.
    result: {
      yourRoute: "Dein Weg",
      bestRoute: "Bester Weg",
      setupShot: "Stellwurf",
      notCheckable: "Nicht checkbar",
    },
    verdict: {
      codes: {
        best: { title: "Bester Weg", note: "genau richtig" },
        alternative: { title: "Alternative", note: "auch richtig" },
        notRecommended: { title: "Geht, aber nicht empfohlen", note: "Finish stimmt, Weg ist schlechter" },
        noCheckout: { title: "Geht nicht auf", note: "Der Weg führt nicht zum Finish" },
        checkable: { title: "Ist checkbar", note: "Es gibt einen Weg" },
        bogeyRight: { title: "Richtig", note: "Rest ist nicht checkbar" },
        setupRight: { title: "Richtiger Stellwurf", note: "genau richtig" },
        setupOther: { title: "Anderer Stellwurf", note: "empfohlen siehe unten" },
      } satisfies Record<VerdictCode, { title: string; note: string }>,
      detail: (d: VerdictDetail): string => {
        switch (d.kind) {
          case "total":
            return `Ergibt ${d.total} statt ${d.rest}`;
          case "notDouble":
            return "Letzter Dart ist kein Doppel";
          case "notCheckable":
            return "Rest ist nicht checkbar";
        }
      },
    },
    // Felder und Tastenfeld.
    slots: { darts: "Darts", open: "offen", miss: "Fehlwurf" },
    pad: {
      ring: "Ring",
      rings: { S: "Single", D: "Doppel", T: "Triple" },
      singleBull: "Single Bull 25",
      deleteLast: "Letzten Dart löschen",
    },
    question: {
      notCheckable: "Nicht checkbar",
      check: "Prüfen",
      reveal: "Ohne Eingabe aufdecken",
    },
    // Abstände unter den Bewertungsknöpfen.
    interval: (l: IntervalLabel): string => {
      switch (l.unit) {
        case "now":
          return "gleich";
        case "underMinute":
          return "< 1 Min";
        case "minutes":
          return `${l.value} Min`;
        case "hours":
          return `${l.value} Std`;
        case "days":
          return l.value === 1 ? "1 Tag" : `${l.value} Tage`;
        case "months":
          return l.value === 1 ? "1 Monat" : `${l.value} Monate`;
        case "years":
          return l.value === 1 ? "1 Jahr" : `${String(l.value).replace(".", ",")} Jahre`;
      }
    },
    session: {
      ratings: { 1: "Nochmal", 2: "Schwer", 3: "Gut", 4: "Leicht" },
      progress: "Fortschritt",
      progressText: (done: number, total: number) => `${done} von ${total} Karten gelernt`,
      confirmClose: "Noch nicht alles gespeichert. Trotzdem schließen?",
      saveFailed: "Nicht gespeichert, wird erneut versucht",
      skipped: (n: number) => (n === 1 ? "Eine Bewertung wurde nicht gezählt." : `${n} Bewertungen wurden nicht gezählt.`),
      signedOut: "Du wurdest abgemeldet.",
      notSaved: (n: number) => (n === 1 ? "1 Bewertung wurde nicht gespeichert." : `${n} Bewertungen wurden nicht gespeichert.`),
      toSignIn: "Zur Anmeldung",
      finished: "Geschafft",
      cardsStudied: (n: number) => `${n === 1 ? "1 Karte" : `${n} Karten`} gelernt.`,
      toOverview: "Zur Übersicht",
      retry: "Erneut versuchen",
      saving: "Speichere …",
      loadFailed: "Die Lernsitzung konnte nicht geladen werden.",
    },
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
