import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { newPerDaySchema, validateField } from "@/lib/validation/schemas";

/**
 * Kern ohne Sitzung und ohne "use server": Die Server Action liefert die
 * Nutzer-ID aus der Sitzung. Der Wert ist untrusted und wird hier geprüft.
 */
export async function setNewPerDay(
  db: Db,
  userId: string,
  value: unknown,
): Promise<{ ok: true } | { ok: false }> {
  // Das Formular darf Zahlenstrings schicken, die Server Action bekommt eine Zahl.
  if (typeof value !== "number" || validateField(newPerDaySchema, value)) {
    return { ok: false };
  }
  await db.update(user).set({ newPerDay: value }).where(eq(user.id, userId));
  return { ok: true };
}
