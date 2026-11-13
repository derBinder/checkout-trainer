"use client";

import { LoadingRegion } from "@/components/loading-region";
import { buttonShape } from "@/components/ui/button";
import { inputShape } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { switchShape } from "@/components/ui/switch";
import { useDictionary } from "@/i18n/client";
import { EXTRA_CARD_COUNTS, EXTRA_KINDS } from "@/lib/extra-cards";
import { cn } from "@/lib/utils";
import {
  EXTRA_HINT,
  EXTRA_LABEL,
  EXTRA_LIST,
  EXTRA_ROW,
  EXTRA_TEXT,
  SECTION_TITLE,
  SETTINGS_SECTION,
} from "./settings-parts";

/** Platzhalter in Feldhöhe, solange der gespeicherte Wert lädt. */
export function NewPerDayFieldSkeleton() {
  return (
    <LoadingRegion>
      <Skeleton className={cn(inputShape, "border-transparent")} />
    </LoadingRegion>
  );
}

/**
 * Abschnitt „Konto löschen" im Normalfall (kein Betreiberkonto): Überschrift und Knopf
 * als Skeleton, weil der Abschnitt beim Betreiber ganz entfällt.
 */
export function DeleteAccountSectionSkeleton() {
  const title = useDictionary().settings.deleteAccount.title;
  return (
    <LoadingRegion className={SETTINGS_SECTION}>
      <Skeleton className={cn(SECTION_TITLE, "w-fit rounded-cell text-transparent")}>{title}</Skeleton>
      <Skeleton className={cn(buttonShape("xl"), "text-transparent")}>{title}</Skeleton>
    </LoadingRegion>
  );
}

/** Zusatzkarten: Titel und Sätze stehen schon da (keine Nutzerdaten), nur die Schalter laden nach. */
export function ExtraCardsSkeleton() {
  const t = useDictionary().settings.extraCards;
  return (
    <LoadingRegion className={EXTRA_LIST}>
      {EXTRA_KINDS.map((kind) => (
        <div key={kind} className={EXTRA_ROW}>
          <div className={EXTRA_TEXT}>
            <span className={EXTRA_LABEL}>{t.kinds[kind].label}</span>
            <span className={EXTRA_HINT}>{t.kinds[kind].hint(EXTRA_CARD_COUNTS[kind])}</span>
          </div>
          <Skeleton className={cn(switchShape, "shrink-0")} />
        </div>
      ))}
    </LoadingRegion>
  );
}
