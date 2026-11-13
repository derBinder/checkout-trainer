// @vitest-environment jsdom
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardView } from "@/components/study/card-view";
import { I18nProvider } from "@/i18n/client";
import { de } from "@/i18n/dictionaries/de";
import { cardById } from "@/lib/cards";
import { checkFor } from "@/lib/darts/judge";

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

// Üben speichert nichts: Die Server Action darf nie aufgerufen werden.
const submitReview = vi.hoisted(() => vi.fn());
vi.mock("@/lib/review/actions", () => ({ submitReview }));

const { PracticeRoutesRound } = await import("./practice-routes-round");

function item(id: string) {
  const card = cardById(id)!;
  return { id, view: cardView(card, de.study), check: checkFor(card) };
}

// Aufdecken und „Weiter“ liegen an derselben Stelle; Tipps kurz hintereinander
// zählen nicht. Jeder Tipp im Test liegt deshalb eine Sekunde nach dem letzten.
let clock = 0;
function tap(name: string) {
  clock += 1000;
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
}
const flush = () => act(async () => {});
const big = (text: string) => screen.getByText(text, { selector: "p" });

const onClose = vi.fn();
const onRestart = vi.fn();

function renderRound(...ids: string[]) {
  return render(<PracticeRoutesRound items={ids.map(item)} onClose={onClose} onRestart={onRestart} />, { wrapper });
}

beforeEach(() => {
  clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  onClose.mockReset();
  onRestart.mockReset();
  submitReview.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PracticeRoutesRound", () => {
  it("fragt wie beim Lernen und zeigt nach dem Aufdecken „Nochmal“ und „Weiter“ statt der Bewertungen", () => {
    renderRound("r-5", "r-7");
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(big("5")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeTruthy();
    tap("Ohne Eingabe aufdecken");
    expect(screen.getByRole("button", { name: "Nochmal" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Weiter" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Gut/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Schwer/ })).toBeNull();
  });

  it("stellt nach „Nochmal“ auf der letzten Karte dieselbe Karte sofort wieder, mit leerer Eingabe", async () => {
    renderRound("r-5");
    tap("Ohne Eingabe aufdecken");
    tap("Nochmal");
    await flush();
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(big("5")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prüfen" }).hasAttribute("disabled")).toBe(true);
  });

  it("endet mit „Runde geschafft“ und bietet eine neue Runde oder das Ende an", async () => {
    renderRound("r-5", "r-7");
    tap("Ohne Eingabe aufdecken");
    tap("Weiter");
    tap("Ohne Eingabe aufdecken");
    tap("Weiter");
    await flush();
    expect(screen.getByRole("heading", { name: "Runde geschafft" })).toBeTruthy();
    expect(screen.getByText("2 Karten geübt.")).toBeTruthy();
    tap("Noch eine Runde");
    expect(onRestart).toHaveBeenCalledTimes(1);
    tap("Fertig");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("schließt über das Kreuz ohne Rückfrage", () => {
    const confirm = vi.spyOn(window, "confirm");
    renderRound("r-5", "r-7");
    fireEvent.click(screen.getByRole("button", { name: "Übung beenden" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("speichert nichts und warnt nicht beim Verlassen", async () => {
    const listen = vi.spyOn(window, "addEventListener");
    renderRound("r-5", "r-7");
    tap("Ohne Eingabe aufdecken");
    tap("Nochmal");
    tap("Ohne Eingabe aufdecken");
    tap("Weiter");
    await flush();
    expect(submitReview).not.toHaveBeenCalled();
    expect(listen.mock.calls.some(([type]) => type === "beforeunload")).toBe(false);
  });

  it("prüft Zwei-Dart-Karten wie beim Lernen", () => {
    renderRound("t-125");
    fireEvent.click(screen.getByRole("radio", { name: "Triple" }));
    fireEvent.click(screen.getByRole("button", { name: "Triple 20" }));
    fireEvent.click(screen.getByRole("button", { name: "Triple 11" }));
    tap("Prüfen");
    expect(screen.getByRole("status").textContent).toBe("Richtiger Stellwurfgenau richtig");
  });

  it("zählt den Fortschritt für Screenreader als „erledigt“", () => {
    renderRound("r-5", "r-7");
    tap("Ohne Eingabe aufdecken");
    tap("Weiter");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toBe("1 von 2 erledigt");
  });
});
