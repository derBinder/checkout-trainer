// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { CARDS, cardsFor } from "@/lib/cards";
import { NO_EXTRA_CARDS } from "@/lib/extra-cards";
import { practiceGroups, RANGES, type RangeId } from "@/lib/practice/filter";
import { DEFAULT_SELECTION, type PracticeSelection } from "@/lib/practice/selection";
import { PracticeSelect } from "./practice-select";

const CARD_META = cardsFor(NO_EXTRA_CARDS).map((c) => ({ rest: c.rest, groups: practiceGroups(c) }));
const ALL_META = CARDS.map((c) => ({ rest: c.rest, groups: practiceGroups(c) }));
const CORE_RANGES = RANGES.map((r) => r.id).filter((id) => id !== "171-230");

function Harness({
  initial = { ...DEFAULT_SELECTION, ranges: CORE_RANGES },
  onStart = () => {},
  onSave = () => {},
  cards = CARD_META,
  ranges = CORE_RANGES,
}: {
  initial?: PracticeSelection;
  onStart?: () => void;
  onSave?: (s: PracticeSelection) => void;
  cards?: { rest: number; groups: ReturnType<typeof practiceGroups> }[];
  ranges?: RangeId[];
}) {
  const [selection, setSelection] = useState(initial);
  return (
    <PracticeSelect
      cards={cards}
      ranges={ranges}
      selection={selection}
      onChange={(s) => {
        setSelection(s);
        onSave(s);
      }}
      onStart={onStart}
    />
  );
}

function renderSelect(props: Parameters<typeof Harness>[0] = {}, locale: "de" | "en" = "de") {
  return render(
    <I18nProvider locale={locale}>
      <Harness {...props} />
    </I18nProvider>,
  );
}

const start = () => screen.getByRole("button", { name: "Los" });
const range = (name: string) => within(screen.getByRole("group", { name: "Bereich" })).getByRole("button", { name });
const kind = (name: string) => within(screen.getByRole("radiogroup", { name: "Kartenart" })).getByRole("radio", { name });
const exercise = (name: string) => within(screen.getByRole("radiogroup", { name: "Übung" })).getByRole("radio", { name });

describe("PracticeSelect", () => {
  it("wählt beim ersten Öffnen „Wege“, alle Bereiche und alle Karten", () => {
    renderSelect();
    expect((exercise("Wege") as HTMLInputElement).checked).toBe(true);
    const chips = within(screen.getByRole("group", { name: "Bereich" })).getAllByRole("button");
    expect(chips.map((c) => c.textContent)).toEqual(["2–40", "41–60", "61–80", "81–100", "101–120", "121–140", "141–170"]);
    for (const chip of chips) expect(chip.getAttribute("aria-pressed")).toBe("true");
    expect((kind("Alle") as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText("402 Karten passen")).toBeTruthy();
    expect(start().hasAttribute("disabled")).toBe(false);
  });

  it("sperrt „Los“ ohne Bereich und sagt warum", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    renderSelect({ initial: { ...DEFAULT_SELECTION, ranges: ["2-40"] }, onStart });
    await user.click(range("2–40"));
    expect(range("2–40").getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Wähle mindestens einen Bereich.")).toBeTruthy();
    expect(start().hasAttribute("disabled")).toBe(true);
    await user.click(start());
    expect(onStart).not.toHaveBeenCalled();
  });

  it("sperrt „Los“, wenn keine Karte zur Auswahl passt", async () => {
    const user = userEvent.setup();
    renderSelect({ initial: { ...DEFAULT_SELECTION, ranges: ["2-40"] } });
    await user.click(kind("Fehlwürfe"));
    expect(screen.getByText("Zu dieser Auswahl gibt es keine Karten.")).toBeTruthy();
    expect(start().hasAttribute("disabled")).toBe(true);
  });

  it("zählt die passenden Karten und startet", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const onSave = vi.fn();
    renderSelect({ initial: { ...DEFAULT_SELECTION, ranges: ["2-40"], kind: "misses" }, onStart, onSave });
    await user.click(range("41–60"));
    expect(screen.getByText("1 Karte passt")).toBeTruthy();
    expect(onSave).toHaveBeenLastCalledWith({ exercise: "routes", ranges: ["2-40", "41-60"], kind: "misses" });
    await user.click(start());
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("zeigt für „Rechnen“ nur einen Satz zur Übung und „Los“", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    renderSelect({ initial: { ...DEFAULT_SELECTION, ranges: [] }, onSave });
    await user.click(exercise("Rechnen"));
    expect(onSave).toHaveBeenLastCalledWith({ exercise: "math", ranges: [], kind: "all" });
    expect(screen.queryByRole("group", { name: "Bereich" })).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Kartenart" })).toBeNull();
    expect(screen.getByText("Zehn kurze Rechnungen vor dem Checkout. Was bleibt nach drei Darts, und ist es eine Bogey-Zahl?")).toBeTruthy();
    expect(start().hasAttribute("disabled")).toBe(false);
  });

  it("zeigt den Bereich 171–230 nur, wenn er angeboten wird, und zählt dort die Stellwürfe", async () => {
    const user = userEvent.setup();
    renderSelect({ cards: ALL_META, ranges: RANGES.map((r) => r.id), initial: { ...DEFAULT_SELECTION, ranges: [] } });
    const chips = within(screen.getByRole("group", { name: "Bereich" })).getAllByRole("button");
    expect(chips.at(-1)?.textContent).toBe("171–230");
    await user.click(range("171–230"));
    await user.click(kind("Stellwürfe"));
    expect(screen.getByText("60 Karten passen")).toBeTruthy();
    await user.click(kind("Fehlwürfe"));
    expect(screen.getByText("Zu dieser Auswahl gibt es keine Karten.")).toBeTruthy();
  });

  it("spricht Englisch", () => {
    renderSelect({}, "en");
    expect(screen.getByRole("radiogroup", { name: "Exercise" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Setups" })).toBeTruthy();
    expect(screen.getByText("402 cards match")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Start" })).toBeTruthy();
  });
});
