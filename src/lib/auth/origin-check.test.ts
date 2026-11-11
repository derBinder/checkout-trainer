import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "../db/test-db";
import type { Db } from "../db";
import { user } from "../db/schema";
import { createAuth } from "./index";

// Better Auth schaltet die Origin-Prüfung unter Vitest ab (isTest() beim
// Laden des Moduls, NODE_ENV=test). Hier wird sie für diese Datei wieder
// eingeschaltet, damit der CSRF-Schutz der App-Konfiguration geprüft wird.

const APP = "http://localhost:3000";
const FOREIGN = "https://angreifer.example";
const PASSWORD = "ein-langes-passwort";

let db: Db;
let auth: ReturnType<typeof createAuth>;

beforeEach(async () => {
  vi.stubEnv("ADMIN_EMAIL", "betreiber@checkout-trainer.test");
  db = await createTestDb();
  auth = createAuth(db);
  const context = await auth.$context;
  expect(context.skipOriginCheck).toBe(true);
  context.skipOriginCheck = false;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

function post(path: string, body: unknown, headers: Record<string, string>) {
  return auth.handler(
    new Request(`${APP}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.9",
        ...headers,
      },
      body: JSON.stringify(body),
    }),
  );
}

async function signedInCookie() {
  const signUp = await post(
    "/sign-up/email",
    { email: "a@example.test", password: PASSWORD, name: "Vorher" },
    { origin: APP },
  );
  expect(signUp.status).toBe(200);
  const signIn = await post(
    "/sign-in/email",
    { email: "a@example.test", password: PASSWORD },
    { origin: APP },
  );
  expect(signIn.status).toBe(200);
  return signIn.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
}

async function nameOf(email: string) {
  const [row] = await db.select().from(user).where(eq(user.email, email));
  return row?.name;
}

describe("Origin-Prüfung", () => {
  it("lehnt update-user mit fremdem Origin ab", async () => {
    const cookie = await signedInCookie();
    const res = await post("/update-user", { name: "Fremd" }, { cookie, origin: FOREIGN });
    expect(res.status).toBe(403);
    expect(await nameOf("a@example.test")).toBe("Vorher");
  });

  it("lehnt delete-user mit fremdem Origin ab", async () => {
    const cookie = await signedInCookie();
    const res = await post("/delete-user", { password: PASSWORD }, { cookie, origin: FOREIGN });
    expect(res.status).toBe(403);
    expect(await nameOf("a@example.test")).toBe("Vorher");
  });

  it("lässt update-user mit eigenem Origin durch", async () => {
    const cookie = await signedInCookie();
    const res = await post("/update-user", { name: "Neu" }, { cookie, origin: APP });
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
    expect(await nameOf("a@example.test")).toBe("Neu");
  });

  it("lässt delete-user mit eigenem Origin durch", async () => {
    const cookie = await signedInCookie();
    const res = await post("/delete-user", { password: PASSWORD }, { cookie, origin: APP });
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(200);
    expect(await nameOf("a@example.test")).toBeUndefined();
  });
});
