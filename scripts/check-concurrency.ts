/**
 * Prüft den Schutz gegen doppelt abgeschickte Bewertungen (SELECT … FOR UPDATE
 * in applyReview): zwei identische Bewertungen laufen gleichzeitig, genau eine
 * darf gelten. Legt dafür einen Wegwerf-Nutzer an und entfernt ihn danach
 * wieder (ON DELETE CASCADE räumt Lernstand und Protokoll mit ab).
 *
 * Datenbank wie in der App: mit DATABASE_URL über pg (zwei echte Verbindungen
 * aus dem Pool), sonst die lokale PGlite-Datenbank unter .data/pglite
 * (der Entwicklungsserver darf dabei nicht laufen).
 *
 *   npx tsx scripts/check-concurrency.ts
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { CARD_ORDER } from "../src/lib/cards";
import { db } from "../src/lib/db";
import { cardState, reviewLog, user } from "../src/lib/db/schema";
import { applyReview } from "../src/lib/review/queries";

async function close() {
  const client = (db as unknown as { $client: { end?: () => Promise<void>; close?: () => Promise<void> } })
    .$client;
  await (client.end?.() ?? client.close?.());
}

const id = `check-concurrency-${randomUUID()}`;
let passed = false;

try {
  await db.insert(user).values({
    id,
    name: "Gleichzeitigkeitsprüfung",
    email: `${id}@checkout-trainer.test`,
    status: "active",
  });

  const input = { cardId: CARD_ORDER[0], rating: 3 as const, reps: 0 };
  const actor = { id, newPerDay: 10 };
  const results = await Promise.all([
    applyReview(db, actor, input, new Date()),
    applyReview(db, actor, input, new Date()),
  ]);
  const logRows = await db.select().from(reviewLog).where(eq(reviewLog.userId, id));
  const stateRows = await db.select().from(cardState).where(eq(cardState.userId, id));

  console.log("Ergebnisse:", JSON.stringify(results));
  console.log("review_log-Zeilen:", logRows.length);
  console.log("card_state-Zeilen:", stateRows.length);

  const ok = results.filter((r) => r.ok).length;
  const stale = results.filter((r) => !r.ok && r.reason === "stale").length;
  passed = ok === 1 && stale === 1 && logRows.length === 1 && stateRows.length === 1;
} finally {
  await db.delete(user).where(eq(user.id, id));
  const left = await db.select().from(reviewLog).where(eq(reviewLog.userId, id));
  console.log(left.length === 0 ? "Wegwerf-Nutzer entfernt." : "Aufräumen unvollständig!");
  await close();
}

console.log(passed ? "OK: genau eine Bewertung gilt." : "FEHLER: Der Schutz greift nicht.");
process.exit(passed ? 0 : 1);
