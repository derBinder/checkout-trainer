"use server";

import { getSessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { recordPracticeDay } from "@/lib/practice/practice-day";

/**
 * Merkt den heutigen Tag als Übungstag, damit er für die Serie zählt. Argumente gibt es
 * nicht: die Nutzer-ID kommt nur aus der Sitzung. Ohne aktives Konto passiert nichts.
 */
export async function recordPractice(): Promise<void> {
  const u = await getSessionUser();
  if (!u || u.status !== "active") return;
  await recordPracticeDay(db, u.id, new Date());
}
