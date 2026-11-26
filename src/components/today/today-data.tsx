import Link from "next/link";
import { cache } from "react";
import { StreakChip } from "@/components/streak-chip";
import { MoreCardsButton } from "@/components/today/more-cards-button";
import { buttonVariants } from "@/components/ui/button";
import { localePath, ROUTES } from "@/i18n/paths";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireActiveUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { progressView } from "@/lib/progress";
import { loadQueue, loadStreakDays } from "@/lib/review/queries";
import { streakOf, summarize } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Count, Counts, LEARN_ACTIONS, LEARN_BUTTON_LAYOUT, ProgressLine, TODAY_BODY } from "./today-parts";

/**
 * Prüft zuerst den Zugriff, dann lädt sie die Daten der Heute-Seite. cache():
 * Beide Datenbausteine der Seite teilen sich innerhalb einer Anfrage eine Abfrage.
 * Die Tagesgrenze (new Date()) entsteht erst hier, zur Anfragezeit. Für die Serie
 * reichen die Lern- und Übungstage; den ganzen Verlauf lädt nur die Statistik.
 */
const loadToday = cache(async () => {
  const user = await requireActiveUser();
  const now = new Date();
  const [{ dueCount, freshCount, unseenCount, states }, days] = await Promise.all([
    loadQueue(db, user, now),
    loadStreakDays(db, user.id),
  ]);
  const { counts } = summarize({ states: Object.values(states), logs: [], now });
  return { dueCount, freshCount, unseenCount, streak: streakOf(new Set(days), now), progress: progressView(counts) };
});

export async function TodayStreak() {
  const { streak } = await loadToday();
  return <StreakChip streak={streak} />;
}

export async function TodayOverview() {
  const { dueCount, freshCount, unseenCount, streak, progress } = await loadToday();
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  const nothingToDo = dueCount + freshCount === 0;

  return (
    <div className={TODAY_BODY}>
      {streak.paused && !(nothingToDo && unseenCount === 0) ? <p className="text-sm text-muted-foreground">{t.today.streakPaused}</p> : null}
      {nothingToDo ? (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <p className="text-lg font-medium text-muted-foreground">{t.today.done}</p>
            {unseenCount === 0 ? (
              <p className="text-sm text-muted-foreground">{t.today.allStarted}</p>
            ) : null}
          </div>
          {unseenCount > 0 ? <MoreCardsButton /> : null}
        </div>
      ) : (
        <Counts>
          <Count label={t.today.due}>{dueCount}</Count>
          <Count label={t.today.new}>{freshCount}</Count>
        </Counts>
      )}

      <ProgressLine label={t.today.progress(progress.started, progress.total, progress.known)}
        percent={t.common.percent(progress.percent)}>
        <div className="h-full bg-level-known" style={{ width: `${progress.knownWidth}%` }} />
        <div className="h-full bg-level-learning" style={{ width: `${progress.learningWidth}%` }} />
      </ProgressLine>

      {/* „Üben“ ist immer da, aber nie die Hauptaktion: Ohne „Lernen“ steht es ruhig an dessen Stelle. */}
      <div className={LEARN_ACTIONS}>
        {nothingToDo ? null : (
          <Link href={localePath(locale, ROUTES.study)} className={cn(buttonVariants({ size: "xl" }), LEARN_BUTTON_LAYOUT)}>
            {t.today.learn}
          </Link>
        )}
        <Link
          href={localePath(locale, ROUTES.practice)}
          className={cn(buttonVariants({ variant: "secondary", size: "xl" }), LEARN_BUTTON_LAYOUT)}
        >
          {t.today.practice}
        </Link>
      </div>
    </div>
  );
}
