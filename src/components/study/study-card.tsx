import { DartSlots } from "@/components/dart-slots";
import { useDictionary } from "@/i18n/client";
import type { Answer, Verdict } from "@/lib/darts/judge";
import type { CardView, Note } from "./card-view";
import { cn } from "@/lib/utils";
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

/** Zeile über einer Reihe Felder: links die Beschriftung, rechts der Rest, wenn zwei Stellwürfe verglichen werden. */
function RowHead({ label, leaves }: { label: string; leaves?: string }) {
  if (!leaves) return <p className={ROW_LABEL}>{label}</p>;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <p className={ROW_LABEL}>{label}</p>
      <p className={cn(ROW_LABEL, "tabular-nums")}>{leaves}</p>
    </div>
  );
}

/** „Dein Weg“: die eingegebenen Darts in neutraler Farbe, oder „Nicht checkbar“. */
function YourRoute({
  result,
  missSlots,
  spent,
  leaves,
}: {
  result: StudyResult;
  missSlots: number[];
  spent: number;
  leaves?: string;
}) {
  const t = useDictionary().study.result;
  return (
    <div className="flex flex-col gap-1.5">
      <RowHead label={t.yourRoute} leaves={leaves} />
      {result.answer.kind === "notCheckable" ? (
        <p className="flex h-11 items-center justify-center rounded-pill bg-muted font-heading text-base font-extrabold">
          {t.notCheckable}
        </p>
      ) : (
        <DartSlots
          slots={[...Array<null>(spent).fill(null), ...result.fixed, ...result.answer.darts]}
          tone="none"
          missSlots={missSlots}
          spent={spent}
          size="sm"
          label={t.yourRoute}
        />
      )}
    </div>
  );
}

/** Auflösung einer Karte, ohne Bedienelemente; mit Ergebnis, wenn eine Antwort eingegeben war. */
export function StudyCard({ view, result }: { view: CardView; result?: StudyResult }) {
  const study = useDictionary().study;
  const t = study.result;
  const { answer } = view;
  // Anderer Stellwurf: beide Reste stehen über ihren Reihen, darunter der Grund.
  const other = result?.verdict.detail?.kind === "setupOther" ? result.verdict.detail : undefined;
  // Karten mit Stellwurf-Prüfung tragen genau eine Notiz, den empfohlenen Rest. Der steht dann schon über der Reihe.
  const notes = other ? [{ title: study.card.why, text: study.verdict.detail(other) }] : answer.notes;
  const rowLabel = answer.slotTone === "best" ? t.bestRoute : t.setupShot;
  const slots = (
    <DartSlots
      slots={answer.slots}
      tone={answer.slotTone}
      missSlots={answer.missSlots}
      spent={answer.spent}
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
          <YourRoute
            result={result}
            missSlots={answer.missSlots}
            spent={answer.spent ?? 0}
            leaves={other && t.leaves(other.leaves, other.double)}
          />
          <div className="flex flex-col gap-1.5">
            <RowHead label={rowLabel} leaves={other && t.leaves(other.bestLeaves, other.bestDouble)} />
            {slots}
          </div>
        </>
      ) : (
        slots
      )}
      {notes.length > 0 && <NoteList notes={notes} compact />}
    </div>
  );
}
