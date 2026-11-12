import type { BogeyCard, Card, FollowText, RestCard, SingleCase } from "@/lib/darts/cards";

type Slots = (string | null)[];
export type Note = { title: string; text: string };

export type CardView = {
  question: { label: string; big: string; slots: Slots; hint?: string };
  answer: {
    label: string;
    big: string;
    slots: Slots;
    slotTone: "best" | "none";
    missSlots: number[];
    notes: Note[];
  };
};

const SLOT_COUNT = 3;

/** Würfe in drei Felder; fehlende Felder bleiben leer (null). */
function toSlots(darts: string[]): Slots {
  return Array.from({ length: SLOT_COUNT }, (_, i) => darts[i] ?? null);
}

const joinDarts = (darts: string[]) => darts.join(" · ");

/** "S20" → "Single 20" */
const singleName = (hit: string) => `Single ${hit.slice(1)}`;

/** Stellwurf in Kurzform: "S20, Rest 32". */
function setupText(follow: Extract<FollowText, { kind: "setup" }>): string {
  return `${joinDarts(follow.throws)}, Rest ${follow.leaves}`;
}

/** Ein Fall „Nur Single getroffen“ in Kurzform: „Nur S20“ / „101: T17 · Bull“. */
function singleCaseNote(c: SingleCase): Note {
  const text =
    c.follow.kind === "finish"
      ? `${c.newRest}: ${joinDarts(c.follow.route)}`
      : `Stellen: ${setupText(c.follow)}`;
  return { title: `Nur ${c.hit}`, text };
}

const EMPTY_QUESTION_SLOTS: Slots = [null, null, null];

/** Was über einen Rest ohne Fehlwurf-Fälle zu wissen ist: Weg, Begründung, Alternativen, Weg mit 2 Darts oder der Stellwurf. */
export type RestDetail =
  | Pick<RestCard, "kind" | "rest" | "best" | "reason" | "alternatives" | "twoDarts">
  | Pick<BogeyCard, "kind" | "rest" | "setup">;

export type RestDetailView = { slots: Slots; slotTone: "best" | "none"; notes: Note[] };

/** Auflösung eines Rests ohne die Fälle „Nur Single getroffen“ (Statistik, Kern der Rest-Karte). */
export function restDetailView(detail: RestDetail): RestDetailView {
  if (detail.kind === "bogey") {
    return {
      slots: toSlots(detail.setup.throws),
      slotTone: "none",
      notes: [
        {
          title: "Stellwurf",
          text: `Kein Finish möglich. Stellen auf Rest ${detail.setup.leaves}.`,
        },
      ],
    };
  }
  const notes: Note[] = [{ title: "Warum", text: detail.reason }];
  if (detail.alternatives.length > 0) {
    notes.push({
      title: detail.alternatives.length === 1 ? "Alternative" : "Alternativen",
      text: detail.alternatives.map(joinDarts).join(" oder "),
    });
  }
  // Nennt die Tabelle für zwei Darts denselben Weg wie für drei, wäre der Hinweis eine Wiederholung.
  if (detail.twoDarts && joinDarts(detail.twoDarts) !== joinDarts(detail.best)) {
    notes.push({ title: "Mit 2 Darts in der Hand", text: joinDarts(detail.twoDarts) });
  }
  return { slots: toSlots(detail.best), slotTone: "best", notes };
}

/** Reine Abbildung Karte → Anzeige (Frage und Auflösung). */
export function cardView(card: Card): CardView {
  switch (card.kind) {
    case "rest": {
      const detail = restDetailView(card);
      return {
        question: { label: "Rest", big: String(card.rest), slots: EMPTY_QUESTION_SLOTS },
        answer: {
          label: "Rest",
          big: String(card.rest),
          ...detail,
          missSlots: [],
          notes: [...detail.notes, ...card.singleCases.map(singleCaseNote)],
        },
      };
    }
    case "miss": {
      const missIndex = card.thrown.length - 1;
      const { follow } = card;
      const finish = follow.kind === "finish";
      const followDarts = follow.kind === "finish" ? follow.route : follow.throws;
      return {
        question: {
          label: `Rest war ${card.rest}`,
          big: "?",
          slots: toSlots(card.thrown),
          hint: `Ziel war ${card.aimed}, getroffen: ${singleName(card.hit)}`,
        },
        answer: {
          label: "Neuer Rest",
          big: String(card.newRest),
          slots: toSlots([...card.thrown, ...followDarts]),
          slotTone: finish ? "best" : "none",
          missSlots: [missIndex],
          notes: follow.kind === "setup" ? [{ title: "Stellwurf", text: setupText(follow) }] : [],
        },
      };
    }
    case "bogey":
      return {
        question: { label: "Rest", big: String(card.rest), slots: EMPTY_QUESTION_SLOTS },
        answer: {
          label: `Rest ${card.rest}`,
          big: "Nicht checkbar",
          ...restDetailView(card),
          missSlots: [],
        },
      };
  }
}
