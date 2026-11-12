// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardById } from "@/lib/cards";
import type { Rating } from "@/lib/srs/fsrs";
import { cardView } from "./card-view";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const submitReview = vi.hoisted(() => vi.fn());
vi.mock("@/lib/review/actions", () => ({ submitReview }));

const { StudySession } = await import("./study-session");
type StudyItem = Parameters<typeof StudySession>[0]["items"][number];

const FIRST_LABELS: Record<Rating, string> = { 1: "1 Min", 2: "2 T", 3: "3 T", 4: "8 T" };
const AFTER_AGAIN: Record<Rating, string> = { 1: "5 Min", 2: "1 T", 3: "2 T", 4: "4 T" };

function item(id: string, reps = 0): StudyItem {
  const card = cardById(id);
  if (!card) throw new Error(`Karte ${id} fehlt`);
  return { id, view: cardView(card), reps, labels: [FIRST_LABELS, AFTER_AGAIN] };
}

type Result = { ok: true } | { ok: false; reason: string };

/** Ein Speichervorgang, der erst auf Anweisung fertig wird. */
function deferred() {
  let resolve!: (r: Result) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<Result>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Aufdecken und Bewerten liegen an derselben Stelle; Tipps kurz hintereinander
// zählen nicht. Jeder Tipp im Test liegt deshalb eine Sekunde nach dem letzten.
let clock = 0;
function tap(name: string) {
  clock += 1000;
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${name}`) }));
}

/** Der Abstand, der unter einer Bewertung steht. */
function intervalOn(name: string): string | null {
  const button = screen.getByRole("button", { name: new RegExp(`^${name}`) });
  return within(button).getByText(name).nextElementSibling?.textContent ?? null;
}

const flush = () => act(async () => {});

async function rateCurrent(rating: string) {
  tap("Weg zeigen");
  tap(rating);
  await flush();
}

beforeEach(() => {
  router.replace.mockReset();
  submitReview.mockReset();
  submitReview.mockResolvedValue({ ok: true });
  clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  // jsdom kennt kein Element.scrollTo.
  Element.prototype.scrollTo = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("StudySession", () => {
  it("zeigt erst die Frage, nach „Weg zeigen“ die Auflösung und die vier Bewertungen", () => {
    render(<StudySession items={[item("r-5"), item("r-7")]} />);
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(screen.queryByText("Warum")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Gut/ })).toBeNull();

    tap("Weg zeigen");
    expect(screen.getByText("Warum")).toBeTruthy();
    expect(screen.getByText("S3 · D1")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Weg zeigen" })).toBeNull();
    for (const [name, label] of [
      ["Nochmal", "1 Min"],
      ["Schwer", "2 T"],
      ["Gut", "3 T"],
      ["Leicht", "8 T"],
    ]) {
      expect(intervalOn(name)).toBe(label);
    }
    // Der Fokus folgt dem neuen Inhalt.
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
  });

  it("ignoriert einen Tipp auf eine Bewertung direkt nach dem Aufdecken", () => {
    render(<StudySession items={[item("r-5")]} />);
    tap("Weg zeigen");
    clock += 100;
    fireEvent.click(screen.getByRole("button", { name: /^Gut/ }));
    expect(screen.getByText("Warum")).toBeTruthy();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it.each([
    ["Schwer", 2],
    ["Gut", 3],
    ["Leicht", 4],
  ] as const)("„%s“ speichert die Bewertung und geht zur nächsten Karte", async (name, rating) => {
    render(<StudySession items={[item("r-5", 4), item("r-7")]} />);
    await rateCurrent(name);
    expect(submitReview).toHaveBeenCalledWith({ cardId: "r-5", rating, reps: 4 });
    expect(screen.getByText("2 / 2")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Weg zeigen" })).toBeTruthy();
  });

  it("„Nochmal“ legt die Karte wieder vor, mit den Abständen nach einem weiteren Nochmal", async () => {
    render(<StudySession items={[item("r-5")]} />);
    await rateCurrent("Nochmal");
    expect(submitReview).toHaveBeenCalledWith({ cardId: "r-5", rating: 1, reps: 0 });
    expect(screen.getByText("1 / 2")).toBeTruthy();
    tap("Weg zeigen");
    expect(intervalOn("Gut")).toBe("2 T");
    expect(intervalOn("Nochmal")).toBe("5 Min");
  });

  it("zeigt am Ende „Geschafft“, wartet aufs Speichern und bietet dann die Übersicht an", async () => {
    const save = deferred();
    submitReview.mockReturnValueOnce(save.promise);
    render(<StudySession items={[item("r-5")]} />);
    await rateCurrent("Gut");

    expect(screen.getByRole("heading", { name: "Geschafft" })).toBeTruthy();
    expect(screen.getByText("1 Karte gelernt.")).toBeTruthy();
    expect(screen.getByText("Speichere …")).toBeTruthy();
    const waiting = screen.getByRole("button", { name: "Zur Übersicht" });
    expect(waiting.hasAttribute("disabled")).toBe(true);

    await act(async () => save.resolve({ ok: true }));
    expect(screen.queryByText("Speichere …")).toBeNull();
    expect(screen.getByRole("link", { name: "Zur Übersicht" }).getAttribute("href")).toBe("/heute");
  });

  it("zählt mehrere gelernte Karten", async () => {
    render(<StudySession items={[item("r-5"), item("r-7")]} />);
    await rateCurrent("Gut");
    await rateCurrent("Leicht");
    expect(screen.getByText("2 Karten gelernt.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Zur Übersicht" })).toBeTruthy();
  });

  it("meldet einen Speicherfehler und speichert mit „Erneut versuchen“ nach", async () => {
    submitReview.mockRejectedValueOnce(new Error("offline"));
    render(<StudySession items={[item("r-5")]} />);
    await rateCurrent("Gut");

    expect(screen.getByText("Nicht gespeichert, wird erneut versucht")).toBeTruthy();
    expect(screen.queryByText("Speichere …")).toBeNull();
    expect(screen.getByRole("button", { name: "Zur Übersicht" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));
    await flush();
    expect(submitReview).toHaveBeenCalledTimes(2);
    expect(submitReview).toHaveBeenLastCalledWith({ cardId: "r-5", rating: 3, reps: 0 });
    expect(screen.queryByText("Nicht gespeichert, wird erneut versucht")).toBeNull();
    expect(screen.getByRole("link", { name: "Zur Übersicht" })).toBeTruthy();
  });

  it("versucht es nach einem Fehler mitten in der Sitzung automatisch erneut", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    submitReview.mockRejectedValueOnce(new Error("offline"));
    render(<StudySession items={[item("r-5"), item("r-7")]} />);
    await rateCurrent("Gut");

    expect(screen.getByText("Nicht gespeichert, wird erneut versucht")).toBeTruthy();
    expect(screen.getByText("2 / 2")).toBeTruthy();
    expect(submitReview).toHaveBeenCalledTimes(1);

    await act(async () => vi.advanceTimersByTime(1999));
    expect(submitReview).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTime(1));
    await flush();
    expect(submitReview).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Nicht gespeichert, wird erneut versucht")).toBeNull();
  });

  it("schickt nach einem Fehler mit der nächsten Bewertung gleich wieder", async () => {
    submitReview.mockRejectedValueOnce(new Error("offline"));
    render(<StudySession items={[item("r-5"), item("r-7")]} />);
    await rateCurrent("Gut");
    expect(submitReview).toHaveBeenCalledTimes(1);
    await rateCurrent("Gut");
    expect(submitReview).toHaveBeenCalledTimes(3);
    expect(submitReview.mock.calls.map(([input]) => input.cardId)).toEqual(["r-5", "r-5", "r-7"]);
  });

  it("zeigt nach einer abgelaufenen Anmeldung die offenen Bewertungen und führt zur Anmeldung", async () => {
    submitReview.mockResolvedValueOnce({ ok: false, reason: "auth" });
    render(<StudySession items={[item("r-5"), item("r-7")]} />);
    await rateCurrent("Gut");

    expect(screen.getByRole("alert").textContent).toBe(
      "Du wurdest abgemeldet. 1 Bewertung wurde nicht gespeichert.",
    );
    expect(screen.queryByRole("button", { name: "Weg zeigen" })).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Zur Anmeldung" }));
    expect(router.replace).toHaveBeenCalledWith("/anmelden");
  });

  it("nennt mehrere nicht gespeicherte Bewertungen nach dem Abmelden", async () => {
    const save = deferred();
    submitReview.mockReturnValueOnce(save.promise);
    render(<StudySession items={[item("r-5"), item("r-7")]} />);
    await rateCurrent("Gut");
    await rateCurrent("Gut");
    await act(async () => save.resolve({ ok: false, reason: "auth" }));

    expect(screen.getByRole("alert").textContent).toBe(
      "Du wurdest abgemeldet. 2 Bewertungen wurden nicht gespeichert.",
    );
    expect(submitReview).toHaveBeenCalledTimes(1);
  });

  it("weist auf eine nicht gezählte Bewertung hin und lernt weiter", async () => {
    submitReview.mockResolvedValueOnce({ ok: false, reason: "limit" });
    render(<StudySession items={[item("r-5"), item("r-7")]} />);
    await rateCurrent("Gut");
    expect(screen.getByText("Eine Bewertung wurde nicht gezählt.")).toBeTruthy();
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });

  it("zählt mehrere nicht gezählte Bewertungen zusammen, eine schon gespeicherte zählt als gespeichert", async () => {
    submitReview
      .mockResolvedValueOnce({ ok: false, reason: "invalid" })
      .mockResolvedValueOnce({ ok: false, reason: "stale" })
      .mockResolvedValueOnce({ ok: false, reason: "unknown-card" });
    render(<StudySession items={[item("r-5"), item("r-7"), item("r-4")]} />);
    await rateCurrent("Gut");
    await rateCurrent("Gut");
    await rateCurrent("Gut");
    expect(screen.getByText("2 Bewertungen wurden nicht gezählt.")).toBeTruthy();
    expect(screen.getByText("3 Karten gelernt.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Zur Übersicht" })).toBeTruthy();
  });

  it("fragt beim Schließen nach, solange etwas nicht gespeichert ist", async () => {
    const save = deferred();
    submitReview.mockReturnValueOnce(save.promise);
    const confirm = vi.spyOn(window, "confirm");
    render(<StudySession items={[item("r-5"), item("r-7")]} />);

    // Mitschreiben, ob der Klick abgebrochen wurde; danach nie wirklich navigieren (jsdom).
    let prevented: boolean | null = null;
    const record = (event: Event) => {
      prevented = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener("click", record);
    const close = screen.getByRole("link", { name: "Lernen beenden" });
    expect(close.getAttribute("href")).toBe("/heute");

    fireEvent.click(close);
    expect(confirm).not.toHaveBeenCalled();
    expect(prevented).toBe(false);

    await rateCurrent("Gut");
    confirm.mockReturnValueOnce(false);
    fireEvent.click(close);
    expect(confirm).toHaveBeenCalledWith("Noch nicht alles gespeichert. Trotzdem schließen?");
    expect(prevented).toBe(true);

    confirm.mockReturnValueOnce(true);
    fireEvent.click(close);
    expect(prevented).toBe(false);

    await act(async () => save.resolve({ ok: true }));
    confirm.mockClear();
    fireEvent.click(close);
    expect(confirm).not.toHaveBeenCalled();
    document.removeEventListener("click", record);
  });

  it("warnt beim Verlassen der Seite nur, solange etwas nicht gespeichert ist", async () => {
    const save = deferred();
    submitReview.mockReturnValueOnce(save.promise);
    render(<StudySession items={[item("r-5"), item("r-7")]} />);
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };

    expect(leave()).toBe(false);
    await rateCurrent("Gut");
    expect(leave()).toBe(true);
    await act(async () => save.resolve({ ok: true }));
    expect(leave()).toBe(false);
  });

  it("zeigt eine Fehlwurf-Karte mit Hinweis und markiertem Fehlwurf", () => {
    render(<StudySession items={[item("m-56-0")]} />);
    expect(screen.getByText("Rest war 56")).toBeTruthy();
    expect(screen.getByText("Ziel war T16, getroffen: Single 16")).toBeTruthy();
    const darts = within(screen.getByRole("list", { name: "Darts" }));
    expect(darts.getByText("(Fehlwurf)", { exact: false })).toBeTruthy();
  });
});
