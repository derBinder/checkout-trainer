// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { rate } from "@/lib/srs/fsrs";

const user = vi.hoisted(() => ({
  id: "u1",
  email: "spieler@beispiel.de",
  name: "Spieler",
  status: "active" as const,
  role: "user",
  newPerDay: 5,
}));
const loadQueue = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/guard", () => ({ requireActiveUser: async () => user }));
vi.mock("@/lib/review/queries", () => ({ loadQueue }));
vi.mock("@/lib/review/actions", () => ({ submitReview: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ bfcacheId: "seite", refresh: vi.fn(), replace: vi.fn() }),
}));

const { StudySessionData } = await import("./study-data");

beforeEach(() => {
  loadQueue.mockReset();
});

describe("StudySessionData", () => {
  it("startet die Sitzung mit den heutigen Karten und lässt unbekannte weg", async () => {
    const now = new Date();
    loadQueue.mockResolvedValue({
      cardIds: ["r-5", "gibt-es-nicht", "r-7"],
      reps: { "r-5": 1 },
      states: { "r-5": rate(null, 3, now) },
    });
    render(await StudySessionData());

    expect(loadQueue).toHaveBeenCalledWith(db, user, expect.any(Date));
    expect(screen.getByText("1 / 2")).toBeTruthy();
    expect(screen.getByText("5", { selector: "p" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ohne Eingabe aufdecken" })).toBeTruthy();

    // Die Karten bringen mit, wogegen ein eingegebener Weg geprüft wird.
    fireEvent.click(screen.getByRole("button", { name: "Single 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Doppel 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(screen.getByRole("status").textContent).toBe("Bester Weggenau richtig");
  });

  it("leitet zur Übersicht um, wenn heute nichts zu lernen ist", async () => {
    loadQueue.mockResolvedValue({ cardIds: [], reps: {}, states: {} });
    await expect(StudySessionData()).rejects.toHaveProperty(
      "digest",
      expect.stringMatching(/^NEXT_REDIRECT;.*;\/heute;/),
    );
  });
});
