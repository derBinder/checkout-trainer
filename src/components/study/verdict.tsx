import type { Dictionary } from "@/i18n/dictionaries";
import { useDictionary } from "@/i18n/client";
import type { Verdict, VerdictCode } from "@/lib/darts/judge";
import { cn } from "@/lib/utils";

export type VerdictTone = "strong" | "soft" | "bad";

const TONES: Record<VerdictCode, VerdictTone> = {
  best: "strong",
  alternative: "soft",
  notRecommended: "soft",
  noCheckout: "bad",
  checkable: "bad",
  bogeyRight: "strong",
  setupRight: "strong",
  setupOther: "soft",
  setupBogey: "bad",
  setupBust: "bad",
};

/** Ton, Titel und Hinweis eines Ergebnisses; ein Grund (`detail`) ersetzt den Hinweis. Sagt der Titel schon alles, fehlt der Hinweis. */
export function verdictCopy(
  v: Verdict,
  t: Dictionary["study"],
): { tone: VerdictTone; title: string; note?: string } {
  const codes: Record<VerdictCode, { title: string; note?: string }> = t.verdict.codes;
  const { title, note } = codes[v.code];
  // Der Grund für einen anderen Stellwurf steht als eigene Notiz unter dem Vergleich, nicht in der Zeile.
  if (v.detail?.kind === "setupOther") return { tone: TONES[v.code], title, note };
  return { tone: TONES[v.code], title, note: v.detail ? t.verdict.detail(v.detail) : note };
}

const TONE: Record<VerdictTone, string> = {
  strong: "bg-primary text-primary-foreground",
  soft: "bg-verdict-soft text-verdict-soft-foreground",
  bad: "bg-verdict-bad text-verdict-bad-foreground",
};

/** Ergebnis der eingegebenen Antwort, oben in der Auflösung. */
export function VerdictLine({ verdict }: { verdict: Verdict }) {
  return <ResultLine {...verdictCopy(verdict, useDictionary().study)} />;
}

/** Ergebniszeile in einem der drei Töne: links der Titel, rechts der Hinweis, falls es einen gibt. */
export function ResultLine({ tone, title, note }: { tone: VerdictTone; title: string; note?: string }) {
  return (
    <p
      role="status"
      className={cn("flex items-baseline justify-between gap-3 rounded-field px-4 py-2", TONE[tone])}
    >
      <span className="text-base font-bold">{title}</span>
      {note ? <span className="text-right text-sm font-medium">{note}</span> : null}
    </p>
  );
}
