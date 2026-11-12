// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { cardById } from "@/lib/cards";
import { cardView } from "./card-view";
import { StudyCard } from "./study-card";

function show(id: string, revealed: boolean) {
  const card = cardById(id);
  if (!card) throw new Error(`Karte ${id} fehlt`);
  return render(<StudyCard view={cardView(card)} revealed={revealed} />);
}

const darts = () =>
  within(screen.getByRole("list", { name: "Darts" }))
    .getAllByRole("listitem")
    .map((li) => li.textContent);

describe("StudyCard", () => {
  it("fragt nach einem Rest mit drei offenen Feldern", () => {
    show("r-5", false);
    expect(screen.getByText("Rest")).toBeTruthy();
    expect(screen.getByText("5")).toBeTruthy();
    expect(darts()).toEqual(["?offen", "?offen", "?offen"]);
  });

  it("löst einen Rest mit Weg und Erklärungen auf", () => {
    show("r-5", true);
    expect(darts()).toEqual(["S1", "D2"]);
    expect(screen.getByText("Warum")).toBeTruthy();
    expect(screen.getByText("Alternative")).toBeTruthy();
    expect(screen.getByText("S3 · D1")).toBeTruthy();
  });

  it("zeigt eine Bogey-Zahl als nicht checkbar mit Stellwurf", () => {
    show("b-159", false);
    expect(screen.getByText("159")).toBeTruthy();

    show("b-159", true);
    expect(screen.getByText("Rest 159")).toBeTruthy();
    expect(screen.getByText("Nicht checkbar")).toBeTruthy();
    expect(screen.getByText("Stellwurf")).toBeTruthy();
    expect(screen.getByText("Kein Finish möglich. Stellen auf Rest 32.")).toBeTruthy();
  });

  it("fragt bei einem Fehlwurf nach dem neuen Rest", () => {
    show("m-56-0", false);
    expect(screen.getByText("Rest war 56")).toBeTruthy();
    expect(screen.getByText("Ziel war T16, getroffen: Single 16")).toBeTruthy();
    expect(screen.getByText("Neuer Rest")).toBeTruthy();
    expect(screen.getByText("?", { selector: "p" })).toBeTruthy();
    expect(darts()).toEqual(["S16 (Fehlwurf)", "?offen", "?offen"]);
  });

  it("löst einen Fehlwurf mit dem Folgeweg auf, ohne leere Erklärungsliste", () => {
    const { container } = show("m-56-0", true);
    expect(screen.getByText("40")).toBeTruthy();
    expect(darts()).toEqual(["S16 (Fehlwurf)", "D20"]);
    expect(container.querySelector("dl")).toBeNull();
  });

  it("nennt bei einem Fehlwurf ohne Finish den Stellwurf", () => {
    show("m-125-1", true);
    expect(screen.getByText("52")).toBeTruthy();
    expect(screen.getByText("Stellwurf")).toBeTruthy();
    expect(screen.getByText("Kein Finish mehr: S20, Rest 32")).toBeTruthy();
  });
});
