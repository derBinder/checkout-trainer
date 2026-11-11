import Link from "next/link";
import { StreakChip } from "@/components/streak-chip";
import { buttonVariants } from "@/components/ui/button";
import { requireActiveUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { loadQueue, loadStatsData } from "@/lib/review/queries";
import { progressView } from "@/lib/progress";
import { summarize } from "@/lib/stats";
import { cn } from "@/lib/utils";

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="type-label order-2">{label}</dt>
      <dd className="type-display text-6xl tabular-nums">{value}</dd>
    </div>
  );
}

export default async function TodayPage() {
  const user = await requireActiveUser();
  const now = new Date();
  const [{ dueCount, freshCount }, { states, logs }] = await Promise.all([
    loadQueue(db, user, now),
    loadStatsData(db, user.id),
  ]);
  const { counts, streak } = summarize({ states, logs, now });
  const nothingToDo = dueCount + freshCount === 0;
  const progress = progressView(counts);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="type-display text-3xl">Heute</h1>
        <StreakChip streak={streak} />
      </div>

      {nothingToDo ? (
        <p className="text-lg font-medium text-muted-foreground">Für heute bist du fertig.</p>
      ) : (
        <dl className="flex gap-10">
          <Count value={dueCount} label="fällig" />
          <Count value={freshCount} label="neu" />
        </dl>
      )}

      <div className="flex flex-col gap-2.5">
        <p className="flex items-baseline justify-between gap-4 text-sm">
          <span className="font-bold tabular-nums">{progress.label}</span>
          <span className="font-medium text-muted-foreground tabular-nums">{progress.percent}&nbsp;%</span>
        </p>
        {/* Der Text daneben sagt dasselbe, der Balken ist nur Bild: links sicher, daneben im Lernen. */}
        <div aria-hidden className="flex h-2.5 overflow-hidden rounded-pill bg-muted">
          <div className="h-full bg-level-known" style={{ width: `${progress.knownWidth}%` }} />
          <div className="h-full bg-level-learning" style={{ width: `${progress.learningWidth}%` }} />
        </div>
      </div>

      {nothingToDo ? null : (
        <Link
          href="/lernen"
          className={cn(buttonVariants({ size: "xl" }), "mt-4 w-full sm:w-auto sm:self-start sm:px-10")}
        >
          Lernen
        </Link>
      )}
    </div>
  );
}
