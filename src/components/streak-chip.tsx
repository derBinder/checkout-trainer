"use client";

import { Flame, Pause } from "lucide-react";
import { LoadingRegion } from "@/components/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/i18n/client";
import type { Streak } from "@/lib/stats";
import { cn } from "@/lib/utils";

/** Maße des Schildchens; Skeleton und Inhalt teilen sie. */
const CHIP_BOX = "inline-flex items-center gap-1 rounded-pill px-3 py-1.5 text-xs font-bold tabular-nums";
const ICON_BOX = "size-3.5 shrink-0";

export function StreakChip({ streak }: { streak: Streak }) {
  const t = useDictionary().streak;
  if (streak.days < 1) return null;
  const state = chipState(streak);
  const Icon = state === "paused" ? Pause : Flame;
  // Ein Bild mit Beschriftung: Screenreader lesen den ganzen Satz in einem Stück, die Tageszahl steht nur einmal im Text.
  const spoken = `${t.spokenPrefix}${t.days(streak.days)}${streak.paused ? t.spokenPaused : ""}`;
  return (
    <p role="img" aria-label={spoken} data-state={state} className={cn(CHIP_BOX, CHIP_COLORS[state])}>
      <Icon aria-hidden className={cn(ICON_BOX, state === "extended" && "fill-current")} />
      {t.days(streak.days)}
    </p>
  );
}

/** Pausiert grau mit Pause-Icon, heute verlängert kräftig gelb mit gefüllter Flamme, heute noch offen hellgelb mit Umriss. */
const CHIP_COLORS = {
  paused: "bg-muted text-muted-foreground",
  extended: "bg-accent text-accent-foreground",
  open: "bg-streak-open text-streak-open-foreground",
} as const;

function chipState({ paused, today }: Streak): keyof typeof CHIP_COLORS {
  if (paused) return "paused";
  return today ? "extended" : "open";
}

/** Platzhalter in Größe eines typischen Schildchens (Icon und „00 Tage“, ohne Nutzerdaten). */
export function StreakChipSkeleton() {
  const t = useDictionary().streak;
  return (
    <LoadingRegion>
      <Skeleton className={cn(CHIP_BOX, "text-transparent")}>
        <span className={ICON_BOX} />
        {t.sample}
      </Skeleton>
    </LoadingRegion>
  );
}
