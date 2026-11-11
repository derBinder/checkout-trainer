"use client";

import { useRef, useState } from "react";
import { DartSlots } from "@/components/dart-slots";
import { restDetailView, type RestDetail } from "@/components/study/card-view";
import { NoteList } from "@/components/study/study-card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Level } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { LEVEL_CELL, LEVEL_LABEL } from "./level-style";

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
          className="mx-auto max-h-[85dvh] w-full max-w-2xl gap-0 overflow-y-auto rounded-t-xl pb-[env(safe-area-inset-bottom)]"
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
      <SheetHeader className="gap-1 px-5 pt-6 pb-4">
        <SheetTitle className="text-3xl font-bold tracking-tight font-stretch-semi-condensed">
          Rest {detail.rest}
        </SheetTitle>
        <SheetDescription className="flex items-center gap-2 text-base">
          <span aria-hidden className={cn("size-3 shrink-0 rounded-[3px]", LEVEL_CELL[level])} />
          Lernstand: {LEVEL_LABEL[level]}
        </SheetDescription>
      </SheetHeader>
      <div className="flex flex-col gap-4 px-5 pb-6">
        {detail.kind === "bogey" && (
          <p className="font-heading text-2xl font-bold font-stretch-semi-condensed">Nicht checkbar</p>
        )}
        <DartSlots slots={view.slots} tone={view.slotTone} />
        <NoteList notes={view.notes} />
      </div>
    </>
  );
}
