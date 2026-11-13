/**
 * Sprachen der Oberfläche: Deutsch und Englisch, die Sprache steht als erstes
 * URL-Segment. Vorgabe ist Englisch; nur Browser, die Deutsch vor Englisch
 * nennen, bekommen Deutsch. Reine Logik, in Client und Server nutzbar.
 */

export const LOCALES = ["de", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie, das nur der Sprachumschalter setzt. */
export const LOCALE_COOKIE = "lang";
/** Header, mit dem proxy.ts die gewählte Sprache an die Seiten reicht. */
export const LOCALE_HEADER = "x-locale";

/** Sprachtag für Intl (Datum, Zahlen). */
export const INTL_LOCALE: Record<Locale, string> = { de: "de-DE", en: "en-GB" };

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

/** Sprachen aus Accept-Language, nach Gewicht absteigend (bei Gleichstand in Originalreihenfolge). */
function languagesByWeight(header: string): string[] {
  return header
    .split(",")
    .map((entry, index) => {
      const [tag, ...params] = entry.split(";");
      const language = tag.trim().split("-")[0].toLowerCase();
      let q = 1;
      for (const param of params) {
        const [key, value] = param.split("=");
        if (key?.trim().toLowerCase() === "q") {
          const parsed = Number(value?.trim());
          q = Number.isFinite(parsed) ? parsed : 0;
        }
      }
      return { language, q, index };
    })
    .filter((item) => item.language !== "")
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((item) => item.language);
}

export function pickLocale(input: {
  cookie?: string | null;
  acceptLanguage?: string | null;
}): Locale {
  if (isLocale(input.cookie)) return input.cookie;
  const match = languagesByWeight(input.acceptLanguage ?? "").find(isLocale);
  return match ?? DEFAULT_LOCALE;
}
