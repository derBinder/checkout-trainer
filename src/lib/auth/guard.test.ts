import { beforeEach, describe, expect, it, vi } from "vitest";

const getSession = vi.fn();
const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const redirect = vi.fn((to: string) => {
  throw new Error(`NEXT_REDIRECT ${to}`);
});

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  notFound: () => notFound(),
  redirect: (to: string) => redirect(to),
}));
vi.mock("./index", () => ({ auth: { api: { getSession: () => getSession() } } }));

const { requireActiveUser, requireAdmin } = await import("./guard");

function sessionOf(status: string, role: string | null) {
  return {
    session: { id: "s1" },
    user: { id: "u1", email: "u1@x.test", name: "U1", status, role, newPerDay: 10 },
  };
}

beforeEach(() => {
  getSession.mockReset();
  notFound.mockClear();
  redirect.mockClear();
});

describe("requireActiveUser", () => {
  it("schickt Besucher ohne Sitzung zur Anmeldung", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireActiveUser()).rejects.toThrow("NEXT_REDIRECT /anmelden");
  });

  it("schickt wartende und gesperrte Konten nach /warten", async () => {
    for (const status of ["pending", "blocked"]) {
      getSession.mockResolvedValue(sessionOf(status, "user"));
      await expect(requireActiveUser()).rejects.toThrow("NEXT_REDIRECT /warten");
    }
  });
});

describe("requireAdmin", () => {
  it("leitet einen aktiven Nicht-Betreiber nach /heute um, ohne notFound", async () => {
    for (const role of ["user", null]) {
      getSession.mockResolvedValue(sessionOf("active", role));
      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /heute");
    }
    expect(notFound).not.toHaveBeenCalled();
  });

  it("behandelt einen wartenden oder gesperrten Betreiber wie jedes nicht aktive Konto", async () => {
    for (const status of ["pending", "blocked"]) {
      getSession.mockResolvedValue(sessionOf(status, "admin"));
      await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /warten");
    }
  });

  it("schickt Besucher ohne Sitzung zur Anmeldung", async () => {
    getSession.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT /anmelden");
  });

  it("liefert den aktiven Betreiber", async () => {
    getSession.mockResolvedValue(sessionOf("active", "admin"));
    await expect(requireAdmin()).resolves.toMatchObject({ id: "u1", role: "admin", status: "active" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
