"use client";

import { LoadingRegion } from "@/components/loading-region";
import { buttonShape } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { Count, Counts, LEARN_ACTIONS, LEARN_BUTTON_LAYOUT, ProgressLine, TODAY_BODY } from "./today-parts";

/**
 * Normalzustand der Heute-Seite, solange TodayOverview lädt: echte Beschriftungen,
 * leerer Balken, Skeletons für die Zahlen, den Fortschrittstext und die Knöpfe.
 * Die unsichtbaren Mustertexte (nur Nullen, keine Nutzerdaten) geben den Skeletons
 * Höhe und Breite der Schrift im häufigsten Fall (zweistellige Zahlen).
 */
export function TodayOverviewSkeleton() {
  const t = useDictionary();
  return (
    <LoadingRegion className={TODAY_BODY}>
      <Counts>
        <Count label={t.today.due}>
          <Skeleton className="w-fit rounded-cell text-transparent">00</Skeleton>
        </Count>
        <Count label={t.today.new}>
          <Skeleton className="w-fit rounded-cell text-transparent">00</Skeleton>
        </Count>
      </Counts>

      <ProgressLine
        label={<Skeleton className="rounded-cell text-transparent">{t.today.progressSample}</Skeleton>}
        percent={<Skeleton className="rounded-cell text-transparent">{t.common.percent("00")}</Skeleton>}
      />

      <div className={LEARN_ACTIONS}>
        <Skeleton className={cn(buttonShape("xl"), "text-transparent", LEARN_BUTTON_LAYOUT)}>
          {t.today.learn}
        </Skeleton>
        <Skeleton className={cn(buttonShape("xl"), "text-transparent", LEARN_BUTTON_LAYOUT)}>
          {t.today.practice}
        </Skeleton>
      </div>
    </LoadingRegion>
  );
}
