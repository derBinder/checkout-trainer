import { describe, expect, it } from "vitest";
import { de } from "@/i18n/dictionaries/de";
import { en } from "@/i18n/dictionaries/en";
import { cardById } from "@/lib/cards";
import { cardView, restDetailView, type RestDetail } from "./card-view";

const view = (id: string) => cardView(cardById(id)!, de.study);
const viewEn = (id: string) => cardView(cardById(id)!, en.study);

describe("cardView", () => {
  it("shows a rest card as the rest with three empty slots, the answer with notes", () => {
    const rest = view("r-121");
    expect(rest.question).toEqual({ label: "Rest", big: "121", slots: [null, null, null] });
    expect(rest.answer.slots).toEqual(["T20", "T11", "D14"]);
    expect(rest.answer.notes.map((n) => n.title)).toEqual(
      expect.arrayContaining(["Nach T20", "Alternative", "Nur S20"]),
    );
  });

  it("asks a miss card for the new rest and marks the miss", () => {
    const miss = view("m-121-0");
    // Ohne große Zahl: Den neuen Rest rechnet der Nutzer im Kopf.
    expect(miss.question).toEqual({
      label: "Rest war 121",
      slots: ["S20", null, null],
      hint: "Ziel war T20, getroffen: Single 20",
    });
    expect(miss.answer).toMatchObject({
      label: "Neuer Rest",
      big: "101",
      slots: ["S20", "T17", "Bull"],
      missSlots: [0],
    });
  });

  it("asks a two-dart card for the rest with a spent first slot, way and setup alike", () => {
    for (const [id, rest] of [["t-61", "61"], ["t-125", "125"]]) {
      expect(view(id).question).toEqual({
        label: "Rest",
        big: rest,
        sub: "noch 2 Darts",
        slots: [null, null, null],
        spent: 1,
      });
    }
    expect(viewEn("t-61").question.sub).toBe("2 darts left");
  });

  it("answers a two-dart way card with the route as best route", () => {
    expect(view("t-61").answer).toEqual({
      label: "Rest",
      big: "61",
      slots: [null, "T11", "D14"],
      slotTone: "best",
      missSlots: [],
      spent: 1,
      notes: [],
    });
  });

  it("answers a two-dart setup card with no finish and the setup shot", () => {
    expect(view("t-125").answer).toEqual({
      label: "Rest 125 mit 2 Darts",
      big: "Kein Finish",
      slots: [null, "T20", "T11"],
      slotTone: "none",
      missSlots: [],
      spent: 1,
      notes: [{ title: "Stellwurf", text: "T20 · T11, Rest 32" }],
    });
    expect(viewEn("t-125").answer).toMatchObject({ label: "125 with 2 darts", big: "No finish" });
  });

  it("asks a bogey card exactly like a rest card", () => {
    const bogey = view("b-169");
    expect(bogey.question).toEqual({ label: "Rest", big: "169", slots: [null, null, null] });
    expect(bogey.answer.big).toBe("Nicht checkbar");
    expect(bogey.answer.notes[0]).toMatchObject({ title: "Stellwurf" });
    expect(bogey.answer.notes).toEqual([{ title: "Stellwurf", text: "Danach Rest 32" }]);
  });

  it("leaves unused slots empty when the route has fewer than three darts", () => {
    const rest = view("r-100");
    expect(rest.answer.slots).toEqual(["T20", "D20", null]);
    expect(rest.answer.slotTone).toBe("best");
    expect(rest.answer.missSlots).toEqual([]);
  });

  it("writes the follow-up route of a single case with darts left", () => {
    const rest = view("r-121");
    expect(rest.answer.notes).toContainEqual({
      title: "Nur S20",
      text: "101: T17 · Bull",
    });
    expect(rest.answer.notes).toContainEqual({
      title: "Nur S11",
      text: "50: Bull",
    });
    expect(rest.answer.notes[0]).toEqual({ title: "Nach T20", text: "61 mit 2 Darts: T11 · D14" });
  });

  it("replaces the reason with the breakdown into first dart and known rest", () => {
    expect(view("r-170").answer.notes[0]).toEqual({ title: "Nach T20", text: "110 mit 2 Darts: T20 · Bull" });
    expect(view("r-60").answer.notes[0]).toEqual({ title: "Nach S20", text: "40 mit 1 Dart: D20" });
    expect(view("r-170").answer.notes.map((n) => n.title)).not.toContain("Warum");
    expect(viewEn("r-170").answer.notes[0]).toEqual({ title: "After T20", text: "110 with 2 darts: T20 · Bull" });
    expect(viewEn("r-60").answer.notes[0]).toEqual({ title: "After S20", text: "40 with 1 dart: D20" });
  });

  it("shortens the breakdown where the chart goes on differently", () => {
    expect(view("r-110").answer.notes[0]).toEqual({ title: "Nach T20", text: "bleiben 50" });
    expect(viewEn("r-110").answer.notes[0]).toEqual({ title: "After T20", text: "50 left" });
  });

  it("keeps the reason without a breakdown", () => {
    expect(view("r-32").answer.notes[0]).toEqual({ title: "Warum", text: "Direkt auf das Doppel." });
    expect(view("r-42").answer.notes[0].title).toBe("Warum");
  });

  it("joins several alternatives into one note", () => {
    const rest = view("r-25");
    expect(rest.answer.notes).toContainEqual({ title: "Alternativen", text: "S1 · D12 oder S17 · D4" });
  });

  it("names a setup shot as follow-up 'Stellen'", () => {
    const rest = view("r-125");
    const setupCase = rest.answer.notes.find((n) => n.text.startsWith("Stellen"));
    expect(setupCase?.text).toMatch(/^Stellen: .+, Rest \d+$/);

    const miss = view("m-125-1");
    expect(miss.answer.slots).toEqual(["T18", "S19", "S20"]);
    expect(miss.answer.slotTone).toBe("none");
    expect(miss.answer.missSlots).toEqual([1]);
    expect(miss.answer.notes).toEqual([{ title: "Stellwurf", text: "S20, Rest 32" }]);
  });

  it("adds the chart's two-dart route as its own note", () => {
    const rest = view("r-110");
    expect(rest.answer.slots).toEqual(["T20", "T10", "D10"]);
    expect(rest.answer.notes).toContainEqual({ title: "Mit 2 Darts", text: "T20 · Bull" });
    expect(rest.answer.notes.map((n) => n.title)).toEqual([
      "Nach T20",
      "Mit 2 Darts",
      "Nur S20",
      "Nur S10",
    ]);
    expect(view("r-100").answer.notes.map((n) => n.title)).not.toContain("Mit 2 Darts");
    // 63 und 69: die Tabelle nennt für zwei Darts denselben Weg wie Variante 1
    expect(view("r-63").answer.notes.map((n) => n.title)).not.toContain("Mit 2 Darts");
    expect(view("r-69").answer.notes.map((n) => n.title)).not.toContain("Mit 2 Darts");
  });

  it("shows a split route as the chart writes it", () => {
    const rest = view("r-48");
    expect(rest.question.slots).toEqual([null, null, null]);
    expect(rest.answer.slots).toEqual(["16/8", "D16/D20", null]);
    expect(rest.answer.notes[0]).toEqual({
      title: "Warum",
      text: "Zwischen 16 und 8 gezielt lässt jedes der beiden Felder ein Doppel.",
    });
    expect(view("r-108").answer.slots).toEqual(["T20", "16/8", "D16/D20"]);
  });

  it("keeps the outer bull as 25", () => {
    expect(view("r-91").answer.notes).toContainEqual({ title: "Alternative", text: "25 · T16 · D9" });
  });
});

describe("restDetailView", () => {
  it("shows route, breakdown and alternatives of a rest without the single cases", () => {
    const detail = restDetailView(cardById("r-121") as RestDetail, de.study);
    expect(detail.slots).toEqual(["T20", "T11", "D14"]);
    expect(detail.slotTone).toBe("best");
    expect(detail.notes.map((n) => n.title)).toEqual(["Nach T20", "Alternative"]);
  });

  it("shows the two-dart route of a rest", () => {
    const detail = restDetailView(cardById("r-110") as RestDetail, de.study);
    expect(detail.notes).toEqual([
      { title: "Nach T20", text: "bleiben 50" },
      { title: "Mit 2 Darts", text: "T20 · Bull" },
    ]);
  });

  it("shows the setup shot of a bogey number", () => {
    const detail = restDetailView({ kind: "bogey", rest: 169, setup: { throws: ["T20", "T19", "S20"], leaves: 32 } }, de.study);
    expect(detail).toEqual({
      slots: ["T20", "T19", "S20"],
      slotTone: "none",
      notes: [{ title: "Stellwurf", text: "Kein Finish möglich. Stellen auf Rest 32." }],
    });
  });
});

describe("cardView auf Englisch", () => {
  it("fragt und löst eine Rest-Karte auf", () => {
    const rest = viewEn("r-121");
    expect(rest.question).toEqual({ label: "Score", big: "121", slots: [null, null, null] });
    expect(rest.answer.notes[0]).toEqual({ title: "After T20", text: "61 with 2 darts: T11 · D14" });
    expect(rest.answer.notes).toContainEqual({ title: "Alternative", text: expect.any(String) });
    expect(rest.answer.notes).toContainEqual({ title: "Only S20", text: "101: T17 · Bull" });
  });

  it("nennt Alternativen und die Tabellenvariante mit 2 Darts", () => {
    expect(viewEn("r-25").answer.notes).toContainEqual({ title: "Alternatives", text: "S1 · D12 or S17 · D4" });
    expect(viewEn("r-110").answer.notes).toContainEqual({ title: "With 2 darts", text: "T20 · Bull" });
  });

  it("schreibt einen Stellwurf in Kurzform", () => {
    expect(viewEn("r-125").answer.notes.find((n) => n.text.startsWith("Set up"))?.text).toMatch(
      /^Set up: .+, \d+ left$/,
    );
    expect(viewEn("m-125-1").answer.notes).toEqual([{ title: "Setup shot", text: "S20, 32 left" }]);
  });

  it("fragt eine Fehlwurf-Karte nach dem neuen Rest", () => {
    const miss = viewEn("m-121-0");
    expect(miss.question).toEqual({
      label: "Score was 121",
      slots: ["S20", null, null],
      hint: "Aimed at T20, hit: single 20",
    });
    expect(miss.answer).toMatchObject({ label: "New score", big: "101" });
  });

  it("zeigt eine Bogey-Karte wie eine Rest-Karte", () => {
    const bogey = viewEn("b-169");
    expect(bogey.question).toEqual({ label: "Score", big: "169", slots: [null, null, null] });
    expect(bogey.answer).toMatchObject({ label: "Score 169", big: "No checkout" });
    expect(bogey.answer.notes).toEqual([{ title: "Setup shot", text: "Then 32 left" }]);
  });

  it("zeigt den Stellwurf einer Bogey-Zahl ohne Fälle", () => {
    const detail = restDetailView(
      { kind: "bogey", rest: 169, setup: { throws: ["T20", "T19", "S20"], leaves: 32 } },
      en.study,
    );
    expect(detail.notes).toEqual([{ title: "Setup shot", text: "No checkout. Set up 32." }]);
  });
});

describe("cardView for extra cards", () => {
  it("asks a setup above 170 with three open slots and shows the setup", () => {
    const over = view("o-199");
    expect(over.question).toEqual({ label: "Rest", big: "199", slots: [null, null, null] });
    expect(over.answer).toEqual({
      label: "Rest",
      big: "199",
      slots: ["T20", "T20", "T13"],
      slotTone: "none",
      missSlots: [],
      notes: [{ title: "Stellwurf", text: "Danach Rest 40" }],
    });
    expect(viewEn("o-199").answer.notes).toEqual([{ title: "Setup shot", text: "Then 40 left" }]);
  });

  it("asks a single instead of a double like a miss card", () => {
    const single = view("d-16");
    expect(single.question).toEqual({
      label: "Rest war 32",
      slots: ["S16", null, null],
      hint: "Ziel war D16, getroffen: Single 16",
    });
    expect(single.answer).toMatchObject({ big: "16", slots: ["S16", "D8", null], missSlots: [0] });
  });

  it("names the neighbouring field that was hit", () => {
    expect(view("n-170-0-S5").question.hint).toBe("Ziel war T20, getroffen: Single 5");
    expect(viewEn("n-170-0-S5").question.hint).toBe("Aimed at T20, hit: single 5");
  });
});
