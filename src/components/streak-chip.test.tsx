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

describe("StreakChip", () => {
  it("zeigt nichts ohne Serie", () => {
    const { container } = render(<StreakChip streak={{ days: 0, paused: false, today: false }} />, { wrapper });
    expect(container.innerHTML).toBe("");
  });

  it("zeigt einen Tag in der Einzahl", () => {
    render(<StreakChip streak={{ days: 1, paused: false, today: true }} />, { wrapper });
    expect(screen.getByText("1 Tag Serie")).toBeTruthy();
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    render(<StreakChip streak={{ days: 12, paused: false, today: true }} />, { wrapper });
    expect(screen.getByText("12 Tage Serie")).toBeTruthy();
  });
});

describe("StreakChip pausiert", () => {
  it("zeigt die pausierte Serie", () => {
    render(<StreakChip streak={{ days: 1, paused: true, today: false }} />, { wrapper });
    expect(screen.getByText("1 Tag Serie · pausiert")).toBeTruthy();
    render(<StreakChip streak={{ days: 5, paused: true, today: false }} />, { wrapper: wrapperEn });
    expect(screen.getByText("5-day streak · paused")).toBeTruthy();
  });
});

describe("StreakChip heute", () => {
  it("zeigt die heute verlängerte Serie kräftig", () => {
    render(<StreakChip streak={{ days: 5, paused: false, today: true }} />, { wrapper });
    expect(screen.getByText("5 Tage Serie").getAttribute("data-state")).toBe("extended");
  });

  it("zeigt die heute noch offene Serie hellgelb, ohne zusätzlichen Text", () => {
    render(<StreakChip streak={{ days: 5, paused: false, today: false }} />, { wrapper });
    expect(screen.getByText("5 Tage Serie").getAttribute("data-state")).toBe("open");
  });

  it("zeigt die pausierte Serie grau, nicht als offen", () => {
    render(<StreakChip streak={{ days: 5, paused: true, today: false }} />, { wrapper });
    expect(screen.getByText("5 Tage Serie · pausiert").getAttribute("data-state")).toBe("paused");
  });
});

describe("StreakChip auf Englisch", () => {
  it("zeigt die Serie auf Englisch", () => {
    render(<StreakChip streak={{ days: 1, paused: false, today: true }} />, { wrapper: wrapperEn });
    expect(screen.getByText("1-day streak")).toBeTruthy();
    render(<StreakChip streak={{ days: 12, paused: false, today: true }} />, { wrapper: wrapperEn });
    expect(screen.getByText("12-day streak")).toBeTruthy();
  });
});

describe("StreakChipSkeleton", () => {
  it("kennzeichnet den Platzhalter als ladend, ohne Nutzerdaten", () => {
    const { container } = render(<StreakChipSkeleton />, { wrapper });
    const region = container.firstElementChild!;
    expect(region.getAttribute("aria-busy")).toBe("true");
    expect(region.textContent).toBe("00 Tage Serie");
  });
});
