import { LoadingRegion } from "@/components/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { streakLabel } from "@/lib/streak";
import { cn } from "@/lib/utils";

/** Maße des Schildchens; Skeleton und Inhalt teilen sie. */
const CHIP_BOX = "rounded-pill px-3 py-1.5 text-xs font-bold tabular-nums";

export function StreakChip({ streak }: { streak: number }) {
  const label = streakLabel(streak);
  if (!label) return null;
  return <p className={cn(CHIP_BOX, "bg-accent text-accent-foreground")}>{label}</p>;
}

/** Platzhalter in Größe eines typischen Schildchens („6 Tage Serie"). */
export function StreakChipSkeleton() {
  return (
    <LoadingRegion>
      <Skeleton className={cn(CHIP_BOX, "text-transparent")}>6 Tage Serie</Skeleton>
    </LoadingRegion>
  );
}
