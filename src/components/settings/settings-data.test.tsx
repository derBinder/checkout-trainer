// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const user = vi.hoisted(() => ({
  id: "u1",
  email: "spieler@beispiel.de",
  name: "Spieler",
  status: "active" as const,
  role: "user",
  newPerDay: 7,
}));
vi.mock("@/lib/auth/guard", () => ({ requireActiveUser: async () => user }));
vi.mock("@/app/(app)/einstellungen/actions", () => ({ updateNewPerDay: vi.fn() }));
vi.mock("@/lib/auth/client", () => ({ authClient: {} }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }) }));

const { DeleteAccountSection, NewPerDayField } = await import("./settings-data");
const { NewPerDayForm } = await import("./new-per-day-form");

beforeEach(() => {
  user.role = "user";
});

describe("NewPerDayField", () => {
  it("füllt das Feld mit dem gespeicherten Wert", async () => {
    render(<NewPerDayForm>{await NewPerDayField()}</NewPerDayForm>);
    expect((screen.getByLabelText("Neue Karten pro Tag") as HTMLInputElement).value).toBe("7");
  });
});

describe("DeleteAccountSection", () => {
  it("bietet einem Nutzer das Löschen des Kontos an", async () => {
    render(await DeleteAccountSection());
    expect(screen.getByRole("heading", { name: "Konto löschen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Konto löschen" })).toBeTruthy();
  });

  it("entfällt für das Betreiberkonto", async () => {
    user.role = "admin";
    expect(await DeleteAccountSection()).toBeNull();
  });
});
