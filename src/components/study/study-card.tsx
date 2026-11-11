import { DartSlots } from "@/components/dart-slots";
import { cn } from "@/lib/utils";
import type { CardView, Note } from "./card-view";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="type-label text-center">{children}</p>;
}

/** Die Zahl, nach der gefragt wird: das größte Element der Seite. */
function Big({ value, compact = false }: { value: string; compact?: boolean }) {
  const word = value.length > 3;
  return (
    <p
      className={cn(
        "type-display text-center tabular-nums",
        word
          ? "py-2 text-[clamp(2.5rem,12vw,3.5rem)]"
          : compact
            ? "text-[clamp(5rem,28vw,7.5rem)]"
            : "text-[clamp(6rem,36vw,10rem)]",
      )}
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
          <dt className="type-label tracking-[0.1em]">{note.title}</dt>
          <dd className="pt-1 text-[0.9375rem] leading-snug font-medium">{note.text}</dd>
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
