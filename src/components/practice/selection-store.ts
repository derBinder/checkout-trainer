import {
  parsePracticeSelection,
  PRACTICE_STORAGE_KEY,
  type PracticeSelection,
} from "@/lib/practice/selection";

/**
 * Browserseitiger Speicher der Übungsauswahl, wie die Darstellungswahl
 * (theme-store.ts): Die im Tab getroffene Wahl gilt vor dem Speicher, damit sie
 * auch bei gesperrtem localStorage bis zum Neuladen hält. Eine Änderung aus einem
 * anderen Tab setzt sie zurück.
 */
let chosenHere: PracticeSelection | null = null;

// useSyncExternalStore verlangt bei unverändertem Speicher dieselbe Referenz.
let lastRaw: string | null = null;
let lastParsed: PracticeSelection = parsePracticeSelection(null);

export function readPracticeSelection(): PracticeSelection {
  if (chosenHere !== null) return chosenHere;
  let raw: string | null;
  try {
    raw = localStorage.getItem(PRACTICE_STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    lastParsed = parsePracticeSelection(raw);
  }
  return lastParsed;
}

const CHANGE_EVENT = "practiceselectionchange";

export function savePracticeSelection(selection: PracticeSelection) {
  chosenHere = selection;
  try {
    localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Speicher gesperrt: chosenHere hält die Wahl bis zum Neuladen.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Meldet Änderungen aus diesem Tab und aus anderen Tabs (storage). */
export function subscribePracticeSelection(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key !== PRACTICE_STORAGE_KEY && event.key !== null) return;
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
