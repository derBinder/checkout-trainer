import {
  THEME_CHOICE_META_ID,
  THEME_STORAGE_KEY,
  parseThemeSetting,
  themeAttribute,
  themeChoiceColor,
  type ThemeSetting,
} from "@/lib/theme";

/** Browserseitige Gegenstücke zu themeInitScript, für den Schalter und nach dem Laden. */

/**
 * Die zuletzt in diesem Tab getroffene Wahl. Sie gilt vor dem Speicher, damit
 * eine Wahl auch dann bis zum Neuladen hält, wenn localStorage gesperrt ist.
 * Eine Änderung aus einem anderen Tab setzt sie zurück.
 */
let chosenHere: ThemeSetting | null = null;

export function readThemeSetting(): ThemeSetting {
  if (chosenHere !== null) return chosenHere;
  try {
    return parseThemeSetting(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function applyThemeSetting(setting: ThemeSetting) {
  const attr = themeAttribute(setting);
  if (attr) document.documentElement.setAttribute("data-theme", attr);
  else document.documentElement.removeAttribute("data-theme");

  // Eigene theme-color-Zeile an erster Stelle im <head>; die Zeilen von Next bleiben unberührt.
  const color = themeChoiceColor(setting);
  let meta = document.getElementById(THEME_CHOICE_META_ID) as HTMLMetaElement | null;
  if (color === null) {
    meta?.remove();
    return;
  }
  if (!meta) {
    meta = document.createElement("meta");
    meta.id = THEME_CHOICE_META_ID;
    meta.name = "theme-color";
  }
  meta.content = color;
  if (document.head.firstChild !== meta) document.head.prepend(meta);
}

const CHANGE_EVENT = "themesettingchange";

export function saveThemeSetting(setting: ThemeSetting) {
  chosenHere = setting;
  try {
    if (setting === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, setting);
  } catch {
    // Speicher gesperrt: chosenHere hält die Wahl bis zum Neuladen, danach gilt wieder „System“.
  }
  applyThemeSetting(setting);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Meldet Änderungen aus diesem Tab (Schalter) und aus anderen Tabs (storage). */
export function subscribeThemeSetting(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    chosenHere = null;
    onChange();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
