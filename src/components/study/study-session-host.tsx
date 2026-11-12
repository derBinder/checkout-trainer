"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { nextLoad, type StudyLoad } from "./study-load";
import { StudySession, type StudyItem } from "./study-session";
import { StudySkeleton } from "./study-skeleton";

/** Ladungen, mit denen in diesem Tab schon eine Sitzung lief. */
const usedLoads = new Set<string>();

/**
 * Wann eine Sitzung neu beginnt. Next.js hält die Seite beim Verlassen mit ihrem
 * Zustand vor (Activity); bfcacheId wechselt nur, wenn die Seite durch einen neuen
 * Seitenwechsel (Link, push, replace) entsteht, nicht bei Server Actions,
 * router.refresh() oder Zurück/Vor. So startet jeder Aufruf über die App frisch,
 * eine laufende Sitzung übersteht aber das Neurendern nach einer Bewertung.
 */
export function StudySessionHost({ loadId, items }: StudyLoad<StudyItem[]>) {
  const { bfcacheId } = useRouter();
  return <StudyLoadView key={bfcacheId} loadId={loadId} items={items} />;
}

function StudyLoadView({ loadId, items }: StudyLoad<StudyItem[]>) {
  const router = useRouter();
  const incoming = { loadId, items };
  const [active, setActive] = useState(() => nextLoad(null, incoming, usedLoads));
  const next = nextLoad(active, incoming, usedLoads);
  if (next !== active) setActive(next);

  useEffect(() => {
    if (active) usedLoads.add(active.loadId);
  }, [active]);

  // Zurück/Vor ohne vorgehaltenen Zustand: Die Ladung aus dem Zurück-Cache ist
  // schon verbraucht, also frische Karten vom Server holen.
  useEffect(() => {
    if (!active) router.refresh();
  }, [active, router]);

  if (!active) return <StudySkeleton />;
  return <StudySession items={active.items} />;
}
