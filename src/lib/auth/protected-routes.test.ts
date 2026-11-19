import { describe, expect, it } from "vitest";
import { config as proxyConfig } from "@/proxy";
import { isProtectedPath, PROTECTED_ROUTES, PROXY_MATCHER, proxyDecision } from "./protected-routes";

describe("isProtectedPath (Pfad ohne Sprache)", () => {
  it("erkennt die Bereiche samt Unterpfaden, aber keine ähnlich beginnenden", () => {
    expect(isProtectedPath("/today")).toBe(true);
    expect(isProtectedPath("/today/x")).toBe(true);
    expect(isProtectedPath("/sign-in")).toBe(false);
    expect(isProtectedPath("/todayx")).toBe(false);
  });

  it("deckt genau die sieben Bereiche ab", () => {
    expect([...PROTECTED_ROUTES]).toEqual(["/today", "/study", "/practice", "/stats", "/settings", "/admin", "/pending"]);
  });

  it("schützt die Übungsseite samt Unterpfaden", () => {
    expect(isProtectedPath("/practice")).toBe(true);
    expect(isProtectedPath("/practice/x")).toBe(true);
    expect(isProtectedPath("/practicex")).toBe(false);
  });
});

describe("PROXY_MATCHER", () => {
  it("schließt api, _next und Dateien aus", () => {
    expect(PROXY_MATCHER).toBe("/((?!api|_next|.*\\..*).*)");
  });

  it("ist der Matcher von proxy.ts", () => {
    expect(proxyConfig.matcher).toEqual([PROXY_MATCHER]);
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
    expect(proxyDecision({ ...base, pathname: "/de/practice" })).toEqual({ type: "redirect", location: "/de/sign-in" });
  });

  it("lässt durch, was keine Umleitung braucht", () => {
    expect(proxyDecision({ ...base, pathname: "/de/today", hasSessionCookie: true })).toEqual({ type: "next", locale: "de" });
    expect(proxyDecision({ ...base, pathname: "/en/sign-in" })).toEqual({ type: "next", locale: "en" });
    expect(proxyDecision({ ...base, pathname: "/en/todayx" })).toEqual({ type: "next", locale: "en" });
  });

  it("schickt Besucher mit Sitzungs-Cookie von der Startseite direkt zu Heute", () => {
    const signedIn = { ...base, hasSessionCookie: true };
    expect(proxyDecision({ ...signedIn, pathname: "/de" })).toEqual({ type: "redirect", location: "/de/today" });
    expect(proxyDecision({ ...signedIn, pathname: "/en/" })).toEqual({ type: "redirect", location: "/en/today" });
    // Ohne Cookie bleibt die Startseite; die Anmeldung leitet nie um, sonst
    // entstünde mit einem ungültigen Cookie eine Schleife über /today.
    expect(proxyDecision({ ...base, pathname: "/de" })).toEqual({ type: "next", locale: "de" });
    expect(proxyDecision({ ...signedIn, pathname: "/de/sign-in" })).toEqual({ type: "next", locale: "de" });
  });

  it("leitet andere Methoden als GET und HEAD nie um", () => {
    expect(proxyDecision({ ...base, method: "POST", pathname: "/en/today" })).toEqual({ type: "next", locale: "en" });
    expect(proxyDecision({ ...base, method: "POST", pathname: "/today" })).toEqual({ type: "next", locale: null });
  });
});
