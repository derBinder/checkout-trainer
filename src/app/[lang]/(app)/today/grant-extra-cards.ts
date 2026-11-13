import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { cardState, user } from "@/lib/db/schema";
import { EXTRA_SELECT, extraCardsOf } from "@/lib/extra-cards-db";
import { queueFromRows } from "@/lib/review/queries";
import { dayKey } from "@/lib/time";

/** Neue Karten pro Tippen auf „Weitere 5 Karten lernen". */
export const EXTRA_NEW_STEP = 5;
/** Höchstens so viele Extrakarten an einem Tag. */
export const EXTRA_NEW_MAX = 50;

export type GrantResult =
  | { ok: true }
  | { ok: false; reason: "inactive" | "not-done" | "all-introduced" | "cap" };

/**
 * Kern ohne Sitzung und ohne "use server": Die Server Action liefert die
 * Nutzer-ID aus der Sitzung. Alles Weitere wird hier unter der Zeilensperre
 * des Nutzers aus der Datenbank gelesen, dieselbe Sperre wie in applyReview.
 */
export async function grantExtraNewCards(
  db: Db,
  userId: unknown,
  now: Date,
): Promise<GrantResult> {
  if (typeof userId !== "string" || userId === "") return { ok: false, reason: "inactive" };

  return db.transaction(async (tx): Promise<GrantResult> => {
    const [u] = await tx
      .select({
        status: user.status,
        newPerDay: user.newPerDay,
        extraNewDay: user.extraNewDay,
        extraNewCount: user.extraNewCount,
        ...EXTRA_SELECT,
      })
      .from(user)
      .where(eq(user.id, userId))
      .for("update");
    if (!u || u.status !== "active") return { ok: false, reason: "inactive" };

    const rows = await tx.select().from(cardState).where(eq(cardState.userId, userId));
    const { due, fresh, introducedToday, unseenCount } = queueFromRows(rows, u, now, extraCardsOf(u));
    if (due.length + fresh.length > 0) return { ok: false, reason: "not-done" };
    if (unseenCount === 0) return { ok: false, reason: "all-introduced" };

    const today = dayKey(now);
    // Eine Gewährung von einem früheren Tag verfällt und wird ersetzt. Wurde die
    // Einstellung heute gesenkt, zählt, was tatsächlich schon eingeführt ist,
    // damit der nächste Schritt wirklich 5 neue Karten bringt.
    const current = u.extraNewDay === today ? u.extraNewCount : 0;
    const base = Math.max(current, introducedToday - u.newPerDay, 0);
    const next = base + EXTRA_NEW_STEP;
    if (next > EXTRA_NEW_MAX) return { ok: false, reason: "cap" };

    await tx
      .update(user)
      .set({ extraNewDay: today, extraNewCount: next })
      .where(eq(user.id, userId));
    return { ok: true };
  });
}
