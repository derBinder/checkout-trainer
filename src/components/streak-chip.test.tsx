// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import type { Streak } from "@/lib/stats";
import { StreakChip, StreakChipSkeleton } from "./streak-chip";

function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}
function wrapperEn({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="en">{children}</I18nProvider>;
}

/** Das Schildchen zeigt die Tageszahl; der ganze Text mit Vor- und Nachsatz ist der für Screenreader. */
function chipWith(streak: Streak, visible: string, wrap = wrapper) {
  render(<StreakChip streak={streak} />, { wrapper: wrap });
  return screen.getByText(visible).parentElement!;
}

describe("StreakChip", () => {
  it("zeigt nichts ohne Serie", () => {
    const { container } = render(<StreakChip streak={{ days: 0, paused: false, today: false }} />, { wrapper });
    expect(container.innerHTML).toBe("");
  });

  it("zeigt einen Tag in der Einzahl", () => {
    expect(chipWith({ days: 1, paused: false, today: true }, "1 Tag").textContent).toBe("Serie: 1 Tag");
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    expect(chipWith({ days: 12, paused: false, today: true }, "12 Tage").textContent).toBe("Serie: 12 Tage");
  });

  it("zeigt eine dreistellige Serie", () => {
    expect(chipWith({ days: 365, paused: false, today: true }, "365 Tage").textContent).toBe("Serie: 365 Tage");
  });

  it("nennt die Tageszahl nur einmal", () => {
    chipWith({ days: 12, paused: false, today: true }, "12 Tage");
    expect(screen.getAllByText(/12 Tage/)).toHaveLength(1);
  });
});

describe("StreakChip pausiert", () => {
  it("nennt die Pause im Text für Screenreader", () => {
    expect(chipWith({ days: 5, paused: true, today: false }, "5 Tage").textContent).toBe("Serie: 5 Tage, pausiert");
  });

  it("nennt die Pause auf Englisch", () => {
    expect(chipWith({ days: 5, paused: true, today: false }, "5 days", wrapperEn).textContent).toBe("Streak: 5 days, paused");
  });
});

describe("StreakChip Zustände", () => {
  const cases: { state: string; streak: Streak }[] = [
    { state: "extended", streak: { days: 5, paused: false, today: true } },
    { state: "open", streak: { days: 5, paused: false, today: false } },
    { state: "paused", streak: { days: 5, paused: true, today: false } },
  ];

  it.each(cases)("kennzeichnet den Zustand $state", ({ state, streak }) => {
    expect(chipWith(streak, "5 Tage").getAttribute("data-state")).toBe(state);
  });
});

describe("StreakChip auf Englisch", () => {
  it("zeigt einen Tag in der Einzahl", () => {
    expect(chipWith({ days: 1, paused: false, today: true }, "1 day", wrapperEn).textContent).toBe("Streak: 1 day");
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    expect(chipWith({ days: 12, paused: false, today: true }, "12 days", wrapperEn).textContent).toBe("Streak: 12 days");
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
