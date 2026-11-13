// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  newPerDay: 7,
}));
vi.mock("@/lib/auth/guard", () => ({ requireActiveUser: async () => user }));
vi.mock("@/app/[lang]/(app)/settings/actions", () => ({ updateNewPerDay: vi.fn(), updateExtraCards: vi.fn() }));
const calls = vi.hoisted(() => [] as string[]);
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/extra-cards-db", () => ({
  loadExtraCards: async (_db: unknown, userId: string) => {
    calls.push(`load ${userId}`);
    return { singleDouble: false, neighbours: true, over170: false };
  },
}));
vi.mock("@/lib/auth/client", () => ({ authClient: {} }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const { DeleteAccountSection, ExtraCardsField, NewPerDayField } = await import("./settings-data");
const { NewPerDayForm } = await import("./new-per-day-form");

beforeEach(() => {
  user.role = "user";
  calls.length = 0;
});

describe("NewPerDayField", () => {
  it("füllt das Feld mit dem gespeicherten Wert", async () => {
    render(<NewPerDayForm>{await NewPerDayField()}</NewPerDayForm>, { wrapper });
    expect((screen.getByLabelText("Neue Karten pro Tag") as HTMLInputElement).value).toBe("7");
  });
});

describe("ExtraCardsField", () => {
  it("zeigt die gespeicherten Schalter des angemeldeten Kontos", async () => {
    render(await ExtraCardsField(), { wrapper });
    expect(calls).toEqual(["load u1"]);
    expect(screen.getByRole("switch", { name: "Nachbarfelder" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: "Reste über 170" }).getAttribute("aria-checked")).toBe("false");
  });
});

describe("DeleteAccountSection", () => {
  it("bietet einem Nutzer das Löschen des Kontos an", async () => {
    render(await DeleteAccountSection(), { wrapper });
    expect(screen.getByRole("heading", { name: "Konto löschen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Konto löschen" })).toBeTruthy();
  });

  it("entfällt für das Betreiberkonto", async () => {
    user.role = "admin";
    expect(await DeleteAccountSection()).toBeNull();
  });
});
