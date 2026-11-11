import { describe, expect, it } from "vitest";
import { AUTH_MESSAGES } from "@/lib/auth/constants";
import { authErrorMessage } from "./auth-error";

describe("authErrorMessage", () => {
  it("zeigt die eigenen Meldungen der Auth-Hooks unverändert", () => {
    for (const message of [
      AUTH_MESSAGES.nameRequired,
      AUTH_MESSAGES.nameTooLong,
      AUTH_MESSAGES.nameInvalid,
      AUTH_MESSAGES.emailTooLong,
      AUTH_MESSAGES.imageNotAllowed,
      AUTH_MESSAGES.passwordRequired,
    ]) {
      expect(authErrorMessage({ status: 400, message })).toBe(message);
    }
  });

  it("zeigt die Sperrmeldung nach richtigem Passwort", () => {
    // So antwortet der Server, wenn die Sitzung für ein gesperrtes Konto verweigert wird.
    expect(
      authErrorMessage({ status: 403, message: AUTH_MESSAGES.blocked }),
    ).toBe("Dieses Konto ist gesperrt.");
  });

  it("zeigt bei falschem Passwort die allgemeine Meldung", () => {
    expect(
      authErrorMessage({
        status: 401,
        code: "INVALID_EMAIL_OR_PASSWORD",
        message: "Invalid email or password",
      }),
    ).toBe("E-Mail-Adresse oder Passwort stimmt nicht.");
  });

  it("übersetzt fremde englische Meldungen nicht wörtlich", () => {
    expect(authErrorMessage({ status: 400, message: "Something else" })).toBe(
      "Das hat nicht geklappt. Versuche es erneut.",
    );
  });
});
