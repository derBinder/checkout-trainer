// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { VerdictCode } from "@/lib/darts/judge";
import { VerdictLine } from "./verdict";
import { I18nProvider } from "@/i18n/client";
// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

describe("VerdictLine auf Englisch", () => {
  it("meldet das Ergebnis als Status", () => {
    render(<VerdictLine verdict={{ code: "alternative" }} />, {
      wrapper: ({ children }) => <I18nProvider locale="en">{children}</I18nProvider>,
    });
    const status = screen.getByRole("status");
    expect(within(status).getByText("Alternative")).toBeTruthy();
    expect(within(status).getByText("also correct")).toBeTruthy();
  });
});

describe("VerdictLine", () => {
  it.each([
    ["alternative", "Alternative", "auch richtig"],
    ["notRecommended", "Geht, aber nicht empfohlen", "Der Checkout stimmt, der Weg ist schlechter"],
    ["bogeyRight", "Richtig", "Der Rest ist nicht checkbar"],
    ["setupOther", "Anderer Stellwurf", "Empfohlener Stellwurf unten"],
  ] as [VerdictCode, string, string][])("meldet „%s“ als Status mit Titel und Hinweis", (code, title, note) => {
    render(<VerdictLine verdict={{ code }} />, { wrapper });
    const status = screen.getByRole("status");
    expect(within(status).getByText(title)).toBeTruthy();
    expect(within(status).getByText(note)).toBeTruthy();
  });

  it.each([
    ["best", "Bester Weg"],
    ["checkable", "Ist checkbar"],
    ["setupRight", "Richtiger Stellwurf"],
  ] as [VerdictCode, string][])("meldet „%s“ nur mit dem Titel, ohne Hinweis", (code, title) => {
    render(<VerdictLine verdict={{ code }} />, { wrapper });
    expect(screen.getByRole("status").textContent).toBe(title);
  });

  it("nennt bei einem Weg, der nicht aufgeht, den Grund", () => {
    render(<VerdictLine verdict={{ code: "noCheckout", detail: { kind: "notDouble" } }} />, { wrapper });
    const status = screen.getByRole("status");
    expect(within(status).getByText("Geht nicht auf")).toBeTruthy();
    expect(within(status).getByText("Der letzte Dart ist kein Doppel")).toBeTruthy();
  });
});

describe("ResultLine", () => {
  it("zeigt Titel und Hinweis als Status", async () => {
    const { ResultLine } = await import("./verdict");
    render(<ResultLine tone="bad" title="Falsch, es bleiben 89" note="nicht 98" />, { wrapper });
    const status = screen.getByRole("status");
    expect(within(status).getByText("Falsch, es bleiben 89")).toBeTruthy();
    expect(within(status).getByText("nicht 98")).toBeTruthy();
  });
});
