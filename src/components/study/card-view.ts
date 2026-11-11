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

const dartsLeftText = (n: 1 | 2) => (n === 1 ? "1 Dart" : `${n} Darts`);

function setupText(follow: Extract<FollowText, { kind: "setup" }>): string {
  return `Kein Finish mehr: ${joinDarts(follow.throws)}, Rest ${follow.leaves}`;
}

function singleCaseNote(c: SingleCase): Note {
  const text =
    c.follow.kind === "finish"
      ? `Rest ${c.newRest}, ${dartsLeftText(c.dartsLeft)}: ${joinDarts(c.follow.route)}`
      : setupText(c.follow);
  return { title: `Nur ${singleName(c.hit)} getroffen`, text };
}

const EMPTY_QUESTION_SLOTS: Slots = [null, null, null];

/** Was über einen Rest ohne Fehlwurf-Fälle zu wissen ist: Weg, Begründung, Alternativen oder der Stellwurf. */
export type RestDetail =
  | Pick<RestCard, "kind" | "rest" | "best" | "reason" | "alternatives">
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
