"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ROUTES } from "@/i18n/paths";
import { localeRedirectPath } from "@/i18n/server";
import { getSessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { grantExtraNewCards, type GrantResult } from "./grant-extra-cards";

export type MoreCardsState = Extract<GrantResult, { ok: false }> | { ok: false; reason: "auth" } | null;

/**
 * Gewährt weitere neue Karten für heute und öffnet die Lernseite. Argumente aus dem
 * Aufruf werden nicht ausgewertet: die Nutzer-ID kommt nur aus der Sitzung.
 */
export async function learnMoreCards(): Promise<MoreCardsState> {
  const u = await getSessionUser();
  if (!u || u.status !== "active") return { ok: false, reason: "auth" };

  const result = await grantExtraNewCards(db, u.id, new Date());
  if (!result.ok) return result;

  revalidatePath("/[lang]/(app)/today", "page");
  redirect(await localeRedirectPath(ROUTES.study));
}
