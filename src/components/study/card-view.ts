import type { Dictionary } from "@/i18n/dictionaries";
import type { BogeyCard, Card, FollowText, RestCard, SingleCase, TwoDartCard } from "@/lib/darts/cards";

type T = Dictionary["study"];
type Slots = (string | null)[];
export type Note = { title: string; text: string };

/**
 * Frage einer Karte: Rest-, Bogey- und Zwei-Dart-Karten zeigen den Rest als große Zahl,
 * Fehlwurf-Karten stattdessen einen Hinweis zum Wurf. Zwei-Dart-Karten tragen
 * darunter einen Hinweis (`sub`) und ein verbrauchtes erstes Feld (`spent`).
 */
type QuestionView =
  | { label: string; big: string; slots: Slots; hint?: undefined; sub?: string; spent?: number }
  | { label: string; hint: string; slots: Slots; big?: undefined; sub?: undefined; spent?: undefined };

export type CardView = {
  question: QuestionView;
  answer: {
    label: string;
    big: string;
    slots: Slots;
    slotTone: "best" | "none";
    missSlots: number[];
    /** Verbrauchte Felder vorn (Zwei-Dart-Karte), ohne Angabe keine. */
    spent?: number;
    notes: Note[];
  };
};

const SLOT_COUNT = 3;

/** Würfe in drei Felder; fehlende Felder bleiben leer (null). */
function toSlots(darts: (string | null)[]): Slots {
  return Array.from({ length: SLOT_COUNT }, (_, i) => darts[i] ?? null);
}

const joinDarts = (darts: string[]) => darts.join(" · ");

/** Stellwurf in Kurzform: "S20, Rest 32" bzw. "S20, 32 left". */
function setupText(follow: Extract<FollowText, { kind: "setup" }>, t: T): string {
  return t.card.setupShort(joinDarts(follow.throws), follow.leaves);
}

/** Ein Fall „Nur Single getroffen“ in Kurzform: „Nur S20“ / „101: T17 · Bull“. */
function singleCaseNote(c: SingleCase, t: T): Note {
  const text =
    c.follow.kind === "finish"
      ? `${c.newRest}: ${joinDarts(c.follow.route)}`
      : t.card.setUp(setupText(c.follow, t));
  return { title: t.card.only(c.hit), text };
}

const EMPTY_QUESTION_SLOTS: Slots = [null, null, null];

/** Was über einen Rest ohne Fehlwurf-Fälle zu wissen ist: Weg, Begründung, Alternativen, Weg mit 2 Darts oder der Stellwurf. */
export type RestDetail =
  | Pick<RestCard, "kind" | "rest" | "best" | "reason" | "breakdown" | "alternatives" | "twoDarts">
  | Pick<BogeyCard, "kind" | "rest" | "setup">;

export type RestDetailView = { slots: Slots; slotTone: "best" | "none"; notes: Note[] };

/** Auflösung eines Rests ohne die Fälle „Nur Single getroffen“ (Statistik, Kern der Rest-Karte). */
export function restDetailView(detail: RestDetail, t: T): RestDetailView {
  if (detail.kind === "bogey") {
    return {
      slots: toSlots(detail.setup.throws),
      slotTone: "none",
      notes: [
        {
          title: t.card.setupShot,
          text: t.card.bogeySetup(detail.setup.leaves),
        },
      ],
    };
  }
  // Die Zerlegung ersetzt den Begründungssatz; ohne sie (Ein-Dart-Weg, geteilter erster Dart) steht er da.
  const { breakdown, reason } = detail;
  const notes: Note[] = [];
  if (breakdown) {
    notes.push({
      title: t.card.after(breakdown.first),
      text: t.card.breakdown(breakdown.after, breakdown.dartsLeft, breakdown.route && joinDarts(breakdown.route)),
    });
  } else if (reason) {
    notes.push({ title: t.card.why, text: t.reason(reason) });
  }
  if (detail.alternatives.length > 0) {
    notes.push({
      title: detail.alternatives.length === 1 ? t.card.alternative : t.card.alternatives,
      text: detail.alternatives.map(joinDarts).join(` ${t.card.or} `),
    });
  }
  // Nennt die Tabelle für zwei Darts denselben Weg wie für drei, wäre der Hinweis eine Wiederholung.
  if (detail.twoDarts && joinDarts(detail.twoDarts) !== joinDarts(detail.best)) {
    notes.push({ title: t.card.twoDarts, text: joinDarts(detail.twoDarts) });
  }
  return { slots: toSlots(detail.best), slotTone: "best", notes };
}

/** Zwei-Dart-Karte: wie eine Rest-Karte gefragt, das erste Feld ist schon verbraucht. */
function twoDartView(card: TwoDartCard, t: T): CardView {
  const { follow } = card;
  const spent = 1;
  const question = {
    label: t.card.score,
    big: String(card.rest),
    sub: t.card.twoDartsLeft,
    slots: EMPTY_QUESTION_SLOTS,
    spent,
  };
  if (follow.kind === "finish") {
    return {
      question,
      answer: {
        label: t.card.score,
        big: String(card.rest),
        slots: toSlots([null, ...follow.route]),
        slotTone: "best",
        missSlots: [],
        spent,
        notes: [],
      },
    };
  }
  return {
    question,
    answer: {
      label: t.card.twoDartsOf(card.rest),
      big: t.card.noFinish,
      slots: toSlots([null, ...follow.throws]),
      slotTone: "none",
      missSlots: [],
      spent,
      notes: [{ title: t.card.setupShot, text: setupText(follow, t) }],
    },
  };
}

/** Reine Abbildung Karte → Anzeige (Frage und Auflösung). */
export function cardView(card: Card, t: T): CardView {
  switch (card.kind) {
    case "rest": {
      const detail = restDetailView(card, t);
      return {
        question: { label: t.card.score, big: String(card.rest), slots: EMPTY_QUESTION_SLOTS },
        answer: {
          label: t.card.score,
          big: String(card.rest),
          ...detail,
          missSlots: [],
          notes: [...detail.notes, ...card.singleCases.map((c) => singleCaseNote(c, t))],
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
          label: t.card.scoreWas(card.rest),
          slots: toSlots(card.thrown),
          hint: t.card.missHint(card.aimed, card.hit.slice(1)),
        },
        answer: {
          label: t.card.newScore,
          big: String(card.newRest),
          slots: toSlots([...card.thrown, ...followDarts]),
          slotTone: finish ? "best" : "none",
          missSlots: [missIndex],
          notes: follow.kind === "setup" ? [{ title: t.card.setupShot, text: setupText(follow, t) }] : [],
        },
      };
    }
    case "bogey":
      return {
        question: { label: t.card.score, big: String(card.rest), slots: EMPTY_QUESTION_SLOTS },
        answer: {
          label: t.card.scoreOf(card.rest),
          big: t.card.notCheckable,
          ...restDetailView(card, t),
          // Kurzform: „Nicht checkbar“ und die Stellwürfe stehen schon darüber.
          notes: [{ title: t.card.setupShot, text: t.card.afterwards(card.setup.leaves) }],
          missSlots: [],
        },
      };
    case "two":
      return twoDartView(card, t);
    case "over":
      // Über 170 ist nichts checkbar: gefragt ist nur der Stellwurf mit drei Darts.
      return {
        question: { label: t.card.score, big: String(card.rest), slots: EMPTY_QUESTION_SLOTS },
        answer: {
          label: t.card.score,
          big: String(card.rest),
          slots: toSlots(card.setup.throws),
          slotTone: "none",
          missSlots: [],
          notes: [{ title: t.card.setupShot, text: t.card.afterwards(card.setup.leaves) }],
        },
      };
  }
}
