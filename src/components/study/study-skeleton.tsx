import { SLOT_BOX, SLOTS_ROW } from "@/components/dart-slots";
import { buttonShape } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PAD_GRID, PAD_KEY, PAD_KEY_SPANS, RING_BAR, RING_SEGMENT } from "./route-pad";
import { BIG_NUMERAL, EYEBROW } from "./study-card";
import {
  STUDY_CONTENT,
  STUDY_COUNTER,
  STUDY_FOOTER,
  STUDY_HEADER,
  STUDY_HEADER_ROW,
  StudySurface,
} from "./study-parts";
import { StudyCloseLink } from "./study-close-link";

/**
 * Lernseite, solange die Sitzung lädt: echtes Schließen-Kreuz und leere
 * Fortschrittslinie, Skeletons in den Maßen der Fragenansicht (Zähler,
 * Beschriftung, Zahl, drei Felder, Tastenfeld, Knöpfe). Die unsichtbaren Mustertexte
 * enthalten keine Lerninhalte; sie geben den Skeletons die Höhe der Schrift.
 */
export function StudySkeleton() {
  return (
    <StudySurface busy>
      <header className={STUDY_HEADER}>
        <div className={STUDY_HEADER_ROW}>
          <StudyCloseLink />
          <Skeleton className={cn(STUDY_COUNTER, "rounded-cell text-transparent")}>00 / 00</Skeleton>
        </div>
        {/* Nur Bild: Wie weit die Sitzung ist, steht erst mit den Daten fest. */}
        <Progress value={0} aria-hidden />
      </header>

      <div className={STUDY_CONTENT}>
        <div className="my-auto">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <div className={EYEBROW}>
                  <Skeleton className="mx-auto w-fit rounded-cell text-transparent">Rest</Skeleton>
                </div>
                <div className={BIG_NUMERAL}>
                  <Skeleton className="mx-auto w-fit rounded-card text-transparent">000</Skeleton>
                </div>
              </div>
              <div className={SLOTS_ROW}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className={SLOT_BOX} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className={cn(RING_BAR, "bg-transparent p-0")}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className={RING_SEGMENT} />
                ))}
              </div>
              <div className={PAD_GRID}>
                {PAD_KEY_SPANS.map((span, i) => (
                  <Skeleton key={i} className={cn(PAD_KEY, span === 2 && "col-span-2")} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className={STUDY_FOOTER}>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className={cn(buttonShape("xl"), "w-full text-transparent")}>Nicht checkbar</Skeleton>
          <Skeleton className={cn(buttonShape("xl"), "w-full text-transparent")}>Prüfen</Skeleton>
        </div>
        <Skeleton className={cn(buttonShape("xs"), "self-center text-transparent")}>Ohne Eingabe aufdecken</Skeleton>
      </footer>
    </StudySurface>
  );
}
