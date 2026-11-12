import type { Verdict, VerdictCode } from "@/lib/darts/judge";
import { cn } from "@/lib/utils";

export type VerdictTone = "strong" | "soft" | "bad";

const COPY: Record<VerdictCode, { tone: VerdictTone; title: string; note: string }> = {
  best: { tone: "strong", title: "Bester Weg", note: "genau richtig" },
  alternative: { tone: "soft", title: "Alternative", note: "auch richtig" },
  notRecommended: { tone: "soft", title: "Geht, aber nicht empfohlen", note: "Finish stimmt, Weg ist schlechter" },
  noCheckout: { tone: "bad", title: "Geht nicht auf", note: "" },
  checkable: { tone: "bad", title: "Ist checkbar", note: "Es gibt einen Weg" },
  bogeyRight: { tone: "strong", title: "Richtig", note: "Rest ist nicht checkbar" },
  setupRight: { tone: "strong", title: "Richtiger Stellwurf", note: "genau richtig" },
  setupOther: { tone: "soft", title: "Anderer Stellwurf", note: "empfohlen siehe unten" },
};

export function verdictCopy(v: Verdict): { tone: VerdictTone; title: string; note: string } {
  const copy = COPY[v.code];
  return { ...copy, note: v.detail ?? copy.note };
}

const TONE: Record<VerdictTone, string> = {
  strong: "bg-primary text-primary-foreground",
  soft: "bg-verdict-soft text-verdict-soft-foreground",
  bad: "bg-verdict-bad text-verdict-bad-foreground",
};

/** Ergebnis der eingegebenen Antwort, oben in der Auflösung. */
export function VerdictLine({ verdict }: { verdict: Verdict }) {
  const { tone, title, note } = verdictCopy(verdict);
  return (
    <p
      role="status"
      className={cn("flex items-baseline justify-between gap-3 rounded-field px-4 py-2", TONE[tone])}
    >
      <span className="text-base font-bold">{title}</span>
      <span className="text-right text-sm font-medium">{note}</span>
    </p>
  );
}
