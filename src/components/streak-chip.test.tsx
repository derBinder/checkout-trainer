// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StreakChip, StreakChipSkeleton } from "./streak-chip";

describe("StreakChip", () => {
  it("zeigt nichts ohne Serie", () => {
    const { container } = render(<StreakChip streak={0} />);
    expect(container.innerHTML).toBe("");
  });

  it("zeigt einen Tag in der Einzahl", () => {
    render(<StreakChip streak={1} />);
    expect(screen.getByText("1 Tag Serie")).toBeTruthy();
  });

  it("zeigt mehrere Tage in der Mehrzahl", () => {
    render(<StreakChip streak={12} />);
    expect(screen.getByText("12 Tage Serie")).toBeTruthy();
  });
});

describe("StreakChipSkeleton", () => {
  it("kennzeichnet den Platzhalter als ladend, ohne Nutzerdaten", () => {
    const { container } = render(<StreakChipSkeleton />);
    const region = container.firstElementChild!;
    expect(region.getAttribute("aria-busy")).toBe("true");
    expect(region.textContent).toBe("00 Tage Serie");
  });
});
