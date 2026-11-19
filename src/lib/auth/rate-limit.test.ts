import { beforeEach, expect, it, vi } from "vitest";
import { createTestDb } from "../db/test-db";
import { createAuth } from "./index";

// Begrenzt werden nur HTTP-Aufrufe über auth.handler, nicht auth.api.
const APP = "http://localhost:3000";
const PASSWORD = "ein-langes-passwort";

let auth: ReturnType<typeof createAuth>;

beforeEach(async () => {
  vi.stubEnv("ADMIN_EMAIL", "betreiber@checkout-trainer.test");
  auth = createAuth(await createTestDb());
  return () => vi.unstubAllEnvs();
});

function call(method: "GET" | "POST", path: string, cookie = "", body?: unknown) {
  return auth.handler(
    new Request(`${APP}/api/auth${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": "203.0.113.9",
        origin: APP,
        cookie,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  );
}

async function signedInCookie() {
  await call("POST", "/sign-up/email", "", { email: "a@example.test", password: PASSWORD, name: "A" });
  const res = await call("POST", "/sign-in/email", "", { email: "a@example.test", password: PASSWORD });
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

it("bremst das Raten des Passworts beim Konto löschen nach fünf Versuchen pro Minute", async () => {
  const cookie = await signedInCookie();
  const statuses = [];
  for (let i = 0; i < 6; i++) {
    statuses.push((await call("POST", "/delete-user", cookie, { password: "falsch-geraten" })).status);
  }
  expect(statuses.slice(0, 5)).not.toContain(429);
  expect(statuses[5]).toBe(429);
});

it("begrenzt die Sitzungsabfrage nicht, sie läuft bei jedem App-Start", async () => {
  const cookie = await signedInCookie();
  for (let i = 0; i < 101; i++) {
    expect((await call("GET", "/get-session", cookie)).status).toBe(200);
  }
});
