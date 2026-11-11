import { redirect } from "next/navigation";
import { cardView } from "@/components/study/card-view";
import { StudySession, type StudyItem } from "@/components/study/study-session";
import { requireActiveUser } from "@/lib/auth/guard";
import { cardById } from "@/lib/cards";
import { db } from "@/lib/db";
import { loadQueue } from "@/lib/review/queries";
import { intervalLabelChain } from "@/lib/srs/fsrs";

export default async function StudyPage() {
  const user = await requireActiveUser();
  const now = new Date();
  const queue = await loadQueue(db, user, now);
  if (queue.cardIds.length === 0) redirect("/heute");

  // Nur die Karten dieser Sitzung, fertig für die Anzeige aufbereitet: Kartendaten
  // und Scheduler bleiben auf dem Server.
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

  return <StudySession items={items} />;
}
