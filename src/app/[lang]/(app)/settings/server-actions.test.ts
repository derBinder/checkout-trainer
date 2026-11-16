import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";
import { cardState, reviewLog, user } from "@/lib/db/schema";
import { NO_EXTRA_CARDS } from "@/lib/extra-cards";
import { loadExtraCards } from "@/lib/extra-cards-db";

// Die Server Action so, wie Next.js sie aufruft: echte Sitzungsprüfung über ein
// Cookie, gegen eine Test-Datenbank.
const state = vi.hoisted(() => ({ db: undefined as unknown as Db, cookie: "" }));
const revalidatePath = vi.hoisted(() => vi.fn());

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
vi.mock("next/cache", () => ({ revalidatePath }));

vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
state.db = await createTestDb();
const { auth } = await import("@/lib/auth");
const { resetLearningProgress, updateExtraCards } = await import("./actions");

const PASSWORD = "ein-langes-passwort";
let counter = 0;

async function signedIn(status: "pending" | "active" | "blocked") {
  counter += 1;
  const email = `schalter-${counter}@x.test`;
  const res = await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: email } });
  // Erst anmelden, dann den Status setzen: Ein gesperrtes Konto kann sich nicht anmelden.
  const { headers } = await auth.api.signInEmail({ body: { email, password: PASSWORD }, returnHeaders: true });
  state.cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  await state.db.update(user).set({ status }).where(eq(user.id, res.user.id));
  return res.user.id;
}

beforeEach(() => {
  state.cookie = "";
  revalidatePath.mockClear();
});

describe("updateExtraCards", () => {
  it("switches an extra card on for the signed-in active account", async () => {
    const id = await signedIn("active");
    expect(await updateExtraCards("over170", true)).toEqual({ ok: true });
    expect(await loadExtraCards(state.db, id)).toEqual({ ...NO_EXTRA_CARDS, over170: true });
    expect(revalidatePath).toHaveBeenCalledWith("/[lang]/(app)", "layout");
  });

  it("refuses without a session", async () => {
    expect(await updateExtraCards("over170", true)).toEqual({ ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["pending", "blocked"] as const)("refuses a %s account and stores nothing", async (status) => {
    const id = await signedIn(status);
    expect(await updateExtraCards("neighbours", true)).toEqual({ ok: false });
    expect(await loadExtraCards(state.db, id)).toEqual(NO_EXTRA_CARDS);
  });

  it("refuses malformed input from the client", async () => {
    const id = await signedIn("active");
    expect(await updateExtraCards("admin" as never, true)).toEqual({ ok: false });
    expect(await updateExtraCards("over170", "true" as never)).toEqual({ ok: false });
    expect(await loadExtraCards(state.db, id)).toEqual(NO_EXTRA_CARDS);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("resetLearningProgress", () => {
  async function addProgress(userId: string) {
    const now = new Date("2026-11-10T10:00:00Z");
    await state.db.insert(cardState).values({
      userId,
      cardId: "r40",
      due: now,
      stability: 1,
      difficulty: 5,
      elapsedDays: 0,
      scheduledDays: 1,
      learningSteps: 0,
      reps: 1,
      lapses: 0,
      state: 2,
      lastReview: now,
      introducedAt: now,
    });
    await state.db.insert(reviewLog).values({ userId, cardId: "r40", rating: 3, reviewedAt: now });
  }

  it("resets the progress of the signed-in active account and refreshes the pages", async () => {
    const id = await signedIn("active");
    await addProgress(id);
    expect(await resetLearningProgress()).toEqual({ ok: true });
    expect(await state.db.select().from(cardState).where(eq(cardState.userId, id))).toHaveLength(0);
    expect(await state.db.select().from(reviewLog).where(eq(reviewLog.userId, id))).toHaveLength(0);
    expect(revalidatePath).toHaveBeenCalledWith("/[lang]/(app)", "layout");
  });

  it("refuses without a session", async () => {
    expect(await resetLearningProgress()).toEqual({ ok: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["pending", "blocked"] as const)("refuses a %s account and keeps its progress", async (status) => {
    const id = await signedIn(status);
    await addProgress(id);
    expect(await resetLearningProgress()).toEqual({ ok: false });
    expect(await state.db.select().from(cardState).where(eq(cardState.userId, id))).toHaveLength(1);
  });
});
