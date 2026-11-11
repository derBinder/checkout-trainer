import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { db, type Db } from "../db";

/**
 * Minimalversion: nur, was das Datenbankschema bestimmt. Verhalten (Hooks,
 * Limits, Guards, Seeding) kommt mit Task 7.
 */
export function createAuth(database: Db) {
  return betterAuth({
    database: drizzleAdapter(database, { provider: "pg" }),
    emailAndPassword: { enabled: true },
    user: {
      additionalFields: {
        status: { type: "string", defaultValue: "pending", input: false },
        newPerDay: { type: "number", defaultValue: 10, input: false },
      },
    },
    plugins: [admin()],
    rateLimit: { enabled: true, storage: "database" },
  });
}

export const auth = createAuth(db);
