// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardById } from "@/lib/cards";
import { checkFor } from "@/lib/darts/judge";
import { cardView } from "./card-view";
import { REFRESH_TIMEOUT_MS } from "./study-load";

const router = vi.hoisted(() => ({ bfcacheId: "a", replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/review/actions", () => ({ submitReview: vi.fn(async () => ({ ok: true })) }));

const { StudySessionHost } = await import("./study-session-host");
type StudyItem = Parameters<typeof StudySessionHost>[0]["items"][number];

function items(...ids: string[]): StudyItem[] {
  return ids.map((id) => ({
    id,
    view: cardView(cardById(id)!),
    check: checkFor(cardById(id)!),
    reps: 0,
    labels: [{ 1: "1 Min", 2: "2 T", 3: "3 T", 4: "8 T" }],
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
    render(<StudySessionHost loadId={newLoadId()} items={items("r-5", "r-7")} />);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeTruthy();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it("holt für eine schon verbrauchte Ladung frische Karten und meldet, wenn keine kommen", async () => {
    const loadId = newLoadId();
    const first = render(<StudySessionHost loadId={loadId} items={items("r-5")} />);
    first.unmount();

    // Zurück zur Seite: dieselbe Ladung kommt aus dem Zurück-Cache.
    router.bfcacheId = "zurueck";
    const { container } = render(<StudySessionHost loadId={loadId} items={items("r-5")} />);
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Prüfen" })).toBeNull();
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();

    await act(async () => vi.advanceTimersByTime(REFRESH_TIMEOUT_MS));
    expect(screen.getByRole("alert").textContent).toBe(ERROR_TEXT);
    expect(screen.getByRole("link", { name: "Zur Übersicht" }).getAttribute("href")).toBe("/heute");
  });

  it("startet mit der frischen Ladung nach dem Neuladen und zeigt dann keinen Fehler", async () => {
    const loadId = newLoadId();
    render(<StudySessionHost loadId={loadId} items={items("r-5")} />).unmount();

    router.bfcacheId = "zurueck";
    const { rerender } = render(<StudySessionHost loadId={loadId} items={items("r-5")} />);
    expect(router.refresh).toHaveBeenCalledTimes(1);

    rerender(<StudySessionHost loadId={newLoadId()} items={items("r-7", "r-4")} />);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByText("7", { selector: "p" })).toBeTruthy();

    await act(async () => vi.advanceTimersByTime(REFRESH_TIMEOUT_MS));
    expect(screen.queryByText(ERROR_TEXT)).toBeNull();
  });

  it("behält die laufende Sitzung, wenn der Server die Seite neu rendert", () => {
    const { rerender } = render(<StudySessionHost loadId={newLoadId()} items={items("r-5")} />);
    fireEvent.click(screen.getByRole("button", { name: "Ohne Eingabe aufdecken" }));
    expect(screen.getByText("Warum")).toBeTruthy();

    const during = newLoadId();
    rerender(<StudySessionHost loadId={during} items={items("r-7")} />);
    expect(screen.getByText("Warum")).toBeTruthy();
    expect(screen.getByText("1 / 1")).toBeTruthy();
    expect(router.refresh).not.toHaveBeenCalled();

    // Auch die währenddessen angekommene Ladung gilt danach als verbraucht.
    router.bfcacheId = "spaeter";
    rerender(<StudySessionHost loadId={during} items={items("r-7")} />);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("beginnt nach einem neuen Seitenwechsel mit frischer Ladung von vorn", () => {
    const { rerender } = render(<StudySessionHost loadId={newLoadId()} items={items("r-5")} />);
    fireEvent.click(screen.getByRole("button", { name: "Ohne Eingabe aufdecken" }));
    expect(screen.getByText("Warum")).toBeTruthy();

    router.bfcacheId = "neu";
    rerender(<StudySessionHost loadId={newLoadId()} items={items("r-5")} />);
    expect(screen.queryByText("Warum")).toBeNull();
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeTruthy();
  });

  it("behält einen halb eingegebenen Weg, wenn der Server die Seite neu rendert", () => {
    const { rerender } = render(<StudySessionHost loadId={newLoadId()} items={items("r-5")} />);
    fireEvent.click(screen.getByRole("button", { name: "Single 1" }));
    rerender(<StudySessionHost loadId={newLoadId()} items={items("r-7")} />);
    const darts = within(screen.getByRole("list", { name: "Darts" })).getAllByRole("listitem");
    expect(darts.map((li) => li.textContent)).toEqual(["S1", "?offen", "?offen"]);
    expect(screen.getByText("5", { selector: "p" })).toBeTruthy();
  });
});
