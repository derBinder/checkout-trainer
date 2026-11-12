import type { Metadata } from "next";
import { Suspense } from "react";
import { StatsOverview, StatsStreak } from "@/components/stats/stats-data";
import { StatsOverviewSkeleton } from "@/components/stats/stats-skeleton";
import { StreakChipSkeleton } from "@/components/streak-chip";

export const metadata: Metadata = { title: "Statistik · Checkout-Trainer" };

/** Gerüst ohne Datenzugriff; die Datenbausteine prüfen den Zugriff selbst. */
export default function StatsPage() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="type-display text-3xl">Statistik</h1>
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
