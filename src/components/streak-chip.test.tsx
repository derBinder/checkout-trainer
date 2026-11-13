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
    const { container } = render(<StreakChip streak={0} />, { wrapper });
    expect(container.innerHTML).toBe("");
  });

  it("zeigt einen Tag in der Einzahl", () => {
    render(<StreakChip streak={1} />, { wrapper });
    expect(screen.getByText("1 Tag Serie")).toBeTruthy();
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    render(<StreakChip streak={12} />, { wrapper });
    expect(screen.getByText("12 Tage Serie")).toBeTruthy();
  });
});

describe("StreakChip auf Englisch", () => {
  it("zeigt die Serie auf Englisch", () => {
    render(<StreakChip streak={1} />, { wrapper: wrapperEn });
    expect(screen.getByText("1-day streak")).toBeTruthy();
    render(<StreakChip streak={12} />, { wrapper: wrapperEn });
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
