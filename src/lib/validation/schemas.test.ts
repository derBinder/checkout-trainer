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

const EMAIL_FORMAT = "emailInvalid";

describe("validateField", () => {
  it("prüft den Namen", () => {
    expect(validateField(nameSchema, "")).toBe("nameRequired");
    expect(validateField(nameSchema, "   ")).toBe("nameRequired");
    expect(validateField(nameSchema, "Felix")).toBeNull();
  });

  it("begrenzt den Namen nach dem Trimmen auf 100 Zeichen", () => {
    expect(validateField(nameSchema, "a".repeat(100))).toBeNull();
    expect(validateField(nameSchema, `  ${"a".repeat(100)}  `)).toBeNull();
    expect(validateField(nameSchema, "a".repeat(101))).toBe(
      "nameTooLong",
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
        "nameInvalid",
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
      "emailTooLong",
    );
  });

  it("prüft die E-Mail-Adresse", () => {
    expect(validateField(emailSchema, "")).toBe(
      "emailRequired",
    );
    expect(validateField(emailSchema, "   ")).toBe(
      "emailRequired",
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
      "passwordRequired",
    );
    expect(validateField(passwordRequiredSchema, "x")).toBeNull();
    expect(validateField(currentPasswordSchema, "")).toBe(
      "currentPasswordRequired",
    );
    expect(validateField(currentPasswordSchema, "x")).toBeNull();
  });

  it("prüft das neue Passwort", () => {
    expect(validateField(newPasswordSchema, "")).toBe(
      "passwordRequired",
    );
    expect(validateField(newPasswordSchema, "a".repeat(9))).toBe(
      "passwordTooShort",
    );
    expect(validateField(newPasswordSchema, "a".repeat(10))).toBeNull();
    // Passwörter werden nicht getrimmt.
    expect(validateField(newPasswordSchema, " ".repeat(10))).toBeNull();
    expect(validateField(newPasswordSchema, "a".repeat(128))).toBeNull();
    expect(validateField(newPasswordSchema, "a".repeat(129))).toBe(
      "passwordTooLong",
    );
  });

  it("prüft neue Karten pro Tag", () => {
    const message = "newPerDayInvalid";
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

  it("nennt den Schlüssel der Prüfmeldung", () => {
    expect(validateField(nameSchema, 123)).toBe("nameRequired");
    expect(validateField(newPerDaySchema, "x")).toBe("newPerDayInvalid");
  });

  it("nennt den Schlüssel invalid, wenn die Prüfung selbst scheitert", () => {
    const broken = {} as unknown as Parameters<typeof validateField>[0];
    expect(validateField(broken, "x")).toBe("invalid");
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

  it("liefert den Schlüssel für ungültige Werte jeden Typs", () => {
    expect(parseName(undefined)).toEqual({
      ok: false,
      message: "nameRequired",
    });
    for (const odd of [null, 5, { a: 1 }, [], true]) {
      expect(parseName(odd).ok).toBe(false);
    }
    expect(parseName("a".repeat(101))).toEqual({
      ok: false,
      message: "nameTooLong",
    });
    expect(parseName("a\u0000")).toEqual({
      ok: false,
      message: "nameInvalid",
    });
  });
});

describe("normalizeEmail", () => {
  it("entfernt Leerraum an den Rändern", () => {
    expect(normalizeEmail("  name@beispiel.de \n")).toBe("name@beispiel.de");
  });
});
