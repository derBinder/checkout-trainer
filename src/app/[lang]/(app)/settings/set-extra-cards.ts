import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { isExtraKind } from "@/lib/extra-cards";
import { EXTRA_FIELDS } from "@/lib/extra-cards-db";

/**
 * Kern ohne Sitzung und ohne "use server": Die Server Action liefert die
 * Nutzer-ID aus der Sitzung. Schalter und Wert sind untrusted und werden hier
 * geprüft: nur bekannte Schalter, nur wahr oder falsch.
 */
export async function setExtraCards(
  db: Db,
  userId: string,
  kind: unknown,
  on: unknown,
): Promise<{ ok: true } | { ok: false }> {
  if (!isExtraKind(kind) || typeof on !== "boolean") return { ok: false };
  await db
    .update(user)
    .set({ [EXTRA_FIELDS[kind]]: on })
    .where(eq(user.id, userId));
  return { ok: true };
}
