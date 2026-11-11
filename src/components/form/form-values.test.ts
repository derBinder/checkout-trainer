import { describe, expect, it } from "vitest";
import {
  emailSchema,
  nameSchema,
  newPasswordSchema,
  newPerDaySchema,
} from "@/lib/validation/schemas";
import {
  leavesField,
  PASSWORD_TOGGLE_ATTRIBUTE,
  validateValues,
} from "./form-values";

const fields = [
  { name: "name", schema: nameSchema },
  { name: "email", schema: emailSchema },
  { name: "password", schema: newPasswordSchema },
];

describe("validateValues", () => {
  it("liefert je Feld die erste Meldung", () => {
    expect(
      validateValues(fields, { name: "", email: "abc", password: "kurz" }),
    ).toEqual({
      name: "Bitte gib einen Namen ein.",
      email:
        "Das ist keine gültige E-Mail-Adresse, zum Beispiel name@beispiel.de.",
      password: "Das Passwort braucht mindestens 10 Zeichen.",
    });
  });

  it("liefert null für gültige Felder", () => {
    expect(
      validateValues(fields, {
        name: "Felix",
        email: "a@b.de",
        password: "a".repeat(10),
      }),
    ).toEqual({ name: null, email: null, password: null });
  });

  it("zählt fehlende Schlüssel als leer", () => {
    // Feld nicht im Formular oder Autofill ohne Ereignis.
    expect(validateValues(fields, {})).toEqual({
      name: "Bitte gib einen Namen ein.",
      email: "Bitte gib deine E-Mail-Adresse ein.",
      password: "Bitte gib ein Passwort ein.",
    });
  });

  it("prüft die Zahl aus dem Formular als String", () => {
    const perDay = [{ name: "newPerDay", schema: newPerDaySchema }];
    expect(validateValues(perDay, { newPerDay: "abc" })).toEqual({
      newPerDay: "Gib eine ganze Zahl von 0 bis 50 ein.",
    });
    expect(validateValues(perDay, { newPerDay: "51" })).toEqual({
      newPerDay: "Gib eine ganze Zahl von 0 bis 50 ein.",
    });
    expect(validateValues(perDay, { newPerDay: "12" })).toEqual({
      newPerDay: null,
    });
  });
});

describe("leavesField", () => {
  const toggleFor = (id: string | null) => ({
    getAttribute: (name: string) =>
      name === PASSWORD_TOGGLE_ATTRIBUTE ? id : null,
  });

  it("zählt den Wechsel zum eigenen Auge-Knopf nicht als Verlassen", () => {
    expect(leavesField("pw", toggleFor("pw"))).toBe(false);
  });

  it("zählt jedes andere Ziel als Verlassen", () => {
    expect(leavesField("pw", toggleFor("anderes"))).toBe(true);
    expect(leavesField("pw", toggleFor(null))).toBe(true);
    expect(leavesField("pw", null)).toBe(true);
  });

  it("zählt ohne Feld-ID immer als Verlassen", () => {
    expect(leavesField("", toggleFor(""))).toBe(true);
  });
});
