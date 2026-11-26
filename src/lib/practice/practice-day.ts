import type { Db } from "@/lib/db";
import { practiceDay } from "@/lib/db/schema";
import { dayKey } from "@/lib/time";

/** Merkt den heutigen Berliner Tag als Übungstag; ein zweiter Aufruf am selben Tag ändert nichts. */
export async function recordPracticeDay(db: Db, userId: string, now: Date): Promise<void> {
  await db.insert(practiceDay).values({ userId, day: dayKey(now) }).onConflictDoNothing();
}
