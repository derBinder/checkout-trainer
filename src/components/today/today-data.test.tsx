// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { State } from "ts-fsrs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { I18nProvider } from "@/i18n/client";

// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

const user = vi.hoisted(() => ({
  id: "u1",
  email: "spieler@beispiel.de",
  name: "Spieler",
  status: "active" as const,
  role: "user",
  newPerDay: 5,
}));
const queries = vi.hoisted(() => ({ loadQueue: vi.fn(), loadStatsData: vi.fn() }));
vi.mock("@/lib/auth/guard", () => ({ requireActiveUser: async () => user }));
vi.mock("@/lib/review/queries", () => queries);
vi.mock("@/app/[lang]/(app)/today/actions", () => ({ learnMoreCards: vi.fn() }));
const rootParams = vi.hoisted(() => ({ lang: "de" }));
vi.mock("next/root-params", () => ({ lang: async () => rootParams.lang }));

const { TodayOverview, TodayStreak } = await import("./today-data");

const DAY_MS = 24 * 60 * 60 * 1000;

function queue(dueCount: number, freshCount: number, unseenCount: number) {
  queries.loadQueue.mockResolvedValue({ cardIds: [], dueCount, freshCount, unseenCount, reps: {}, states: {} });
}

afterEach(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  queries.loadStatsData.mockResolvedValue({
    states: [
      { cardId: "r-5", state: State.Review, scheduledDays: 30 },
      { cardId: "r-7", state: State.Learning, scheduledDays: 0 },
    ],
    logs: [],
  });
});

describe("TodayOverview", () => {
  it("zeigt fällige und neue Karten, den Fortschritt und den Knopf zum Lernen", async () => {
    queue(3, 2, 150);
    render(await TodayOverview(), { wrapper });

    expect(queries.loadQueue).toHaveBeenCalledWith(db, user, expect.any(Date));
    expect(queries.loadStatsData).toHaveBeenCalledWith(db, "u1");
    expect(screen.getByText("fällig").nextElementSibling?.textContent).toBe("3");
    expect(screen.getByText("neu").nextElementSibling?.textContent).toBe("2");
    expect(screen.getByText("2 von 169 begonnen, 1 sicher").nextElementSibling?.textContent).toBe("1\u00a0%");
    expect(screen.getByRole("link", { name: "Lernen" }).getAttribute("href")).toBe("/de/study");
    expect(screen.queryByText("Für heute bist du fertig.")).toBeNull();
  });

  it("bietet weitere Karten an, wenn heute nichts mehr offen ist", async () => {
    queue(0, 0, 150);
    render(await TodayOverview(), { wrapper });

    expect(screen.getByText("Für heute bist du fertig.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Weitere 5 Karten lernen" })).toBeTruthy();
    expect(screen.queryByText("Du hast alle Karten begonnen.")).toBeNull();
    expect(screen.queryByRole("link", { name: "Lernen" })).toBeNull();
  });

  it("sagt, wenn alle Karten begonnen sind, und bietet keine weiteren an", async () => {
    queue(0, 0, 0);
    render(await TodayOverview(), { wrapper });

    expect(screen.getByText("Für heute bist du fertig.")).toBeTruthy();
    expect(screen.getByText("Du hast alle Karten begonnen.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Weitere 5 Karten lernen" })).toBeNull();
  });
});

describe("TodayOverview: Einstieg „Üben“", () => {
  const links = () => screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")]);

  it("steht als ruhiger Knopf unter „Lernen“", async () => {
    queue(3, 2, 150);
    render(await TodayOverview(), { wrapper });
    expect(links()).toEqual([
      ["Lernen", "/de/study"],
      ["Üben", "/de/practice"],
    ]);
    expect(screen.getByRole("link", { name: "Üben" }).className).toContain("bg-secondary");
  });

  it("bleibt da, wenn heute nichts mehr fällig ist, und wird nicht zur Hauptaktion", async () => {
    queue(0, 0, 0);
    render(await TodayOverview(), { wrapper });
    expect(links()).toEqual([["Üben", "/de/practice"]]);
    expect(screen.getByRole("link", { name: "Üben" }).className).toContain("bg-secondary");
  });

  it("spricht Englisch", async () => {
    queue(3, 2, 150);
    rootParams.lang = "en";
    try {
      render(await TodayOverview(), {
        wrapper: ({ children }) => <I18nProvider locale="en">{children}</I18nProvider>,
      });
      expect(screen.getByRole("link", { name: "Practice" }).getAttribute("href")).toBe("/en/practice");
    } finally {
      rootParams.lang = "de";
    }
  });
});

describe("TodayStreak", () => {
  it("zeigt die Serie der Lerntage", async () => {
    queue(0, 0, 0);
    // Feste Zeit am Mittag: Serien zählen Berliner Kalendertage; „jetzt minus 24 Stunden“
    // läge um die Zeitumstellung herum (etwa 2026-10-25T22:30Z) sonst auf demselben Tag.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T11:00:00Z"));
    const now = Date.now();
    queries.loadStatsData.mockResolvedValue({
      states: [],
      logs: [
        { cardId: "r-5", rating: 3, reviewedAt: new Date(now) },
        { cardId: "r-5", rating: 3, reviewedAt: new Date(now - DAY_MS) },
      ],
    });
    render(await TodayStreak(), { wrapper });
    expect(screen.getByText("2 Tage Serie")).toBeTruthy();
  });

  it("zeigt ohne Serie nichts", async () => {
    queue(0, 0, 0);
    const { container } = render(await TodayStreak(), { wrapper });
    expect(container.textContent).toBe("");
  });
});
