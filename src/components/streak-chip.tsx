"use client";

import { LoadingRegion } from "@/components/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/i18n/client";
import type { Streak } from "@/lib/stats";
import { cn } from "@/lib/utils";

/** Maße des Schildchens; Skeleton und Inhalt teilen sie. */
const CHIP_BOX = "rounded-pill px-3 py-1.5 text-xs font-bold tabular-nums";

export function StreakChip({ streak }: { streak: Streak }) {
  const t = useDictionary().streak;
  if (streak.days < 1) return null;
  return (
    <p className={cn(CHIP_BOX, chipColors(streak))}>
      {streak.paused ? t.pausedLabel(streak.days) : t.label(streak.days)}
    </p>
  );
}

/** Pausiert grau, heute verlängert kräftig gelb, heute noch offen hellgelb. */
function chipColors({ paused, today }: Streak) {
  if (paused) return "bg-muted text-muted-foreground";
  return today ? "bg-accent text-accent-foreground" : "bg-streak-open text-streak-open-foreground";
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
