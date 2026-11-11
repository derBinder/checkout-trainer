import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { MAX_NEW_PER_DAY } from "@/lib/settings";

/**
 * Kern ohne Sitzung und ohne "use server": Die Server Action liefert die
 * Nutzer-ID aus der Sitzung. Der Wert ist untrusted und wird hier geprüft.
 */
export async function setNewPerDay(
  db: Db,
  userId: string,
  value: unknown,
): Promise<{ ok: true } | { ok: false }> {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > MAX_NEW_PER_DAY
  ) {
    return { ok: false };
  }
  await db.update(user).set({ newPerDay: value }).where(eq(user.id, userId));
  return { ok: true };
}
