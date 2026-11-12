"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { setUserPassword, setUserStatus } from "./admin-users";

// Jede Action prüft die Adminrechte selbst: der Seitenschutz gilt nicht für
// Aufrufe der Action. Den Akteur gibt es nur aus der Sitzung.

export async function changeUserStatus(
  userId: string,
  status: "active" | "blocked",
): Promise<{ ok: boolean }> {
  const actor = await requireAdmin();
  const result = await setUserStatus(db, auth, actor, userId, status);
  if (result.ok) revalidatePath("/[lang]/(app)/admin", "page");
  return result;
}

export async function changeUserPassword(
  userId: string,
  password: string,
): Promise<{ ok: boolean }> {
  const actor = await requireAdmin();
  return setUserPassword(auth, actor, userId, password);
}
