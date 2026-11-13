import { describe, expect, it } from "vitest";
import {
  emailSchema,
  nameSchema,
  newPasswordSchema,
  newPerDaySchema,
} from "@/lib/validation/schemas";
import {
  describedBy,
  firstInvalidField,
  leavesField,
  PASSWORD_TOGGLE_ATTRIBUTE,
  validateFormData,
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
      name: "nameRequired",
      email:
        "emailInvalid",
      password: "passwordTooShort",
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
      name: "nameRequired",
      email: "emailRequired",
      password: "passwordRequired",
    });
  });

  it("prüft die Zahl aus dem Formular als String", () => {
    const perDay = [{ name: "newPerDay", schema: newPerDaySchema }];
    expect(validateValues(perDay, { newPerDay: "abc" })).toEqual({
      newPerDay: "newPerDayInvalid",
    });
    expect(validateValues(perDay, { newPerDay: "51" })).toEqual({
      newPerDay: "newPerDayInvalid",
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

describe("validateFormData", () => {
  it("prüft Werte aus dem Formular, auch ohne Eingabe über React", () => {
    // Autofill oder ein Passwortmanager füllt das Feld, ohne dass onChange läuft.
    const form = new FormData();
    form.append("name", "  Felix  ");
    form.append("email", "a@b.de");
    form.append("password", "a".repeat(10));
    expect(validateFormData(fields, form)).toEqual({
      name: null,
      email: null,
      password: null,
    });
  });

  it("meldet ungültige Werte aus dem Formular", () => {
    const form = new FormData();
    form.append("name", "Felix");
    form.append("email", "abc");
    form.append("password", "kurz");
    expect(validateFormData(fields, form)).toEqual({
      name: null,
      email:
        "emailInvalid",
      password: "passwordTooShort",
    });
  });

  it("zählt einen fehlenden Schlüssel als leer", () => {
    const form = new FormData();
    form.append("email", "a@b.de");
    expect(validateFormData(fields, form)).toEqual({
      name: "nameRequired",
      email: null,
      password: "passwordRequired",
    });
  });
});

describe("firstInvalidField", () => {
  it("liefert das erste fehlerhafte Feld in Deklarationsreihenfolge", () => {
    expect(
      firstInvalidField(fields, { password: "p", email: "e", name: null }),
    ).toBe("email");
    expect(firstInvalidField(fields, { password: "p" })).toBe("password");
  });

  it("liefert null, wenn alles gültig ist", () => {
    expect(
      firstInvalidField(fields, { name: null, email: null, password: null }),
    ).toBeNull();
    expect(firstInvalidField(fields, {})).toBeNull();
  });
});

describe("describedBy", () => {
  it("verbindet Beschreibung und Fehler", () => {
    expect(describedBy("hint", "err", true)).toBe("hint err");
  });

  it("verweist nur bei einem Fehler auf die Fehler-ID", () => {
    expect(describedBy(undefined, "err", true)).toBe("err");
    expect(describedBy(undefined, "err", false)).toBeUndefined();
    expect(describedBy("hint", "err", false)).toBe("hint");
  });
});
