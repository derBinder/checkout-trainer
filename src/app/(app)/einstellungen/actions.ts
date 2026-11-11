"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { setNewPerDay } from "./set-new-per-day";

export async function updateNewPerDay(
  value: number,
): Promise<{ ok: true } | { ok: false }> {
  // Nutzer-ID nur aus der Sitzung, nie aus dem Aufruf.
  const u = await getSessionUser();
  if (!u || u.status !== "active") return { ok: false };

  const result = await setNewPerDay(db, u.id, value);
  if (result.ok) revalidatePath("/heute");
  return result;
}
