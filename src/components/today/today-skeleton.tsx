import { LoadingRegion } from "@/components/loading-region";
import { buttonShape } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Count, Counts, LEARN_BUTTON_LAYOUT, ProgressLine, TODAY_BODY } from "./today-parts";

/**
 * Normalzustand der Heute-Seite, solange TodayOverview lädt: echte Beschriftungen,
 * leerer Balken, Skeletons für die Zahlen, den Fortschrittstext und den Knopf.
 * Die unsichtbaren Mustertexte (nur Nullen, keine Nutzerdaten) geben den Skeletons
 * Höhe und Breite der Schrift im häufigsten Fall (zweistellige Zahlen).
 */
export function TodayOverviewSkeleton() {
  return (
    <LoadingRegion className={TODAY_BODY}>
      <Counts>
        <Count label="fällig">
          <Skeleton className="w-fit rounded-cell text-transparent">00</Skeleton>
        </Count>
        <Count label="neu">
          <Skeleton className="w-fit rounded-cell text-transparent">00</Skeleton>
        </Count>
      </Counts>

      <ProgressLine
        label={<Skeleton className="rounded-cell text-transparent">00 von 169 begonnen, 00 sicher</Skeleton>}
        percent={<Skeleton className="rounded-cell text-transparent">00&nbsp;%</Skeleton>}
      />

      <Skeleton className={cn(buttonShape("xl"), "text-transparent", LEARN_BUTTON_LAYOUT)}>
        Lernen
      </Skeleton>
    </LoadingRegion>
  );
}
