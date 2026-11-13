"use client";

import { LoadingRegion } from "@/components/loading-region";
import { buttonShape } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/i18n/client";
import { RANGES } from "@/lib/practice/filter";
import { cn } from "@/lib/utils";
import {
  CHIP,
  CHIP_GRID,
  PRACTICE_BODY,
  PRACTICE_SECTION,
  SEGMENT_BAR,
  SEGMENT_HEIGHT,
  SectionLabel,
  START_AREA,
  START_BUTTON_LAYOUT,
  STATUS_LINE,
} from "./practice-parts";

/**
 * Übungsseite, solange die Karten laden: echte Beschriftungen, Skeletons in den
 * Maßen der Auswahl „Wege“ (die häufigste). Die unsichtbaren Mustertexte geben nur
 * die Höhe der Schrift vor und enthalten weder Kartenzahlen noch Lerninhalte.
 */
export function PracticeSkeleton() {
  const t = useDictionary().practice;
  return (
    <LoadingRegion className={PRACTICE_BODY}>
      <Skeleton className={cn(SEGMENT_BAR, "bg-muted")}>
        <div className={SEGMENT_HEIGHT} />
      </Skeleton>
      <div className={PRACTICE_SECTION}>
        <SectionLabel>{t.range}</SectionLabel>
        <div className={CHIP_GRID}>
          {RANGES.map((range) => (
            <Skeleton key={range.id} className={CHIP} />
          ))}
        </div>
      </div>
      <div className={PRACTICE_SECTION}>
        <SectionLabel>{t.kind}</SectionLabel>
        <div className={CHIP_GRID}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className={CHIP} />
          ))}
        </div>
      </div>
      <div className={START_AREA}>
        <Skeleton className={cn(STATUS_LINE, "w-fit rounded-cell text-transparent")}>{t.noRange}</Skeleton>
        <Skeleton className={cn(buttonShape("xl"), "text-transparent", START_BUTTON_LAYOUT)}>{t.start}</Skeleton>
      </div>
    </LoadingRegion>
  );
}
