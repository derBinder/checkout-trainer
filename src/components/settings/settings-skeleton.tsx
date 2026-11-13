"use client";

import { LoadingRegion } from "@/components/loading-region";
import { buttonShape } from "@/components/ui/button";
import { inputShape } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { SECTION_TITLE, SETTINGS_SECTION } from "./settings-parts";

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
