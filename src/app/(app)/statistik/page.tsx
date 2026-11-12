import type { Metadata } from "next";
import { LEVEL_CELL, LEVEL_LABEL, LEVEL_SAMPLE, WEAK_RING } from "@/components/level-style";
import { CELL_BASE, RestGrid } from "@/components/rest-grid";
import { StreakChip } from "@/components/streak-chip";
import { RestSheet } from "@/components/rest-sheet";
import type { RestDetail } from "@/components/study/card-view";
import { requireActiveUser } from "@/lib/auth/guard";
import { CARDS } from "@/lib/cards";
import { db } from "@/lib/db";
import { loadStatsData } from "@/lib/review/queries";
import { summarize, type Level } from "@/lib/stats";
import { cn } from "@/lib/utils";

// Noch vom sofortigen Seitenwechsel ausgenommen, bis die Seite umgestellt ist.
export const instant = false;

// Nur was das Sheet zeigt, ohne Fehlwurf-Karten und -Fälle: für alle Nutzer gleich.
const DETAILS: Record<number, RestDetail> = Object.fromEntries(
  CARDS.flatMap((card): [number, RestDetail][] => {
    if (card.kind === "rest") {
      const { kind, rest, best, reason, alternatives, twoDarts } = card;
      return [[rest, { kind, rest, best, reason, alternatives, twoDarts }]];
    }
    if (card.kind === "bogey") {
      const { kind, rest, setup } = card;
      return [[rest, { kind, rest, setup }]];
    }
    return [];
  }),
);

export const metadata: Metadata = { title: "Statistik · Checkout-Trainer" };

const COUNT_ORDER: Level[] = ["known", "learning", "new"];

export default async function StatsPage() {
  const user = await requireActiveUser();
  const { states, logs } = await loadStatsData(db, user.id);
  const { counts, levels, streak, hardest } = summarize({ states, logs, now: new Date() });

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="type-display text-3xl">Statistik</h1>
        <StreakChip streak={streak} />
      </div>

      {/* Die drei Zahlen sind zugleich die Legende des Rasters. */}
      <dl className="grid grid-cols-3 gap-2">
        {COUNT_ORDER.map((level) => (
          <div key={level} className="flex flex-col gap-2">
            <dt className="type-label order-2 flex items-center gap-1.5 whitespace-nowrap">
              <span aria-hidden className={cn(LEVEL_SAMPLE, LEVEL_CELL[level])} />
              {LEVEL_LABEL[level]}
            </dt>
            <dd className="type-display text-5xl tabular-nums">
              {counts[level]}
            </dd>
          </div>
        ))}
      </dl>

      <RestSheet details={DETAILS} levels={levels}>
        <RestGrid levels={levels} weak={new Set(hardest.map((h) => h.rest))} />
        {hardest.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-extrabold font-stretch-semi-expanded">Am schwierigsten</h2>
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
                    <span>{again}× „Nochmal“</span>
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
