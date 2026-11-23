// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { I18nProvider } from "@/i18n/client";
// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

const requireAdmin = vi.hoisted(() => vi.fn(async () => ({ id: "admin" })));
const listUsers = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/guard", () => ({ requireAdmin }));
vi.mock("@/app/[lang]/(app)/admin/admin-users", () => ({ listUsers }));
vi.mock("@/app/[lang]/(app)/admin/actions", () => ({
  changeUserPassword: vi.fn(),
  changeUserStatus: vi.fn(),
}));

const rootParams = vi.hoisted(() => ({ lang: "de" }));
vi.mock("next/root-params", () => ({ lang: async () => rootParams.lang }));

const { UserList, formatCreated } = await import("./admin-data");

// In UTC noch der 3., in Berlin schon der 4. November.
const created = new Date("2026-11-03T23:30:00Z");

beforeEach(() => {
  rootParams.lang = "de";
});

describe("formatCreated", () => {
  it("schreibt das Datum in der Sprache, nach Berliner Zeit", () => {
    expect(formatCreated(created, "de")).toBe("04.11.2026");
    expect(formatCreated(created, "en")).toBe("4 Nov 2026");
  });
});

describe("UserList", () => {
  it("beschriftet die Liste auf Englisch", async () => {
    rootParams.lang = "en";
    listUsers.mockResolvedValue([
      { id: "1", name: "Anna", email: "anna@example.com", status: "pending", role: "user", createdAt: created },
      { id: "3", name: "Chef", email: "chef@example.com", status: "active", role: "admin", createdAt: created },
    ]);
    render(await UserList(), { wrapper: ({ children }) => <I18nProvider locale="en">{children}</I18nProvider> });
    const [anna, chef] = screen.getAllByRole("listitem").map((row) => within(row));
    expect(anna.getByText(/registered on/).textContent).toBe("pending · registered on 4 Nov 2026");
    expect(anna.getByRole("button", { name: "Approve" })).toBeTruthy();
    expect(anna.getByRole("button", { name: "Block" })).toBeTruthy();
    expect(chef.getByText("Administrator account")).toBeTruthy();
  });

  it("listet alle Konten mit Status, Registrierdatum und passenden Aktionen", async () => {
    listUsers.mockResolvedValue([
      { id: "1", name: "Anna", email: "anna@beispiel.de", status: "pending", role: "user", createdAt: created },
      { id: "2", name: "Bernd", email: "bernd@beispiel.de", status: "blocked", role: "user", createdAt: created },
      { id: "3", name: "Chef", email: "chef@beispiel.de", status: "active", role: "admin", createdAt: created },
      { id: "4", name: "Dora", email: "dora@beispiel.de", status: "unbekannt", role: "user", createdAt: created },
    ]);
    render(await UserList(), { wrapper });

    expect(requireAdmin).toHaveBeenCalled();
    expect(listUsers).toHaveBeenCalledWith(db);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(4);

    const [anna, bernd, chef, dora] = rows.map((row) => within(row));
    expect(anna.getByText("Anna")).toBeTruthy();
    expect(anna.getByText("anna@beispiel.de")).toBeTruthy();
    expect(anna.getByText(/registriert am/).textContent).toBe("wartend · registriert am 04.11.2026");
    expect(anna.getByRole("button", { name: "Freischalten" })).toBeTruthy();
    expect(anna.getByRole("button", { name: "Sperren" })).toBeTruthy();

    expect(bernd.getByText(/registriert am/).textContent).toMatch(/^gesperrt/);
    expect(bernd.getByRole("button", { name: "Entsperren" })).toBeTruthy();

    expect(chef.getByText(/registriert am/).textContent).toMatch(/^aktiv/);
    expect(chef.getByText("Administratorkonto")).toBeTruthy();
    expect(chef.queryByRole("button")).toBeNull();

    expect(dora.getByText(/registriert am/).textContent).toMatch(/^unbekannt/);
  });
});
