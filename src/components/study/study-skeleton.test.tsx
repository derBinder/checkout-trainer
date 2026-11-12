// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StudySkeleton } from "./study-skeleton";

describe("StudySkeleton", () => {
  it("kennzeichnet die Lernseite als ladend und lässt nur das Schließen-Kreuz bedienen", () => {
    const { container } = render(<StudySkeleton />);
    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.getByRole("link", { name: "Lernen beenden" }).getAttribute("href")).toBe("/heute");
    // Tastenfeld, Prüfen und Aufdecken sind nur Platzhalter.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("radiogroup")).toBeNull();
    // Die Fortschrittslinie ist nur Bild, der Stand steht erst mit den Daten fest.
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("enthält keine Lerninhalte", () => {
    const { container } = render(<StudySkeleton />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(container.textContent).not.toMatch(/[1-9]/);
    expect(container.textContent).not.toMatch(/\b[SDT]\d/);
  });
});
