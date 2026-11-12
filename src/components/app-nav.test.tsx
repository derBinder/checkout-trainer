import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const usePathname = vi.hoisted(() => vi.fn(() => "/de/today"));
vi.mock("next/navigation", () => ({ usePathname }));

const { AppNav, AdminNavLink } = await import("./app-nav");
const { I18nProvider } = await import("@/i18n/client");

function render(pathname: string) {
  usePathname.mockReturnValue(pathname);
  const locale = pathname.startsWith("/en") ? "en" : "de";
  return renderToStaticMarkup(
    <I18nProvider locale={locale}>
      <AppNav adminItem={<AdminNavLink />} />
    </I18nProvider>,
  );
}

describe("AppNav", () => {
  it("markiert den Eintrag der aktuellen Seite", () => {
    const html = render("/de/stats");
    expect(html).toMatch(/<a aria-current="page"[^>]*href="\/de\/stats"/);
    expect(html.match(/aria-current=/g)).toHaveLength(1);
  });

  it("verlinkt alle Einträge in der Sprache der Seite", () => {
    const html = render("/en/today");
    for (const route of ["/en/today", "/en/stats", "/en/settings", "/en/admin"]) {
      expect(html).toContain(`href="${route}"`);
    }
  });

  it("beschriftet die Einträge in der Sprache der Seite", () => {
    const de = render("/de/today");
    for (const label of ["Heute", "Statistik", "Einstellungen", "Verwaltung"]) expect(de).toContain(label);
    expect(de).toContain('aria-label="Hauptnavigation"');
    const en = render("/en/today");
    for (const label of ["Today", "Stats", "Settings", "Admin"]) expect(en).toContain(label);
    expect(en).toContain('aria-label="Main navigation"');
    expect(en).not.toContain("Heute");
  });

  it("fehlt auf der Lernseite, die nur eine Aufgabe hat", () => {
    expect(render("/en/study")).toBe("");
    expect(render("/de/study")).toBe("");
  });

  // Ein Farbübergang blendet beim Seitenwechsel Hintergrund und Symbolfarbe
  // gegeneinander über: Das Symbol blinkt kurz in einer Zwischenfarbe.
  it.each(["/de/today", "/de/stats", "/de/settings", "/de/admin"])(
    "wechselt die Farben auf %s ohne Übergang",
    (pathname) => {
      expect(render(pathname)).not.toMatch(/transition/);
    },
  );
});
