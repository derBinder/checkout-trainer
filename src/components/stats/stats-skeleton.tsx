import { LoadingRegion } from "@/components/loading-region";
import { NeutralRestGrid } from "@/components/rest-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { LevelCounts, STATS_BODY } from "./stats-parts";

/**
 * Statistik, solange StatsOverview lädt: echte Legende, Skeletons für die Zähler
 * und das Raster in neutraler Darstellung. Die Liste der schwierigsten Reste steht
 * am Seitenende und bekommt keinen Platzhalter.
 */
export function StatsOverviewSkeleton() {
  return (
    <LoadingRegion className={STATS_BODY}>
      <LevelCounts value={() => <Skeleton className="w-fit text-transparent">00</Skeleton>} />
      <NeutralRestGrid />
    </LoadingRegion>
  );
}
