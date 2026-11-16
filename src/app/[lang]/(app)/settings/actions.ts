"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import type { ExtraKind } from "@/lib/extra-cards";
import { setExtraCards } from "./set-extra-cards";
import { resetProgress } from "./reset-progress";
import { setNewPerDay } from "./set-new-per-day";

export async function updateNewPerDay(
  value: number,
): Promise<{ ok: true } | { ok: false }> {
  // Nutzer-ID nur aus der Sitzung, nie aus dem Aufruf.
  const u = await getSessionUser();
  if (!u || u.status !== "active") return { ok: false };

  const result = await setNewPerDay(db, u.id, value);
  if (result.ok) revalidatePath("/[lang]/(app)/today", "page");
  return result;
}

export async function updateExtraCards(
  kind: ExtraKind,
  on: boolean,
): Promise<{ ok: true } | { ok: false }> {
  // Nutzer-ID nur aus der Sitzung; Schalter und Wert prüft der Kern.
  const u = await getSessionUser();
  if (!u || u.status !== "active") return { ok: false };

  const result = await setExtraCards(db, u.id, kind, on);
  // Lernplan, Heute, Statistik und Üben hängen an den Schaltern.
  if (result.ok) revalidatePath("/[lang]/(app)", "layout");
  return result;
}

export async function resetLearningProgress(): Promise<{ ok: true } | { ok: false }> {
  // Nutzer-ID nur aus der Sitzung, nie aus dem Aufruf.
  const u = await getSessionUser();
  if (!u || u.status !== "active") return { ok: false };

  const result = await resetProgress(db, u.id);
  // Heute, Lernplan, Statistik und Üben hängen am Lernstand.
  if (result.ok) revalidatePath("/[lang]/(app)", "layout");
  return result;
}
