import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireActiveUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { loadQueue, loadStatsData } from "@/lib/review/queries";
import { MAX_REST, MIN_REST, summarize } from "@/lib/stats";
import { cn } from "@/lib/utils";

const REST_COUNT = MAX_REST - MIN_REST + 1;

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="type-label order-2">{label}</dt>
      <dd className="type-display text-[4rem] tabular-nums">{value}</dd>
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
  const known = counts.known;
  const percent = Math.round((known / REST_COUNT) * 100);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="type-display text-[2rem]">Heute</h1>
        {streak >= 1 && (
          <p className="rounded-pill bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground tabular-nums">
            {streak === 1 ? "1 Tag" : `${streak} Tage`} Serie
          </p>
        )}
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
          <span className="font-bold tabular-nums">
            {known} von {REST_COUNT} sicher
          </span>
          <span className="font-medium text-muted-foreground tabular-nums">{percent}&nbsp;%</span>
        </p>
        {/* Der Text daneben sagt dasselbe, der Balken ist nur Bild. */}
        <div aria-hidden className="h-2.5 overflow-hidden rounded-pill bg-muted">
          <div className="h-full rounded-pill bg-primary" style={{ width: `${percent}%` }} />
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
