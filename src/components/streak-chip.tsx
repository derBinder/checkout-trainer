"use client";

import { LoadingRegion } from "@/components/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Maße des Schildchens; Skeleton und Inhalt teilen sie. */
const CHIP_BOX = "rounded-pill px-3 py-1.5 text-xs font-bold tabular-nums";

export function StreakChip({ streak }: { streak: number }) {
  const t = useDictionary().streak;
  if (streak < 1) return null;
  return <p className={cn(CHIP_BOX, "bg-accent text-accent-foreground")}>{t.label(streak)}</p>;
}

/** Platzhalter in Größe eines typischen Schildchens („00 Tage Serie“, ohne Nutzerdaten). */
export function StreakChipSkeleton() {
  const t = useDictionary().streak;
  return (
    <LoadingRegion>
      <Skeleton className={cn(CHIP_BOX, "text-transparent")}>{t.sample}</Skeleton>
    </LoadingRegion>
  );
}
