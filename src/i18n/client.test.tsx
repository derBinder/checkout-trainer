import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, localeFromLocation, useDictionary, useLocale, useLocalePath } from "./client";
import { ROUTES } from "./paths";

function Probe() {
  const locale = useLocale();
  const t = useDictionary();
  const path = useLocalePath();
  return (
    <p data-locale={locale} data-today={path(ROUTES.today)} data-home={path(ROUTES.home)}>
      {t.language.label}
    </p>
  );
}

describe("I18nProvider", () => {
  it("gibt Sprache, Wörterbuch und Pfade an die Hooks weiter", () => {
    expect(renderToStaticMarkup(<I18nProvider locale="de"><Probe /></I18nProvider>)).toBe(
      '<p data-locale="de" data-today="/de/today" data-home="/de">Sprache</p>',
    );
    expect(renderToStaticMarkup(<I18nProvider locale="en"><Probe /></I18nProvider>)).toBe(
      '<p data-locale="en" data-today="/en/today" data-home="/en">Language</p>',
    );
  });

  it("nimmt die Sprache des nächsten Providers", () => {
    const html = renderToStaticMarkup(
      <I18nProvider locale="de">
        <I18nProvider locale="en">
          <Probe />
        </I18nProvider>
      </I18nProvider>,
    );
    expect(html).toContain('data-locale="en"');
  });

  it("meldet einen fehlenden Provider, statt still eine Sprache zu raten", () => {
    expect(() => renderToStaticMarkup(<Probe />)).toThrow(/I18nProvider/);
  });
});

describe("localeFromLocation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["/de/today", "de"],
    ["/en", "en"],
    ["/", "en"],
    ["/dexter", "en"],
  ])("liest die Sprache aus %s", (pathname, locale) => {
    vi.stubGlobal("window", { location: { pathname } });
    expect(localeFromLocation()).toBe(locale);
  });

  it("nimmt ohne Fenster die Vorgabe", () => {
    vi.stubGlobal("window", undefined);
    expect(localeFromLocation()).toBe("en");
  });
});
