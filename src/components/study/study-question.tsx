import { DartSlots } from "@/components/dart-slots";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/client";
import { offersNotCheckable, type Answer, type Check } from "@/lib/darts/judge";
import type { CardView } from "./card-view";
import { isFull, type InputAction, type InputState } from "./route-input";
import { RoutePad } from "./route-pad";
import { BIG_NUMERAL, EYEBROW } from "./study-card";

const SLOT_COUNT = 3;

/** Schon geworfene Darts einer Fehlwurf-Karte; bei Rest- und Bogey-Karten keine. */
export function fixedDarts(view: CardView): string[] {
  return view.question.slots.filter((d): d is string => d !== null);
}

/**
 * Frage mit Eingabe: Rest (bzw. bei Fehlwurf-Karten der Wurf und was passiert
 * ist), die Felder mit Eingabe und das Tastenfeld. Bogey- und Rest-Karten sehen
 * gleich aus, damit die Frage nichts verrät.
 */
export function StudyQuestion({
  view,
  input,
  onAction,
}: {
  view: CardView;
  input: InputState;
  onAction: (a: InputAction) => void;
}) {
  const { question } = view;
  const spent = question.spent ?? 0;
  const fixed = fixedDarts(view);
  const entered = [...fixed, ...input.darts];
  const slots = Array.from({ length: SLOT_COUNT }, (_, i) => (i < spent ? null : (entered[i - spent] ?? null)));
  const next = isFull(input) ? undefined : spent + entered.length;
  const dartSlots = <DartSlots slots={slots} missSlots={view.answer.missSlots} next={next} spent={spent} />;

  return (
    <div className="flex flex-col gap-4">
      {question.hint ? (
        // Fehlwurf-Karte: Wurf und was passiert ist; den neuen Rest rechnet der Nutzer im Kopf.
        <div className="flex flex-col gap-3">
          <p className={EYEBROW}>{question.label}</p>
          {dartSlots}
          <p className="text-center font-medium text-muted-foreground">{question.hint}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className={EYEBROW}>{question.label}</p>
            <p className={BIG_NUMERAL}>{question.big}</p>
            {question.sub && <p className="text-center font-medium text-muted-foreground">{question.sub}</p>}
          </div>
          {dartSlots}
        </div>
      )}
      <RoutePad state={input} onAction={onAction} />
    </div>
  );
}

/** Fußzeile der Frage: „Nicht checkbar“ (nur Rest/Bogey), „Prüfen“, „Ohne Eingabe aufdecken“. */
export function QuestionFooter({
  check,
  input,
  onReveal,
}: {
  check: Check;
  input: InputState;
  /** Ohne Antwort: ohne Eingabe aufgedeckt. */
  onReveal: (answer?: Answer) => void;
}) {
  const t = useDictionary().study.question;
  const verify = (
    <Button
      size="xl"
      className="w-full"
      disabled={input.darts.length === 0}
      onClick={() => onReveal({ kind: "darts", darts: input.darts })}
    >
      {t.check}
    </Button>
  );
  return (
    <>
      {offersNotCheckable(check) ? (
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="xl"
            className="w-full"
            onClick={() => onReveal({ kind: "notCheckable" })}
          >
            {t.notCheckable}
          </Button>
          {verify}
        </div>
      ) : (
        verify
      )}
      <Button variant="link" size="xs" className="self-center text-muted-foreground" onClick={() => onReveal()}>
        {t.reveal}
      </Button>
    </>
  );
}
