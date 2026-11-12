/**
 * Deutsches Wörterbuch, nach Namensräumen gegliedert. Werte sind Texte oder
 * Funktionen für Texte mit Werten (`(n: number) => string`). Es gibt den Typ
 * vor: Das englische Wörterbuch muss genau dieselben Einträge haben.
 */

export const de = {
  common: {
    appName: "Checkout-Trainer",
    titleSuffix: " · Checkout-Trainer",
    description: "Checkout-Wege im Darts mit Karteikarten lernen.",
  },
  language: {
    label: "Sprache",
    // Sprachnamen werden nie übersetzt.
    names: { de: "Deutsch", en: "English" },
    short: { de: "DE", en: "EN" },
  },
} as const;

/** Weitet Literal-Strings zu `string`; Funktionen und Aufbau bleiben. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : { readonly [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof de>;
