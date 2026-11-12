import { SLOT_BOX, SLOTS_ROW } from "@/components/dart-slots";
import { buttonShape } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { BIG_NUMERAL, EYEBROW } from "./study-card";
import {
  STUDY_CONTENT,
  STUDY_COUNTER,
  STUDY_FOOTER,
  STUDY_HEADER,
  STUDY_HEADER_ROW,
  StudyCloseLink,
  StudySurface,
} from "./study-parts";

/**
 * Lernseite, solange die Sitzung lädt: echtes Schließen-Kreuz und leere
 * Fortschrittslinie, Skeletons in den Maßen der Fragenansicht (Zähler,
 * Beschriftung, große Zahl, drei Felder, Knopf). Die unsichtbaren Mustertexte
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
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
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
        </div>
      </div>

      <footer className={STUDY_FOOTER}>
        <Skeleton className={cn(buttonShape("xl"), "w-full text-transparent")}>Weg zeigen</Skeleton>
      </footer>
    </StudySurface>
  );
}
