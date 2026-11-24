// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { StreakChip, StreakChipSkeleton } from "./streak-chip";

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}
function wrapperEn({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="en">{children}</I18nProvider>;
}

/** Sichtbar ist nur die Tageszahl, der volle Text ist Screenreadern vorbehalten. */
function expectTexts(visible: string, spoken: string) {
  expect(screen.getByText(visible).getAttribute("aria-hidden")).toBe("true");
  expect(screen.getByText(spoken).classList).toContain("sr-only");
}

describe("StreakChip", () => {
  it("zeigt nichts ohne Serie", () => {
    const { container } = render(<StreakChip streak={{ days: 0, paused: false, today: false }} />, { wrapper });
    expect(container.innerHTML).toBe("");
  });

  it("zeigt einen Tag in der Einzahl", () => {
    render(<StreakChip streak={{ days: 1, paused: false, today: true }} />, { wrapper });
    expectTexts("1 Tag", "Serie: 1 Tag");
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    render(<StreakChip streak={{ days: 12, paused: false, today: true }} />, { wrapper });
    expectTexts("12 Tage", "Serie: 12 Tage");
  });

  it("zeigt eine dreistellige Serie", () => {
    render(<StreakChip streak={{ days: 365, paused: false, today: true }} />, { wrapper });
    expectTexts("365 Tage", "Serie: 365 Tage");
  });
});

describe("StreakChip pausiert", () => {
  it("nennt die Pause nur Screenreadern", () => {
    render(<StreakChip streak={{ days: 5, paused: true, today: false }} />, { wrapper });
    expectTexts("5 Tage", "Serie: 5 Tage · pausiert");
  });

  it("nennt die Pause auf Englisch nur Screenreadern", () => {
    render(<StreakChip streak={{ days: 5, paused: true, today: false }} />, { wrapper: wrapperEn });
    expectTexts("5 days", "5-day streak · paused");
  });
});

describe("StreakChip Zustände", () => {
  const cases = [
    { state: "extended", streak: { days: 5, paused: false, today: true }, icon: "lucide-flame", colors: "bg-accent text-accent-foreground" },
    { state: "open", streak: { days: 5, paused: false, today: false }, icon: "lucide-flame", colors: "bg-streak-open text-streak-open-foreground" },
    { state: "paused", streak: { days: 5, paused: true, today: false }, icon: "lucide-pause", colors: "bg-muted text-muted-foreground" },
  ];

  it.each(cases)("zeigt $state mit eigenem Icon und eigenen Theme-Farben", ({ state, streak, icon, colors }) => {
    render(<StreakChip streak={streak} />, { wrapper });
    const chip = screen.getByText("5 Tage").closest("p")!;
    expect(chip.getAttribute("data-state")).toBe(state);
    for (const color of colors.split(" ")) expect(chip.classList).toContain(color);
    const svg = chip.querySelector("svg")!;
    expect(svg.getAttribute("aria-hidden")).toBe("true");
    expect(svg.classList).toContain(icon);
    // Nur die heute verlängerte Serie brennt gefüllt.
    expect(svg.classList.contains("fill-current")).toBe(state === "extended");
  });
});

describe("StreakChip auf Englisch", () => {
  it("zeigt einen Tag in der Einzahl", () => {
    render(<StreakChip streak={{ days: 1, paused: false, today: true }} />, { wrapper: wrapperEn });
    expectTexts("1 day", "1-day streak");
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    render(<StreakChip streak={{ days: 12, paused: false, today: true }} />, { wrapper: wrapperEn });
    expectTexts("12 days", "12-day streak");
  });
});

describe("StreakChipSkeleton", () => {
  it("kennzeichnet den Platzhalter als ladend, ohne Nutzerdaten", () => {
    const { container } = render(<StreakChipSkeleton />, { wrapper });
    const region = container.firstElementChild!;
    expect(region.getAttribute("aria-busy")).toBe("true");
    expect(region.textContent).toBe("00 Tage");
  });
});
