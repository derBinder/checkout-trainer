export function streakLabel(streak: number): string | null {
  if (streak < 1) return null;
  return streak === 1 ? "1 Tag Serie" : `${streak} Tage Serie`;
}
