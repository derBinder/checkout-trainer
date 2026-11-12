// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { VerdictCode } from "@/lib/darts/judge";
import { VerdictLine } from "./verdict";

describe("VerdictLine", () => {
  it.each([
    ["best", "Bester Weg", "genau richtig"],
    ["alternative", "Alternative", "auch richtig"],
    ["notRecommended", "Geht, aber nicht empfohlen", "Finish stimmt, Weg ist schlechter"],
    ["checkable", "Ist checkbar", "Es gibt einen Weg"],
    ["bogeyRight", "Richtig", "Rest ist nicht checkbar"],
    ["setupRight", "Richtiger Stellwurf", "genau richtig"],
    ["setupOther", "Anderer Stellwurf", "empfohlen siehe unten"],
  ] as [VerdictCode, string, string][])("meldet „%s“ als Status mit Titel und Hinweis", (code, title, note) => {
    render(<VerdictLine verdict={{ code }} />);
    const status = screen.getByRole("status");
    expect(within(status).getByText(title)).toBeTruthy();
    expect(within(status).getByText(note)).toBeTruthy();
  });

  it("nennt bei einem Weg, der nicht aufgeht, den Grund", () => {
    render(<VerdictLine verdict={{ code: "noCheckout", detail: "Letzter Dart ist kein Doppel" }} />);
    const status = screen.getByRole("status");
    expect(within(status).getByText("Geht nicht auf")).toBeTruthy();
    expect(within(status).getByText("Letzter Dart ist kein Doppel")).toBeTruthy();
  });
});
