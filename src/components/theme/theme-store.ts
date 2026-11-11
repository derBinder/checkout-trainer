import {
  THEME_COLORS,
  THEME_STORAGE_KEY,
  parseThemeSetting,
  resolveTheme,
  themeAttribute,
  type ThemeSetting,
} from "@/lib/theme";

/** Browserseitige Gegenstücke zu themeInitScript, für den Schalter und nach dem Laden. */

export function readThemeSetting(): ThemeSetting {
  try {
    return parseThemeSetting(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function applyThemeSetting(setting: ThemeSetting) {
  const root = document.documentElement;
  const attr = themeAttribute(setting);
  if (attr) root.setAttribute("data-theme", attr);
  else root.removeAttribute("data-theme");
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    const prefersDark = /dark/.test(meta.getAttribute("media") ?? "");
    meta.setAttribute("content", THEME_COLORS[resolveTheme(setting, prefersDark)]);
  }
}

const CHANGE_EVENT = "themesettingchange";

export function saveThemeSetting(setting: ThemeSetting) {
  try {
    if (setting === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, setting);
  } catch {
    // Ohne Speicher gilt die Wahl nur bis zum Neuladen.
  }
  applyThemeSetting(setting);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Meldet Änderungen aus diesem Tab (Schalter) und aus anderen Tabs (storage). */
export function subscribeThemeSetting(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
