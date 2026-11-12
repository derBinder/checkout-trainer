// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { State } from "ts-fsrs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";

const queries = vi.hoisted(() => ({ loadQueue: vi.fn(), loadStatsData: vi.fn() }));
vi.mock("@/lib/auth/guard", () => ({
  requireActiveUser: async () => ({
    id: "u1",
    email: "spieler@beispiel.de",
    name: "Spieler",
    status: "active",
    role: "user",
    newPerDay: 5,
  }),
}));
vi.mock("@/lib/review/queries", () => queries);

const { StatsOverview, StatsStreak } = await import("./stats-data");

const again = (cardId: string) => ({ cardId, rating: 1, reviewedAt: new Date() });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("StatsOverview", () => {
  it("zählt die Lernstände, zeigt das Raster und die schwierigsten Reste", async () => {
    queries.loadStatsData.mockResolvedValue({
      states: [
        { cardId: "r-5", state: State.Review, scheduledDays: 30 },
        { cardId: "r-7", state: State.Learning, scheduledDays: 0 },
      ],
      logs: [again("r-7"), again("r-7"), again("r-5")],
    });
    render(await StatsOverview());

    expect(queries.loadStatsData).toHaveBeenCalledWith(db, "u1");
    expect(screen.getByText("sicher").nextElementSibling?.textContent).toBe("1");
    expect(screen.getByText("im Lernen").nextElementSibling?.textContent).toBe("1");
    expect(screen.getByText("neu").nextElementSibling?.textContent).toBe("167");

    expect(screen.getByRole("button", { name: "7, im Lernen, schwierig" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "5, sicher, schwierig" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "6, neu" })).toBeTruthy();

    const hardest = screen.getByRole("heading", { name: "Am schwierigsten" })
      .nextElementSibling as HTMLElement;
    expect(within(hardest).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "72× „Nochmal“",
      "51× „Nochmal“",
    ]);
  });

  it("lässt die schwierigsten Reste weg, solange es kein „Nochmal“ gab", async () => {
    queries.loadStatsData.mockResolvedValue({ states: [], logs: [] });
    render(await StatsOverview());
    expect(screen.getByText("neu").nextElementSibling?.textContent).toBe("169");
    expect(screen.queryByRole("heading", { name: "Am schwierigsten" })).toBeNull();
  });
});

describe("StatsStreak", () => {
  it("zeigt die Serie der Lerntage", async () => {
    queries.loadStatsData.mockResolvedValue({ states: [], logs: [again("r-5")] });
    render(await StatsStreak());
    expect(screen.getByText("1 Tag Serie")).toBeTruthy();
  });
});
