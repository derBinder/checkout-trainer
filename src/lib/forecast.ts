import { INTL_LOCALE, type Locale } from "@/i18n/locales";
import { dayKey, dayStart } from "./time";

/**
 * Wann alle Karten freigeschaltet sind: schon geschehen, an einem Berliner Tag
 * (`YYYY-MM-DD`) oder nie, weil keine neuen Karten eingestellt sind.
 */
export type Forecast = { kind: "done" } | { kind: "date"; day: string } | { kind: "none" };

export type ForecastInput = {
  /** Karten, die noch nie gezeigt wurden. */
  unseen: number;
  /** Heute noch offene neue Karten: Tagesgrenze samt heutiger Extrakarten minus heute schon eingeführte. */
  newLeftToday: number;
  /** Einstellung „Neue Karten pro Tag“; gilt ab morgen, ohne Extrakarten. */
  newPerDay: number;
  now: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const NOON_MS = 12 * 60 * 60 * 1000;

/** Der Berliner Tag `days` Tage nach dem von `now`. Mittags gemessen, damit 23- und 25-Stunden-Tage nicht verrutschen. */
function dayAfter(now: Date, days: number): string {
  return dayKey(new Date(dayStart(now).getTime() + days * DAY_MS + NOON_MS));
}

export function forecast({ unseen, newLeftToday, newPerDay, now }: ForecastInput): Forecast {
  if (unseen <= 0) return { kind: "done" };
  const afterToday = unseen - Math.max(0, newLeftToday);
  if (afterToday <= 0) return { kind: "date", day: dayKey(now) };
  if (newPerDay <= 0) return { kind: "none" };
  return { kind: "date", day: dayAfter(now, Math.ceil(afterToday / newPerDay)) };
}

/** Ein Berliner Tag als „14. Januar“ bzw. „14 January“, mit Jahr nur außerhalb des laufenden Jahres. */
export function formatDay(day: string, locale: Locale, now: Date): string {
  const withYear = day.slice(0, 4) !== dayKey(now).slice(0, 4);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(`${day}T12:00:00Z`));
}
