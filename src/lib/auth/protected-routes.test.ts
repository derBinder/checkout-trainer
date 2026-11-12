import { describe, expect, it } from "vitest";
import { config as proxyConfig } from "@/proxy";
import { isProtectedPath, needsLoginRedirect, PROTECTED_PREFIXES } from "./protected-routes";

describe("isProtectedPath", () => {
  it("erkennt die angemeldeten Bereiche samt Unterpfaden", () => {
    for (const p of ["/heute", "/lernen", "/statistik", "/einstellungen", "/verwaltung", "/warten", "/heute/", "/statistik/x"]) {
      expect(isProtectedPath(p)).toBe(true);
    }
  });

  it("lässt öffentliche Seiten und ähnlich beginnende Pfade durch", () => {
    for (const p of ["/", "/anmelden", "/registrieren", "/impressum", "/datenschutz", "/api/auth/sign-in/email", "/heutemorgen", "/lernenx"]) {
      expect(isProtectedPath(p)).toBe(false);
    }
  });

  it("deckt genau die sechs Bereiche ab", () => {
    expect([...PROTECTED_PREFIXES]).toEqual(["/heute", "/lernen", "/statistik", "/einstellungen", "/verwaltung", "/warten"]);
  });

  it("stimmt mit dem Matcher der Vorprüfung überein", () => {
    expect(proxyConfig.matcher).toEqual(PROTECTED_PREFIXES.map((p) => `${p}/:path*`));
  });
});

describe("needsLoginRedirect", () => {
  it("leitet nur ohne Sitzungs-Cookie auf geschützten Pfaden um", () => {
    expect(needsLoginRedirect("GET", "/heute", false)).toBe(true);
    expect(needsLoginRedirect("GET", "/heute", true)).toBe(false);
    expect(needsLoginRedirect("GET", "/anmelden", false)).toBe(false);
    expect(needsLoginRedirect("GET", "/", false)).toBe(false);
  });

  it("leitet auch HEAD ohne Cookie um", () => {
    expect(needsLoginRedirect("HEAD", "/heute", false)).toBe(true);
  });

  it("lässt andere Methoden durch: Server Actions antworten mit ihrer eigenen Prüfung", () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      expect(needsLoginRedirect(method, "/lernen", false)).toBe(false);
    }
  });
});
