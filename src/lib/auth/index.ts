import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db, type Db } from "../db";
import { user as userTable } from "../db/schema";
import { AUTH_MESSAGES, MIN_PASSWORD_LENGTH } from "./constants";

export { MIN_PASSWORD_LENGTH } from "./constants";

function isOperatorEmail(email: unknown): boolean {
  const operator = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return (
    !!operator &&
    typeof email === "string" &&
    email.trim().toLowerCase() === operator
  );
}

/**
 * Alle Regeln stehen hier und nicht in Formularen: Der Endpunkt
 * `/api/auth/sign-up/email` ist für jeden erreichbar.
 */
export function createAuth(database: Db) {
  return betterAuth({
    database: drizzleAdapter(database, { provider: "pg" }),
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
      deleteUser: { enabled: true },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email" && isOperatorEmail(ctx.body?.email)) {
          throw new APIError("BAD_REQUEST", {
            message: AUTH_MESSAGES.operatorEmail,
          });
        }
        if (
          ctx.path === "/sign-in/email" &&
          typeof ctx.body?.email === "string"
        ) {
          const [row] = await database
            .select({ status: userTable.status })
            .from(userTable)
            .where(eq(userTable.email, ctx.body.email.trim().toLowerCase()));
          if (row?.status === "blocked") {
            throw new APIError("FORBIDDEN", {
              message: AUTH_MESSAGES.blocked,
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
            // (seedAdmin). Der Admin-Endpunkt ist durch das Admin-Plugin
            // geschützt. Alles andere (öffentliche Registrierung) startet
            // immer als pending und nie als Admin.
            if (!context || context.path === "/admin/create-user") return;
            return {
              data: { ...data, status: "pending", role: "user", newPerDay: 10 },
            };
          },
        },
      },
      session: {
        create: {
          // Zweite Absicherung: kein Pfad kann eine Sitzung für einen
          // gesperrten Nutzer anlegen.
          before: async (session) => {
            const [row] = await database
              .select({ status: userTable.status })
              .from(userTable)
              .where(eq(userTable.id, session.userId));
            if (row?.status === "blocked") return false;
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
