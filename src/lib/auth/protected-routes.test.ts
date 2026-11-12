import { describe, expect, it } from "vitest";
import { config as proxyConfig } from "@/proxy";
import {
  isProtectedPath,
  isProtectedRoute,
  needsLoginRedirect,
  PROTECTED_PREFIXES,
  PROTECTED_ROUTES,
  PROXY_MATCHER,
  proxyDecision,
} from "./protected-routes";

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

describe("isProtectedRoute (Pfad ohne Sprache)", () => {
  it("erkennt die Bereiche samt Unterpfaden, aber keine ähnlich beginnenden", () => {
    expect(isProtectedRoute("/today")).toBe(true);
    expect(isProtectedRoute("/today/x")).toBe(true);
    expect(isProtectedRoute("/sign-in")).toBe(false);
    expect(isProtectedRoute("/todayx")).toBe(false);
  });

  it("deckt genau die sechs Bereiche ab", () => {
    expect([...PROTECTED_ROUTES]).toEqual(["/today", "/study", "/stats", "/settings", "/admin", "/pending"]);
  });
});

describe("PROXY_MATCHER", () => {
  it("schließt api, _next und Dateien aus", () => {
    expect(PROXY_MATCHER).toBe("/((?!api|_next|.*\\..*).*)");
  });
});

describe("proxyDecision", () => {
  const base = { method: "GET", hasSessionCookie: false, cookieLocale: null, acceptLanguage: null };

  it("setzt ohne Sprache die gewählte Sprache vor den Pfad", () => {
    expect(proxyDecision({ ...base, pathname: "/" })).toEqual({ type: "redirect", location: "/en" });
    expect(proxyDecision({ ...base, pathname: "/today", acceptLanguage: "de" })).toEqual({ type: "redirect", location: "/de/today" });
    expect(proxyDecision({ ...base, pathname: "/today", cookieLocale: "en", acceptLanguage: "de" })).toEqual({ type: "redirect", location: "/en/today" });
  });

  it("leitet geschützte Pfade ohne Sitzungs-Cookie zur Anmeldung in derselben Sprache", () => {
    expect(proxyDecision({ ...base, pathname: "/en/today" })).toEqual({ type: "redirect", location: "/en/sign-in" });
    expect(proxyDecision({ ...base, method: "HEAD", pathname: "/de/admin" })).toEqual({ type: "redirect", location: "/de/sign-in" });
  });

  it("lässt durch, was keine Umleitung braucht", () => {
    expect(proxyDecision({ ...base, pathname: "/de/today", hasSessionCookie: true })).toEqual({ type: "next", locale: "de" });
    expect(proxyDecision({ ...base, pathname: "/en/sign-in" })).toEqual({ type: "next", locale: "en" });
    expect(proxyDecision({ ...base, pathname: "/en/todayx" })).toEqual({ type: "next", locale: "en" });
  });

  it("leitet andere Methoden als GET und HEAD nie um", () => {
    expect(proxyDecision({ ...base, method: "POST", pathname: "/en/today" })).toEqual({ type: "next", locale: "en" });
    expect(proxyDecision({ ...base, method: "POST", pathname: "/today" })).toEqual({ type: "next", locale: null });
  });
});
