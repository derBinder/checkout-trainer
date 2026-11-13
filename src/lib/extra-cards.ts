import type { Card } from "@/lib/darts/cards";

/**
 * Zusatzkarten, die jeder Nutzer einzeln zuschaltet. Frei von Server-Abhängigkeiten
 * und ohne Kartendaten, damit auch Client-Komponenten es importieren können.
 */
export const EXTRA_KINDS = ["singleDouble", "neighbours", "over170"] as const;
export type ExtraKind = (typeof EXTRA_KINDS)[number];

/** Welche Zusatzkarten eingeschaltet sind. */
export type ExtraCards = Record<ExtraKind, boolean>;

export const NO_EXTRA_CARDS: ExtraCards = { singleDouble: false, neighbours: false, over170: false };
export const ALL_EXTRA_CARDS: ExtraCards = { singleDouble: true, neighbours: true, over170: true };

/** Karten je Schalter, für die Texte der Einstellungen; ein Test hält sie am Kartensatz fest. */
export const EXTRA_CARD_COUNTS: Record<ExtraKind, number> = { singleDouble: 19, neighbours: 202, over170: 60 };

/** Der Schalter, zu dem eine Karte gehört; Grundkarten gehören zu keinem. */
export function extraKindOf(card: Card): ExtraKind | null {
  if (card.kind === "over") return "over170";
  if (card.kind !== "miss") return null;
  if (card.variant === "neighbour") return "neighbours";
  if (card.variant === "singleDouble") return "singleDouble";
  return null;
}

export function isCardOn(card: Card, extras: ExtraCards): boolean {
  const kind = extraKindOf(card);
  return kind === null || extras[kind];
}

export function isExtraKind(value: unknown): value is ExtraKind {
  return typeof value === "string" && (EXTRA_KINDS as readonly string[]).includes(value);
}
