import { redirect } from "next/navigation";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminNavLink } from "@/components/app-nav";

const getSessionUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/guard", () => ({ getSessionUser }));

const { AdminNavItem } = await import("./admin-nav-item");

beforeEach(() => {
  getSessionUser.mockReset();
});

// Stummgeschaltetes console.error auch nach einem fehlgeschlagenen Test zurücksetzen.
afterEach(() => {
  vi.restoreAllMocks();
});

describe("AdminNavItem", () => {
  it("zeigt den Verwaltungseintrag für einen aktiven Betreiber", async () => {
    getSessionUser.mockResolvedValue({ id: "a", status: "active", role: "admin" });
    const item = (await AdminNavItem()) as ReactElement | null;
    expect(item?.type).toBe(AdminNavLink);
  });

  it("zeigt nichts für Nutzer ohne Betreiberrolle oder ohne Sitzung", async () => {
    getSessionUser.mockResolvedValue({ id: "u", status: "active", role: "user" });
    await expect(AdminNavItem()).resolves.toBeNull();
    getSessionUser.mockResolvedValue({ id: "a", status: "blocked", role: "admin" });
    await expect(AdminNavItem()).resolves.toBeNull();
    getSessionUser.mockResolvedValue(null);
    await expect(AdminNavItem()).resolves.toBeNull();
  });

  it("zeigt nichts, wenn die Sitzungsabfrage scheitert", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    getSessionUser.mockRejectedValue(new Error("Datenbank nicht erreichbar"));
    await expect(AdminNavItem()).resolves.toBeNull();
    expect(log).toHaveBeenCalledOnce();
  });

  it("reicht Steuerfehler von Next weiter", async () => {
    getSessionUser.mockImplementation(async () => redirect("/anmelden"));
    await expect(AdminNavItem()).rejects.toHaveProperty(
      "digest",
      expect.stringMatching(/^NEXT_REDIRECT;/),
    );
  });
});
