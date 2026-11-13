import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db, type Db } from "../db";
import * as schema from "../db/schema";
import { user as userTable } from "../db/schema";
import { parseName } from "../validation/schemas";
import {
  AUTH_ERRORS,
  MAX_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "./constants";

export { MIN_PASSWORD_LENGTH } from "./constants";

function operatorEmail(): string | undefined {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || undefined;
}

function isOperatorEmail(email: unknown): boolean {
  const operator = operatorEmail();
  return (
    !!operator &&
    typeof email === "string" &&
    email.trim().toLowerCase() === operator
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Name, E-Mail und Bild für Registrierung und Profiländerung, unabhängig von
 * der Prüfung im Formular. Liefert den Körper mit getrimmtem Namen zurück.
 */
function checkProfileInput(path: "/sign-up/email" | "/update-user", body: unknown) {
  // Kein Objekt: Better Auth lehnt den Körper selbst mit 400 ab.
  if (!isRecord(body)) return;
  if (body.image !== undefined) {
    throw new APIError("BAD_REQUEST", {
      message: AUTH_ERRORS.imageNotAllowed,
    });
  }
  if (
    path === "/sign-up/email" &&
    typeof body.email === "string" &&
    body.email.length > MAX_EMAIL_LENGTH
  ) {
    throw new APIError("BAD_REQUEST", { message: AUTH_ERRORS.emailTooLong });
  }
  // Bei der Profiländerung ist der Name optional, bei der Registrierung Pflicht.
  if (path === "/update-user" && body.name === undefined) return;
  const name = parseName(body.name);
  if (!name.ok) throw new APIError("BAD_REQUEST", { message: name.message });
  return { context: { body: { ...body, name: name.name } } };
}

/**
 * Alle Regeln stehen hier und nicht in Formularen: Der Endpunkt
 * `/api/auth/sign-up/email` ist für jeden erreichbar.
 */
export function createAuth(database: Db) {
  return betterAuth({
    // Schema ausdrücklich: Sonst liest die Schemaprüfung, die Better Auth schon
    // beim Import startet, `database._` und öffnet damit die Datenbank, auch im
    // Kurzzeitprozess von `next dev` für die Pfade (zweiter PGlite-Prozess).
    database: drizzleAdapter(database, { provider: "pg", schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: MIN_PASSWORD_LENGTH,
    },
    user: {
      additionalFields: {
        // input: false: der Client kann diese Felder nie setzen.
        status: { type: "string", defaultValue: "pending", input: false },
        newPerDay: { type: "number", defaultValue: 10, input: false },
      },
      deleteUser: {
        enabled: true,
        // Das Betreiberkonto bleibt bestehen, auch über den offenen Endpunkt.
        beforeDelete: async (u) => {
          if ((u as { role?: string | null }).role === "admin") {
            throw new APIError("FORBIDDEN", {
              message: AUTH_ERRORS.operatorDelete,
            });
          }
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        // Die App nutzt keinen Endpunkt des Admin-Plugins: Die Verwaltung
        // arbeitet über eigene Kerne mit dem internen Adapter. Die Hooks
        // laufen für HTTP und für auth.api, damit ist kein Weg offen.
        if (ctx.path?.startsWith("/admin/")) {
          throw new APIError("NOT_FOUND");
        }
        // Ohne ADMIN_EMAIL ließe sich die Betreiberadresse nicht schützen:
        // in Produktion dann keine öffentliche Registrierung (fail closed).
        if (
          ctx.path === "/sign-up/email" &&
          !operatorEmail() &&
          process.env.NODE_ENV === "production"
        ) {
          throw new APIError("FORBIDDEN", {
            message: AUTH_ERRORS.signUpClosed,
          });
        }
        if (ctx.path === "/sign-up/email" && isOperatorEmail(ctx.body?.email)) {
          throw new APIError("BAD_REQUEST", {
            message: AUTH_ERRORS.operatorEmail,
          });
        }
        if (ctx.path === "/sign-up/email" || ctx.path === "/update-user") {
          return checkProfileInput(ctx.path, ctx.body);
        }
        // Better Auth verlangt das Passwort nur bei alter Sitzung und
        // überspringt die Prüfung bei einem leeren String.
        if (ctx.path === "/delete-user") {
          const password = isRecord(ctx.body) ? ctx.body.password : undefined;
          if (typeof password !== "string" || password === "") {
            throw new APIError("BAD_REQUEST", {
              message: AUTH_ERRORS.passwordRequired,
            });
          }
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (data, context) => {
            // Ohne Endpunktkontext läuft vertrauenswürdiger Servercode
            // (seedAdmin). Alles andere (öffentliche Registrierung) startet
            // immer als pending und nie als Admin.
            if (!context) return;
            return {
              data: { ...data, status: "pending", role: "user", newPerDay: 10 },
            };
          },
        },
      },
      session: {
        create: {
          // Kein Pfad legt eine Sitzung für einen gesperrten Nutzer an. Bei
          // der Anmeldung läuft das erst nach der Passwortprüfung, damit die
          // Sperre bei falschem Passwort nicht verraten wird.
          before: async (session) => {
            const [row] = await database
              .select({ status: userTable.status })
              .from(userTable)
              .where(eq(userTable.id, session.userId));
            if (row?.status === "blocked") {
              throw new APIError("FORBIDDEN", {
                message: AUTH_ERRORS.blocked,
              });
            }
          },
        },
      },
    },
    plugins: [admin(), nextCookies()],
    rateLimit: {
      enabled: true,
      storage: "database",
      customRules: {
        "/sign-up/email": { window: 60 * 60, max: 5 },
        "/sign-in/email": { window: 60, max: 10 },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

export const auth: Auth = createAuth(db);

/**
 * Legt den Betreiber an (aktiv, Admin). Idempotent: existiert die Adresse
 * schon, passiert nichts (bei einem Konto ohne Adminrolle Fehler statt
 * stiller Beförderung).
 */
export async function seedAdmin(
  authInstance: Auth,
  email: string,
  password: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const ctx = await authInstance.$context;
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      `Das Startpasswort braucht mindestens ${MIN_PASSWORD_LENGTH} Zeichen.`,
    );
  }
  const existing = await ctx.internalAdapter.findUserByEmail(normalized);
  if (existing) {
    if ((existing.user as { role?: string | null }).role !== "admin") {
      throw new Error(
        "Unter dieser Adresse existiert bereits ein Konto ohne Adminrolle.",
      );
    }
    return;
  }
  const created = await ctx.internalAdapter.createUser<{
    role: string;
    status: string;
    newPerDay: number;
  }>(
    {
      email: normalized,
      name: "Betreiber",
      emailVerified: true,
      role: "admin",
      status: "active",
      newPerDay: 10,
    },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: await ctx.password.hash(password),
  });
}
