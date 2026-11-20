// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardById } from "@/lib/cards";
import { checkFor } from "@/lib/darts/judge";
import { de } from "@/i18n/dictionaries/de";
import { cardView } from "./card-view";
import { REFRESH_TIMEOUT_MS } from "./study-load";
import { drainDetached, initStudy, studyReducer } from "./study-state";
import { I18nProvider } from "@/i18n/client";

// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

const router = vi.hoisted(() => ({ bfcacheId: "a", replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/review/actions", () => ({ submitReview: vi.fn(async () => ({ ok: true })) }));

const { StudySessionHost } = await import("./study-session-host");
type StudyItem = Parameters<typeof StudySessionHost>[0]["items"][number];

function items(...ids: string[]): StudyItem[] {
  return ids.map((id) => ({
    id,
    view: cardView(cardById(id)!, de.study),
    check: checkFor(cardById(id)!),
    reps: 0,
    labels: [
      {
        1: { unit: "minutes", value: 1 },
        2: { unit: "days", value: 2 },
        3: { unit: "days", value: 3 },
        4: { unit: "days", value: 8 },
      },
    ],
  }));
}

// Verbrauchte Ladungen merkt sich das Modul für den ganzen Tab: je Test eigene Kennungen.
let n = 0;
const newLoadId = () => `ladung-${++n}`;

const ERROR_TEXT = "Die Lernsitzung konnte nicht geladen werden.";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  router.bfcacheId = `seite-${n}`;
  router.refresh.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("StudySessionHost", () => {
  it("startet mit einer frischen Ladung die Sitzung, ohne neu zu laden", () => {
    render(<StudySessionHost loadId={newLoadId()} items={items("r-5", "r-7")} />, { wrapper });
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeTruthy();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("zählt die heute schon erledigten Karten in den Fortschritt", () => {
    render(<StudySessionHost loadId={newLoadId()} items={items("r-5")} doneToday={2} />, { wrapper });
    expect(screen.getByText("3 / 3")).toBeTruthy();
  });

  it("holt für eine schon verbrauchte Ladung frische Karten und meldet, wenn keine kommen", async () => {
    const loadId = newLoadId();
    const first = render(<StudySessionHost loadId={loadId} items={items("r-5")} />, { wrapper });
    first.unmount();

    // Zurück zur Seite: dieselbe Ladung kommt aus dem Zurück-Cache.
    router.bfcacheId = "zurueck";
    const { container } = render(<StudySessionHost loadId={loadId} items={items("r-5")} />, { wrapper });
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Prüfen" })).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();

    await act(async () => vi.advanceTimersByTime(REFRESH_TIMEOUT_MS));
    expect(screen.getByRole("alert").textContent).toBe(ERROR_TEXT);
    expect(screen.getByRole("link", { name: "Zur Übersicht" }).getAttribute("href")).toBe("/de/today");
  });

  it("startet mit der frischen Ladung nach dem Neuladen und zeigt dann keinen Fehler", async () => {
    const loadId = newLoadId();
    render(<StudySessionHost loadId={loadId} items={items("r-5")} />, { wrapper }).unmount();

    router.bfcacheId = "zurueck";
    const { rerender } = render(<StudySessionHost loadId={loadId} items={items("r-5")} />, { wrapper });
    expect(router.refresh).toHaveBeenCalledTimes(1);

    rerender(<StudySessionHost loadId={newLoadId()} items={items("r-7", "r-4")} />);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByText("7", { selector: "p" })).toBeTruthy();

    await act(async () => vi.advanceTimersByTime(REFRESH_TIMEOUT_MS));
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();
  });

  it("behält die laufende Sitzung, wenn der Server die Seite neu rendert", () => {
    const { rerender } = render(<StudySessionHost loadId={newLoadId()} items={items("r-5")} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Ohne Eingabe aufdecken" }));
    expect(screen.getByText("Nach S1")).toBeTruthy();

    const during = newLoadId();
    rerender(<StudySessionHost loadId={during} items={items("r-7")} />);
    expect(screen.getByText("Nach S1")).toBeTruthy();
    expect(screen.getByText("1 / 1")).toBeTruthy();
    expect(router.refresh).not.toHaveBeenCalled();

    // Auch die währenddessen angekommene Ladung gilt danach als verbraucht.
    router.bfcacheId = "spaeter";
    rerender(<StudySessionHost loadId={during} items={items("r-7")} />);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("beginnt nach einem neuen Seitenwechsel mit frischer Ladung von vorn", () => {
    const { rerender } = render(<StudySessionHost loadId={newLoadId()} items={items("r-5")} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Ohne Eingabe aufdecken" }));
    expect(screen.getByText("Nach S1")).toBeTruthy();

    router.bfcacheId = "neu";
    rerender(<StudySessionHost loadId={newLoadId()} items={items("r-5")} />);
    expect(screen.queryByText("Nach S1")).toBeNull();
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeTruthy();
  });

  it("wartet auf eine verlassene Sitzung, die noch speichert, und holt dann frische Karten", async () => {
    // Uhr fest auf einen Zeitpunkt lange vor heute: Die Speicherung gilt danach für die anderen Tests als alt.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], now: new Date("2020-01-01T10:00:00Z") });
    let answer!: (r: { ok: true }) => void;
    const open = [{ type: "reveal" }, { type: "rate", rating: 3 }] as const;
    drainDetached(
      open.reduce(studyReducer, initStudy(["r-5"], {})),
      () => new Promise((resolve) => (answer = resolve)),
    );

    // Diese Ladung entstand, bevor die alte Bewertung ankam: Sie kann r-5 mit alter Wiederholungszahl zeigen.
    const { container, rerender } = render(
      <StudySessionHost loadId={newLoadId()} items={items("r-5", "r-7")} />,
      { wrapper },
    );
    expect(screen.queryByRole("button", { name: "Prüfen" })).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(router.refresh).not.toHaveBeenCalled();
    // Solange noch gespeichert wird, ist nichts fehlgeschlagen.
    await act(async () => vi.advanceTimersByTime(REFRESH_TIMEOUT_MS));
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();

    await act(async () => answer({ ok: true }));
    expect(router.refresh).toHaveBeenCalledTimes(1);

    rerender(<StudySessionHost loadId={newLoadId()} items={items("r-5", "r-7")} />);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    await act(async () => vi.advanceTimersByTime(REFRESH_TIMEOUT_MS));
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();
  });

  it("lädt gleich frisch, wenn eine verlassene Sitzung eben erst gespeichert hat", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], now: new Date("2020-01-02T10:00:00Z") });
    const open = [{ type: "reveal" }, { type: "rate", rating: 3 }] as const;
    drainDetached(open.reduce(studyReducer, initStudy(["r-5"], {})), async () => ({ ok: true }));
    await act(async () => {});

    render(<StudySessionHost loadId={newLoadId()} items={items("r-5")} />, { wrapper });
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Prüfen" })).toBeNull();
  });

  it("behält einen halb eingegebenen Weg, wenn der Server die Seite neu rendert", () => {
    const { rerender } = render(<StudySessionHost loadId={newLoadId()} items={items("r-5")} />, { wrapper });
    fireEvent.click(screen.getByRole("button", { name: "Single 1" }));
    rerender(<StudySessionHost loadId={newLoadId()} items={items("r-7")} />);
    const darts = within(screen.getByRole("list", { name: "Darts" })).getAllByRole("listitem");
    expect(darts.map((li) => li.textContent)).toEqual(["S1", "?offen", "?offen"]);
    expect(screen.getByText("5", { selector: "p" })).toBeTruthy();
  });
});
