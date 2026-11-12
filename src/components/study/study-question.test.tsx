// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReducer } from "react";
import { describe, expect, it, vi } from "vitest";
import { cardById } from "@/lib/cards";
import { checkFor, type Answer } from "@/lib/darts/judge";
import { de } from "@/i18n/dictionaries/de";
import { cardView } from "./card-view";
import { initInput, inputReducer } from "./route-input";
import { QuestionFooter, StudyQuestion, fixedDarts } from "./study-question";
import { I18nProvider } from "@/i18n/client";
// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

/** Frage mit Fußzeile und echter Eingabelogik, wie in der Lernsitzung. */
function Question({ id, onReveal }: { id: string; onReveal: (answer?: Answer) => void }) {
  const card = cardById(id)!;
  const check = checkFor(card);
  const [input, dispatch] = useReducer(inputReducer, check, initInput);
  return (
    <>
      <StudyQuestion view={cardView(card, de.study)} input={input} onAction={dispatch} />
      <QuestionFooter check={check} input={input} onReveal={onReveal} />
    </>
  );
}

function setup(id: string) {
  const user = userEvent.setup();
  const onReveal = vi.fn();
  render(<Question id={id} onReveal={onReveal} />, { wrapper });
  const press = (name: string) => user.click(screen.getByRole("button", { name }));
  const ring = (name: string) => user.click(screen.getByRole("radio", { name }));
  return { user, onReveal, press, ring };
}

const slots = () => within(screen.getByRole("list", { name: "Darts" })).getAllByRole("listitem");
const darts = () => slots().map((li) => li.textContent);
/** Index des hervorgehobenen nächsten Felds, -1 wenn keins. */
const nextSlot = () => slots().findIndex((li) => li.getAttribute("aria-current") === "step");
const checkedRing = () => screen.getByRole("radio", { checked: true }).getAttribute("aria-label");
const isDisabled = (name: string) => screen.getByRole("button", { name }).hasAttribute("disabled");

describe("StudyQuestion", () => {
  it("fragt nach einem Rest mit drei offenen Feldern, das erste hervorgehoben", () => {
    setup("r-5");
    expect(screen.getByText("Rest")).toBeTruthy();
    expect(screen.getByText("5", { selector: "p" })).toBeTruthy();
    expect(darts()).toEqual(["?offen", "?offen", "?offen"]);
    expect(nextSlot()).toBe(0);
  });

  it.each(["r-5", "r-40", "r-121", "b-169", "m-56-0"])("beginnt auf %s mit dem Ring Single", (id) => {
    setup(id);
    expect(checkedRing()).toBe("Single");
  });

  it("füllt die Felder Dart für Dart und springt auf D, sobald ein direktes Doppel bleibt", async () => {
    const { press, ring } = setup("r-121");
    await ring("Triple");
    await press("Triple 20");
    expect(darts()).toEqual(["T20", "?offen", "?offen"]);
    expect(nextSlot()).toBe(1);
    // Rest 61: kein Doppel, der Ring bleibt.
    expect(checkedRing()).toBe("Triple");

    await press("Triple 11");
    expect(nextSlot()).toBe(2);
    // Rest 28: direktes Doppel.
    expect(checkedRing()).toBe("Doppel");

    await press("Doppel 14");
    expect(darts()).toEqual(["T20", "T11", "D14"]);
    expect(nextSlot()).toBe(-1);
  });

  it("lässt den Ring wechseln, und Löschen stellt den Ring vor dem gelöschten Dart wieder her", async () => {
    const { press, ring } = setup("r-121");
    expect(checkedRing()).toBe("Single");
    await press("Single 20");
    await ring("Triple");
    await press("Triple 17");
    // Rest 50: kein automatischer Wechsel, Bull hat eine eigene Taste.
    expect(checkedRing()).toBe("Triple");
    await ring("Doppel");

    await press("Letzten Dart löschen");
    expect(darts()).toEqual(["S20", "?offen", "?offen"]);
    expect(checkedRing()).toBe("Triple");
    await press("Letzten Dart löschen");
    expect(darts()).toEqual(["?offen", "?offen", "?offen"]);
    expect(checkedRing()).toBe("Single");
    expect(isDisabled("Letzten Dart löschen")).toBe(true);
  });

  it("nimmt 25 und Bull unabhängig vom gewählten Ring", async () => {
    const { press, ring } = setup("r-121");
    await ring("Triple");
    await press("Single Bull 25");
    await press("Bull");
    expect(darts()).toEqual(["25", "Bull", "?offen"]);
  });

  it("sperrt nach drei Darts die Feldtasten, Löschen bleibt", async () => {
    const { press, ring } = setup("r-121");
    await ring("Triple");
    await press("Triple 20");
    await press("Triple 20");
    await press("Triple 20");
    expect(isDisabled("Triple 1")).toBe(true);
    expect(isDisabled("Single Bull 25")).toBe(true);
    expect(isDisabled("Bull")).toBe(true);
    expect(isDisabled("Letzten Dart löschen")).toBe(false);
    await press("Letzten Dart löschen");
    expect(isDisabled("Triple 1")).toBe(false);
  });

  it("fragt bei einem Fehlwurf nach dem Folgeweg, die geworfenen Darts stehen fest", async () => {
    const { press, ring } = setup("m-56-0");
    expect(screen.getByText("Rest war 56")).toBeTruthy();
    expect(screen.getByText("Ziel war T16, getroffen: Single 16")).toBeTruthy();
    // Den neuen Rest rechnet der Nutzer im Kopf: keine große Zahl.
    expect(screen.queryByText("40")).toBeNull();
    expect(darts()).toEqual(["S16 (Fehlwurf)", "?offen", "?offen"]);
    expect(nextSlot()).toBe(1);
    // Nur eigene Darts lassen sich löschen.
    expect(isDisabled("Letzten Dart löschen")).toBe(true);

    await ring("Doppel");
    await press("Doppel 20");
    expect(darts()).toEqual(["S16 (Fehlwurf)", "D20", "?offen"]);
    await press("Letzten Dart löschen");
    expect(darts()).toEqual(["S16 (Fehlwurf)", "?offen", "?offen"]);
  });

  it("nimmt bei einem Fehlwurf nur so viele Darts, wie noch in der Hand sind", async () => {
    const { press } = setup("m-125-1");
    expect(darts()).toEqual(["T18", "S19 (Fehlwurf)", "?offen"]);
    await press("Single 20");
    expect(darts()).toEqual(["T18", "S19 (Fehlwurf)", "S20"]);
    expect(nextSlot()).toBe(-1);
    // Rest 32 bleibt: der Ring springt auf D, die Tasten sind aber gesperrt.
    expect(checkedRing()).toBe("Doppel");
    expect(isDisabled("Doppel 1")).toBe(true);
    expect(isDisabled("Bull")).toBe(true);
  });
});

describe("QuestionFooter", () => {
  it("prüft erst, wenn ein Dart eingegeben ist, und gibt den eingegebenen Weg weiter", async () => {
    const { press, ring, onReveal } = setup("r-100");
    expect(isDisabled("Prüfen")).toBe(true);
    await press("Prüfen");
    expect(onReveal).not.toHaveBeenCalled();

    await ring("Triple");
    await press("Triple 20");
    await press("Doppel 20");
    await press("Prüfen");
    expect(onReveal).toHaveBeenCalledWith({ kind: "darts", darts: ["T20", "D20"] });
  });

  it("„Nicht checkbar“ ist auch mit eingegebenen Darts aktiv und gibt nur die Wahl weiter", async () => {
    const { press, onReveal } = setup("r-121");
    await press("Single 20");
    await press("Nicht checkbar");
    expect(onReveal).toHaveBeenCalledWith({ kind: "notCheckable" });
  });

  it("„Ohne Eingabe aufdecken“ deckt ohne Antwort auf", async () => {
    const { press, onReveal } = setup("r-121");
    await press("Single 20");
    await press("Ohne Eingabe aufdecken");
    expect(onReveal).toHaveBeenCalledTimes(1);
    expect(onReveal.mock.calls[0]).toEqual([]);
  });

  it("verrät nicht, ob ein Rest ein Bogey ist", () => {
    setup("b-169");
    expect(screen.getByText("169", { selector: "p" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Nicht checkbar" })).toBeTruthy();
    expect(checkedRing()).toBe("Single");
  });

  it("bietet auf Fehlwurf-Karten kein „Nicht checkbar“ an", () => {
    setup("m-125-1");
    expect(screen.queryByRole("button", { name: "Nicht checkbar" })).toBeNull();
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ohne Eingabe aufdecken" })).toBeTruthy();
  });
});

describe("fixedDarts", () => {
  it("nennt die schon geworfenen Darts einer Fehlwurf-Karte, sonst keine", () => {
    expect(fixedDarts(cardView(cardById("m-125-1")!, de.study))).toEqual(["T18", "S19"]);
    expect(fixedDarts(cardView(cardById("r-121")!, de.study))).toEqual([]);
  });
});
