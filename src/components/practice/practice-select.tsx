"use client";

import { useId } from "react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/client";
import {
  matchesFilter,
  ROUND_SIZE,
  PRACTICE_KINDS,
  RANGES,
  type PracticeGroup,
  type RangeId,
} from "@/lib/practice/filter";
import { EXERCISES, type PracticeSelection } from "@/lib/practice/selection";
import { cn } from "@/lib/utils";
import {
  CHIP,
  CHIP_GRID,
  PRACTICE_BODY,
  PRACTICE_SECTION,
  SEGMENT_BAR,
  SEGMENT_HEIGHT,
  SectionLabel,
  START_AREA,
  START_BUTTON_LAYOUT,
  STATUS_LINE,
} from "./practice-parts";

/** Gewählt: Hauptaktion (hell schwarz mit Gelb, dunkel Gelb mit Schwarz), sonst ruhig. */
const CHIP_ON = "bg-primary text-primary-foreground";
const CHIP_OFF = "bg-muted text-muted-foreground hover:bg-secondary-hover hover:text-foreground";
const FOCUS = "outline-ring transition select-none focus-visible:outline-2";

/**
 * Auswahlseite: Übung, bei „Wege“ Bereiche und Kartenart, darunter wie viele
 * Karten die Runde hat und „Los“. Gesteuert von außen (PracticeHost speichert die Wahl).
 */
export function PracticeSelect({
  cards,
  ranges,
  selection,
  onChange,
  onStart,
}: {
  cards: readonly { rest: number; groups: readonly PracticeGroup[] }[];
  /** Die wählbaren Bereiche, in der Reihenfolge von RANGES. */
  ranges: readonly RangeId[];
  selection: PracticeSelection;
  onChange: (selection: PracticeSelection) => void;
  onStart: () => void;
}) {
  const t = useDictionary().practice;
  const id = useId();
  const routes = selection.exercise === "routes";
  const matching = cards.filter((card) => matchesFilter(card, selection)).length;
  const status = !routes
    ? null
    : selection.ranges.length === 0
      ? t.noRange
      : matching === 0
        ? t.noCards
        : t.roundSize(Math.min(matching, ROUND_SIZE), matching);
  const canStart = !routes || matching > 0;

  function toggleRange(range: RangeId) {
    const chosen = selection.ranges.includes(range)
      ? selection.ranges.filter((r) => r !== range)
      : ranges.filter((r) => r === range || selection.ranges.includes(r));
    onChange({ ...selection, ranges: chosen });
  }

  return (
    <div className={PRACTICE_BODY}>
      <div role="radiogroup" aria-label={t.exercise} className={SEGMENT_BAR}>
        {EXERCISES.map((value) => (
          <label
            key={value}
            className={cn(
              SEGMENT_HEIGHT,
              "flex cursor-pointer items-center justify-center rounded-field text-sm font-semibold text-muted-foreground transition-colors select-none hover:text-foreground has-checked:bg-accent has-checked:font-bold has-checked:text-accent-foreground has-focus-visible:outline-2 has-focus-visible:outline-ring",
            )}
          >
            <input
              type="radio"
              name={`${id}-exercise`}
              value={value}
              checked={selection.exercise === value}
              onChange={() => onChange({ ...selection, exercise: value })}
              className="sr-only"
            />
            {t.exercises[value]}
          </label>
        ))}
      </div>

      {routes ? (
        <>
          <div className={PRACTICE_SECTION}>
            <SectionLabel id={`${id}-range`}>{t.range}</SectionLabel>
            <div role="group" aria-labelledby={`${id}-range`} className={CHIP_GRID}>
              {RANGES.filter((range) => ranges.includes(range.id)).map((range) => {
                const on = selection.ranges.includes(range.id);
                return (
                  <button
                    key={range.id}
                    type="button"
                    aria-pressed={on}
                    className={cn(CHIP, FOCUS, on ? CHIP_ON : CHIP_OFF)}
                    onClick={() => toggleRange(range.id)}
                  >
                    {range.from}–{range.to}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={PRACTICE_SECTION}>
            <SectionLabel id={`${id}-kind`}>{t.kind}</SectionLabel>
            <div role="radiogroup" aria-labelledby={`${id}-kind`} className={CHIP_GRID}>
              {PRACTICE_KINDS.map((kind) => (
                <label
                  key={kind}
                  className={cn(
                    CHIP,
                    "cursor-pointer select-none has-focus-visible:outline-2 has-focus-visible:outline-ring",
                    selection.kind === kind ? CHIP_ON : CHIP_OFF,
                  )}
                >
                  <input
                    type="radio"
                    name={`${id}-kind`}
                    value={kind}
                    checked={selection.kind === kind}
                    onChange={() => onChange({ ...selection, kind })}
                    className="sr-only"
                  />
                  {t.kinds[kind]}
                </label>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-base font-medium text-muted-foreground">{t.mathIntro}</p>
      )}

      <div className={START_AREA}>
        {status !== null && (
          <p aria-live="polite" className={STATUS_LINE}>
            {status}
          </p>
        )}
        <Button size="xl" className={START_BUTTON_LAYOUT} disabled={!canStart} onClick={onStart}>
          {t.start}
        </Button>
      </div>
    </div>
  );
}
