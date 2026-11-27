// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cardById } from "@/lib/cards";
import { checkFor, judge, type Answer } from "@/lib/darts/judge";
import { de } from "@/i18n/dictionaries/de";
import { en } from "@/i18n/dictionaries/en";
import { cardView } from "./card-view";
import { StudyCard } from "./study-card";
import { fixedDarts } from "./study-question";
import { I18nProvider } from "@/i18n/client";
// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

function viewOf(id: string) {
  const card = cardById(id);
  if (!card) throw new Error(`Karte ${id} fehlt`);
  return { card, view: cardView(card, de.study) };
}

/** Auflösung ohne Eingabe („Ohne Eingabe aufdecken“). */
function show(id: string) {
  return render(<StudyCard view={viewOf(id).view} />, { wrapper });
}

/** Auflösung mit eingegebener Antwort, so geprüft wie in der Lernsitzung. */
function showWith(id: string, answer: Answer) {
  const { card, view } = viewOf(id);
  return render(
    <StudyCard view={view} result={{ verdict: judge(checkFor(card), answer), answer, fixed: fixedDarts(view) }} />, { wrapper });
}

const row = (name: string) =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

const darts = () => row("Darts");

describe("StudyCard", () => {
  it("löst einen Rest mit Weg und Erklärungen auf", () => {
    show("r-5");
    expect(screen.getByText("Rest")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(darts()).toEqual(["S1", "D2"]);
    expect(screen.getByText("Nach S1")).toBeTruthy();
    expect(screen.getByText("4 mit 1 Dart: D2")).toBeTruthy();
    expect(screen.getByText("Alternative")).toBeTruthy();
    expect(screen.getByText("S3 · D1")).toBeTruthy();
  });

  it("zeigt ohne Eingabe weder Ergebnis noch „Dein Weg“", () => {
    show("r-5");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("Dein Weg")).toBeNull();
    expect(screen.queryByText("Bester Weg")).toBeNull();
  });

  it("zeigt eine Bogey-Zahl als nicht checkbar mit Stellwurf", () => {
    show("b-159");
    expect(screen.getByText("Rest 159")).toBeTruthy();
    expect(screen.getByText("Nicht checkbar")).toBeTruthy();
    expect(darts()).toEqual(["T20", "T20", "S7"]);
    expect(screen.getByText("Stellwurf")).toBeTruthy();
    expect(screen.getByText("Danach Rest 32")).toBeTruthy();
  });

  it("löst einen Fehlwurf mit dem Folgeweg auf, ohne leere Erklärungsliste", () => {
    const { container } = show("m-56-0");
    expect(screen.getByText("Neuer Rest")).toBeTruthy();
    expect(screen.getByText("40")).toBeTruthy();
    expect(darts()).toEqual(["S16 (Fehlwurf)", "D20"]);
    expect(container.querySelector("dl")).toBeNull();
  });

  it("nennt bei einem Fehlwurf ohne Finish den Stellwurf", () => {
    show("m-125-1");
    expect(screen.getByText("52")).toBeTruthy();
    expect(darts()).toEqual(["T18", "S19 (Fehlwurf)", "S20"]);
    expect(screen.getByText("Stellwurf")).toBeTruthy();
    expect(screen.getByText("S20, Rest 32")).toBeTruthy();
  });

  describe("mit eingegebener Antwort", () => {
    it("meldet den besten Weg und stellt den eigenen Weg über den besten", () => {
      showWith("r-121", { kind: "darts", darts: ["T20", "T11", "D14"] });
      expect(screen.getByRole("status").textContent).toBe("Bester Weg");
      expect(row("Dein Weg")).toEqual(["T20", "T11", "D14"]);
      expect(row("Bester Weg")).toEqual(["T20", "T11", "D14"]);
      // Die Erklärungen bleiben.
      expect(screen.getByText("Nach T20")).toBeTruthy();
      expect(screen.getByText("101: T17 · Bull")).toBeTruthy();
    });

    it("meldet einen Weg, der nicht aufgeht, mit der Summe", () => {
      showWith("r-121", { kind: "darts", darts: ["T20", "T20"] });
      expect(screen.getByRole("status").textContent).toBe("Geht nicht aufErgibt 120 statt 121");
      expect(row("Dein Weg")).toEqual(["T20", "T20"]);
      expect(row("Bester Weg")).toEqual(["T20", "T11", "D14"]);
    });

    it("zeigt „Nicht checkbar“ als eigenen Weg statt Feldern", () => {
      showWith("r-121", { kind: "notCheckable" });
      expect(screen.getByRole("status").textContent).toBe("Ist checkbar");
      expect(screen.queryByRole("list", { name: "Dein Weg" })).toBeNull();
      expect(screen.getByText("Dein Weg").nextElementSibling?.textContent).toBe("Nicht checkbar");
    });

    it("bestätigt auf einer Bogey-Karte „Nicht checkbar“ und zeigt den Stellwurf", () => {
      showWith("b-159", { kind: "notCheckable" });
      expect(screen.getByRole("status").textContent).toBe("RichtigDer Rest ist nicht checkbar");
      expect(screen.getByText("Rest 159")).toBeTruthy();
      expect(screen.getAllByText("Nicht checkbar")).toHaveLength(2);
      expect(row("Stellwurf")).toEqual(["T20", "T20", "S7"]);
      expect(screen.queryByText("Bester Weg")).toBeNull();
    });

    it("stellt bei einem Fehlwurf die schon geworfenen Darts vor den eigenen Folgeweg", () => {
      showWith("m-56-0", { kind: "darts", darts: ["D20"] });
      expect(screen.getByRole("status").textContent).toBe("Bester Weg");
      expect(row("Dein Weg")).toEqual(["S16 (Fehlwurf)", "D20"]);
      expect(row("Bester Weg")).toEqual(["S16 (Fehlwurf)", "D20"]);
    });

    describe("mit einem anderen Stellwurf", () => {
      const over = (...d: string[]): Answer => ({ kind: "darts", darts: d });

      it("stellt beide Reste gegenüber und nennt den Grund", () => {
        // o-171: empfohlen T20 · T20 · S19, Rest 32
        showWith("o-171", over("T20", "T19", "S14"));
        expect(screen.getByRole("status").textContent).toBe("Anderer Stellwurf");
        expect(screen.getByText("Rest 40 (D20)")).toBeTruthy();
        expect(screen.getByText("Rest 32 (D16)")).toBeTruthy();
        expect(screen.getByText("Warum")).toBeTruthy();
        expect(screen.getByText("D16 lässt sich öfter halbieren als D20")).toBeTruthy();
        expect(screen.queryByText("Danach Rest 32")).toBeNull();
        expect(row("Dein Weg")).toEqual(["T20", "T19", "S14"]);
        expect(row("Stellwurf")).toEqual(["T20", "T20", "S19"]);
      });

      it("nennt einen Rest ohne Ein-Dart-Finish ohne Doppel", () => {
        showWith("o-171", over("S20", "S20", "S20"));
        expect(screen.getByText("Rest 111")).toBeTruthy();
      });

      it("lässt den richtigen Stellwurf wie bisher", () => {
        showWith("o-171", over("T20", "T20", "S19"));
        expect(screen.getByRole("status").textContent).toBe("Richtiger Stellwurf");
        expect(screen.getByText("Danach Rest 32")).toBeTruthy();
        expect(screen.queryByText("Rest 32 (D16)")).toBeNull();
        expect(screen.queryByText("Warum")).toBeNull();
      });

      it.each([
        ["überworfen", ["T20", "T20", "T17"]],
        ["mit Bogey-Zahl", ["S12"]],
      ])("zeigt %s weder Reste noch Grund", (_, entered) => {
        showWith("o-171", over(...entered));
        expect(screen.queryByText("Warum")).toBeNull();
        expect(screen.queryByText(/^Rest \d/)).toBeNull();
        expect(screen.getByText("Danach Rest 32")).toBeTruthy();
      });

      it("nennt die Reste auch auf Englisch", () => {
        const card = cardById("o-171")!;
        const answer = over("T20", "T19", "S14");
        const view = cardView(card, en.study);
        render(
          <StudyCard view={view} result={{ verdict: judge(checkFor(card), answer), answer, fixed: fixedDarts(view) }} />,
          { wrapper: ({ children }) => <I18nProvider locale="en">{children}</I18nProvider> },
        );
        expect(screen.getByText("40 left (D20)")).toBeTruthy();
        expect(screen.getByText("32 left (D16)")).toBeTruthy();
        expect(screen.getByText("D16 can be halved more often than D20")).toBeTruthy();
      });
    });

    it("nennt bei einem Fehlwurf ohne Finish einen anderen Stellwurf", () => {
      showWith("m-125-1", { kind: "darts", darts: ["S12"] });
      expect(screen.getByRole("status").textContent).toBe("Anderer Stellwurf");
      expect(row("Dein Weg")).toEqual(["T18", "S19 (Fehlwurf)", "S12"]);
      expect(row("Stellwurf")).toEqual(["T18", "S19 (Fehlwurf)", "S20"]);
    });
  });
});
