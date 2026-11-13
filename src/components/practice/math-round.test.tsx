// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { CARDS } from "@/lib/cards";
import { mathSolutions, type MathTask } from "@/lib/practice/math";
import { MathRound } from "./math-round";

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}
function wrapperEn({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="en">{children}</I18nProvider>;
}

const SOLUTIONS = mathSolutions(CARDS);
const T89: MathTask = { start: 211, throws: ["T20", "T19", "S5"], rest: 89 };
const T159: MathTask = { start: 219, throws: ["S20", "S20", "S20"], rest: 159 };

let clock = 0;
function tap(name: string) {
  clock += 1000;
  fireEvent.click(screen.getByRole("button", { name }));
}
const type = (...digits: number[]) => digits.forEach((d) => tap(String(d)));
const row = (name: string) =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);
const answer = () => screen.getByRole("status", { name: "Deine Antwort" }).textContent;

const onClose = vi.fn();
const onRestart = vi.fn();

function renderRound(tasks: MathTask[], w = wrapper) {
  return render(<MathRound tasks={tasks} solutions={SOLUTIONS} onClose={onClose} onRestart={onRestart} />, {
    wrapper: w,
  });
}

beforeEach(() => {
  clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  onClose.mockReset();
  onRestart.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("MathRound", () => {
  it("zeigt Rest, Würfe, die Frage und das Zahlenfeld", () => {
    renderRound([T89, T159]);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    const progress = screen.getByRole("progressbar", { name: "Fortschritt" });
    expect(progress.getAttribute("aria-valuetext")).toBe("0 von 2 erledigt");
    expect(screen.getByRole("button", { name: "Übung beenden" })).toBeTruthy();
    expect(screen.getByText("Rest")).toBeTruthy();
    expect(screen.getByText("211")).toBeTruthy();
    expect(row("Darts")).toEqual(["T20", "T19", "S5"]);
    expect(screen.getByText("Was bleibt?")).toBeTruthy();
    for (let d = 0; d <= 9; d++) expect(screen.getByRole("button", { name: String(d) })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prüfen" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "0" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Letzte Ziffer löschen" }).hasAttribute("disabled")).toBe(true);
  });

  it("nimmt Ziffern auf, löscht und sperrt nach drei Ziffern", () => {
    renderRound([T89]);
    type(1, 0, 5);
    expect(answer()).toBe("105");
    expect(screen.getByRole("button", { name: "7" }).hasAttribute("disabled")).toBe(true);
    tap("Letzte Ziffer löschen");
    expect(answer()).toBe("10");
    expect(screen.getByRole("button", { name: "Prüfen" }).hasAttribute("disabled")).toBe(false);
  });

  it("meldet eine richtige Antwort und den besten Weg des Rests", () => {
    renderRound([T89, T159]);
    type(8, 9);
    tap("Prüfen");
    const status = screen.getByRole("status");
    expect(within(status).getByText("Richtig")).toBeTruthy();
    expect(within(status).getByText("es bleiben 89")).toBeTruthy();
    const best = SOLUTIONS[89];
    expect(best.kind).toBe("finish");
    expect(row("Checkbar, bester Weg")).toEqual(best.kind === "finish" ? best.route : []);
    expect(screen.queryByRole("button", { name: "Prüfen" })).toBeNull();
    expect(screen.getByRole("button", { name: "Weiter" })).toBeTruthy();
  });

  it("meldet eine falsche Antwort mit dem richtigen Rest", () => {
    renderRound([T89]);
    type(9, 8);
    tap("Prüfen");
    const status = screen.getByRole("status");
    expect(within(status).getByText("Falsch, es bleiben 89")).toBeTruthy();
    expect(within(status).getByText("nicht 98")).toBeTruthy();
  });

  it("zeigt bei einer Bogey-Zahl den Stellwurf", () => {
    renderRound([T159]);
    type(1, 5, 9);
    tap("Prüfen");
    const setup = SOLUTIONS[159];
    if (setup.kind !== "bogey") throw new Error("159 ist eine Bogey-Zahl");
    expect(screen.getByText("Bogey, nicht checkbar")).toBeTruthy();
    expect(row("Stellwurf")).toEqual(setup.throws);
    expect(screen.getByText(`Danach Rest ${setup.leaves}`)).toBeTruthy();
  });

  it("geht mit „Weiter“ zur nächsten Aufgabe und endet mit dem Ergebnis", () => {
    renderRound([T89, T159]);
    type(8, 9);
    tap("Prüfen");
    tap("Weiter");
    expect(screen.getByText("2 / 2")).toBeTruthy();
    expect(answer()).toBe("");
    type(1);
    tap("Prüfen");
    tap("Weiter");
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Runde geschafft" }));
    expect(screen.getByText("1 von 2 richtig")).toBeTruthy();
    tap("Noch eine Runde");
    expect(onRestart).toHaveBeenCalledTimes(1);
    tap("Fertig");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("verwirft einen Doppeltipp auf das Ergebnis und behält es", () => {
    renderRound([T89]);
    type(8, 9);
    tap("Prüfen");
    tap("Weiter");
    fireEvent.click(screen.getByRole("button", { name: "Fertig" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText("1 von 1 richtig")).toBeTruthy();
  });

  it("führt den Fokus zur Auflösung und zur nächsten Aufgabe", () => {
    renderRound([T89, T159]);
    type(8, 9);
    tap("Prüfen");
    const content = document.activeElement as HTMLElement;
    expect(content).not.toBe(document.body);
    expect(within(content).getByText("Richtig")).toBeTruthy();
    tap("Weiter");
    expect(document.activeElement).not.toBe(document.body);
    expect(within(document.activeElement as HTMLElement).getByText("Was bleibt?")).toBeTruthy();
  });

  it("schließt über das Kreuz", () => {
    renderRound([T89]);
    tap("Übung beenden");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("hält den Bildschirm an, solange Aufgaben offen sind", async () => {
    const release = vi.fn(async () => {});
    const request = vi.fn(async () => ({ released: false, release }));
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    try {
      renderRound([T89]);
      await act(async () => {});
      expect(request).toHaveBeenCalledWith("screen");
      type(8);
      tap("Prüfen");
      tap("Weiter");
      await act(async () => {});
      expect(release).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(navigator, "wakeLock");
    }
  });

  it("spricht Englisch", () => {
    renderRound([T89], wrapperEn);
    expect(screen.getByText("What is left?")).toBeTruthy();
    type(9, 8);
    tap("Check");
    expect(screen.getByText("Wrong, 89 left")).toBeTruthy();
    expect(screen.getByText("Checkable, best route")).toBeTruthy();
  });
});
