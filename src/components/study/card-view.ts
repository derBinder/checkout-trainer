import type { Card, FollowText, SingleCase } from "@/lib/darts/cards";

type Slots = (string | null)[];
type Note = { title: string; text: string };

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

/** Reine Abbildung Karte → Anzeige (Frage und Auflösung). */
export function cardView(card: Card): CardView {
  switch (card.kind) {
    case "rest": {
      const notes: Note[] = [{ title: "Warum", text: card.reason }];
      if (card.alternatives.length > 0) {
        notes.push({
          title: card.alternatives.length === 1 ? "Alternative" : "Alternativen",
          text: card.alternatives.map(joinDarts).join(" oder "),
        });
      }
      notes.push(...card.singleCases.map(singleCaseNote));
      return {
        question: { label: "Rest", big: String(card.rest), slots: EMPTY_QUESTION_SLOTS },
        answer: {
          label: "Rest",
          big: String(card.rest),
          slots: toSlots(card.best),
          slotTone: "best",
          missSlots: [],
          notes,
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
          slots: toSlots(card.setup.throws),
          slotTone: "none",
          missSlots: [],
          notes: [
            {
              title: "Stellwurf",
              text: `Kein Finish möglich. Stellen auf Rest ${card.setup.leaves}.`,
            },
          ],
        },
      };
  }
}
