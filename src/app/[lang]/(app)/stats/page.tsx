import type { Metadata } from "next";
import { Suspense } from "react";
import { StatsOverview, StatsStreak } from "@/components/stats/stats-data";
import { StatsOverviewSkeleton } from "@/components/stats/stats-skeleton";
import { StreakChipSkeleton } from "@/components/streak-chip";
import { getDictionary } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getDictionary();
  return { title: `${t.nav.stats}${t.common.titleSuffix}` };
}

/** Gerüst ohne Datenzugriff; die Datenbausteine prüfen den Zugriff selbst. */
export default async function StatsPage() {
  const t = await getDictionary();
  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="type-display text-3xl">{t.nav.stats}</h1>
        <Suspense fallback={<StreakChipSkeleton />}>
          <StatsStreak />
        </Suspense>
      </div>

      <Suspense fallback={<StatsOverviewSkeleton />}>
        <StatsOverview />
      </Suspense>
    </div>
  );
}
