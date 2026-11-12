import { DartSlots } from "@/components/dart-slots";
import type { Answer, Verdict } from "@/lib/darts/judge";
import type { CardView, Note } from "./card-view";
import { VerdictLine } from "./verdict";

/** Beschriftung über der Zahl; das Skeleton der Fragenansicht übernimmt die Schrift. */
export const EYEBROW = "type-label text-center";

/** Die Zahl der Fragenansicht über dem Tastenfeld; das Skeleton übernimmt die Schrift. */
export const BIG_NUMERAL = "type-display text-center tabular-nums text-numeral-input";

/** Kleine Beschriftung über einer Reihe Felder in der Auflösung. */
const ROW_LABEL = "type-label";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className={EYEBROW}>{children}</p>;
}

/** Die Zahl der Auflösung; ein Wort („Nicht checkbar“) kleiner. */
function Big({ value, withResult }: { value: string; withResult: boolean }) {
  const word = value.length > 3;
  return (
    <p
      className={
        word
          ? withResult
            ? "type-display text-center text-4xl leading-none"
            : "type-display text-center tabular-nums py-1 text-5xl leading-none"
          : withResult
            ? "type-display text-center tabular-nums text-numeral-result"
            : "type-display text-center tabular-nums text-numeral-compact"
      }
    >
      {value}
    </p>
  );
}

/**
 * Erklärungen zur Auflösung, je ein Block mit Titel und Text. Kompakt (Lernkarte):
 * Titel und Text in einer Zeile, damit die Auflösung ohne Scrollen passt.
 */
export function NoteList({ notes, compact = false }: { notes: Note[]; compact?: boolean }) {
  return (
    <dl className={compact ? "flex flex-col gap-1.5" : "flex flex-col gap-2"}>
      {notes.map((note, i) =>
        compact ? (
          <div key={i} className="flex items-baseline gap-3 rounded-card bg-muted px-4 py-2">
            <dt className="type-label shrink-0 tracking-widest">{note.title}</dt>
            <dd className="text-base leading-snug font-medium">{note.text}</dd>
          </div>
        ) : (
          <div key={i} className="rounded-card bg-muted px-4 py-3">
            <dt className="type-label tracking-widest">{note.title}</dt>
            <dd className="pt-1 text-base leading-snug font-medium">{note.text}</dd>
          </div>
        ),
      )}
    </dl>
  );
}

/** Ergebnis der Eingabe: wie geprüft, was eingegeben war, welche Darts schon feststanden. */
export type StudyResult = { verdict: Verdict; answer: Answer; fixed: string[] };

/** „Dein Weg“: die eingegebenen Darts in neutraler Farbe, oder „Nicht checkbar“. */
function YourRoute({ result, missSlots }: { result: StudyResult; missSlots: number[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className={ROW_LABEL}>Dein Weg</p>
      {result.answer.kind === "notCheckable" ? (
        <p className="flex h-11 items-center justify-center rounded-pill bg-muted font-heading text-base font-extrabold">
          Nicht checkbar
        </p>
      ) : (
        <DartSlots
          slots={[...result.fixed, ...result.answer.darts]}
          tone="none"
          missSlots={missSlots}
          size="sm"
          label="Dein Weg"
        />
      )}
    </div>
  );
}

/** Auflösung einer Karte, ohne Bedienelemente; mit Ergebnis, wenn eine Antwort eingegeben war. */
export function StudyCard({ view, result }: { view: CardView; result?: StudyResult }) {
  const { answer } = view;
  const rowLabel = answer.slotTone === "best" ? "Bester Weg" : "Stellwurf";
  const slots = (
    <DartSlots
      slots={answer.slots}
      tone={answer.slotTone}
      missSlots={answer.missSlots}
      size={result ? "sm" : undefined}
      label={result ? rowLabel : undefined}
    />
  );
  return (
    <div className={result ? "flex flex-col gap-3" : "flex flex-col gap-5"}>
      <div className="flex flex-col gap-1">
        <Eyebrow>{answer.label}</Eyebrow>
        <Big value={answer.big} withResult={result !== undefined} />
      </div>
      {result ? (
        <>
          <VerdictLine verdict={result.verdict} />
          <YourRoute result={result} missSlots={answer.missSlots} />
          <div className="flex flex-col gap-1.5">
            <p className={ROW_LABEL}>{rowLabel}</p>
            {slots}
          </div>
        </>
      ) : (
        slots
      )}
      {answer.notes.length > 0 && <NoteList notes={answer.notes} compact />}
    </div>
  );
}
