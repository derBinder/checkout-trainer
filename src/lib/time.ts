const TIME_ZONE = "Europe/Berlin";
const HOUR_MS = 60 * 60 * 1000;

// en-CA formats as YYYY-MM-DD.
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar day of the instant in Europe/Berlin, as 'YYYY-MM-DD'. */
export function dayKey(d: Date): string {
  return dayFormat.format(d);
}

/** First instant of the Berlin day containing `d`. */
export function dayStart(d: Date): Date {
  const key = dayKey(d);
  // A Berlin day is 23 to 25 hours long, so the day began within 25h before `d`.
  // Find the first millisecond whose Berlin day is `key`.
  let lo = d.getTime() - 25 * HOUR_MS; // not in the day (or an earlier day)
  let hi = d.getTime(); // in the day
  while (hi - lo > 1) {
    const mid = lo + Math.floor((hi - lo) / 2);
    if (dayKey(new Date(mid)) === key) hi = mid;
    else lo = mid;
  }
  return new Date(hi);
}

/** Last millisecond of the Berlin day containing `d`. */
export function dayEnd(d: Date): Date {
  // 36h after the start is always inside the next Berlin day (days last 23-25h).
  const nextStart = dayStart(new Date(dayStart(d).getTime() + 36 * HOUR_MS));
  return new Date(nextStart.getTime() - 1);
}
