import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const usePathname = vi.hoisted(() => vi.fn(() => "/heute"));
vi.mock("next/navigation", () => ({ usePathname }));

const { AppNav, AdminNavLink } = await import("./app-nav");

function render(pathname: string) {
  usePathname.mockReturnValue(pathname);
  return renderToStaticMarkup(
    createElement(AppNav, { adminItem: createElement(AdminNavLink) }),
  );
}

describe("AppNav", () => {
  it("markiert den Eintrag der aktuellen Seite", () => {
    const html = render("/statistik");
    expect(html).toMatch(/<a aria-current="page"[^>]*href="\/statistik"/);
    expect(html.match(/aria-current=/g)).toHaveLength(1);
  });

  // Ein Farbübergang blendet beim Seitenwechsel Hintergrund und Symbolfarbe
  // gegeneinander über: Das Symbol blinkt kurz in einer Zwischenfarbe.
  it.each(["/heute", "/statistik", "/einstellungen", "/verwaltung"])(
    "wechselt die Farben auf %s ohne Übergang",
    (pathname) => {
      expect(render(pathname)).not.toMatch(/transition/);
    },
  );
});
