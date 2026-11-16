"use client";

import { useRef, useState } from "react";
import { DartSlots } from "@/components/dart-slots";
import { useDictionary } from "@/i18n/client";
import { restDetailView, type RestDetail } from "@/components/study/card-view";
import { NoteList } from "@/components/study/study-card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Level } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { LEVEL_CELL, LEVEL_SAMPLE } from "./level-style";

/** Fertig formatiert; `due` ist `null`, wenn die Karte heute oder schon früher fällig ist. */
type RestSheetDates = { learned: string; known?: string; due: string | null };

type RestSheetProps = {
  details: Record<number, RestDetail>;
  levels: Record<number, Level>;
  /** Fertig formatierte Tage je Rest mit Lernstand; ein Rest ohne Eintrag (neu) zeigt keine Zeile. */
  dates: Record<number, RestSheetDates>;
  /** Server-gerendertes Raster und Liste; jedes Element mit data-rest öffnet das Sheet. */
  children: React.ReactNode;
};

/** Öffnet zu einem angetippten Rest ein Sheet mit Weg, Begründung und Alternativen. */
export function RestSheet({ details, levels, dates, children }: RestSheetProps) {
  const [rest, setRest] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-rest]");
    if (!target) return;
    opener.current = target;
    setRest(Number(target.dataset.rest));
    setOpen(true);
  }

  // rest bleibt nach dem Schließen gesetzt, damit der Inhalt beim Ausblenden stehen bleibt.
  const detail = rest === null ? undefined : details[rest];
  const t = useDictionary();

  return (
    <div onClick={handleClick} className="flex flex-col gap-10">
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          finalFocus={opener}
          closeLabel={t.common.close}
          className="mx-auto max-h-5/6 w-full max-w-2xl gap-0 overflow-y-auto rounded-t-panel border-t-0 pb-home-indicator"
        >
          {detail && <RestDetailBody detail={detail} level={levels[detail.rest]} dates={dates[detail.rest]} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function RestDetailBody({
  detail,
  level,
  dates,
}: {
  detail: RestDetail;
  level: Level;
  dates: RestSheetDates | undefined;
}) {
  const t = useDictionary();
  const view = restDetailView(detail, t.study);
  return (
    <>
      <SheetHeader className="gap-2 px-page pt-6 pb-5">
        <SheetTitle className="type-display text-3xl font-black">
          {t.study.card.scoreOf(detail.rest)}
        </SheetTitle>
        <SheetDescription className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className={cn(LEVEL_SAMPLE, LEVEL_CELL[level])} />
          {t.stats.levelOf(t.stats.levels[level])}
        </SheetDescription>
        {dates && (
          <p className="text-sm text-muted-foreground">
            {[
              t.stats.learnedOn(dates.learned),
              dates.known && t.stats.knownSince(dates.known),
              dates.due ? t.stats.dueOn(dates.due) : t.stats.dueToday,
            ]
              .filter(Boolean)
              .map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
          </p>
        )}
      </SheetHeader>
      <div className="flex flex-col gap-4 px-page pb-6">
        {detail.kind === "bogey" && (
          <p className="type-display text-2xl">{t.study.card.notCheckable}</p>
        )}
        <DartSlots slots={view.slots} tone={view.slotTone} />
        <NoteList notes={view.notes} />
      </div>
    </>
  );
}
