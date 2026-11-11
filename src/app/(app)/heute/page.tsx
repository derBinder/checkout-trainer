import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { requireActiveUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { loadQueue } from "@/lib/review/queries";
import { cn } from "@/lib/utils";

function Count({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="order-2 text-sm font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="font-heading text-7xl leading-none font-extrabold tabular-nums font-stretch-condensed">
        {value}
      </dd>
    </div>
  );
}

export default async function TodayPage() {
  const user = await requireActiveUser();
  const { dueCount, freshCount } = await loadQueue(db, user, new Date());
  const nothingToDo = dueCount + freshCount === 0;

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-4xl">Heute</h1>
      {nothingToDo ? (
        <p className="text-lg text-muted-foreground">Für heute bist du fertig.</p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-6">
            <Count value={dueCount} label="fällig" />
            <Count value={freshCount} label="neu" />
          </dl>
          <Link href="/lernen" className={cn(buttonVariants({ size: "xl" }), "w-full sm:w-auto sm:self-start")}>
            Lernen
          </Link>
        </>
      )}
    </div>
  );
}
