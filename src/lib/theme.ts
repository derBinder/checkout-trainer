/**
 * Darstellung: System (Standard), Hell oder Dunkel, gespeichert pro Gerät.
 *
 * Bei „System“ bleibt <html> ohne data-theme, das CSS folgt dann allein der
 * Systemeinstellung (auch ohne JavaScript und bei späteren Wechseln). Eine
 * feste Wahl setzt data-theme="light" oder "dark" und überstimmt das System.
 */

export const THEME_SETTINGS = ["system", "light", "dark"] as const;
export type ThemeSetting = (typeof THEME_SETTINGS)[number];
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

/** Hintergrundfarben, zugleich die Browserleiste (theme-color). */
export const THEME_COLORS: Record<Theme, string> = {
  light: "#ffffff",
  dark: "#0b0b0c",
};

export function parseThemeSetting(value: unknown): ThemeSetting {
  return THEME_SETTINGS.includes(value as ThemeSetting) ? (value as ThemeSetting) : "system";
}

export function resolveTheme(setting: ThemeSetting, prefersDark: boolean): Theme {
  if (setting === "system") return prefersDark ? "dark" : "light";
  return setting;
}

/** Wert für data-theme auf <html>; null heißt: Attribut entfernen. */
export function themeAttribute(setting: ThemeSetting): Theme | null {
  return setting === "system" ? null : setting;
}

/**
 * Farbe der Browserleiste bei fester Wahl; null bei „System“. Dann gelten die
 * beiden theme-color-Zeilen von Next (viewport in layout.tsx), je eine pro
 * Systemeinstellung.
 */
export function themeChoiceColor(setting: ThemeSetting): string | null {
  return setting === "system" ? null : THEME_COLORS[setting];
}

/** Eigene theme-color-Zeile für eine feste Wahl. Der Browser nimmt die erste passende Zeile. */
export const THEME_CHOICE_META_ID = "theme-color-choice";

/**
 * Läuft im <head> vor dem ersten Zeichnen (siehe layout.tsx) und tut dasselbe
 * wie die Funktionen oben: data-theme setzen und bei fester Wahl eine eigene
 * theme-color-Zeile einfügen. Sie landet vor den Zeilen von Next, die erst nach
 * dem Skript geparst werden, und geht damit vor. Die Zeilen von Next bleiben
 * unberührt, sonst fügt React beim Hydrieren eine zweite ein. Der Test führt
 * das Skript aus und vergleicht es mit resolveTheme.
 */
export const themeInitScript = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(s!=="light"&&s!=="dark")return;
document.documentElement.setAttribute("data-theme",s);
var m=document.createElement("meta");
m.id=${JSON.stringify(THEME_CHOICE_META_ID)};
m.name="theme-color";
m.content=${JSON.stringify(THEME_COLORS)}[s];
document.head.appendChild(m);
}catch(e){}})()`;
