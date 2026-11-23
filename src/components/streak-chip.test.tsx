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
    expect(screen.getByText("Serie: 1 Tag")).toBeTruthy();
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    render(<StreakChip streak={{ days: 12, paused: false, today: true }} />, { wrapper });
    expect(screen.getByText("Serie: 12 Tage")).toBeTruthy();
  });
});

describe("StreakChip pausiert", () => {
  it("zeigt die pausierte Serie", () => {
    render(<StreakChip streak={{ days: 1, paused: true, today: false }} />, { wrapper });
    expect(screen.getByText("Serie: 1 Tag · pausiert")).toBeTruthy();
    render(<StreakChip streak={{ days: 5, paused: true, today: false }} />, { wrapper: wrapperEn });
    expect(screen.getByText("5-day streak · paused")).toBeTruthy();
  });
});

describe("StreakChip heute", () => {
  it("zeigt die heute verlängerte Serie kräftig", () => {
    render(<StreakChip streak={{ days: 5, paused: false, today: true }} />, { wrapper });
    expect(screen.getByText("Serie: 5 Tage").getAttribute("data-state")).toBe("extended");
  });

  it("zeigt die heute noch offene Serie hellgelb, ohne zusätzlichen Text", () => {
    render(<StreakChip streak={{ days: 5, paused: false, today: false }} />, { wrapper });
    expect(screen.getByText("Serie: 5 Tage").getAttribute("data-state")).toBe("open");
  });

  it("zeigt die pausierte Serie grau, nicht als offen", () => {
    render(<StreakChip streak={{ days: 5, paused: true, today: false }} />, { wrapper });
    expect(screen.getByText("Serie: 5 Tage · pausiert").getAttribute("data-state")).toBe("paused");
  });

  it("färbt jeden Zustand mit seinen Theme-Farben", () => {
    const cases = [
      { streak: { days: 5, paused: false, today: true }, text: "Serie: 5 Tage", colors: "bg-accent text-accent-foreground" },
      { streak: { days: 5, paused: false, today: false }, text: "Serie: 5 Tage", colors: "bg-streak-open text-streak-open-foreground" },
      { streak: { days: 5, paused: true, today: false }, text: "Serie: 5 Tage · pausiert", colors: "bg-muted text-muted-foreground" },
    ];
    for (const { streak, text, colors } of cases) {
      const { unmount } = render(<StreakChip streak={streak} />, { wrapper });
      const classes = screen.getByText(text).className.split(" ");
      for (const color of colors.split(" ")) expect(classes).toContain(color);
      unmount();
    }
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
    expect(region.textContent).toBe("Serie: 00 Tage");
  });
});
