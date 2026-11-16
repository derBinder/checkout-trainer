// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { State } from "ts-fsrs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/locales";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/forecast";
import { rate, type SrsState } from "@/lib/srs/fsrs";
import { levelOf } from "@/lib/stats";
import { dayKey } from "@/lib/time";

// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapperFor(locale: Locale) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <I18nProvider locale={locale}>{children}</I18nProvider>;
  };
}
const wrapper = wrapperFor("de");

const user = vi.hoisted(() => ({
  id: "u1",
  email: "spieler@beispiel.de",
  name: "Spieler",
  status: "active" as const,
  role: "user",
  newPerDay: 5,
}));
const request = vi.hoisted(() => ({ lang: "de" }));
vi.mock("next/root-params", () => ({ lang: async () => request.lang }));
const queries = vi.hoisted(() => ({ loadQueue: vi.fn(), loadStatsData: vi.fn() }));
vi.mock("@/lib/auth/guard", () => ({ requireActiveUser: async () => user }));
vi.mock("@/lib/review/queries", () => queries);

const { StatsOverview, StatsStreak } = await import("./stats-data");

const introducedAt = new Date("2026-11-01T10:00:00Z");
const again = (cardId: string) => ({ cardId, rating: 1, reviewedAt: new Date() });

function queue(unseenCount: number, newLeftToday: number) {
  queries.loadQueue.mockResolvedValue({ cardIds: [], dueCount: 0, freshCount: 0, unseenCount, newLeftToday, reps: {}, states: {} });
}

beforeEach(() => {
  vi.clearAllMocks();
  request.lang = "de";
  user.newPerDay = 5;
  queue(402, 5);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("StatsOverview", () => {
  it("zählt die Lernstände, zeigt das Raster und die schwierigsten Reste", async () => {
    queries.loadStatsData.mockResolvedValue({
      states: [
        { cardId: "r-5", state: State.Review, scheduledDays: 30, introducedAt },
        { cardId: "r-7", state: State.Learning, scheduledDays: 0, introducedAt },
      ],
      logs: [again("r-7"), again("r-7"), again("r-5")],
    });
    render(await StatsOverview(), { wrapper });

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

  it("nennt im Detailblatt das Lerndatum, aber kein Sicher-seit-Datum, das der Verlauf nicht trägt", async () => {
    queries.loadStatsData.mockResolvedValue({
      states: [
        { cardId: "r-5", state: State.Review, scheduledDays: 30, introducedAt },
        { cardId: "r-7", state: State.Learning, scheduledDays: 0, introducedAt },
      ],
      // Ein einzelnes „Nochmal“ erklärt keinen Stand „sicher“: kein Datum erfinden.
      logs: [again("r-5")],
    });
    const person = userEvent.setup();
    render(await StatsOverview(), { wrapper });

    await person.click(screen.getByRole("button", { name: "7, im Lernen" }));
    let dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("gelernt am 01.11.2026");
    await person.click(within(dialog).getByRole("button", { name: "Schließen" }));

    await person.click(screen.getByRole("button", { name: /^5, sicher/ }));
    dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain("gelernt am 01.11.2026");
    expect(dialog.textContent).not.toContain("sicher seit");
    await person.click(within(dialog).getByRole("button", { name: "Schließen" }));

    await person.click(screen.getByRole("button", { name: "6, neu" }));
    dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).not.toContain("gelernt am");
  });

  it.each([
    ["de", "gelernt am", "sicher seit", "sicher"],
    ["en", "learned on", "known since", "known"],
  ] as const)("nennt im Detailblatt gelernt am und sicher seit im Format der Sprache (%s)", async (locale, learnedOn, knownSince, level) => {
    // Bewertungen und gespeicherter Stand aus demselben rate()-Verlauf: der Verlauf trägt „sicher“.
    const logs: { cardId: string; rating: number; reviewedAt: Date }[] = [];
    const levels: string[] = [];
    let card: SrsState | null = null;
    let at = introducedAt;
    for (let i = 0; i < 6; i++) {
      card = rate(card, 3, at);
      logs.push({ cardId: "r-5", rating: 3, reviewedAt: at });
      levels.push(levelOf(card.state, card.scheduledDays));
      at = new Date(Math.max(card.due.getTime(), at.getTime() + 86_400_000));
    }
    expect(levels.at(-1)).toBe("known");
    const knownDay = dayKey(logs[levels.indexOf("known")].reviewedAt);
    queries.loadStatsData.mockResolvedValue({
      states: [{ cardId: "r-5", state: card!.state, scheduledDays: card!.scheduledDays, introducedAt }],
      logs,
    });
    request.lang = locale;
    const person = userEvent.setup();
    render(await StatsOverview(), { wrapper: wrapperFor(locale) });

    await person.click(screen.getByRole("button", { name: new RegExp(`^5, ${level}`) }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog.textContent).toContain(`${learnedOn} ${formatDate(dayKey(introducedAt), locale)}`);
    expect(dialog.textContent).toContain(`${knownSince} ${formatDate(knownDay, locale)}`);
  });

  it("lässt die schwierigsten Reste weg, solange es kein „Nochmal“ gab", async () => {
    queries.loadStatsData.mockResolvedValue({ states: [], logs: [] });
    render(await StatsOverview(), { wrapper });
    expect(screen.getByText("neu").nextElementSibling?.textContent).toBe("169");
    expect(screen.queryByRole("heading", { name: "Am schwierigsten" })).toBeNull();
  });
});

describe("Prognose", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-13T10:00:00Z"));
    queries.loadStatsData.mockResolvedValue({ states: [], logs: [] });
  });

  it("nennt den Tag, an dem alle Karten freigeschaltet sind", async () => {
    // 30 ungesehen, heute 0 offen, 5 pro Tag: sechs Tage nach heute.
    queue(30, 0);
    render(await StatsOverview(), { wrapper });
    expect(queries.loadQueue).toHaveBeenCalledWith(db, user, new Date("2026-11-13T10:00:00Z"));
    const line = screen.getByText("Voraussichtlich alle Karten frei am 19. November");
    // Tag und Monat brechen nicht auseinander.
    expect(line.textContent).toContain("19.\u00a0November");
  });

  it("meldet, wenn alle Karten freigeschaltet sind", async () => {
    queue(0, 5);
    render(await StatsOverview(), { wrapper });
    expect(screen.getByText("Alle Karten freigeschaltet")).toBeTruthy();
  });

  it("nennt kein Datum, wenn keine neuen Karten eingestellt sind", async () => {
    user.newPerDay = 0;
    queue(30, 0);
    render(await StatsOverview(), { wrapper });
    expect(screen.getByText("Keine neuen Karten eingestellt")).toBeTruthy();
  });
});

describe("StatsStreak", () => {
  it("zeigt die Serie der Lerntage", async () => {
    queries.loadStatsData.mockResolvedValue({ states: [], logs: [again("r-5")] });
    render(await StatsStreak(), { wrapper });
    expect(screen.getByText("1 Tag Serie")).toBeTruthy();
  });
});
