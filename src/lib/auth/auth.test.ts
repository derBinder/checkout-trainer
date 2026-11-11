import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/test-db";
import type { Db } from "../db";
import { user } from "../db/schema";
import { createAuth, seedAdmin } from "./index";

const OPERATOR = "betreiber@checkout-trainer.test";
const PASSWORD = "ein-langes-passwort";

let db: Db;
let auth: ReturnType<typeof createAuth>;

beforeEach(async () => {
  vi.stubEnv("ADMIN_EMAIL", OPERATOR);
  db = await createTestDb();
  auth = createAuth(db);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function signUp(email: string, extra: Record<string, unknown> = {}, password = PASSWORD) {
  return auth.api.signUpEmail({ body: { email, password, name: "Test", ...extra } });
}

async function userRow(email: string) {
  const [row] = await db.select().from(user).where(eq(user.email, email));
  return row;
}

async function sessionHeaders(email: string, password = PASSWORD) {
  const { headers } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

describe("Registrierung", () => {
  it("legt Nutzer als pending, ohne Adminrolle, mit 10 neuen Karten pro Tag an", async () => {
    await signUp("a@example.test");
    const row = await userRow("a@example.test");
    expect(row.status).toBe("pending");
    expect(row.role).not.toBe("admin");
    expect(row.newPerDay).toBe(10);
  });

  it("ignoriert status und role aus dem Anfragekörper", async () => {
    await signUp("b@example.test", { status: "active", role: "admin", newPerDay: 99 }).catch(
      () => undefined,
    );
    const row = await userRow("b@example.test");
    // Entweder abgelehnt (kein Nutzer) oder mit sicheren Werten angelegt.
    if (row) {
      expect(row.status).toBe("pending");
      expect(row.role).not.toBe("admin");
      expect(row.newPerDay).toBe(10);
    }
  });

  it("legt mit status/role im Körper nie einen aktiven oder Admin-Nutzer an", async () => {
    await signUp("c@example.test", { status: "active" }).catch(() => undefined);
    await signUp("d@example.test", { role: "admin" }).catch(() => undefined);
    for (const email of ["c@example.test", "d@example.test"]) {
      const row = await userRow(email);
      if (row) {
        expect(row.status).toBe("pending");
        expect(row.role).not.toBe("admin");
      }
    }
  });

  it("lehnt die Betreiberadresse ab, auch in anderer Schreibweise", async () => {
    await expect(signUp(OPERATOR)).rejects.toThrow();
    await expect(signUp("Betreiber@Checkout-Trainer.Test")).rejects.toThrow();
    expect(await userRow(OPERATOR)).toBeUndefined();
  });

  it("lehnt ein Passwort mit 9 Zeichen ab, nimmt 10 an", async () => {
    await expect(signUp("e@example.test", {}, "123456789")).rejects.toThrow();
    await expect(signUp("f@example.test", {}, "1234567890")).resolves.toBeDefined();
  });
});

describe("Selbstbedienung durch angemeldete Nutzer", () => {
  it("kann status, role und newPerDay nicht über updateUser ändern", async () => {
    await signUp("g@example.test");
    const headers = await sessionHeaders("g@example.test");
    for (const body of [{ status: "active" }, { role: "admin" }, { newPerDay: 500 }]) {
      await auth.api
        .updateUser({ body: body as never, headers })
        .catch(() => undefined);
    }
    const row = await userRow("g@example.test");
    expect(row.status).toBe("pending");
    expect(row.role).not.toBe("admin");
    expect(row.newPerDay).toBe(10);
  });

  it("kann keine Rollen oder Fremdpasswörter setzen", async () => {
    const { user: victim } = await signUp("h@example.test");
    await signUp("i@example.test");
    const headers = await sessionHeaders("i@example.test");
    await expect(
      auth.api.setRole({ body: { userId: victim.id, role: "admin" }, headers }),
    ).rejects.toThrow();
    await expect(
      auth.api.setUserPassword({
        body: { userId: victim.id, newPassword: "ueberschrieben-123" },
        headers,
      }),
    ).rejects.toThrow();
    await expect(
      auth.api.signInEmail({ body: { email: "h@example.test", password: PASSWORD } }),
    ).resolves.toBeDefined();
  });

  it("kann das eigene Konto löschen", async () => {
    await signUp("j@example.test");
    const headers = await sessionHeaders("j@example.test");
    await auth.api.deleteUser({ body: { password: PASSWORD }, headers });
    expect(await userRow("j@example.test")).toBeUndefined();
  });
});

describe("seedAdmin", () => {
  it("legt genau einen aktiven Admin an und ist idempotent", async () => {
    await seedAdmin(auth, OPERATOR, "startpasswort-123");
    await seedAdmin(auth, OPERATOR.toUpperCase(), "anderes-passwort-456");
    const rows = await db.select().from(user);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("active");
    expect(rows[0].role).toBe("admin");
    expect(rows[0].email).toBe(OPERATOR);
    await expect(
      auth.api.signInEmail({ body: { email: OPERATOR, password: "startpasswort-123" } }),
    ).resolves.toBeDefined();
    await expect(
      auth.api.signInEmail({ body: { email: OPERATOR, password: "anderes-passwort-456" } }),
    ).rejects.toThrow();
  });

  it("verweigert zu kurze Startpasswörter", async () => {
    await expect(seedAdmin(auth, OPERATOR, "kurz")).rejects.toThrow();
    expect(await userRow(OPERATOR)).toBeUndefined();
  });

  it("der Admin darf Rollen und Passwörter anderer setzen", async () => {
    await seedAdmin(auth, OPERATOR, "startpasswort-123");
    const { user: other } = await signUp("k@example.test");
    const headers = await sessionHeaders(OPERATOR, "startpasswort-123");
    await auth.api.setUserPassword({
      body: { userId: other.id, newPassword: "neues-passwort-123" },
      headers,
    });
    await expect(
      auth.api.signInEmail({ body: { email: "k@example.test", password: "neues-passwort-123" } }),
    ).resolves.toBeDefined();
  });
});

describe("gesperrte Nutzer", () => {
  it("können sich nicht anmelden", async () => {
    await signUp("l@example.test");
    await db.update(user).set({ status: "blocked" }).where(eq(user.email, "l@example.test"));
    await expect(
      auth.api.signInEmail({ body: { email: "l@example.test", password: PASSWORD } }),
    ).rejects.toThrow();
  });

  it("zeigen mit bestehender Sitzung den aktuellen Status aus der Datenbank", async () => {
    await signUp("m@example.test");
    const headers = await sessionHeaders("m@example.test");
    await db.update(user).set({ status: "blocked" }).where(eq(user.email, "m@example.test"));
    const session = await auth.api.getSession({ headers });
    expect((session?.user as { status?: string } | undefined)?.status).toBe("blocked");
  });

  it("pending-Nutzer können sich anmelden", async () => {
    await signUp("n@example.test");
    await expect(sessionHeaders("n@example.test")).resolves.toBeDefined();
  });
});

describe("Rate-Limit", () => {
  function post(path: string, body: unknown) {
    return auth.handler(
      new Request(`http://localhost:3000/api/auth${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7" },
        body: JSON.stringify(body),
      }),
    );
  }

  it("begrenzt die Registrierung auf 5 pro Stunde und IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await post("/sign-up/email", {
        email: `r${i}@example.test`,
        password: PASSWORD,
        name: "R",
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it("begrenzt die Anmeldung auf 10 pro Minute und IP", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await post("/sign-in/email", { email: "x@example.test", password: PASSWORD });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10).every((s) => s !== 429)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
