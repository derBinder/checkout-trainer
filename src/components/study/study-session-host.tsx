"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { useLocalePath } from "@/i18n/client";
import { ROUTES } from "@/i18n/paths";
import { cn } from "@/lib/utils";
import { loadsToRecord, nextLoad, REFRESH_TIMEOUT_MS, type StudyLoad } from "./study-load";
import { StudySurface } from "./study-parts";
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
  const localePath = useLocalePath();
  const incoming = { loadId, items };
  const [active, setActive] = useState(() => nextLoad(null, incoming, usedLoads));
  const next = nextLoad(active, incoming, usedLoads);
  if (next !== active) setActive(next);

  const [failed, setFailed] = useState(false);

  // Jede Ladung, die diese Sitzung gesehen hat, gilt als verbraucht.
  useEffect(() => {
    for (const id of loadsToRecord(active, { loadId, items })) usedLoads.add(id);
  }, [active, loadId, items]);

  // Zurück/Vor ohne vorgehaltenen Zustand: Die Ladung aus dem Zurück-Cache ist
  // schon verbraucht, also einmal frische Karten vom Server holen. Kommen keine,
  // erscheint nach kurzer Zeit ein Hinweis statt eines endlosen Skeletons.
  useEffect(() => {
    if (active) return;
    router.refresh();
    const timer = setTimeout(() => setFailed(true), REFRESH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [active, router]);

  if (!active && failed) {
    return (
      <StudySurface className="px-page pt-screen-top pb-inset-bottom">
        <div className="flex flex-1 flex-col gap-5">
          <p role="alert" className="text-lg font-medium text-muted-foreground">
            Die Lernsitzung konnte nicht geladen werden.
          </p>
        </div>
        <Link href={localePath(ROUTES.today)} className={cn(buttonVariants({ size: "xl" }), "w-full")}>
          Zur Übersicht
        </Link>
      </StudySurface>
    );
  }
  if (!active) return <StudySkeleton />;
  return <StudySession items={active.items} />;
}
