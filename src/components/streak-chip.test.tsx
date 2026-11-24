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

/** Screenreader hören das Schildchen als ein Bild mit ganzem Satz; sichtbar ist nur die Tageszahl. */
function chipWith(streak: Streak, spoken: string, wrap = wrapper) {
  render(<StreakChip streak={streak} />, { wrapper: wrap });
  return screen.getByRole("img", { name: spoken });
}

describe("StreakChip", () => {
  it("zeigt nichts ohne Serie", () => {
    const { container } = render(<StreakChip streak={{ days: 0, paused: false, today: false }} />, { wrapper });
    expect(container.innerHTML).toBe("");
  });

  it("zeigt einen Tag in der Einzahl", () => {
    expect(chipWith({ days: 1, paused: false, today: true }, "Serie: 1 Tag").textContent).toBe("1 Tag");
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    expect(chipWith({ days: 12, paused: false, today: true }, "Serie: 12 Tage").textContent).toBe("12 Tage");
  });

  it("zeigt eine dreistellige Serie", () => {
    expect(chipWith({ days: 365, paused: false, today: true }, "Serie: 365 Tage").textContent).toBe("365 Tage");
  });
});

describe("StreakChip pausiert", () => {
  it("nennt die Pause nur Screenreadern", () => {
    expect(chipWith({ days: 5, paused: true, today: false }, "Serie: 5 Tage, pausiert").textContent).toBe("5 Tage");
  });

  it("nennt die Pause auf Englisch", () => {
    expect(chipWith({ days: 5, paused: true, today: false }, "Streak: 5 days, paused", wrapperEn).textContent).toBe("5 days");
  });
});

describe("StreakChip Zustände", () => {
  const cases: { state: string; streak: Streak }[] = [
    { state: "extended", streak: { days: 5, paused: false, today: true } },
    { state: "open", streak: { days: 5, paused: false, today: false } },
    { state: "paused", streak: { days: 5, paused: true, today: false } },
  ];

  it.each(cases)("kennzeichnet den Zustand $state", ({ state, streak }) => {
    expect(chipWith(streak, state === "paused" ? "Serie: 5 Tage, pausiert" : "Serie: 5 Tage").getAttribute("data-state")).toBe(state);
  });
});

describe("StreakChip auf Englisch", () => {
  it("zeigt einen Tag in der Einzahl", () => {
    expect(chipWith({ days: 1, paused: false, today: true }, "Streak: 1 day", wrapperEn).textContent).toBe("1 day");
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    expect(chipWith({ days: 12, paused: false, today: true }, "Streak: 12 days", wrapperEn).textContent).toBe("12 days");
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
