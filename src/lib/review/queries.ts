import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { cardState, reviewLog, user } from "@/lib/db/schema";
import { cardById, cardOrderFor } from "@/lib/cards";
import { EXTRA_SELECT, extraCardsOf } from "@/lib/extra-cards-db";
import { isCardOn, NO_EXTRA_CARDS, type ExtraCards } from "@/lib/extra-cards";
import { rate, type Rating, type SrsState } from "@/lib/srs/fsrs";
import { buildQueue, effectiveNewLimit, type NewCardAllowance } from "@/lib/srs/queue";
import { dayEnd, dayStart } from "@/lib/time";

type QueueUser = { id: string; newPerDay: number };

export type ReviewResult =
  | { ok: true }
  | { ok: false; reason: "unknown-card" | "off" | "stale" | "limit" | "invalid" };

type StateRow = typeof cardState.$inferSelect;

/**
 * Heutige Warteschlange aus den Lernständen eines Nutzers, seinem Tageslimit und seinen
 * Zusatzkarten: Ausgeschaltete Karten werden weder neu eingeführt noch als fällig gezeigt,
 * ihr Lernstand bleibt. Heute eingeführt zählt jede Karte, wie beim Tageslimit in applyReview.
 */
export function queueFromRows(rows: StateRow[], allowance: NewCardAllowance, now: Date, extras: ExtraCards) {
  const order = cardOrderFor(extras);
  const introducedToday = rows.filter(
    (r) => r.introducedAt >= dayStart(now) && r.introducedAt <= dayEnd(now),
  ).length;
  const limit = effectiveNewLimit(allowance, now);
  const { due, fresh } = buildQueue({
    order,
    states: rows.map((r) => ({ cardId: r.cardId, due: r.due })),
    now,
    newPerDay: limit,
    introducedToday,
  });
  const seen = new Set(rows.map((r) => r.cardId));
  return {
    due,
    fresh,
    introducedToday,
    /** Heute noch offene neue Karten, auch wenn keine ungesehene mehr übrig ist. */
    newLeftToday: Math.max(0, limit - introducedToday),
    unseenCount: order.filter((id) => !seen.has(id)).length,
  };
}

export async function loadQueue(db: Db, u: QueueUser, now: Date) {
  const [rows, [extra]] = await Promise.all([
    db.select().from(cardState).where(eq(cardState.userId, u.id)),
    // Extrakarten und Zusatzkarten stehen nicht in der Sitzung, sondern nur in der Datenbank.
    db
      .select({ extraNewDay: user.extraNewDay, extraNewCount: user.extraNewCount, ...EXTRA_SELECT })
      .from(user)
      .where(eq(user.id, u.id)),
  ]);
  const { due, fresh, unseenCount, newLeftToday } = queueFromRows(
    rows,
    { newPerDay: u.newPerDay, extraNewDay: extra?.extraNewDay ?? null, extraNewCount: extra?.extraNewCount ?? 0 },
    now,
    extra ? extraCardsOf(extra) : NO_EXTRA_CARDS,
  );
  return {
    cardIds: [...due, ...fresh],
    dueCount: due.length,
    freshCount: fresh.length,
    unseenCount,
    newLeftToday,
    reps: Object.fromEntries(rows.map((r) => [r.cardId, r.reps])),
    states: Object.fromEntries(rows.map((r) => [r.cardId, r])),
  };
}

function isRating(v: unknown): v is Rating {
  return v === 1 || v === 2 || v === 3 || v === 4;
}

export async function applyReview(
  db: Db,
  u: QueueUser,
  input: { cardId: string; rating: Rating; reps: number },
  now: Date,
): Promise<ReviewResult> {
  const { cardId, rating, reps } = input;
  if (!isRating(rating) || !Number.isInteger(reps) || reps < 0) {
    return { ok: false, reason: "invalid" };
  }
  const card = typeof cardId === "string" ? cardById(cardId) : undefined;
  if (!card) return { ok: false, reason: "unknown-card" };

  return db.transaction(async (tx): Promise<ReviewResult> => {
    // Serialises all reviews of one user, so the stale check, the daily limit
    // and both writes cannot interleave with a parallel request.
    // The extra allowance is read here, under the lock, never from the session.
    const [locked] = await tx
      .select({ extraNewDay: user.extraNewDay, extraNewCount: user.extraNewCount, ...EXTRA_SELECT })
      .from(user)
      .where(eq(user.id, u.id))
      .for("update");
    // Ausgeschaltete Zusatzkarten sind über keinen Weg zu bewerten, auch nicht aus
    // einer Lernsitzung, die vor dem Ausschalten geladen wurde.
    if (!isCardOn(card, locked ? extraCardsOf(locked) : NO_EXTRA_CARDS)) return { ok: false, reason: "off" };

    const [current] = await tx
      .select()
      .from(cardState)
      .where(and(eq(cardState.userId, u.id), eq(cardState.cardId, cardId)));

    if ((current?.reps ?? 0) !== reps) return { ok: false, reason: "stale" };

    const next = rate(current ?? null, rating, now);
    const stored: SrsState = { ...next };

    if (current) {
      // Conditional on reps as a second guard against concurrent writers.
      const updated = await tx
        .update(cardState)
        .set(stored)
        .where(
          and(
            eq(cardState.userId, u.id),
            eq(cardState.cardId, cardId),
            eq(cardState.reps, reps),
          ),
        )
        .returning({ cardId: cardState.cardId });
      if (updated.length === 0) return { ok: false, reason: "stale" };
    } else {
      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(cardState)
        .where(
          and(
            eq(cardState.userId, u.id),
            gte(cardState.introducedAt, dayStart(now)),
            lte(cardState.introducedAt, dayEnd(now)),
          ),
        );
      const limit = effectiveNewLimit(
        {
          newPerDay: u.newPerDay,
          extraNewDay: locked?.extraNewDay ?? null,
          extraNewCount: locked?.extraNewCount ?? 0,
        },
        now,
      );
      if (n >= limit) return { ok: false, reason: "limit" };
      const inserted = await tx
        .insert(cardState)
        .values({ userId: u.id, cardId, introducedAt: now, ...stored })
        .onConflictDoNothing()
        .returning({ cardId: cardState.cardId });
      if (inserted.length === 0) return { ok: false, reason: "stale" };
    }

    await tx.insert(reviewLog).values({ userId: u.id, cardId, rating, reviewedAt: now });
    return { ok: true };
  });
}

/** Rohdaten für die Statistik: alle Lernstände und Bewertungen eines Nutzers. */
export async function loadStatsData(db: Db, userId: string) {
  const [states, logs] = await Promise.all([
    db
      .select({
        cardId: cardState.cardId,
        state: cardState.state,
        scheduledDays: cardState.scheduledDays,
      })
      .from(cardState)
      .where(eq(cardState.userId, userId)),
    db
      .select({ cardId: reviewLog.cardId, rating: reviewLog.rating, reviewedAt: reviewLog.reviewedAt })
      .from(reviewLog)
      .where(eq(reviewLog.userId, userId)),
  ]);
  return { states, logs };
}
