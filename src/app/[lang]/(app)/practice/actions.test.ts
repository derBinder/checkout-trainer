import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/guard";
import type { Db } from "@/lib/db";
import { practiceDay, user } from "@/lib/db/schema";
import { createTestDb } from "@/lib/db/test-db";
import { dayKey } from "@/lib/time";

const state = vi.hoisted(() => ({ db: undefined as unknown as Db }));
const getSessionUser = vi.hoisted(() => vi.fn<() => Promise<SessionUser | null>>());

vi.mock("@/lib/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop) {
        const value = Reflect.get(state.db, prop, state.db);
        return typeof value === "function" ? value.bind(state.db) : value;
      },
    },
  ),
}));
vi.mock("@/lib/auth/guard", () => ({ getSessionUser }));

const { recordPractice } = await import("./actions");

const sessionUser = (status: string) => ({ id: "u1", status, newPerDay: 10 }) as SessionUser;

beforeEach(async () => {
  state.db = await createTestDb();
  await state.db.insert(user).values({ id: "u1", name: "u1", email: "u1@x.test", status: "active" });
});

describe("recordPractice", () => {
  it("writes today's Berlin day for the active user", async () => {
    getSessionUser.mockResolvedValue(sessionUser("active"));
    await recordPractice();
    expect(await state.db.select().from(practiceDay)).toEqual([{ userId: "u1", day: dayKey(new Date()) }]);
  });

  it("writes nothing without a session", async () => {
    getSessionUser.mockResolvedValue(null);
    expect(await recordPractice()).toBeUndefined();
    expect(await state.db.select().from(practiceDay)).toEqual([]);
  });

  it("writes nothing for an account that is not active", async () => {
    getSessionUser.mockResolvedValue(sessionUser("pending"));
    await recordPractice();
    expect(await state.db.select().from(practiceDay)).toEqual([]);
  });
});
