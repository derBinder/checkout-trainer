import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/guard", () => ({ getSessionUser }));

const { AdminNavItem } = await import("./admin-nav-item");

beforeEach(() => {
  getSessionUser.mockReset();
});

describe("AdminNavItem", () => {
  it("zeigt nichts, wenn die Sitzungsabfrage scheitert", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    getSessionUser.mockRejectedValue(new Error("Datenbank nicht erreichbar"));
    await expect(AdminNavItem()).resolves.toBeNull();
    expect(log).toHaveBeenCalledOnce();
    log.mockRestore();
  });

  it("reicht Steuerfehler von Next weiter", async () => {
    getSessionUser.mockImplementation(async () => redirect("/anmelden"));
    await expect(AdminNavItem()).rejects.toHaveProperty(
      "digest",
      expect.stringMatching(/^NEXT_REDIRECT;/),
    );
  });
});
