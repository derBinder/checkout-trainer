import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/test-db";
import type { Db } from "../db";
import { account, session, user } from "../db/schema";
import type { UserStatus } from "../db/schema";
import { AUTH_ERRORS, MAX_PENDING_USERS } from "./constants";
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

describe("Start", () => {
  // `next dev` lädt Seiten zum Ermitteln der Pfade in einem eigenen
  // Kurzzeitprozess. Öffnet schon der Import die lokale PGlite-Datenbank,
  // laufen zwei Prozesse auf demselben Verzeichnis und PGlite bricht ab.
  it("greift beim Erzeugen und Initialisieren nicht auf die Datenbank zu", async () => {
    const accessed: PropertyKey[] = [];
    const untouched = new Proxy({} as Db, {
      get(_target, prop) {
        accessed.push(prop);
        return undefined;
      },
    });
    const lazyAuth = createAuth(untouched);
    await lazyAuth.$context;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(accessed).toEqual([]);
  });
});

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

  it("verweigert in Produktion ohne ADMIN_EMAIL jede Registrierung", async () => {
    vi.stubEnv("ADMIN_EMAIL", undefined);
    vi.stubEnv("NODE_ENV", "production");
    await expect(signUp("g@example.test")).rejects.toThrow(AUTH_ERRORS.signUpClosed);
    expect(await userRow("g@example.test")).toBeUndefined();
  });

  it("erlaubt ohne ADMIN_EMAIL außerhalb der Produktion die Registrierung", async () => {
    vi.stubEnv("ADMIN_EMAIL", undefined);
    vi.stubEnv("NODE_ENV", "development");
    await expect(signUp("h@example.test")).resolves.toBeDefined();
  });

  it("lehnt ein Passwort mit 9 Zeichen ab, nimmt 10 an", async () => {
    await expect(signUp("e@example.test", {}, "123456789")).rejects.toThrow();
    await expect(signUp("f@example.test", {}, "1234567890")).resolves.toBeDefined();
  });
});

describe("Obergrenze wartender Konten", () => {
  async function fillUsers(count: number, status: UserStatus) {
    await db.insert(user).values(
      Array.from({ length: count }, (_, i) => ({
        id: `${status}-${i}`,
        name: "Fuell",
        email: `${status}-${i}@example.test`,
        status,
      })),
    );
  }

  it("lässt die Registrierung zu, solange weniger als die Obergrenze wartet", async () => {
    await fillUsers(MAX_PENDING_USERS - 1, "pending");
    await expect(signUp("neu@example.test")).resolves.toBeDefined();
    expect((await userRow("neu@example.test")).status).toBe("pending");
  });

  it("lehnt die Registrierung ab, sobald die Obergrenze erreicht ist", async () => {
    await fillUsers(MAX_PENDING_USERS, "pending");
    await expect(signUp("neu@example.test")).rejects.toThrow(AUTH_ERRORS.signUpClosed);
    expect(await userRow("neu@example.test")).toBeUndefined();
  });

  it("zählt aktive und gesperrte Konten nicht mit", async () => {
    await fillUsers(MAX_PENDING_USERS, "active");
    await fillUsers(MAX_PENDING_USERS, "blocked");
    await fillUsers(3, "pending");
    await expect(signUp("neu@example.test")).resolves.toBeDefined();
  });

  it("lässt wartende Konten sich auch bei voller Grenze anmelden", async () => {
    await signUp("alt@example.test");
    await fillUsers(MAX_PENDING_USERS, "pending");
    await expect(sessionHeaders("alt@example.test")).resolves.toBeDefined();
  });

  it("meldet die Betreiberadresse bei voller Grenze weiter mit der bisherigen Meldung", async () => {
    await fillUsers(MAX_PENDING_USERS, "pending");
    await expect(signUp(OPERATOR)).rejects.toThrow(AUTH_ERRORS.operatorEmail);
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

  it("kann die Extrakarten des Tages weder bei der Registrierung noch über updateUser setzen", async () => {
    const extra = { extraNewDay: "2026-11-11", extraNewCount: 50, extra_new_day: "2026-11-11", extra_new_count: 50 };
    await signUp("m@example.test", extra).catch(() => undefined);
    const created = await userRow("m@example.test");
    expect(created).toBeDefined();
    expect(created.extraNewDay).toBeNull();
    expect(created.extraNewCount).toBe(0);

    const headers = await sessionHeaders("m@example.test");
    await auth.api.updateUser({ body: extra as never, headers }).catch(() => undefined);
    const row = await userRow("m@example.test");
    expect(row.extraNewDay).toBeNull();
    expect(row.extraNewCount).toBe(0);
  });

  it("kann die Zusatzkarten weder bei der Registrierung noch über updateUser einschalten", async () => {
    const extra = {
      extraSingleDouble: true,
      extraNeighbours: true,
      extraOver170: true,
      extra_single_double: true,
      extra_neighbours: true,
      extra_over_170: true,
    };
    const off = { extraSingleDouble: false, extraNeighbours: false, extraOver170: false };
    await signUp("z@example.test", extra).catch(() => undefined);
    expect(await userRow("z@example.test")).toMatchObject(off);

    const headers = await sessionHeaders("z@example.test");
    await auth.api.updateUser({ body: extra as never, headers }).catch(() => undefined);
    expect(await userRow("z@example.test")).toMatchObject(off);
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
  it("der Betreiber kann sein Konto nicht löschen", async () => {
    await seedAdmin(auth, OPERATOR, "startpasswort-123");
    const headers = await sessionHeaders(OPERATOR, "startpasswort-123");
    await expect(
      auth.api.deleteUser({ body: { password: "startpasswort-123" }, headers }),
    ).rejects.toThrow();
    expect(await userRow(OPERATOR)).toBeDefined();
  });

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

  it("ergänzt beim nächsten Lauf ein fehlendes Passwortkonto, ohne ein vorhandenes zu ändern", async () => {
    // Abbruch zwischen createUser und linkAccount (etwa Verbindungsabbruch beim Prod-Bau).
    await seedAdmin(auth, OPERATOR, "startpasswort-123");
    await db.delete(account);
    await seedAdmin(auth, OPERATOR, "startpasswort-123");
    await expect(
      auth.api.signInEmail({ body: { email: OPERATOR, password: "startpasswort-123" } }),
    ).resolves.toBeDefined();
    expect(await db.select().from(account)).toHaveLength(1);
  });

  it("verweigert zu kurze Startpasswörter", async () => {
    await expect(seedAdmin(auth, OPERATOR, "kurz")).rejects.toThrow();
    expect(await userRow(OPERATOR)).toBeUndefined();
  });

  it("auch der Admin kann Rollen und Passwörter nicht über das Admin-Plugin setzen", async () => {
    // Die Verwaltung nutzt eigene Kerne (admin-users.ts), nicht die Plugin-Endpunkte.
    await seedAdmin(auth, OPERATOR, "startpasswort-123");
    const { user: other } = await signUp("k@example.test");
    const headers = await sessionHeaders(OPERATOR, "startpasswort-123");
    await expect(
      auth.api.setUserPassword({
        body: { userId: other.id, newPassword: "neues-passwort-123" },
        headers,
      }),
    ).rejects.toThrow();
    await expect(
      auth.api.setRole({ body: { userId: other.id, role: "admin" }, headers }),
    ).rejects.toThrow();
    await expect(
      auth.api.signInEmail({ body: { email: "k@example.test", password: PASSWORD } }),
    ).resolves.toBeDefined();
    expect((await userRow("k@example.test")).role).not.toBe("admin");
  });
});

function post(path: string, body: unknown, cookie?: string) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": "203.0.113.7",
  };
  if (cookie) headers.cookie = cookie;
  return auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

describe("gesperrte Nutzer", () => {
  it("bekommen bei falschem Passwort die allgemeine Antwort, ohne Hinweis auf die Sperre", async () => {
    await signUp("o@example.test");
    await db.update(user).set({ status: "blocked" }).where(eq(user.email, "o@example.test"));
    const res = await post("/sign-in/email", { email: "o@example.test", password: "falsches-passwort" });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code?: string; message?: string };
    expect(body.code).toBe("INVALID_EMAIL_OR_PASSWORD");
    expect(body.message).not.toBe(AUTH_ERRORS.blocked);
    expect(res.headers.getSetCookie()).toEqual([]);
  });

  it("bekommen bei richtigem Passwort die Sperrmeldung und keine Sitzung", async () => {
    await signUp("p@example.test");
    const id = (await userRow("p@example.test")).id;
    await db.update(user).set({ status: "blocked" }).where(eq(user.email, "p@example.test"));
    await db.delete(session).where(eq(session.userId, id));
    const res = await post("/sign-in/email", { email: "p@example.test", password: PASSWORD });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { message?: string };
    expect(body.message).toBe(AUTH_ERRORS.blocked);
    expect(
      res.headers.getSetCookie().filter((c) => c.includes("session_token=") && !/max-age=0/i.test(c)),
    ).toEqual([]);
    expect(await db.select().from(session).where(eq(session.userId, id))).toEqual([]);
  });

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

describe("Admin-Plugin-Endpunkte", () => {
  const ADMIN_PATHS: [string, Record<string, unknown>][] = [
    ["/admin/update-user", { userId: "", data: { status: "active", newPerDay: 9999 } }],
    ["/admin/create-user", { email: "neu@example.test", password: "kurz1", name: "Neu", role: "admin" }],
    ["/admin/impersonate-user", { userId: "" }],
    ["/admin/set-role", { userId: "", role: "admin" }],
    ["/admin/remove-user", { userId: "" }],
    ["/admin/set-user-password", { userId: "", newPassword: "neues-passwort-123" }],
    ["/admin/ban-user", { userId: "" }],
    ["/admin/list-users", {}],
  ];

  it("sind für den Betreiber über HTTP gesperrt und ändern nichts", async () => {
    await seedAdmin(auth, OPERATOR, "startpasswort-123");
    const { user: other } = await signUp("q@example.test");
    const cookie = (await sessionHeaders(OPERATOR, "startpasswort-123")).get("cookie") ?? "";
    for (const [path, body] of ADMIN_PATHS) {
      const withUser = "userId" in body ? { ...body, userId: other.id } : body;
      const res = await post(path, withUser, cookie);
      expect([403, 404], path).toContain(res.status);
    }
    const row = await userRow("q@example.test");
    expect(row).toBeDefined();
    expect(row.status).toBe("pending");
    expect(row.newPerDay).toBe(10);
    expect(row.role).not.toBe("admin");
    expect(await userRow("neu@example.test")).toBeUndefined();
    await expect(
      auth.api.signInEmail({ body: { email: "q@example.test", password: PASSWORD } }),
    ).resolves.toBeDefined();
  });

  it("sind auch als GET und für Unangemeldete gesperrt", async () => {
    const res = await auth.handler(
      new Request("http://localhost:3000/api/auth/admin/list-users", { method: "GET" }),
    );
    expect([403, 404]).toContain(res.status);
    const anon = await post("/admin/create-user", {
      email: "anon@example.test",
      password: PASSWORD,
      name: "Anon",
    });
    expect([401, 403, 404]).toContain(anon.status);
    expect(await userRow("anon@example.test")).toBeUndefined();
  });

  it("sind auch über auth.api für den Betreiber gesperrt", async () => {
    await seedAdmin(auth, OPERATOR, "startpasswort-123");
    const headers = await sessionHeaders(OPERATOR, "startpasswort-123");
    await expect(
      auth.api.createUser({
        body: { email: "api@example.test", password: "kurz1", name: "Api" },
        headers,
      }),
    ).rejects.toThrow();
    await expect(auth.api.listUsers({ query: {}, headers })).rejects.toThrow();
    expect(await userRow("api@example.test")).toBeUndefined();
  });
});

describe("Rate-Limit", () => {
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
