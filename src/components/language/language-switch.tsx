"use client";

import { usePathname, useRouter } from "next/navigation";
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
  const pathname = usePathname();
  const router = useRouter();
  const compact = variant === "compact";

  function change(to: Locale) {
    rememberLocale(to);
    router.push(switchLocalePath(pathname, to));
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
            "flex cursor-pointer items-center justify-center font-semibold transition-colors select-none has-focus-visible:outline-2 has-focus-visible:outline-ring",
            compact
              ? "h-8 rounded-pill px-3 text-xs text-muted-foreground has-checked:bg-accent has-checked:font-bold has-checked:text-accent-foreground"
              : "h-12 rounded-field text-sm text-muted-foreground hover:text-foreground has-checked:bg-accent has-checked:font-bold has-checked:text-accent-foreground",
          )}
        >
          <input
            type="radio"
            name={compact ? "language-compact" : "language"}
            value={value}
            checked={locale === value}
            onChange={() => change(value)}
            aria-label={compact ? t.names[value] : undefined}
            className="sr-only"
          />
          {compact ? t.short[value] : t.names[value]}
        </label>
      ))}
    </div>
  );
}
