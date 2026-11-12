import Link from "next/link";
import { cache } from "react";
import { StreakChip } from "@/components/streak-chip";
import { MoreCardsButton } from "@/components/today/more-cards-button";
import { buttonVariants } from "@/components/ui/button";
import { localePath, ROUTES } from "@/i18n/paths";
import { getLocale } from "@/i18n/server";
import { requireActiveUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { progressView } from "@/lib/progress";
import { loadQueue, loadStatsData } from "@/lib/review/queries";
import { summarize } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Count, Counts, LEARN_BUTTON_LAYOUT, ProgressLine, TODAY_BODY } from "./today-parts";

/**
 * Prüft zuerst den Zugriff, dann lädt sie die Daten der Heute-Seite. cache():
 * Beide Datenbausteine der Seite teilen sich innerhalb einer Anfrage eine Abfrage.
 * Die Tagesgrenze (new Date()) entsteht erst hier, zur Anfragezeit.
 */
const loadToday = cache(async () => {
  const user = await requireActiveUser();
  const now = new Date();
  const [{ dueCount, freshCount, unseenCount }, { states, logs }] = await Promise.all([
    loadQueue(db, user, now),
    loadStatsData(db, user.id),
  ]);
  const { counts, streak } = summarize({ states, logs, now });
  return { dueCount, freshCount, unseenCount, streak, progress: progressView(counts) };
});

export async function TodayStreak() {
  const { streak } = await loadToday();
  return <StreakChip streak={streak} />;
}

export async function TodayOverview() {
  const { dueCount, freshCount, unseenCount, progress } = await loadToday();
  const locale = await getLocale();
  const nothingToDo = dueCount + freshCount === 0;

  return (
    <div className={TODAY_BODY}>
      {nothingToDo ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-lg font-medium text-muted-foreground">Für heute bist du fertig.</p>
            {unseenCount === 0 ? (
              <p className="text-sm text-muted-foreground">Du hast alle Karten begonnen.</p>
            ) : null}
          </div>
          {unseenCount > 0 ? <MoreCardsButton /> : null}
        </div>
      ) : (
        <Counts>
          <Count label="fällig">{dueCount}</Count>
          <Count label="neu">{freshCount}</Count>
        </Counts>
      )}

      <ProgressLine label={progress.label} percent={<>{progress.percent}&nbsp;%</>}>
        <div className="h-full bg-level-known" style={{ width: `${progress.knownWidth}%` }} />
        <div className="h-full bg-level-learning" style={{ width: `${progress.learningWidth}%` }} />
      </ProgressLine>

      {nothingToDo ? null : (
        <Link href={localePath(locale, ROUTES.study)} className={cn(buttonVariants({ size: "xl" }), LEARN_BUTTON_LAYOUT)}>
          Lernen
        </Link>
      )}
    </div>
  );
}
