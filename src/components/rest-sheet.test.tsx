// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { restDetails } from "@/components/stats/rest-details";
import { I18nProvider } from "@/i18n/client";
import { de } from "@/i18n/dictionaries/de";
import { en } from "@/i18n/dictionaries/en";
import type { Locale } from "@/i18n/locales";
import { CARDS } from "@/lib/cards";
import { MAX_REST, MIN_REST, type Level } from "@/lib/stats";
import { RestGrid } from "./rest-grid";
import { RestSheet } from "./rest-sheet";

const details = restDetails(CARDS);
const levels: Record<number, Level> = Object.fromEntries(
  Array.from({ length: MAX_REST - MIN_REST + 1 }, (_, i) => [MIN_REST + i, "new"]),
);
levels[100] = "known";
levels[170] = "learning";
const dates = {
  100: { learned: "01.01.2026", known: "05.01.2026" },
  170: { learned: "02.01.2026" },
};

function setup(locale: Locale = "de") {
  const user = userEvent.setup();
  render(
    <I18nProvider locale={locale}>
      <RestSheet details={details} levels={levels} dates={dates}>
        <p>Tippe auf einen Rest.</p>
        <RestGrid levels={levels} weak={new Set()} t={(locale === "de" ? de : en).stats} />
      </RestSheet>
    </I18nProvider>,
  );
  return user;
}

describe("RestSheet", () => {
  it("öffnet zu einem angetippten Rest Weg, Lernstand und Zerlegung", async () => {
    const user = setup();
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: "100, sicher" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Rest 100" })).toBeTruthy();
    expect(dialog.textContent).toContain("Lernstand: sicher");
    const darts = within(dialog).getByRole("list", { name: "Darts" });
    expect(within(darts).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "T20",
      "D20",
    ]);
    expect(dialog.textContent).toContain("Nach T2040 mit 1 Dart: D20");
    expect(dialog.textContent).not.toContain("Nicht checkbar");
  });

  it("zeigt bei einer Bogey-Zahl, dass sie nicht checkbar ist, und den Stellwurf", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "169, neu, nicht checkbar" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Rest 169" })).toBeTruthy();
    expect(dialog.textContent).toContain("Nicht checkbar");
    expect(dialog.textContent).toContain("Stellen auf Rest 32.");
    expect(dialog.textContent).toContain("Lernstand: neu");
  });

  it("öffnet nichts bei einem Klick neben die Reste", async () => {
    const user = setup();
    await user.click(screen.getByText("Tippe auf einen Rest."));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("schließt und gibt den Fokus an den angetippten Rest zurück", async () => {
    const user = setup();
    const cell = screen.getByRole("button", { name: "170, im Lernen" });
    await user.click(cell);
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("Lernstand: im Lernen");
    await user.click(within(dialog).getByRole("button", { name: "Schließen" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(cell);
  });

  it("öffnet auf Englisch mit englischen Texten und Schließen-Knopf", async () => {
    const user = setup("en");
    await user.click(screen.getByRole("button", { name: "169, new, no checkout" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Score 169" })).toBeTruthy();
    expect(dialog.textContent).toContain("Level: new");
    expect(dialog.textContent).toContain("No checkout");
    expect(within(dialog).getByRole("button", { name: "Close" })).toBeTruthy();
  });

  it("nennt bei einer sicheren Zahl beide Daten", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "100, sicher" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("gelernt am 01.01.2026");
    expect(dialog.textContent).toContain("sicher seit 05.01.2026");
  });

  it("nennt bei einer Zahl im Lernen nur das Lerndatum", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "170, im Lernen" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("gelernt am 02.01.2026");
    expect(dialog.textContent).not.toContain("sicher seit");
  });

  it("zeigt bei einer neuen Zahl kein Datum", async () => {
    const user = setup();
    await user.click(screen.getByRole("button", { name: "169, neu, nicht checkbar" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).not.toContain("gelernt am");
    expect(dialog.textContent).not.toContain("sicher seit");
  });

  it("nennt die Daten auf Englisch", async () => {
    const user = setup("en");
    await user.click(screen.getByRole("button", { name: "100, known" }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("learned on 01.01.2026");
    expect(dialog.textContent).toContain("known since 05.01.2026");
  });
});
