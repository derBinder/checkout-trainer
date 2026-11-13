import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, LOCALES, pickLocale } from "./locales";

describe("isLocale", () => {
  it("erkennt nur de und en", () => {
    expect(LOCALES).toEqual(["de", "en"]);
    expect(isLocale("de")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("hat Englisch als Vorgabe und passende Intl-Sprachen", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(INTL_LOCALE).toEqual({ de: "de-DE", en: "en-GB" });
  });
});

describe("pickLocale", () => {
  it("nimmt ein gültiges Cookie vor dem Header", () => {
    expect(pickLocale({ cookie: "de", acceptLanguage: "en" })).toBe("de");
  });

  it("ignoriert ein ungültiges Cookie", () => {
    expect(pickLocale({ cookie: "fr", acceptLanguage: "de-DE,de;q=0.9" })).toBe("de");
  });

  it("lässt das höhere Gewicht gewinnen", () => {
    expect(pickLocale({ acceptLanguage: "de-AT;q=0.8, en-US" })).toBe("en");
  });

  it("nimmt die erste unterstützte Sprache", () => {
    expect(pickLocale({ acceptLanguage: "fr, de;q=0.5" })).toBe("de");
  });

  it("fällt auf Englisch zurück", () => {
    expect(pickLocale({ acceptLanguage: "fr, nl" })).toBe("en");
    expect(pickLocale({ acceptLanguage: "" })).toBe("en");
    expect(pickLocale({ acceptLanguage: ";;q=x,," })).toBe("en");
    expect(pickLocale({})).toBe("en");
  });

  it("ignoriert Groß- und Kleinschreibung", () => {
    expect(pickLocale({ acceptLanguage: "DE-ch" })).toBe("de");
  });
});
