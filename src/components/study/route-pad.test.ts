import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cardById } from "@/lib/cards";
import { checkFor } from "@/lib/darts/judge";
import { cardView } from "./card-view";
import { initInput, inputReducer, type InputState } from "./route-input";
import { RoutePad } from "./route-pad";
import { QuestionFooter, StudyQuestion } from "./study-question";

const noop = () => {};
const pad = (state: InputState) => renderToStaticMarkup(createElement(RoutePad, { state, onAction: noop }));
const count = (html: string, pattern: RegExp) => html.match(pattern)?.length ?? 0;

function question(id: string, state?: InputState) {
  const card = cardById(id)!;
  const check = checkFor(card);
  return renderToStaticMarkup(
    createElement(StudyQuestion, { view: cardView(card), input: state ?? initInput(check), onAction: noop }),
  );
}

function footer(id: string, state?: InputState) {
  const check = checkFor(cardById(id)!);
  return renderToStaticMarkup(
    createElement(QuestionFooter, { check, input: state ?? initInput(check), onReveal: noop }),
  );
}

describe("RoutePad", () => {
  it("has 23 keys and a ring switch with the active ring checked", () => {
    const html = pad(initInput(checkFor(cardById("r-121")!)));
    expect(count(html, /<button/g)).toBe(26);
    expect(html).toContain('role="radiogroup" aria-label="Ring"');
    expect(count(html, /role="radio"/g)).toBe(3);
    expect(html).toMatch(/aria-checked="true"[^>]*>T</);
    expect(html).toContain('aria-label="Letzten Dart löschen"');
    expect(html).toContain(">25<");
    expect(html).toContain(">Bull<");
  });

  it("disables all field keys but delete once full", () => {
    const start = initInput(checkFor(cardById("m-125-1")!)); // 1 Dart in der Hand
    const full = inputReducer(start, { type: "number", n: 20 });
    const html = pad(full);
    // 20 Zahlen, 25, Bull gesperrt; Ring-Knöpfe und Löschen nicht
    expect(count(html, /disabled=""/g)).toBe(22);
    expect(html).not.toMatch(/disabled=""[^>]*aria-label="Letzten Dart löschen"/);
    expect(html).not.toMatch(/aria-label="Letzten Dart löschen"[^>]*disabled=""/);
  });
});

describe("StudyQuestion", () => {
  it("looks the same for a rest and a bogey card except for the number", () => {
    expect(question("b-169").replaceAll("169", "###")).toBe(question("r-121").replaceAll("121", "###"));
    expect(footer("b-169")).toBe(footer("r-121"));
  });

  it("marks the next open slot", () => {
    expect(count(question("r-121"), /aria-current="step"/g)).toBe(1);
  });

  it("shows the darts already thrown on a miss card and fills the rest from the input", () => {
    const check = checkFor(cardById("m-121-0")!);
    const html = question("m-121-0", inputReducer(initInput(check), { type: "number", n: 17 }));
    expect(html).toContain("S20");
    expect(html).toContain("T17");
  });
});

describe("QuestionFooter", () => {
  it("offers Nicht checkbar on rest cards but not on miss cards", () => {
    expect(footer("r-121")).toContain("Nicht checkbar");
    expect(footer("m-121-0")).not.toContain("Nicht checkbar");
  });

  it("disables Prüfen until a dart is entered", () => {
    expect(footer("r-121")).toMatch(/<button[^>]*disabled=""[^>]*>Prüfen<\/button>/);
    const check = checkFor(cardById("r-121")!);
    const typed = inputReducer(initInput(check), { type: "number", n: 20 });
    expect(footer("r-121", typed)).not.toMatch(/<button[^>]*disabled=""[^>]*>Prüfen<\/button>/);
  });

  it("always offers revealing without input", () => {
    expect(footer("r-121")).toContain("Ohne Eingabe aufdecken");
    expect(footer("m-121-0")).toContain("Ohne Eingabe aufdecken");
  });
});
