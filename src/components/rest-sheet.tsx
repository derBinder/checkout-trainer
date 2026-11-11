"use client";

import { useRef, useState } from "react";
import { DartSlots } from "@/components/dart-slots";
import { restDetailView, type RestDetail } from "@/components/study/card-view";
import { NoteList } from "@/components/study/study-card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Level } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { LEVEL_CELL, LEVEL_LABEL, LEVEL_SWATCH } from "./level-style";

type RestSheetProps = {
  details: Record<number, RestDetail>;
  levels: Record<number, Level>;
  /** Server-gerendertes Raster und Liste; jedes Element mit data-rest öffnet das Sheet. */
  children: React.ReactNode;
};

/** Öffnet zu einem angetippten Rest ein Sheet mit Weg, Begründung und Alternativen. */
export function RestSheet({ details, levels, children }: RestSheetProps) {
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

  return (
    <div onClick={handleClick} className="flex flex-col gap-10">
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          finalFocus={opener}
          className="mx-auto max-h-5/6 w-full max-w-2xl gap-0 overflow-y-auto rounded-t-panel border-t-0 pb-home-indicator"
        >
          {detail && <RestDetailBody detail={detail} level={levels[detail.rest]} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function RestDetailBody({ detail, level }: { detail: RestDetail; level: Level }) {
  const view = restDetailView(detail);
  return (
    <>
      <SheetHeader className="gap-2 px-5 pt-6 pb-5">
        <SheetTitle className="type-display text-3xl font-black">
          Rest {detail.rest}
        </SheetTitle>
        <SheetDescription className="flex items-center gap-2 text-sm font-medium">
          <span aria-hidden className={cn(LEVEL_SWATCH, LEVEL_CELL[level])} />
          Lernstand: {LEVEL_LABEL[level]}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-5 pb-6">
        {detail.kind === "bogey" && (
          <p className="type-display text-2xl">Nicht checkbar</p>
        )}
        <DartSlots slots={view.slots} tone={view.slotTone} />
        <NoteList notes={view.notes} />
      </div>
    </>
  );
}
