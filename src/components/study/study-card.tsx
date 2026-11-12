import { DartSlots } from "@/components/dart-slots";
import type { CardView, Note } from "./card-view";

/** Beschriftung über der Zahl; das Skeleton der Fragenansicht übernimmt die Schrift. */
export const EYEBROW = "type-label text-center";

/** Die Zahl der Fragenansicht (bis drei Ziffern); das Skeleton übernimmt die Schrift. */
export const BIG_NUMERAL = "type-display text-center tabular-nums text-numeral";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className={EYEBROW}>{children}</p>;
}

/** Die Zahl, nach der gefragt wird: das größte Element der Seite. */
function Big({ value, compact = false }: { value: string; compact?: boolean }) {
  const word = value.length > 3;
  return (
    <p
      className={
        word
          ? "type-display text-center tabular-nums py-2 text-5xl leading-none"
          : compact
            ? "type-display text-center tabular-nums text-numeral-compact"
            : BIG_NUMERAL
      }
    >
      {value}
    </p>
  );
}

/** Erklärungen zur Auflösung, je ein Block mit Titel und Text. */
export function NoteList({ notes }: { notes: Note[] }) {
  return (
    <dl className="flex flex-col gap-2">
      {notes.map((note, i) => (
        <div key={i} className="rounded-card bg-muted px-4 py-3">
          <dt className="type-label tracking-widest">{note.title}</dt>
          <dd className="pt-1 text-base leading-snug font-medium">{note.text}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Frage oder Auflösung einer Karte, ohne Bedienelemente. */
export function StudyCard({ view, revealed }: { view: CardView; revealed: boolean }) {
  if (!revealed) {
    const { question } = view;
    // Fehlwurf-Karte: erst der Wurf und was passiert ist, dann die Frage nach dem neuen Rest.
    if (question.hint) {
      return (
        <div className="flex flex-col gap-4">
          <Eyebrow>{question.label}</Eyebrow>
          <DartSlots slots={question.slots} missSlots={view.answer.missSlots} />
          <p className="text-center font-medium text-muted-foreground">{question.hint}</p>
          <div className="flex flex-col gap-2 pt-6">
            <Eyebrow>{view.answer.label}</Eyebrow>
            <Big value={question.big} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <Eyebrow>{question.label}</Eyebrow>
          <Big value={question.big} />
        </div>
        <DartSlots slots={question.slots} />
      </div>
    );
  }

  const { answer } = view;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Eyebrow>{answer.label}</Eyebrow>
        <Big value={answer.big} compact />
      </div>
      <DartSlots slots={answer.slots} tone={answer.slotTone} missSlots={answer.missSlots} />
      {answer.notes.length > 0 && <NoteList notes={answer.notes} />}
    </div>
  );
}
