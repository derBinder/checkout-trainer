// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Das Stylesheet braucht die PostCSS-Kette von Tailwind, die Vitest nicht lädt.
vi.mock("./globals.css", () => ({}));

const { default: GlobalError } = await import("./global-error");

afterEach(() => {
  vi.restoreAllMocks();
});

// Eigene Datei: Die Seite rendert <html> und braucht das Dokument als Container. React
// hängt seine Ereignisse nur einmal je Dokument an; ein früherer Render in ein <div>
// derselben Datei hätte das schon erledigt, und Klicks kämen nicht mehr an.
describe("Globale Fehlerseite", () => {
  it("protokolliert den Fehler und versucht es auf Wunsch erneut", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = new Error("kaputt");
    render(<GlobalError error={error} retry={retry} />, { container: document });

    expect(log).toHaveBeenCalledWith(error);
    expect(screen.getByRole("heading", { name: "Das hat nicht geklappt." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Zur Übersicht" }).getAttribute("href")).toBe("/today");
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("ersetzt das ganze Dokument, mit eigenem Titel", () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error("kaputt")} retry={() => {}} />);
    expect(html).toMatch(/^<html lang="de">/);
    expect(html).toContain("<title>Fehler · Checkout-Trainer</title>");
  });
});
