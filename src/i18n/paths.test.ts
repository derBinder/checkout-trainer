import { describe, expect, it } from "vitest";
import { localePath, ROUTES, splitLocale, switchLocalePath } from "./paths";

describe("localePath", () => {
  it("setzt die Sprache als erstes Segment davor", () => {
    expect(localePath("de", ROUTES.home)).toBe("/de");
    expect(localePath("en", ROUTES.today)).toBe("/en/today");
    expect(localePath("en", ROUTES.practice)).toBe("/en/practice");
  });
});

describe("splitLocale", () => {
  it("trennt die Sprache vom Rest", () => {
    expect(splitLocale("/en/settings")).toEqual({ locale: "en", rest: "/settings" });
    expect(splitLocale("/de")).toEqual({ locale: "de", rest: "" });
  });

  it("erkennt nur ein ganzes erstes Segment", () => {
    expect(splitLocale("/today")).toEqual({ locale: null, rest: "/today" });
    expect(splitLocale("/english")).toEqual({ locale: null, rest: "/english" });
    expect(splitLocale("/")).toEqual({ locale: null, rest: "" });
  });
});

describe("switchLocalePath", () => {
  it("tauscht die Sprache und behält die Seite", () => {
    expect(switchLocalePath("/de/settings", "en")).toBe("/en/settings");
    expect(switchLocalePath("/de", "en")).toBe("/en");
    expect(switchLocalePath("/en/stats", "en")).toBe("/en/stats");
  });
});
