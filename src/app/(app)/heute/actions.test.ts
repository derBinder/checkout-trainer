import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/guard";

const getSessionUser = vi.fn<() => Promise<SessionUser | null>>();
const grantExtraNewCards = vi.fn();
const redirect = vi.fn();
vi.mock("@/lib/auth/guard", () => ({ getSessionUser: () => getSessionUser() }));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => redirect(to) }));
vi.mock("./grant-extra-cards", () => ({
  grantExtraNewCards: (...args: unknown[]) => grantExtraNewCards(...args),
}));

import { learnMoreCards } from "./actions";

const sessionUser = (status: SessionUser["status"]): SessionUser => ({
  id: "u1", email: "u1@x.test", name: "u1", status, role: "user", newPerDay: 10,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("learnMoreCards", () => {
  it("refuses without an active session and grants nothing", async () => {
    for (const u of [null, sessionUser("pending"), sessionUser("blocked")]) {
      getSessionUser.mockResolvedValue(u);
      expect(await learnMoreCards()).toEqual({ ok: false, reason: "auth" });
    }
    expect(grantExtraNewCards).not.toHaveBeenCalled();
  });

  it("uses the session's user id, ignoring any argument", async () => {
    getSessionUser.mockResolvedValue(sessionUser("active"));
    grantExtraNewCards.mockResolvedValue({ ok: true });
    await (learnMoreCards as (...a: unknown[]) => Promise<unknown>)({ userId: "u2" });
    expect(grantExtraNewCards).toHaveBeenCalledWith({}, "u1", expect.any(Date));
    expect(redirect).toHaveBeenCalledWith("/lernen");
  });

  it("passes a refusal through without redirecting", async () => {
    getSessionUser.mockResolvedValue(sessionUser("active"));
    grantExtraNewCards.mockResolvedValue({ ok: false, reason: "not-done" });
    expect(await learnMoreCards()).toEqual({ ok: false, reason: "not-done" });
    expect(redirect).not.toHaveBeenCalled();
  });
});
