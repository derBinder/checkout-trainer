"use client";

import { LoadingRegion } from "@/components/loading-region";
import { buttonShape } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDictionary } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { USER_ACTIONS_ROW, USER_LIST, USER_ROW, UserRowDetails } from "./admin-parts";

const ROWS = 3;

/**
 * Nutzerliste, solange sie lädt: drei Zeilen in der Höhe einer Nutzerzeile im
 * Normalfall (aktives Konto mit „Sperren" und „Passwort setzen"). Die Zeile selbst
 * ist das Skeleton, weil sie schon die Flächenfarbe trägt; ihr Inhalt ist
 * unsichtbarer Mustertext und gibt nur die Höhe vor.
 */
export function UserListSkeleton() {
  const t = useDictionary().admin;
  return (
    <LoadingRegion className={USER_LIST}>
      {Array.from({ length: ROWS }, (_, i) => (
        <Skeleton key={i} className={cn(USER_ROW, "*:invisible")}>
          <UserRowDetails name="Name" email="name" meta={t.metaSample} />
          <div className={USER_ACTIONS_ROW}>
            <div className={buttonShape("lg")}>{t.block}</div>
            <div className={buttonShape("lg")}>{t.setPassword}</div>
          </div>
        </Skeleton>
      ))}
    </LoadingRegion>
  );
}
