import { redirect } from "next/navigation";
import { cache } from "react";
import { localePath, ROUTES } from "@/i18n/paths";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireActiveUser } from "@/lib/auth/guard";
import { cardById } from "@/lib/cards";
import { db } from "@/lib/db";
import { loadQueue } from "@/lib/review/queries";
import { intervalLabelChain } from "@/lib/srs/fsrs";
import { checkFor } from "@/lib/darts/judge";
import { cardView } from "./card-view";
import type { StudyItem } from "./study-session";
import { StudySessionHost } from "./study-session-host";

/**
 * Prüft zuerst den Zugriff, dann lädt sie die heutige Warteschlange. Die Tagesgrenze
 * (new Date()) entsteht erst hier, zur Anfragezeit. Nur die Karten dieser Sitzung,
 * fertig für die Anzeige aufbereitet: Kartendaten und Scheduler bleiben auf dem Server.
 */
const loadStudy = cache(async () => {
  const user = await requireActiveUser();
  const t = (await getDictionary()).study;
  const now = new Date();
  const queue = await loadQueue(db, user, now);
  const items: StudyItem[] = queue.cardIds.flatMap((id) => {
    const card = cardById(id);
    if (!card) return [];
    return [
      {
        id,
        view: cardView(card, t),
        check: checkFor(card),
        reps: queue.reps[id] ?? 0,
        labels: intervalLabelChain(queue.states[id] ?? null, now),
      },
    ];
  });
  return { empty: queue.cardIds.length === 0, items, doneToday: queue.doneToday };
});

export async function StudySessionData() {
  const { empty, items, doneToday } = await loadStudy();
  if (empty) redirect(localePath(await getLocale(), ROUTES.today));

  // Kennung dieser Ladung: StudySessionHost erkennt daran eine Ladung aus dem
  // Zurück-Cache, mit der schon eine Sitzung lief.
  return <StudySessionHost loadId={crypto.randomUUID()} items={items} doneToday={doneToday} />;
}
