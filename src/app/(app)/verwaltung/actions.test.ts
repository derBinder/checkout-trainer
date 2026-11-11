import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import type { Db } from "@/lib/db";
import { session, user } from "@/lib/db/schema";
import { createAuth, seedAdmin } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth/guard";
import { listUsers, setUserPassword, setUserStatus } from "./admin-users";

const OLD = "das-alte-passwort";
const NEW = "ein-neues-passwort";

let db: Db;
let auth: ReturnType<typeof createAuth>;
let admin: SessionUser;

async function register(email: string, status: "pending" | "active" | "blocked" = "pending") {
  const res = await auth.api.signUpEmail({ body: { email, password: OLD, name: email } });
  await db.update(user).set({ status }).where(eq(user.id, res.user.id));
  return res.user.id;
}

async function statusOf(id: string) {
  const [row] = await db.select({ s: user.status }).from(user).where(eq(user.id, id));
  return row.s;
}

async function sessionCount(id: string) {
  return (await db.select().from(session).where(eq(session.userId, id))).length;
}

function asActor(row: typeof user.$inferSelect): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    status: row.status,
    role: row.role ?? "user",
    newPerDay: row.newPerDay,
  };
}

beforeEach(async () => {
  db = await createTestDb();
  auth = createAuth(db);
  await seedAdmin(auth, "betreiber@checkout-trainer.test", "admin-passwort-lang");
  const [row] = await db.select().from(user).where(eq(user.email, "betreiber@checkout-trainer.test"));
  admin = asActor(row);
});

describe("setUserStatus", () => {
  it("lehnt einen Akteur ohne Adminrolle ab und ändert nichts", async () => {
    const id = await register("a@x.test");
    const actor: SessionUser = { ...admin, role: "user" };
    expect(await setUserStatus(db, auth, actor, id, "active")).toEqual({ ok: false });
    expect(await statusOf(id)).toBe("pending");
  });

  it("lehnt einen gesperrten oder wartenden Admin-Akteur ab", async () => {
    const id = await register("a@x.test");
    expect(await setUserStatus(db, auth, { ...admin, status: "blocked" }, id, "active")).toEqual({ ok: false });
    expect(await statusOf(id)).toBe("pending");
  });

  it("schaltet pending auf active frei", async () => {
    const id = await register("a@x.test");
    expect(await setUserStatus(db, auth, admin, id, "active")).toEqual({ ok: true });
    expect(await statusOf(id)).toBe("active");
  });

  it("lehnt eine wartende Registrierung ab (pending auf blocked)", async () => {
    const id = await register("a@x.test");
    expect(await setUserStatus(db, auth, admin, id, "blocked")).toEqual({ ok: true });
    expect(await statusOf(id)).toBe("blocked");
  });

  it("beendet beim Sperren alle Sitzungen und erlaubt danach keine Anmeldung", async () => {
    const id = await register("a@x.test", "active");
    await auth.api.signInEmail({ body: { email: "a@x.test", password: OLD } });
    await auth.api.signInEmail({ body: { email: "a@x.test", password: OLD } });
    expect(await sessionCount(id)).toBeGreaterThan(0);
    expect(await setUserStatus(db, auth, admin, id, "blocked")).toEqual({ ok: true });
    expect(await statusOf(id)).toBe("blocked");
    expect(await sessionCount(id)).toBe(0);
    await expect(
      auth.api.signInEmail({ body: { email: "a@x.test", password: OLD } }),
    ).rejects.toThrow();
  });

  it("entsperrt einen gesperrten Nutzer", async () => {
    const id = await register("a@x.test", "blocked");
    expect(await setUserStatus(db, auth, admin, id, "active")).toEqual({ ok: true });
    expect(await statusOf(id)).toBe("active");
  });

  it("lässt den Betreiber sich nicht selbst sperren", async () => {
    expect(await setUserStatus(db, auth, admin, admin.id, "blocked")).toEqual({ ok: false });
    expect(await statusOf(admin.id)).toBe("active");
  });

  it("ändert den Status eines anderen Admins nicht", async () => {
    const id = await register("b@x.test", "active");
    await db.update(user).set({ role: "admin" }).where(eq(user.id, id));
    expect(await setUserStatus(db, auth, admin, id, "blocked")).toEqual({ ok: false });
    expect(await statusOf(id)).toBe("active");
  });

  it("lehnt unbekannte Nutzer und ungültige Statuswerte ab", async () => {
    const id = await register("a@x.test");
    expect(await setUserStatus(db, auth, admin, "gibt-es-nicht", "active")).toEqual({ ok: false });
    for (const bad of ["pending", "admin", "", null, undefined, 1]) {
      expect(await setUserStatus(db, auth, admin, id, bad as never)).toEqual({ ok: false });
    }
    expect(await setUserStatus(db, auth, admin, 42 as never, "active")).toEqual({ ok: false });
    expect(await statusOf(id)).toBe("pending");
  });
});

describe("setUserPassword", () => {
  it("setzt das Passwort: neues gilt, altes nicht, Sitzungen enden", async () => {
    const id = await register("a@x.test", "active");
    await auth.api.signInEmail({ body: { email: "a@x.test", password: OLD } });
    expect(await sessionCount(id)).toBeGreaterThan(0);
    expect(await setUserPassword(auth, admin, id, NEW)).toEqual({ ok: true });
    expect(await sessionCount(id)).toBe(0);
    await expect(
      auth.api.signInEmail({ body: { email: "a@x.test", password: OLD } }),
    ).rejects.toThrow();
    const res = await auth.api.signInEmail({ body: { email: "a@x.test", password: NEW } });
    expect(res.user.id).toBe(id);
  });

  it("lehnt ein Passwort mit 9 Zeichen ab und lässt das alte gelten", async () => {
    const id = await register("a@x.test", "active");
    expect(await setUserPassword(auth, admin, id, "123456789")).toEqual({ ok: false });
    const res = await auth.api.signInEmail({ body: { email: "a@x.test", password: OLD } });
    expect(res.user.id).toBe(id);
  });

  it("nimmt genau 10 Zeichen an, lehnt Nicht-Strings und überlange Passwörter ab", async () => {
    const id = await register("a@x.test", "active");
    expect(await setUserPassword(auth, admin, id, "1234567890")).toEqual({ ok: true });
    expect(await setUserPassword(auth, admin, id, 12345678901234 as never)).toEqual({ ok: false });
    expect(await setUserPassword(auth, admin, id, "x".repeat(129))).toEqual({ ok: false });
  });

  it("lehnt einen Akteur ohne Adminrolle ab", async () => {
    const id = await register("a@x.test", "active");
    expect(await setUserPassword(auth, { ...admin, role: "user" }, id, NEW)).toEqual({ ok: false });
    await expect(
      auth.api.signInEmail({ body: { email: "a@x.test", password: NEW } }),
    ).rejects.toThrow();
  });

  it("ändert das Passwort eines anderen Admins nicht und kennt keine fremden IDs", async () => {
    const id = await register("b@x.test", "active");
    await db.update(user).set({ role: "admin" }).where(eq(user.id, id));
    expect(await setUserPassword(auth, admin, id, NEW)).toEqual({ ok: false });
    expect(await setUserPassword(auth, admin, admin.id, NEW)).toEqual({ ok: false });
    expect(await setUserPassword(auth, admin, "gibt-es-nicht", NEW)).toEqual({ ok: false });
  });
});

describe("listUsers", () => {
  it("liefert wartende Nutzer vor aktiven, danach neueste zuerst", async () => {
    const a = await register("a@x.test", "active");
    const b = await register("b@x.test", "pending");
    const c = await register("c@x.test", "blocked");
    const d = await register("d@x.test", "pending");
    const day = (n: number) => new Date(Date.UTC(2026, 0, n));
    await db.update(user).set({ createdAt: day(1) }).where(eq(user.id, a));
    await db.update(user).set({ createdAt: day(2) }).where(eq(user.id, b));
    await db.update(user).set({ createdAt: day(3) }).where(eq(user.id, c));
    await db.update(user).set({ createdAt: day(4) }).where(eq(user.id, d));
    const list = await listUsers(db);
    expect(list.map((u) => u.email)).toEqual([
      "d@x.test",
      "b@x.test",
      "betreiber@checkout-trainer.test",
      "c@x.test",
      "a@x.test",
    ]);
    expect(list[0].status).toBe("pending");
    expect(list[1].status).toBe("pending");
    expect(Object.keys(list[0]).sort()).toEqual(["createdAt", "email", "id", "name", "role", "status"].sort());
  });
});
