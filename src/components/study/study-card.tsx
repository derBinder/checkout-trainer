import { DartSlots } from "@/components/dart-slots";
import { cn } from "@/lib/utils";
import type { CardView, Note } from "./card-view";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

/** Die Zahl, nach der gefragt wird: das größte Element der Seite. */
function Big({ value, compact = false }: { value: string; compact?: boolean }) {
  const word = value.length > 3;
  return (
    <p
      className={cn(
        "text-center font-heading leading-none font-extrabold tabular-nums font-stretch-condensed",
        word
          ? "py-3 text-5xl font-stretch-semi-condensed"
          : compact
            ? "text-[clamp(4rem,22vw,6rem)]"
            : "text-[clamp(5rem,30vw,9rem)]",
      )}
    >
      {value}
    </p>
  );
}

/** Erklärungen zur Auflösung, je ein Kasten mit Titel und Text. */
export function NoteList({ notes }: { notes: Note[] }) {
  return (
    <dl className="flex flex-col gap-2 pt-2">
      {notes.map((note, i) => (
        <div key={i} className="rounded-lg bg-muted/60 px-4 py-3">
          <dt className="text-xs font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {note.title}
          </dt>
          <dd className="pt-0.5 leading-snug">{note.text}</dd>
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
          <p className="text-center text-muted-foreground">{question.hint}</p>
          <div className="flex flex-col gap-1 pt-6">
            <Eyebrow>{view.answer.label}</Eyebrow>
            <Big value={question.big} />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Eyebrow>{question.label}</Eyebrow>
          <Big value={question.big} />
        </div>
        <DartSlots slots={question.slots} />
      </div>
    );
  }

  const { answer } = view;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <Eyebrow>{answer.label}</Eyebrow>
        <Big value={answer.big} compact />
      </div>
      <DartSlots slots={answer.slots} tone={answer.slotTone} missSlots={answer.missSlots} />
      {answer.notes.length > 0 && <NoteList notes={answer.notes} />}
    </div>
  );
}
