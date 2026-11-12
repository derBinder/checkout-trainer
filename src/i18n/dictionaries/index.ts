import type { Locale } from "../locales";
import { de, type Dictionary } from "./de";
import { en } from "./en";

export type { Dictionary };

/** Beide Wörterbücher; Client-Komponenten wählen hieraus über `useDictionary()`. */
export const DICTIONARIES: Record<Locale, Dictionary> = { de, en };

export function dictionaryFor(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}
