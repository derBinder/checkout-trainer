import { describe, expect, it } from "vitest";
import { cardById } from "@/lib/cards";
import { cardView, restDetailView, type RestDetail } from "./card-view";

const view = (id: string) => cardView(cardById(id)!);

describe("cardView", () => {
  it("shows a rest card as the rest with three empty slots, the answer with notes", () => {
    const rest = view("r-121");
    expect(rest.question).toEqual({ label: "Rest", big: "121", slots: [null, null, null] });
    expect(rest.answer.slots).toEqual(["T20", "T11", "D14"]);
    expect(rest.answer.notes.map((n) => n.title)).toEqual(
      expect.arrayContaining(["Warum", "Alternative", "Nur S20"]),
    );
  });

  it("asks a miss card for the new rest and marks the miss", () => {
    const miss = view("m-121-0");
    expect(miss.question).toMatchObject({
      label: "Rest war 121",
      big: "?",
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
    expect(rest.answer.notes[0]).toEqual({ title: "Warum", text: "Bleibt bei Single 20 auf Bull-Finish." });
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
      "Warum",
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
  it("shows route, reason and alternatives of a rest without the single cases", () => {
    const detail = restDetailView(cardById("r-121") as RestDetail);
    expect(detail.slots).toEqual(["T20", "T11", "D14"]);
    expect(detail.slotTone).toBe("best");
    expect(detail.notes.map((n) => n.title)).toEqual(["Warum", "Alternative"]);
  });

  it("shows the two-dart route of a rest", () => {
    const detail = restDetailView(cardById("r-110") as RestDetail);
    expect(detail.notes).toEqual([
      { title: "Warum", text: (cardById("r-110") as RestDetail & { reason: string }).reason },
      { title: "Mit 2 Darts", text: "T20 · Bull" },
    ]);
  });

  it("shows the setup shot of a bogey number", () => {
    const detail = restDetailView({ kind: "bogey", rest: 169, setup: { throws: ["T20", "T19", "S20"], leaves: 32 } });
    expect(detail).toEqual({
      slots: ["T20", "T19", "S20"],
      slotTone: "none",
      notes: [{ title: "Stellwurf", text: "Kein Finish möglich. Stellen auf Rest 32." }],
    });
  });
});
