"use server";

import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/guard";
import { applyReview, type ReviewResult } from "./queries";

export async function submitReview(input: {
  cardId: string;
  rating: number;
  reps: number;
}): Promise<ReviewResult | { ok: false; reason: "auth" }> {
  const u = await getSessionUser();
  if (!u || u.status !== "active") return { ok: false, reason: "auth" };

  // Client input is untrusted: check the shape before it reaches the core.
  if (
    typeof input !== "object" ||
    input === null ||
    typeof input.cardId !== "string" ||
    typeof input.rating !== "number" ||
    typeof input.reps !== "number"
  ) {
    return { ok: false, reason: "invalid" };
  }
  const { cardId, rating, reps } = input;
  if (![1, 2, 3, 4].includes(rating)) return { ok: false, reason: "invalid" };

  return applyReview(
    db,
    { id: u.id, newPerDay: u.newPerDay },
    { cardId, rating: rating as 1 | 2 | 3 | 4, reps },
    new Date(),
  );
}
