import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";
import { session, user } from "@/lib/db/schema";

// Die Server Actions so, wie Next.js sie aufruft: echte Sitzungsprüfung
// (requireAdmin aus guard.ts) über ein Cookie, gegen eine Test-Datenbank.
const state = vi.hoisted(() => ({ db: undefined as unknown as Db, cookie: "" }));

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
vi.mock("next/headers", () => ({
  headers: async () => new Headers(state.cookie ? { cookie: state.cookie } : {}),
  cookies: async () => ({ get: () => undefined, set: () => {} }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  },
}));

vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
state.db = await createTestDb();
const { auth, seedAdmin } = await import("@/lib/auth");
const { changeUserPassword, changeUserStatus } = await import("./actions");

const PASSWORD = "ein-langes-passwort";
const NEW = "ein-neues-passwort";
const OPERATOR = "betreiber@checkout-trainer.test";
await seedAdmin(auth, OPERATOR, PASSWORD);

let counter = 0;

async function register(status: "pending" | "active" | "blocked") {
  counter += 1;
  const email = `nutzer-${counter}@x.test`;
  const res = await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: email } });
  await state.db.update(user).set({ status }).where(eq(user.id, res.user.id));
  return { id: res.user.id, email };
}

async function signInAs(email: string) {
  const { headers } = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    returnHeaders: true,
  });
  state.cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function statusOf(id: string) {
  const [row] = await state.db.select({ s: user.status }).from(user).where(eq(user.id, id));
  return row.s;
}

async function sessionCount(id: string) {
  return (await state.db.select().from(session).where(eq(session.userId, id))).length;
}

async function canSignIn(email: string, password: string) {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return true;
  } catch {
    return false;
  }
}

beforeEach(() => {
  state.cookie = "";
});

describe("Server Actions der Verwaltung", () => {
  it("leiten einen aktiven Nicht-Betreiber nach /heute um und ändern nichts", async () => {
    const actor = await register("active");
    const waiting = await register("pending");
    const other = await register("active");
    await signInAs(other.email);
    await signInAs(actor.email);
    const otherSessions = await sessionCount(other.id);

    await expect(changeUserStatus(waiting.id, "active")).rejects.toThrow("NEXT_REDIRECT /heute");
    await expect(changeUserStatus(other.id, "blocked")).rejects.toThrow("NEXT_REDIRECT /heute");
    await expect(changeUserPassword(other.id, NEW)).rejects.toThrow("NEXT_REDIRECT /heute");

    expect(await statusOf(waiting.id)).toBe("pending");
    expect(await statusOf(other.id)).toBe("active");
    expect(await sessionCount(other.id)).toBe(otherSessions);
    expect(await canSignIn(other.email, NEW)).toBe(false);
    expect(await canSignIn(other.email, PASSWORD)).toBe(true);
  });

  it("schicken wartende Konten nach /warten und Besucher ohne Sitzung zur Anmeldung", async () => {
    const target = await register("pending");
    const waiting = await register("pending");
    await signInAs(waiting.email);
    await expect(changeUserStatus(target.id, "active")).rejects.toThrow("NEXT_REDIRECT /warten");

    state.cookie = "";
    await expect(changeUserStatus(target.id, "active")).rejects.toThrow("NEXT_REDIRECT /anmelden");
    await expect(changeUserPassword(target.id, NEW)).rejects.toThrow("NEXT_REDIRECT /anmelden");
    expect(await statusOf(target.id)).toBe("pending");
  });

  it("wirken für den aktiven Betreiber", async () => {
    const target = await register("pending");
    await signInAs(OPERATOR);
    await expect(changeUserStatus(target.id, "active")).resolves.toEqual({ ok: true });
    expect(await statusOf(target.id)).toBe("active");
  });
});
