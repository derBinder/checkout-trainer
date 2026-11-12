import { LoadingRegion } from "@/components/loading-region";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Count, Counts, LEARN_BUTTON_LAYOUT, ProgressLine, TODAY_BODY } from "./today-parts";

/**
 * Normalzustand der Heute-Seite, solange TodayOverview lädt: echte Beschriftungen,
 * leerer Balken, Skeletons für die Zahlen, den Fortschrittstext und den Knopf.
 * Die unsichtbaren Mustertexte geben den Skeletons die Höhe der Schrift.
 */
export function TodayOverviewSkeleton() {
  return (
    <LoadingRegion className={TODAY_BODY}>
      <Counts>
        <Count label="fällig">
          <Skeleton className="w-fit text-transparent">10</Skeleton>
        </Count>
        <Count label="neu">
          <Skeleton className="w-fit text-transparent">10</Skeleton>
        </Count>
      </Counts>

      <ProgressLine
        label={<Skeleton className="text-transparent">48 von 169 begonnen, 12 sicher</Skeleton>}
        percent={<Skeleton className="text-transparent">28&nbsp;%</Skeleton>}
      />

      <Skeleton
        className={cn("h-13 rounded-pill px-6 text-base font-semibold text-transparent", LEARN_BUTTON_LAYOUT)}
      >
        Lernen
      </Skeleton>
    </LoadingRegion>
  );
}
