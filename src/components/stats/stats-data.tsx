import { cache } from "react";
import { LEVEL_CELL, WEAK_RING } from "@/components/level-style";
import { CELL_BASE, RestGrid } from "@/components/rest-grid";
import { RestSheet } from "@/components/rest-sheet";
import { StreakChip } from "@/components/streak-chip";
import { getDictionary, getLocale } from "@/i18n/server";
import { requireActiveUser } from "@/lib/auth/guard";
import { CARDS } from "@/lib/cards";
import { db } from "@/lib/db";
import { forecast, formatDay, type Forecast } from "@/lib/forecast";
import { loadQueue, loadStatsData } from "@/lib/review/queries";
import { summarize } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { restDetails } from "./rest-details";
import { FORECAST_LINE, LevelCounts, STATS_BODY, STATS_COUNTS } from "./stats-parts";

/**
 * Prüft zuerst den Zugriff, dann lädt sie die Lernstände und die Warteschlange
 * (für die Prognose). cache(): Beide Datenbausteine der Seite teilen sich
 * innerhalb einer Anfrage eine Abfrage. Die Tagesgrenze entsteht erst hier.
 */
const loadStats = cache(async () => {
  const user = await requireActiveUser();
  const now = new Date();
  const [{ states, logs }, { unseenCount, newLeftToday }] = await Promise.all([
    loadStatsData(db, user.id),
    loadQueue(db, user, now),
  ]);
  return {
    ...summarize({ states, logs, now }),
    forecast: forecast({ unseen: unseenCount, newLeftToday, newPerDay: user.newPerDay, now }),
    now,
  };
});

async function forecastText({ forecast: f, now }: { forecast: Forecast; now: Date }): Promise<string> {
  const [locale, t] = await Promise.all([getLocale(), getDictionary()]);
  switch (f.kind) {
    case "done":
      return t.stats.forecast.done;
    case "none":
      return t.stats.forecast.none;
    case "date":
      return t.stats.forecast.until(formatDay(f.day, locale, now));
  }
}

export async function StatsStreak() {
  const { streak } = await loadStats();
  return <StreakChip streak={streak} />;
}

export async function StatsOverview() {
  const stats = await loadStats();
  const { counts, levels, hardest } = stats;
  const [t, forecastLine] = await Promise.all([getDictionary(), forecastText(stats)]);
  // Lerninhalt: entsteht erst nach der Zugriffsprüfung und geht nur an diesen Client-Baustein.
  const details = restDetails(CARDS);

  return (
    <div className={STATS_BODY}>
      <div className={STATS_COUNTS}>
        <LevelCounts value={(level) => counts[level]} t={t.stats} />
        <p className={FORECAST_LINE}>{forecastLine}</p>
      </div>

      <RestSheet details={details} levels={levels}>
        <RestGrid levels={levels} weak={new Set(hardest.map((h) => h.rest))} t={t.stats} />
        {hardest.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold font-stretch-semi-expanded">{t.stats.hardest}</h2>
            <ol className="flex flex-col gap-1">
              {hardest.map(({ rest, again }) => (
                <li key={rest}>
                  <button
                    type="button"
                    data-rest={rest}
                    className="flex w-full items-center gap-4 rounded-card p-1.5 text-left font-medium outline-offset-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <span className={cn(CELL_BASE, "h-11 w-14 text-lg", LEVEL_CELL[levels[rest]], WEAK_RING)}>
                      {rest}
                    </span>
                    <span>{t.stats.againCount(again)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </RestSheet>
    </div>
  );
}
