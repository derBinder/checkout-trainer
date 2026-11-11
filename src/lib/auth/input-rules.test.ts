import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/test-db";
import type { Db } from "../db";
import { user } from "../db/schema";
import { AUTH_MESSAGES } from "./constants";
import { createAuth, seedAdmin } from "./index";

// Direkte Anfragen an den Handler, wie sie jeder ohne Formular schicken kann.

const OPERATOR = "betreiber@checkout-trainer.test";
const OPERATOR_PASSWORD = "startpasswort-123";
const PASSWORD = "ein-langes-passwort";
const FOUR_MB = "a".repeat(4 * 1024 * 1024);

let db: Db;
let auth: ReturnType<typeof createAuth>;
let ip = 0;

beforeEach(async () => {
  vi.stubEnv("ADMIN_EMAIL", OPERATOR);
  db = await createTestDb();
  auth = createAuth(db);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function post(path: string, body: unknown, cookie?: string) {
  ip += 1;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    // Eigene Adresse je Anfrage, damit das Rate-Limit nicht greift.
    "x-forwarded-for": `198.51.100.${ip % 250}`,
  };
  if (cookie) headers.cookie = cookie;
  const res = await auth.handler(
    new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
  const text = await res.text();
  let json: { message?: string } | null = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }
  return { status: res.status, message: json?.message, headers: res.headers };
}

function signUp(body: Record<string, unknown>) {
  return post("/sign-up/email", {
    email: "a@example.test",
    password: PASSWORD,
    name: "Test",
    ...body,
  });
}

async function userRow(email: string) {
  const [row] = await db.select().from(user).where(eq(user.email, email));
  return row;
}

async function cookieFor(email: string, password = PASSWORD) {
  const res = await auth.handler(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "192.0.2.1" },
      body: JSON.stringify({ email, password }),
    }),
  );
  expect(res.status).toBe(200);
  return res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

describe("Registrierung: Name, E-Mail, Bild", () => {
  it.each([
    ["4 MB", FOUR_MB, AUTH_MESSAGES.nameTooLong],
    ["101 Zeichen", "a".repeat(101), AUTH_MESSAGES.nameTooLong],
    ["leer", "", AUTH_MESSAGES.nameRequired],
    ["nur Leerzeichen", "   \t ", AUTH_MESSAGES.nameRequired],
    ["RTL-Override", "Felix‮evil", AUTH_MESSAGES.nameInvalid],
    ["NUL", "Fe\u0000lix", AUTH_MESSAGES.nameInvalid],
    ["Nullbreite", "Fe​lix", AUTH_MESSAGES.nameInvalid],
    ["Steuerzeichen", "Fe\u0007lix", AUTH_MESSAGES.nameInvalid],
    ["Objekt", { a: 1 }, AUTH_MESSAGES.nameRequired],
    ["Zahl", 5, AUTH_MESSAGES.nameRequired],
    ["null", null, AUTH_MESSAGES.nameRequired],
  ])("lehnt den Namen ab: %s", async (_label, name, message) => {
    const res = await signUp({ name });
    expect(res.status).toBe(400);
    expect(res.message).toBe(message);
    expect(await userRow("a@example.test")).toBeUndefined();
  });

  it("verlangt einen Namen", async () => {
    const res = await post("/sign-up/email", {
      email: "a@example.test",
      password: PASSWORD,
    });
    expect(res.status).toBe(400);
    expect(res.message).toBe(AUTH_MESSAGES.nameRequired);
    expect(await userRow("a@example.test")).toBeUndefined();
  });

  it("lehnt eine E-Mail-Adresse mit 10 007 Zeichen ab", async () => {
    const email = `${"a".repeat(10_000)}@b.test`;
    expect(email).toHaveLength(10_007);
    const res = await signUp({ email });
    expect(res.status).toBe(400);
    expect(res.message).toBe(AUTH_MESSAGES.emailTooLong);
    expect(await userRow(email)).toBeUndefined();
  });

  it("nimmt eine E-Mail-Adresse mit 254 Zeichen an", async () => {
    const email = `${"a".repeat(64)}@${"b".repeat(184)}.test`;
    expect(email).toHaveLength(254);
    const res = await signUp({ email });
    expect(res.status).toBe(200);
  });

  it("lehnt das Bildfeld ab", async () => {
    const res = await signUp({ image: "javascript:alert(1)" });
    expect(res.status).toBe(400);
    expect(res.message).toBe(AUTH_MESSAGES.imageNotAllowed);
    expect(await userRow("a@example.test")).toBeUndefined();
  });

  it("nimmt Umlaute, Emoji und Leerzeichen an und speichert den Namen getrimmt", async () => {
    const res = await signUp({ name: "  Jörg 🎯 Müller-Weiß  " });
    expect(res.status).toBe(200);
    const row = await userRow("a@example.test");
    expect(row.name).toBe("Jörg 🎯 Müller-Weiß");
    expect(row.image).toBeNull();
  });

  it("gilt auch für direkte Aufrufe über auth.api", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { email: "b@example.test", password: PASSWORD, name: FOUR_MB },
      }),
    ).rejects.toThrow(AUTH_MESSAGES.nameTooLong);
    expect(await userRow("b@example.test")).toBeUndefined();
  });

  it("lässt die bestehenden Regeln bestehen", async () => {
    const res = await signUp({ status: "active", role: "admin", newPerDay: 99 });
    const row = await userRow("a@example.test");
    if (res.status === 200) {
      expect(row.status).toBe("pending");
      expect(row.role).not.toBe("admin");
      expect(row.newPerDay).toBe(10);
    } else {
      expect(res.status).toBeLessThan(500);
      expect(row).toBeUndefined();
    }
    const operator = await signUp({ email: OPERATOR });
    expect(operator.status).toBe(400);
    expect(operator.message).toBe(AUTH_MESSAGES.operatorEmail);
  });
});

describe("update-user als wartender Nutzer", () => {
  let cookie: string;

  beforeEach(async () => {
    expect((await signUp({ name: "Vorher" })).status).toBe(200);
    cookie = await cookieFor("a@example.test");
  });

  it.each([
    ["4 MB", FOUR_MB, AUTH_MESSAGES.nameTooLong],
    ["Objekt", { a: 1 }, AUTH_MESSAGES.nameRequired],
    ["Zahl", 5, AUTH_MESSAGES.nameRequired],
    ["null", null, AUTH_MESSAGES.nameRequired],
    ["NUL", "Fe\u0000lix", AUTH_MESSAGES.nameInvalid],
    ["RTL-Override", "Felix‮evil", AUTH_MESSAGES.nameInvalid],
    ["nur Leerzeichen", "   ", AUTH_MESSAGES.nameRequired],
  ])("lehnt den Namen ab: %s", async (_label, name, message) => {
    const res = await post("/update-user", { name }, cookie);
    expect(res.status).toBe(400);
    expect(res.message).toBe(message);
    expect((await userRow("a@example.test")).name).toBe("Vorher");
  });

  it("lehnt das Bildfeld ab", async () => {
    const res = await post("/update-user", { image: "javascript:alert(1)" }, cookie);
    expect(res.status).toBe(400);
    expect(res.message).toBe(AUTH_MESSAGES.imageNotAllowed);
    expect((await userRow("a@example.test")).image).toBeNull();
  });

  it("speichert einen gültigen Namen getrimmt", async () => {
    const res = await post("/update-user", { name: "  Jörg 🎯 Müller  " }, cookie);
    expect(res.status).toBe(200);
    expect((await userRow("a@example.test")).name).toBe("Jörg 🎯 Müller");
  });

  it("kann status, role und newPerDay weiterhin nicht setzen", async () => {
    for (const body of [
      { name: "Neu", status: "active" },
      { role: "admin" },
      { newPerDay: 500 },
    ]) {
      const res = await post("/update-user", body, cookie);
      expect(res.status).toBeLessThan(500);
    }
    const row = await userRow("a@example.test");
    expect(row.status).toBe("pending");
    expect(row.role).not.toBe("admin");
    expect(row.newPerDay).toBe(10);
  });
});

describe("delete-user verlangt das Passwort", () => {
  let cookie: string;

  beforeEach(async () => {
    expect((await signUp({})).status).toBe(200);
    cookie = await cookieFor("a@example.test");
  });

  it.each([
    ["ohne Passwort", {}],
    ["mit leerem Passwort", { password: "" }],
    ["mit einer Zahl", { password: 5 }],
  ])("lehnt ab: %s", async (_label, body) => {
    const res = await post("/delete-user", body, cookie);
    expect(res.status).toBe(400);
    expect(res.message).toBe(AUTH_MESSAGES.passwordRequired);
    expect(await userRow("a@example.test")).toBeDefined();
  });

  it("lehnt ein falsches Passwort ab", async () => {
    const res = await post("/delete-user", { password: "falsches-passwort" }, cookie);
    expect(res.status).toBe(400);
    expect(await userRow("a@example.test")).toBeDefined();
  });

  it("löscht mit dem richtigen Passwort", async () => {
    const res = await post("/delete-user", { password: PASSWORD }, cookie);
    expect(res.status).toBe(200);
    expect(await userRow("a@example.test")).toBeUndefined();
  });

  it("das Betreiberkonto bleibt auch mit Passwort bestehen", async () => {
    await seedAdmin(auth, OPERATOR, OPERATOR_PASSWORD);
    const operatorCookie = await cookieFor(OPERATOR, OPERATOR_PASSWORD);
    const res = await post("/delete-user", { password: OPERATOR_PASSWORD }, operatorCookie);
    expect(res.status).toBe(403);
    expect(res.message).toBe(AUTH_MESSAGES.operatorDelete);
    expect(await userRow(OPERATOR)).toBeDefined();
  });
});
