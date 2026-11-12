import { beforeEach, describe, expect, it, vi } from "vitest";

const lang = vi.hoisted(() => vi.fn<() => Promise<unknown>>());
const requestHeaders = vi.hoisted(() => ({ current: new Headers() }));
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);

vi.mock("next/root-params", () => ({ lang: () => lang() }));
vi.mock("next/headers", () => ({ headers: async () => requestHeaders.current }));
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const { getDictionary, getLocale, requestLocale } = await import("./server");
const { de } = await import("./dictionaries/de");
const { en } = await import("./dictionaries/en");

beforeEach(() => {
  lang.mockReset();
  notFound.mockClear();
  requestHeaders.current = new Headers();
});

describe("getLocale", () => {
  it("liefert die Sprache aus dem ersten URL-Segment", async () => {
    lang.mockResolvedValue("de");
    await expect(getLocale()).resolves.toBe("de");
    lang.mockResolvedValue("en");
    await expect(getLocale()).resolves.toBe("en");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("antwortet bei einer unbekannten Sprache mit notFound", async () => {
    for (const value of ["fr", "DE", "", undefined]) {
      lang.mockResolvedValue(value);
      await expect(getLocale()).rejects.toThrow("NEXT_NOT_FOUND");
    }
    expect(notFound).toHaveBeenCalledTimes(4);
  });
});

describe("getDictionary", () => {
  it("liefert das Wörterbuch der Sprache aus der URL", async () => {
    lang.mockResolvedValue("de");
    await expect(getDictionary()).resolves.toBe(de);
    lang.mockResolvedValue("en");
    await expect(getDictionary()).resolves.toBe(en);
  });

  it("antwortet bei einer unbekannten Sprache mit notFound", async () => {
    lang.mockResolvedValue("fr");
    await expect(getDictionary()).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("requestLocale", () => {
  it("liest die Sprache aus dem Header von proxy.ts", async () => {
    requestHeaders.current = new Headers({ "x-locale": "de" });
    await expect(requestLocale()).resolves.toBe("de");
    requestHeaders.current = new Headers({ "x-locale": "en" });
    await expect(requestLocale()).resolves.toBe("en");
  });

  it("liefert null ohne Header oder mit unbekanntem Wert", async () => {
    await expect(requestLocale()).resolves.toBeNull();
    requestHeaders.current = new Headers({ "x-locale": "fr" });
    await expect(requestLocale()).resolves.toBeNull();
  });

  it("braucht keine Root-Params, funktioniert also auch in Server Actions", async () => {
    requestHeaders.current = new Headers({ "x-locale": "en" });
    await requestLocale();
    expect(lang).not.toHaveBeenCalled();
  });
});
