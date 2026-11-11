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
 * Läuft im <head> vor dem ersten Zeichnen (siehe layout.tsx) und tut dasselbe
 * wie die Funktionen oben: data-theme setzen und jede theme-color-Zeile auf die
 * Farbe stellen, die bei ihrer Systemeinstellung gilt. Next schreibt diese
 * Zeilen erst nach dem Skript in den <head>, daher ein zweiter Durchgang bei
 * DOMContentLoaded. Der Test führt das Skript aus und vergleicht es mit resolveTheme.
 */
export const themeInitScript = `(function(){try{
var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
if(s!=="light"&&s!=="dark")s="system";
var r=document.documentElement;
if(s==="system")r.removeAttribute("data-theme");else r.setAttribute("data-theme",s);
var c=${JSON.stringify(THEME_COLORS)};
function f(){
var m=document.querySelectorAll('meta[name="theme-color"]');
for(var i=0;i<m.length;i++){
var d=/dark/.test(m[i].getAttribute("media")||"");
m[i].setAttribute("content",c[s==="system"?(d?"dark":"light"):s]);
}}
f();document.addEventListener("DOMContentLoaded",f);
}catch(e){}})()`;
