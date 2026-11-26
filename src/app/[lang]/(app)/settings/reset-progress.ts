import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { cardState, practiceDay, reviewLog, user } from "@/lib/db/schema";

/**
 * Setzt den Lernstand eines Kontos zurück: Kartenstände, Verlauf und Übungstage (damit auch
 * die Statistik und die Serie) und die heute schon geholten Zusatzkarten. Einstellungen
 * bleiben. Kern ohne Sitzung: Die Server Action liefert die Nutzer-ID aus der Sitzung.
 */
export async function resetProgress(
  db: Db,
  userId: string,
): Promise<{ ok: true } | { ok: false }> {
  return db.transaction(async (tx) => {
    const updated = await tx
      .update(user)
      .set({ extraNewDay: null, extraNewCount: 0 })
      .where(eq(user.id, userId))
      .returning({ id: user.id });
    // Ohne Zeile (Konto inzwischen gelöscht) gibt es nichts zurückzusetzen.
    if (updated.length !== 1) return { ok: false as const };
    await tx.delete(cardState).where(eq(cardState.userId, userId));
    await tx.delete(reviewLog).where(eq(reviewLog.userId, userId));
    await tx.delete(practiceDay).where(eq(practiceDay.userId, userId));
    return { ok: true as const };
  });
}
