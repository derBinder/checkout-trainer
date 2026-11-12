import { Suspense } from "react";
import { StreakChipSkeleton } from "@/components/streak-chip";
import { TodayOverview, TodayStreak } from "@/components/today/today-data";
import { TodayOverviewSkeleton } from "@/components/today/today-skeleton";

/** Gerüst ohne Datenzugriff; die Datenbausteine prüfen den Zugriff selbst. */
export default function TodayPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="type-display text-3xl">Heute</h1>
        <Suspense fallback={<StreakChipSkeleton />}>
          <TodayStreak />
        </Suspense>
      </div>

      <Suspense fallback={<TodayOverviewSkeleton />}>
        <TodayOverview />
      </Suspense>
    </div>
  );
}
