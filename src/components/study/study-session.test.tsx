// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cardById } from "@/lib/cards";
import { checkFor } from "@/lib/darts/judge";
import type { IntervalLabel, Rating } from "@/lib/srs/fsrs";
import { de } from "@/i18n/dictionaries/de";
import { cardView } from "./card-view";
import { I18nProvider } from "@/i18n/client";

// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const submitReview = vi.hoisted(() => vi.fn());
vi.mock("@/lib/review/actions", () => ({ submitReview }));

const { StudySession } = await import("./study-session");
type StudyItem = Parameters<typeof StudySession>[0]["items"][number];

const minutes = (value: number): IntervalLabel => ({ unit: "minutes", value });
const days = (value: number): IntervalLabel => ({ unit: "days", value });
const FIRST_LABELS: Record<Rating, IntervalLabel> = { 1: minutes(1), 2: days(2), 3: days(3), 4: days(8) };
const AFTER_AGAIN: Record<Rating, IntervalLabel> = { 1: minutes(5), 2: days(1), 3: days(2), 4: days(4) };

function item(id: string, reps = 0): StudyItem {
  const card = cardById(id);
  if (!card) throw new Error(`Karte ${id} fehlt`);
  return { id, view: cardView(card, de.study), check: checkFor(card), reps, labels: [FIRST_LABELS, AFTER_AGAIN] };
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

/** Eine Taste des Tastenfelds, mit vollem Namen („Single 1“, nicht „Single 10“). */
function press(name: string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

/** Die große Zahl der Frage bzw. Auflösung (die Tasten tragen dieselben Ziffern). */
const big = (text: string) => screen.getByText(text, { selector: "p" });

/** Die Felder einer Reihe, z. B. „Darts“ in der Frage oder „Dein Weg“ in der Auflösung. */
const row = (name: string) =>
  within(screen.getByRole("list", { name }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

const checkedRing = () => screen.getByRole("radio", { checked: true }).getAttribute("aria-label");

/** Der Abstand, der unter einer Bewertung steht. */
function intervalOn(name: string): string | null {
  const button = screen.getByRole("button", { name: new RegExp(`^${name}`) });
  return within(button).getByText(name).nextElementSibling?.textContent ?? null;
}

const flush = () => act(async () => {});

async function rateCurrent(rating: string) {
  tap("Ohne Eingabe aufdecken");
  tap(rating);
  await flush();
}

beforeEach(() => {
  router.replace.mockReset();
  submitReview.mockReset();
  submitReview.mockResolvedValue({ ok: true });
  clock = 0;
  vi.spyOn(performance, "now").mockImplementation(() => clock);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("StudySession", () => {
  it("zeigt erst die Frage mit Tastenfeld, nach „Ohne Eingabe aufdecken“ die Auflösung und die vier Bewertungen", () => {
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(big("5")).toBeTruthy();
    expect(row("Darts")).toEqual(["?offen", "?offen", "?offen"]);
    expect(screen.getByRole("radiogroup", { name: "Ring" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prüfen" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("button", { name: "Nicht checkbar" })).toBeTruthy();
    expect(screen.queryByText("Nach S1")).toBeNull();
    expect(screen.queryByRole("button", { name: /^Gut/ })).toBeNull();

    tap("Ohne Eingabe aufdecken");
    expect(screen.getByText("Nach S1")).toBeTruthy();
    expect(screen.getByText("S3 · D1")).toBeTruthy();
    // Ohne Eingabe: kein Ergebnis, kein „Dein Weg“, kein Tastenfeld mehr.
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("Dein Weg")).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Ring" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Prüfen" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ohne Eingabe aufdecken" })).toBeNull();
    for (const [name, label] of [
      ["Nochmal", "1 Min"],
      ["Schwer", "2 Tage"],
      ["Gut", "3 Tage"],
      ["Leicht", "8 Tage"],
    ]) {
      expect(intervalOn(name)).toBe(label);
    }
    // Der Fokus folgt dem neuen Inhalt.
    expect(document.activeElement?.getAttribute("tabindex")).toBe("-1");
  });

  it("ignoriert einen Tipp auf eine Bewertung direkt nach dem Aufdecken", () => {
    render(<StudySession items={[item("r-5")]} />, { wrapper });
    tap("Ohne Eingabe aufdecken");
    clock += 100;
    fireEvent.click(screen.getByRole("button", { name: /^Gut/ }));
    expect(screen.getByText("Nach S1")).toBeTruthy();
    expect(submitReview).not.toHaveBeenCalled();
  });

  it.each([
    ["Schwer", 2],
    ["Gut", 3],
    ["Leicht", 4],
  ] as const)("„%s“ speichert die Bewertung und geht zur nächsten Karte", async (name, rating) => {
    render(<StudySession items={[item("r-5", 4), item("r-7")]} />, { wrapper });
    await rateCurrent(name);
    expect(submitReview).toHaveBeenCalledWith({ cardId: "r-5", rating, reps: 4 });
    expect(screen.getByText("2 / 2")).toBeTruthy();
    expect(big("7")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Prüfen" })).toBeTruthy();
  });

  it("„Nochmal“ legt die Karte wieder vor, mit den Abständen nach einem weiteren Nochmal", async () => {
    render(<StudySession items={[item("r-5")]} />, { wrapper });
    await rateCurrent("Nochmal");
    expect(submitReview).toHaveBeenCalledWith({ cardId: "r-5", rating: 1, reps: 0 });
    expect(screen.getByText("1 / 2")).toBeTruthy();
    tap("Ohne Eingabe aufdecken");
    expect(intervalOn("Gut")).toBe("2 Tage");
    expect(intervalOn("Nochmal")).toBe("5 Min");
  });

  it("zeigt am Ende „Geschafft“, wartet aufs Speichern und bietet dann die Übersicht an", async () => {
    const save = deferred();
    submitReview.mockReturnValueOnce(save.promise);
    render(<StudySession items={[item("r-5")]} />, { wrapper });
    await rateCurrent("Gut");

    expect(screen.getByRole("heading", { name: "Geschafft" })).toBeTruthy();
    expect(screen.getByText("1 Karte gelernt.")).toBeTruthy();
    expect(screen.getByText("Speichere …")).toBeTruthy();
    const waiting = screen.getByRole("button", { name: "Zur Übersicht" });
    expect(waiting.hasAttribute("disabled")).toBe(true);

    await act(async () => save.resolve({ ok: true }));
    expect(screen.queryByText("Speichere …")).toBeNull();
    expect(screen.getByRole("link", { name: "Zur Übersicht" }).getAttribute("href")).toBe("/de/today");
  });

  it("hält den Bildschirm an, solange Karten offen sind, und gibt ihn am Ende frei", async () => {
    const release = vi.fn(async () => {});
    const request = vi.fn(async () => ({ released: false, release }));
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request } });
    try {
      render(<StudySession items={[item("r-5")]} />, { wrapper });
      await flush();
      expect(request).toHaveBeenCalledWith("screen");
      expect(release).not.toHaveBeenCalled();
      await rateCurrent("Gut");
      expect(screen.getByRole("heading", { name: "Geschafft" })).toBeTruthy();
      expect(release).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(navigator, "wakeLock");
    }
  });

  it("zählt mehrere gelernte Karten", async () => {
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
    await rateCurrent("Gut");
    await rateCurrent("Leicht");
    expect(screen.getByText("2 Karten gelernt.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Zur Übersicht" })).toBeTruthy();
  });

  it("meldet einen Speicherfehler und speichert mit „Erneut versuchen“ nach", async () => {
    submitReview.mockRejectedValueOnce(new Error("offline"));
    render(<StudySession items={[item("r-5")]} />, { wrapper });
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
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
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
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
    await rateCurrent("Gut");
    expect(submitReview).toHaveBeenCalledTimes(1);
    await rateCurrent("Gut");
    expect(submitReview).toHaveBeenCalledTimes(3);
    expect(submitReview.mock.calls.map(([input]) => input.cardId)).toEqual(["r-5", "r-5", "r-7"]);
  });

  it("zeigt nach einer abgelaufenen Anmeldung die offenen Bewertungen und führt zur Anmeldung", async () => {
    submitReview.mockResolvedValueOnce({ ok: false, reason: "auth" });
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
    await rateCurrent("Gut");

    expect(screen.getByRole("alert").textContent).toBe(
      "Du wurdest abgemeldet. 1 Bewertung wurde nicht gespeichert.",
    );
    expect(screen.queryByRole("button", { name: "Prüfen" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Ohne Eingabe aufdecken" })).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Zur Anmeldung" }));
    expect(router.replace).toHaveBeenCalledWith("/de/sign-in");
  });

  it("nennt mehrere nicht gespeicherte Bewertungen nach dem Abmelden", async () => {
    const save = deferred();
    submitReview.mockReturnValueOnce(save.promise);
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
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
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
    await rateCurrent("Gut");
    expect(screen.getByText("Eine Bewertung wurde nicht gezählt.")).toBeTruthy();
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });

  it("zählt die Bewertung einer inzwischen ausgeschalteten Zusatzkarte nicht und lernt weiter", async () => {
    submitReview.mockResolvedValueOnce({ ok: false, reason: "off" });
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
    await rateCurrent("Gut");
    expect(screen.getByText("Eine Bewertung wurde nicht gezählt.")).toBeTruthy();
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });

  it("zählt mehrere nicht gezählte Bewertungen zusammen, eine schon gespeicherte zählt als gespeichert", async () => {
    submitReview
      .mockResolvedValueOnce({ ok: false, reason: "invalid" })
      .mockResolvedValueOnce({ ok: false, reason: "stale" })
      .mockResolvedValueOnce({ ok: false, reason: "unknown-card" });
    render(<StudySession items={[item("r-5"), item("r-7"), item("r-4")]} />, { wrapper });
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
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });

    // Mitschreiben, ob der Klick abgebrochen wurde; danach nie wirklich navigieren (jsdom).
    let prevented: boolean | null = null;
    const record = (event: Event) => {
      prevented = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener("click", record);
    const close = screen.getByRole("link", { name: "Lernen beenden" });
    expect(close.getAttribute("href")).toBe("/de/today");

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
    render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
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
    render(<StudySession items={[item("m-56-0")]} />, { wrapper });
    expect(screen.getByText("Rest war 56")).toBeTruthy();
    expect(screen.getByText("Ziel war T16, getroffen: Single 16")).toBeTruthy();
    const darts = within(screen.getByRole("list", { name: "Darts" }));
    expect(darts.getByText("(Fehlwurf)", { exact: false })).toBeTruthy();
    // Nur Rest- und Bogey-Karten fragen nach „Nicht checkbar“.
    expect(screen.queryByRole("button", { name: "Nicht checkbar" })).toBeNull();
  });

  describe("Weg eingeben", () => {
    it("prüft den eingegebenen Weg und zeigt Ergebnis und eigenen Weg über der Auflösung", async () => {
      render(<StudySession items={[item("r-5"), item("r-7")]} />, { wrapper });
      expect(checkedRing()).toBe("Single");
      press("Single 1");
      // Rest 4 ist ein direktes Doppel: der Ring springt auf D.
      expect(checkedRing()).toBe("Doppel");
      press("Doppel 2");
      expect(row("Darts")).toEqual(["S1", "D2", "?offen"]);

      tap("Prüfen");
      expect(screen.getByRole("status").textContent).toBe("Bester Weggenau richtig");
      expect(row("Dein Weg")).toEqual(["S1", "D2"]);
      expect(row("Bester Weg")).toEqual(["S1", "D2"]);
      expect(screen.getByText("Nach S1")).toBeTruthy();
      expect(intervalOn("Gut")).toBe("3 Tage");

      // Die Bewertung bleibt Sache des Nutzers; die nächste Karte beginnt ohne Eingabe und Ergebnis.
      tap("Schwer");
      await flush();
      expect(submitReview).toHaveBeenCalledWith({ cardId: "r-5", rating: 2, reps: 0 });
      expect(big("7")).toBeTruthy();
      expect(row("Darts")).toEqual(["?offen", "?offen", "?offen"]);
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("meldet einen Weg, der nicht aufgeht", () => {
      render(<StudySession items={[item("r-5")]} />, { wrapper });
      press("Single 3");
      tap("Prüfen");
      expect(screen.getByRole("status").textContent).toBe("Geht nicht aufErgibt 3 statt 5");
      expect(row("Dein Weg")).toEqual(["S3"]);
    });

    it("„Nicht checkbar“ prüft sofort und verwirft eingegebene Darts", () => {
      render(<StudySession items={[item("r-5")]} />, { wrapper });
      press("Single 1");
      tap("Nicht checkbar");
      expect(screen.getByRole("status").textContent).toBe("Ist checkbarEs gibt einen Weg");
      expect(screen.queryByRole("list", { name: "Dein Weg" })).toBeNull();
      expect(screen.getByText("Dein Weg").nextElementSibling?.textContent).toBe("Nicht checkbar");
    });

    it("bestätigt „Nicht checkbar“ auf einer Bogey-Karte", () => {
      render(<StudySession items={[item("b-159")]} />, { wrapper });
      expect(big("159")).toBeTruthy();
      tap("Nicht checkbar");
      expect(screen.getByRole("status").textContent).toBe("RichtigRest ist nicht checkbar");
      expect(row("Stellwurf")).toEqual(["T20", "T20", "S7"]);
    });

    it("deckt mit „Ohne Eingabe aufdecken“ ohne Ergebnis auf, auch wenn schon Darts eingegeben sind", () => {
      render(<StudySession items={[item("r-5")]} />, { wrapper });
      press("Single 1");
      tap("Ohne Eingabe aufdecken");
      expect(screen.getByText("Nach S1")).toBeTruthy();
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.queryByText("Dein Weg")).toBeNull();
    });

    it("beginnt nach „Nochmal“ dieselbe Karte mit leerer Eingabe", async () => {
      render(<StudySession items={[item("r-5")]} />, { wrapper });
      press("Single 1");
      tap("Prüfen");
      tap("Nochmal");
      await flush();
      expect(screen.getByText("1 / 2")).toBeTruthy();
      expect(big("5")).toBeTruthy();
      expect(row("Darts")).toEqual(["?offen", "?offen", "?offen"]);
      expect(checkedRing()).toBe("Single");
      expect(screen.getByRole("button", { name: "Prüfen" }).hasAttribute("disabled")).toBe(true);
    });

    it("prüft den Stellwurf einer Zwei-Dart-Karte und beginnt nach „Nochmal“ wieder mit verbrauchtem Feld", async () => {
      render(<StudySession items={[item("t-125")]} />, { wrapper });
      expect(row("Darts")).toEqual(["–verbraucht", "?offen", "?offen"]);
      fireEvent.click(screen.getByRole("radio", { name: "Triple" }));
      press("Triple 20");
      press("Triple 11");
      tap("Prüfen");
      expect(screen.getByRole("status").textContent).toBe("Richtiger Stellwurfgenau richtig");
      expect(screen.getByText("Rest 125 mit 2 Darts")).toBeTruthy();
      expect(big("Kein Finish")).toBeTruthy();
      expect(row("Dein Weg")).toEqual(["–verbraucht", "T20", "T11"]);
      expect(row("Stellwurf")).toEqual(["–verbraucht", "T20", "T11"]);

      tap("Nochmal");
      await flush();
      expect(row("Darts")).toEqual(["–verbraucht", "?offen", "?offen"]);
    });

    it("prüft den Weg einer Zwei-Dart-Karte", () => {
      render(<StudySession items={[item("t-61")]} />, { wrapper });
      fireEvent.click(screen.getByRole("radio", { name: "Triple" }));
      press("Triple 15");
      press("Doppel 8");
      tap("Prüfen");
      expect(screen.getByRole("status").textContent).toBe("Geht, aber nicht empfohlenFinish stimmt, Weg ist schlechter");
      expect(row("Bester Weg")).toEqual(["–verbraucht", "T11", "D14"]);
    });

    it("füllt bei einem Fehlwurf nur die Felder nach den geworfenen Darts und prüft den Folgeweg", () => {
      render(<StudySession items={[item("m-56-0")]} />, { wrapper });
      // Auch bei einem direkten Doppel (neuer Rest 40) beginnt der Ring auf Single.
      expect(checkedRing()).toBe("Single");
      fireEvent.click(screen.getByRole("radio", { name: "Doppel" }));
      press("Doppel 20");
      expect(row("Darts")).toEqual(["S16 (Fehlwurf)", "D20", "?offen"]);

      tap("Prüfen");
      expect(screen.getByRole("status").textContent).toBe("Bester Weggenau richtig");
      expect(row("Dein Weg")).toEqual(["S16 (Fehlwurf)", "D20"]);
      expect(big("40")).toBeTruthy();
    });
  });
});

describe("StudySession auf Englisch", () => {
  it("beschriftet Tastenfeld, Knöpfe und Bewertungsleiste auf Englisch", () => {
    render(<StudySession items={[item("r-5")]} />, {
      wrapper: ({ children }) => <I18nProvider locale="en">{children}</I18nProvider>,
    });
    expect(screen.getByRole("link", { name: "End studying" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Treble" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Delete last dart" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Check" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "No checkout" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reveal without answering" }));
    for (const name of ["Again", "Hard", "Good", "Easy"]) {
      expect(screen.getByRole("button", { name: new RegExp(`^${name}`) })).toBeTruthy();
    }
    expect(intervalOn("Again")).toBe("1 min");
    expect(intervalOn("Hard")).toBe("2 days");
  });
});
