import { asc, desc, eq, sql } from "drizzle-orm";
import type { Auth } from "@/lib/auth";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";
import type { SessionUser } from "@/lib/auth/guard";
import type { Db } from "@/lib/db";
import { user } from "@/lib/db/schema";

type Result = { ok: boolean };

/**
 * Kerne ohne Sitzung und ohne "use server": Die Server Actions in actions.ts
 * liefern den Akteur aus der Sitzung. Alle übrigen Argumente sind untrusted.
 * Die Adminprüfung hier ist eine zweite Absicherung.
 */
function isActiveAdmin(actor: SessionUser): boolean {
  return actor.role === "admin" && actor.status === "active";
}

export async function listUsers(db: Db) {
  return db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
    })
    .from(user)
    // Wartende zuerst, dann neueste zuerst.
    .orderBy(
      asc(sql`case when ${user.status} = 'pending' then 0 else 1 end`),
      desc(user.createdAt),
    );
}

export async function setUserStatus(
  db: Db,
  auth: Auth,
  actor: SessionUser,
  userId: string,
  status: "active" | "blocked",
): Promise<Result> {
  if (!isActiveAdmin(actor)) return { ok: false };
  if (typeof userId !== "string" || userId === "") return { ok: false };
  if (status !== "active" && status !== "blocked") return { ok: false };
  // Der Betreiber sperrt sich nicht selbst aus.
  if (userId === actor.id) return { ok: false };

  const [target] = await db
    .select({ id: user.id, role: user.role })
    .from(user)
    .where(eq(user.id, userId));
  // Andere Adminkonten sind über diese Seite unantastbar.
  if (!target || target.role === "admin") return { ok: false };

  await db.update(user).set({ status }).where(eq(user.id, userId));
  if (status === "blocked") {
    const ctx = await auth.$context;
    await ctx.internalAdapter.deleteUserSessions(userId);
  }
  return { ok: true };
}

export async function setUserPassword(
  auth: Auth,
  actor: SessionUser,
  userId: string,
  password: string,
): Promise<Result> {
  if (!isActiveAdmin(actor)) return { ok: false };
  if (typeof userId !== "string" || userId === "") return { ok: false };
  if (
    typeof password !== "string" ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return { ok: false };
  }
  if (userId === actor.id) return { ok: false };

  const ctx = await auth.$context;
  const target = await ctx.internalAdapter.findUserById(userId);
  if (!target || (target as { role?: string | null }).role === "admin") {
    return { ok: false };
  }

  const hash = await ctx.password.hash(password);
  if (await ctx.internalAdapter.findCredentialAccount(userId)) {
    await ctx.internalAdapter.updatePassword(userId, hash);
  } else {
    await ctx.internalAdapter.createAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: hash,
    });
  }
  // Ein vergessenes Passwort kann in fremder Hand sein: alle Sitzungen enden.
  await ctx.internalAdapter.deleteUserSessions(userId);
  return { ok: true };
}
