// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Das Stylesheet braucht die PostCSS-Kette von Tailwind, die Vitest nicht lädt.
vi.mock("./globals.css", () => ({}));

const { default: GlobalError } = await import("./global-error");

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

// Eigene Datei: Die Seite rendert <html> und braucht das Dokument als Container. React
// hängt seine Ereignisse nur einmal je Dokument an; ein früherer Render in ein <div>
// derselben Datei hätte das schon erledigt, und Klicks kämen nicht mehr an.
describe("Globale Fehlerseite", () => {
  it("protokolliert den Fehler und versucht es auf Wunsch erneut", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = new Error("kaputt");
    window.history.replaceState(null, "", "/de/today");
    render(<GlobalError error={error} retry={retry} />, { container: document });

    expect(log).toHaveBeenCalledWith(error);
    expect(screen.getByRole("heading", { name: "Das hat nicht geklappt." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Zur Übersicht" }).getAttribute("href")).toBe("/de/today");
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("ersetzt das ganze Dokument, mit eigenem Titel", () => {
    window.history.replaceState(null, "", "/de/stats");
    render(<GlobalError error={new Error("kaputt")} retry={() => {}} />, { container: document });
    expect(document.documentElement.getAttribute("lang")).toBe("de");
    expect(document.title).toBe("Fehler · Checkout-Trainer");
  });

  it("nimmt im Browser die Sprache aus der Adresse", () => {
    window.history.replaceState(null, "", "/en/today");
    render(<GlobalError error={new Error("kaputt")} retry={() => {}} />, { container: document });
    expect(document.documentElement.getAttribute("lang")).toBe("en");
    expect(screen.getByRole("heading", { name: "That did not work." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Back to overview" }).getAttribute("href")).toBe("/en/today");
  });

  it("rendert auf dem Server immer Englisch, damit die Hydrierung nicht abweicht", () => {
    window.history.replaceState(null, "", "/de/stats");
    const html = renderToStaticMarkup(<GlobalError error={new Error("kaputt")} retry={() => {}} />);
    expect(html).toMatch(/^<html lang="en"/);
    expect(html).toContain("<title>Error · Checkout-Trainer</title>");
    expect(html).toContain('href="/en/today"');
  });
});
