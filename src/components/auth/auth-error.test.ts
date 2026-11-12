import { describe, expect, it } from "vitest";
import { de } from "@/i18n/dictionaries/de";
import { en } from "@/i18n/dictionaries/en";
import { AUTH_ERRORS } from "@/lib/auth/constants";
import { authErrorMessage } from "./auth-error";

describe("authErrorMessage", () => {
  it("übersetzt die eigenen Fehler der Auth-Hooks in beide Sprachen", () => {
    for (const key of Object.values(AUTH_ERRORS)) {
      expect(authErrorMessage({ status: 400, message: key }, de.auth)).toBe(
        de.auth.errors[key],
      );
      expect(authErrorMessage({ status: 400, message: key }, en.auth)).toBe(
        en.auth.errors[key],
      );
    }
  });

  it("zeigt die Sperrmeldung nach richtigem Passwort", () => {
    // So antwortet der Server, wenn die Sitzung für ein gesperrtes Konto verweigert wird.
    expect(
      authErrorMessage({ status: 403, message: AUTH_ERRORS.blocked }, de.auth),
    ).toBe("Dieses Konto ist gesperrt.");
    expect(
      authErrorMessage({ status: 403, message: "blocked" }, en.auth),
    ).toBe("This account is blocked.");
  });

  it("zeigt bei falschem Passwort die allgemeine Meldung", () => {
    const error = {
      status: 401,
      code: "INVALID_EMAIL_OR_PASSWORD",
      message: "Invalid email or password",
    };
    expect(authErrorMessage(error, de.auth)).toBe(
      "E-Mail-Adresse oder Passwort stimmt nicht.",
    );
    expect(authErrorMessage(error, en.auth)).toBe(
      "The email address or password is incorrect.",
    );
  });

  it("meldet zu viele Versuche unabhängig vom Code", () => {
    const error = { status: 429, code: "RATE_LIMITED", message: "Too many" };
    expect(authErrorMessage(error, de.auth)).toBe(de.auth.tooManyAttempts);
    expect(authErrorMessage(error, en.auth)).toBe(en.auth.tooManyAttempts);
  });

  it("übersetzt fremde englische Meldungen nicht wörtlich", () => {
    const error = { status: 400, message: "Something else" };
    expect(authErrorMessage(error, de.auth)).toBe(
      "Das hat nicht geklappt. Versuche es erneut.",
    );
    expect(authErrorMessage(error, en.auth)).toBe(en.auth.fallback);
  });
});
