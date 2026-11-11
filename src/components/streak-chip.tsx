import { streakLabel } from "@/lib/streak";

export function StreakChip({ streak }: { streak: number }) {
  const label = streakLabel(streak);
  if (!label) return null;
  return (
    <p className="rounded-pill bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground tabular-nums">
      {label}
    </p>
  );
}
