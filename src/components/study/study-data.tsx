import { redirect } from "next/navigation";
import { cache } from "react";
import { requireActiveUser } from "@/lib/auth/guard";
import { cardById } from "@/lib/cards";
import { db } from "@/lib/db";
import { loadQueue } from "@/lib/review/queries";
import { intervalLabelChain } from "@/lib/srs/fsrs";
import { cardView } from "./card-view";
import { StudySession, type StudyItem } from "./study-session";

/**
 * Prüft zuerst den Zugriff, dann lädt sie die heutige Warteschlange. Die Tagesgrenze
 * (new Date()) entsteht erst hier, zur Anfragezeit. Nur die Karten dieser Sitzung,
 * fertig für die Anzeige aufbereitet: Kartendaten und Scheduler bleiben auf dem Server.
 */
const loadStudy = cache(async () => {
  const user = await requireActiveUser();
  const now = new Date();
  const queue = await loadQueue(db, user, now);
  const items: StudyItem[] = queue.cardIds.flatMap((id) => {
    const card = cardById(id);
    if (!card) return [];
    return [
      {
        id,
        view: cardView(card),
        reps: queue.reps[id] ?? 0,
        labels: intervalLabelChain(queue.states[id] ?? null, now),
      },
    ];
  });
  return { empty: queue.cardIds.length === 0, items };
});

export async function StudySessionData() {
  const { empty, items } = await loadStudy();
  if (empty) redirect("/heute");

  // Neuer Schlüssel je Laden vom Server: Next.js hält eine verlassene Seite mit ihrem
  // Zustand vor (Activity). Ohne ihn liefe beim Zurückkehren die alte, womöglich schon
  // fertige Sitzung mit veralteten Karten weiter statt der frischen Warteschlange.
  return <StudySession key={crypto.randomUUID()} items={items} />;
}
