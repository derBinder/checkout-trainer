// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cardView } from "@/components/study/card-view";
import { I18nProvider } from "@/i18n/client";
import { de } from "@/i18n/dictionaries/de";
import { CARDS } from "@/lib/cards";
import { checkFor } from "@/lib/darts/judge";
import { practiceGroups } from "@/lib/practice/filter";
import { mathSolutions } from "@/lib/practice/math";
import { DEFAULT_SELECTION } from "@/lib/practice/selection";

const router = vi.hoisted(() => ({ bfcacheId: "a" }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const submitReview = vi.hoisted(() => vi.fn());
vi.mock("@/lib/review/actions", () => ({ submitReview }));

const { PracticeHost } = await import("./practice-host");
const { savePracticeSelection } = await import("./selection-store");

const CARDS_DATA = CARDS.map((c) => ({
  id: c.id,
  rest: c.rest,
  groups: practiceGroups(c),
  view: cardView(c, de.study),
  check: checkFor(c),
}));
const SOLUTIONS = mathSolutions(CARDS);

function renderHost() {
  return render(
    <I18nProvider locale="de">
      <PracticeHost cards={CARDS_DATA} solutions={SOLUTIONS} />
    </I18nProvider>,
  );
}

const exercise = (name: string) => within(screen.getByRole("radiogroup", { name: "Übung" })).getByRole("radio", { name });

beforeEach(() => {
  localStorage.clear();
  savePracticeSelection(DEFAULT_SELECTION);
  router.bfcacheId = "a";
});

describe("PracticeHost", () => {
  it("startet eine Runde „Wege“ mit den Karten der Auswahl und kehrt danach zur Auswahl zurück", async () => {
    const user = userEvent.setup();
    savePracticeSelection({ exercise: "routes", ranges: ["41-60"], kind: "misses" });
    renderHost();
    await user.click(screen.getByRole("button", { name: "Los" }));
    expect(screen.getByText("1 / 1")).toBeTruthy();
    expect(screen.getByText(/Ziel war T/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Ohne Eingabe aufdecken" }));
    await new Promise((r) => setTimeout(r, 400));
    await user.click(screen.getByRole("button", { name: "Weiter" }));
    expect(screen.getByRole("heading", { name: "Runde geschafft" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Noch eine Runde" }));
    expect(screen.getByText("1 / 1")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Übung beenden" }));
    expect(screen.getByText("1 Karte passt")).toBeTruthy();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it("zieht höchstens 20 Karten je Runde", async () => {
    const user = userEvent.setup();
    renderHost();
    await user.click(screen.getByRole("button", { name: "Los" }));
    expect(screen.getByText("1 / 20")).toBeTruthy();
  });

  it("startet eine Runde „Rechnen“ mit zehn Aufgaben", async () => {
    const user = userEvent.setup();
    renderHost();
    await user.click(exercise("Rechnen"));
    await user.click(screen.getByRole("button", { name: "Los" }));
    expect(screen.getByText("1 / 10")).toBeTruthy();
    expect(screen.getByText("Was bleibt?")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Übung beenden" }));
    expect((exercise("Rechnen") as HTMLInputElement).checked).toBe(true);
  });

  it("beginnt nach einem neuen Seitenaufruf wieder mit der Auswahl", async () => {
    const user = userEvent.setup();
    const { rerender } = renderHost();
    await user.click(screen.getByRole("button", { name: "Los" }));
    expect(screen.getByText("1 / 20")).toBeTruthy();
    router.bfcacheId = "b";
    rerender(
      <I18nProvider locale="de">
        <PracticeHost cards={CARDS_DATA} solutions={SOLUTIONS} />
      </I18nProvider>,
    );
    expect(screen.getByRole("button", { name: "Los" })).toBeTruthy();
  });
});
