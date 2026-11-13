"use client";

import { useId } from "react";
import { useDictionary, useLocale } from "@/i18n/client";
import { LOCALE_COOKIE, LOCALES, type Locale } from "@/i18n/locales";
import { switchLocalePath } from "@/i18n/paths";
import { cn } from "@/lib/utils";

const ONE_YEAR = 60 * 60 * 24 * 365;

/** Merkt die Wahl für den nächsten Besuch ohne Sprache im Pfad. */
function rememberLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

/**
 * Sprachwahl aus echten Radio-Knöpfen. Die Auswahl folgt der Sprache aus der
 * Adresse, nie dem Cookie; das Cookie setzt nur dieser Schalter.
 */
export function LanguageSwitch({
  variant,
  labelledBy,
}: {
  variant: "settings" | "compact";
  labelledBy?: string;
}) {
  const t = useDictionary().language;
  const locale = useLocale();
  const groupName = useId();
  const compact = variant === "compact";

  function change(to: Locale) {
    rememberLocale(to);
    // Voller Seitenaufruf: Das Root-Layout (Sprache, Theme-Skript) baut das Dokument neu.
    const { pathname, search, hash } = window.location;
    window.location.assign(switchLocalePath(pathname, to) + search + hash);
  }

  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : t.label}
      className={cn(
        compact
          ? "inline-grid grid-cols-2 rounded-pill bg-muted p-1"
          : "grid grid-cols-2 rounded-panel bg-muted p-1",
      )}
    >
      {LOCALES.map((value) => (
        <label
          key={value}
          className={cn(
            "group flex cursor-pointer items-center justify-center font-semibold select-none",
            // Kompakt: Die Beschriftung ist die 44 px hohe Tippfläche, der sichtbare Knopf
            // (32 px) sitzt darin; der negative Rand hält die Höhe der Gruppe.
            compact ? "-my-1.5 h-11 px-0.5" : "h-12 rounded-field",
          )}
        >
          <input
            type="radio"
            name={groupName}
            value={value}
            checked={locale === value}
            onChange={() => change(value)}
            className="peer sr-only"
          />
          <span
            className={cn(
              "flex w-full items-center justify-center transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-ring",
              compact
                ? "h-8 rounded-pill px-2.5 text-xs text-muted-foreground peer-checked:bg-accent peer-checked:font-bold peer-checked:text-accent-foreground"
                : "h-full rounded-field text-sm text-muted-foreground group-hover:text-foreground peer-checked:bg-accent peer-checked:font-bold peer-checked:text-accent-foreground",
            )}
          >
            {/* Die Sprachnamen tragen ihre eigene Sprache, damit Screenreader sie richtig sprechen. */}
            {compact ? (
              <>
                <span lang={value} aria-hidden="true">
                  {t.short[value]}
                </span>
                <span lang={value} className="sr-only">
                  {t.names[value]}
                </span>
              </>
            ) : (
              <span lang={value}>{t.names[value]}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}
