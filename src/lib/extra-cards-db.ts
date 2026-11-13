import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { NO_EXTRA_CARDS, type ExtraCards, type ExtraKind } from "@/lib/extra-cards";

/** Die Spalten der Schalter, zum Mitlesen in einer Abfrage der Nutzerzeile. */
export const EXTRA_SELECT = {
  extraSingleDouble: user.extraSingleDouble,
  extraNeighbours: user.extraNeighbours,
  extraOver170: user.extraOver170,
};

type ExtraRow = { [K in keyof typeof EXTRA_SELECT]: boolean };

/** Das Feld je Schalter, zum Setzen per `update(user).set()`. */
export const EXTRA_FIELDS: Record<ExtraKind, keyof ExtraRow> = {
  singleDouble: "extraSingleDouble",
  neighbours: "extraNeighbours",
  over170: "extraOver170",
};

export function extraCardsOf(row: ExtraRow): ExtraCards {
  return { singleDouble: row.extraSingleDouble, neighbours: row.extraNeighbours, over170: row.extraOver170 };
}

/** Die Schalter eines Kontos; ein unbekanntes Konto hat alle aus. */
export async function loadExtraCards(db: Db, userId: string): Promise<ExtraCards> {
  const [row] = await db.select(EXTRA_SELECT).from(user).where(eq(user.id, userId));
  return row ? extraCardsOf(row) : NO_EXTRA_CARDS;
}
