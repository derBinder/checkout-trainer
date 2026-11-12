// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { de } from "@/i18n/dictionaries/de";
import { en } from "@/i18n/dictionaries/en";
import { MAX_REST, MIN_REST, type Level } from "@/lib/stats";
import { NeutralRestGrid, RestGrid } from "./rest-grid";

const COUNT = MAX_REST - MIN_REST + 1;

function allLevels(level: Level): Record<number, Level> {
  return Object.fromEntries(Array.from({ length: COUNT }, (_, i) => [MIN_REST + i, level]));
}

describe("RestGrid", () => {
  it("zeigt jeden Rest von 2 bis 170 als Knopf", () => {
    render(<RestGrid levels={allLevels("new")} weak={new Set()} t={de.stats} />);
    const list = screen.getByRole("list", { name: "Alle Reste von 2 bis 170" });
    const buttons = within(list).getAllByRole("button");
    expect(buttons).toHaveLength(COUNT);
    expect(buttons[0].textContent).toBe("2");
    expect(buttons.at(-1)!.textContent).toBe("170");
    expect(buttons[0].getAttribute("data-rest")).toBe("2");
  });

  it("nennt im Namen Lernstand, Bogey-Zahl und schwierige Reste", () => {
    const levels = { ...allLevels("new"), 100: "known", 40: "learning" } satisfies Record<number, Level>;
    render(<RestGrid levels={levels} weak={new Set([100, 169])} t={de.stats} />);
    expect(screen.getByRole("button", { name: "100, sicher, schwierig" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "40, im Lernen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "169, neu, nicht checkbar, schwierig" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "168, neu, nicht checkbar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "2, neu" })).toBeTruthy();
  });
});

describe("NeutralRestGrid", () => {
  it("zeigt alle Reste ohne Knöpfe und versteckt sie vor Screenreadern", () => {
    const { container } = render(<NeutralRestGrid t={de.stats} />);
    const list = container.querySelector("ol")!;
    expect(list.getAttribute("aria-hidden")).toBe("true");
    expect(list.querySelectorAll("li")).toHaveLength(COUNT);
    expect(list.querySelector("button")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

describe("RestGrid auf Englisch", () => {
  it("nennt Lernstand, Bogey-Zahl und schwierige Reste auf Englisch", () => {
    const levels = { ...allLevels("new"), 100: "known", 40: "learning" } satisfies Record<number, Level>;
    render(<RestGrid levels={levels} weak={new Set([100, 169])} t={en.stats} />);
    expect(screen.getByRole("list", { name: "All scores from 2 to 170" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "100, known, difficult" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "40, learning" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "169, new, no checkout, difficult" })).toBeTruthy();
  });
});
