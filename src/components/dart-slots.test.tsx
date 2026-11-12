// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DartSlots } from "./dart-slots";
import { I18nProvider } from "@/i18n/client";
// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

const items = (name = "Darts") => within(screen.getByRole("list", { name })).getAllByRole("listitem");
const texts = (name?: string) => items(name).map((li) => li.textContent);
const current = (name?: string) => items(name).map((li) => li.getAttribute("aria-current"));

describe("DartSlots", () => {
  describe("in der Frage", () => {
    it("zeigt immer drei Felder, offene mit „?“ und für Screenreader als offen", () => {
      render(<DartSlots slots={["T20", null, null]} />, { wrapper });
      expect(texts()).toEqual(["T20", "?offen", "?offen"]);
      expect(within(items()[1]).getByText("?").getAttribute("aria-hidden")).toBe("true");
    });

    it("ergänzt fehlende Einträge zu offenen Feldern", () => {
      render(<DartSlots slots={[]} />, { wrapper });
      expect(texts()).toEqual(["?offen", "?offen", "?offen"]);
    });

    it("hebt das nächste offene Feld hervor", () => {
      render(<DartSlots slots={["S16", null, null]} next={1} missSlots={[0]} />, { wrapper });
      expect(current()).toEqual([null, "step", null]);
      expect(texts()).toEqual(["S16 (Fehlwurf)", "?offen", "?offen"]);
    });

    it("hebt kein Feld hervor, wenn alles eingegeben ist", () => {
      render(<DartSlots slots={["T20", "T20", "S7"]} next={undefined} />, { wrapper });
      expect(current()).toEqual([null, null, null]);
    });

    it("markiert ein offenes Feld nie als Fehlwurf", () => {
      render(<DartSlots slots={[null, null, null]} missSlots={[0]} />, { wrapper });
      expect(texts()).toEqual(["?offen", "?offen", "?offen"]);
    });
  });

  describe("in der Auflösung", () => {
    it("zeigt nur die geworfenen Darts", () => {
      render(<DartSlots slots={["S1", "D2", null]} tone="best" />, { wrapper });
      expect(texts()).toEqual(["S1", "D2"]);
    });

    it("markiert Fehlwürfe auch in neutraler Farbe", () => {
      render(<DartSlots slots={["T18", "S19", "S20"]} tone="none" missSlots={[1]} />, { wrapper });
      expect(texts()).toEqual(["T18", "S19 (Fehlwurf)", "S20"]);
    });

    it("trägt den Namen der Reihe, wenn mehrere untereinander stehen", () => {
      render(
        <>
          <DartSlots slots={["S3", "D1"]} tone="none" size="sm" label="Dein Weg" />
          <DartSlots slots={["S1", "D2"]} tone="best" size="sm" label="Bester Weg" />
        </>, { wrapper });
      expect(texts("Dein Weg")).toEqual(["S3", "D1"]);
      expect(texts("Bester Weg")).toEqual(["S1", "D2"]);
      expect(screen.queryByRole("list", { name: "Darts" })).toBeNull();
    });
  });
});
