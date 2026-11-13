"use client";

import { LoadingRegion } from "@/components/loading-region";
import { NeutralRestGrid } from "@/components/rest-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/i18n/client";
import { LevelCounts, STATS_BODY, STATS_COUNTS } from "./stats-parts";

/**
 * Statistik, solange StatsOverview lädt: echte Legende, Skeletons für die Zähler
 * und die Prognosezeile, das Raster in neutraler Darstellung. Die Liste der schwierigsten Reste steht
 * am Seitenende und bekommt keinen Platzhalter.
 */
export function StatsOverviewSkeleton() {
  const t = useDictionary().stats;
  return (
    <LoadingRegion className={STATS_BODY}>
      <div className={STATS_COUNTS}>
        <LevelCounts value={() => <Skeleton className="w-fit rounded-cell text-transparent">00</Skeleton>} t={t} />
        <Skeleton className="h-5 w-64 max-w-full rounded-cell" />
      </div>
      <NeutralRestGrid t={t} />
    </LoadingRegion>
  );
}
