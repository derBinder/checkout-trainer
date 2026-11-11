import { describe, expect, it } from "vitest";
import {
  currentPasswordSchema,
  emailSchema,
  nameSchema,
  newPasswordSchema,
  newPerDaySchema,
  normalizeEmail,
  parseName,
  passwordRequiredSchema,
  validateField,
} from "./schemas";

const EMAIL_FORMAT =
  "Das ist keine gültige E-Mail-Adresse, zum Beispiel name@beispiel.de.";

describe("validateField", () => {
  it("prüft den Namen", () => {
    expect(validateField(nameSchema, "")).toBe("Bitte gib einen Namen ein.");
    expect(validateField(nameSchema, "   ")).toBe("Bitte gib einen Namen ein.");
    expect(validateField(nameSchema, "Felix")).toBeNull();
  });

  it("begrenzt den Namen nach dem Trimmen auf 100 Zeichen", () => {
    expect(validateField(nameSchema, "a".repeat(100))).toBeNull();
    expect(validateField(nameSchema, `  ${"a".repeat(100)}  `)).toBeNull();
    expect(validateField(nameSchema, "a".repeat(101))).toBe(
      "Der Name darf höchstens 100 Zeichen haben.",
    );
  });

  it("lehnt Steuer- und Formatzeichen im Namen ab", () => {
    for (const bad of [
      "a\u0000b",
      "a\u0007b",
      "a\nb",
      "a\u202Eb",
      "a\u200Bb",
      "a\u2066b",
      "a\u00ADb",
    ]) {
      expect(validateField(nameSchema, bad)).toBe(
        "Der Name enthält unzulässige Zeichen.",
      );
    }
  });

  it("nimmt Umlaute, Emojis und Leerzeichen im Namen an", () => {
    expect(validateField(nameSchema, "Jörg 🎯 Müller-Weiß")).toBeNull();
  });

  it("begrenzt die E-Mail-Adresse auf 254 Zeichen", () => {
    const local = "a".repeat(64);
    const at254 = `${local}@${"b".repeat(186)}.de`;
    expect(at254).toHaveLength(254);
    expect(validateField(emailSchema, at254)).toBeNull();
    expect(validateField(emailSchema, `x${at254}`)).toBe(
      "Die E-Mail-Adresse ist zu lang.",
    );
  });

  it("prüft die E-Mail-Adresse", () => {
    expect(validateField(emailSchema, "")).toBe(
      "Bitte gib deine E-Mail-Adresse ein.",
    );
    expect(validateField(emailSchema, "   ")).toBe(
      "Bitte gib deine E-Mail-Adresse ein.",
    );
    for (const bad of ["abc", "a@b", "a@b.", "@b.de", "a b@c.de", "a@b..de"]) {
      expect(validateField(emailSchema, bad)).toBe(EMAIL_FORMAT);
    }
    for (const good of [
      "name@beispiel.de",
      "  name@beispiel.de  ",
      "a.b+c@sub.example.org",
    ]) {
      expect(validateField(emailSchema, good)).toBeNull();
    }
  });

  it("prüft Pflicht- und aktuelles Passwort", () => {
    expect(validateField(passwordRequiredSchema, "")).toBe(
      "Bitte gib ein Passwort ein.",
    );
    expect(validateField(passwordRequiredSchema, "x")).toBeNull();
    expect(validateField(currentPasswordSchema, "")).toBe(
      "Bitte gib dein aktuelles Passwort ein.",
    );
    expect(validateField(currentPasswordSchema, "x")).toBeNull();
  });

  it("prüft das neue Passwort", () => {
    expect(validateField(newPasswordSchema, "")).toBe(
      "Bitte gib ein Passwort ein.",
    );
    expect(validateField(newPasswordSchema, "a".repeat(9))).toBe(
      "Das Passwort braucht mindestens 10 Zeichen.",
    );
    expect(validateField(newPasswordSchema, "a".repeat(10))).toBeNull();
    // Passwörter werden nicht getrimmt.
    expect(validateField(newPasswordSchema, " ".repeat(10))).toBeNull();
    expect(validateField(newPasswordSchema, "a".repeat(128))).toBeNull();
    expect(validateField(newPasswordSchema, "a".repeat(129))).toBe(
      "Das Passwort darf höchstens 128 Zeichen haben.",
    );
  });

  it("prüft neue Karten pro Tag", () => {
    const message = "Gib eine ganze Zahl von 0 bis 50 ein.";
    for (const bad of [
      "",
      "abc",
      "2.5",
      "-1",
      "51",
      51,
      -1,
      2.5,
      Number.NaN,
      null,
      undefined,
    ]) {
      expect(validateField(newPerDaySchema, bad)).toBe(message);
    }
    for (const good of [0, 10, 50, "0", "10", " 50 "]) {
      expect(validateField(newPerDaySchema, good)).toBeNull();
    }
  });

  it("wirft nie und lehnt falsche Typen ab", () => {
    expect(validateField(nameSchema, 123)).not.toBeNull();
    for (const odd of [
      null,
      undefined,
      {},
      [],
      Symbol("x"),
      () => 1,
      BigInt(10),
    ]) {
      expect(() => validateField(emailSchema, odd)).not.toThrow();
      expect(() => validateField(newPasswordSchema, odd)).not.toThrow();
      expect(() => validateField(newPerDaySchema, odd)).not.toThrow();
    }
  });
});

describe("parseName", () => {
  it("liefert den getrimmten Namen", () => {
    expect(parseName("  Jörg Müller  ")).toEqual({
      ok: true,
      name: "Jörg Müller",
    });
  });

  it("liefert die Meldung für ungültige Werte jeden Typs", () => {
    expect(parseName(undefined)).toEqual({
      ok: false,
      message: "Bitte gib einen Namen ein.",
    });
    for (const odd of [null, 5, { a: 1 }, [], true]) {
      expect(parseName(odd).ok).toBe(false);
    }
    expect(parseName("a".repeat(101))).toEqual({
      ok: false,
      message: "Der Name darf höchstens 100 Zeichen haben.",
    });
    expect(parseName("a\u0000")).toEqual({
      ok: false,
      message: "Der Name enthält unzulässige Zeichen.",
    });
  });
});

describe("normalizeEmail", () => {
  it("entfernt Leerraum an den Rändern", () => {
    expect(normalizeEmail("  name@beispiel.de \n")).toBe("name@beispiel.de");
  });
});
