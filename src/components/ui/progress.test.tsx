// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Progress, ProgressLabel, ProgressValue } from "./progress";

describe("Progress", () => {
  it("zeigt Beschriftung, Wert und Fortschritt für Screenreader", () => {
    render(
      <Progress value={40}>
        <ProgressLabel>Heute gelernt</ProgressLabel>
        <ProgressValue />
      </Progress>,
    );
    const bar = screen.getByRole("progressbar", { name: "Heute gelernt" });
    expect(bar.getAttribute("aria-valuenow")).toBe("40");
    expect(screen.getByText("40%")).toBeTruthy();
  });

  it("zeigt einen eigenen Wert statt der Prozentangabe", () => {
    render(
      <Progress value={3} max={5} aria-label="Karten">
        <ProgressValue>{(_formatted, value) => `${value} von 5`}</ProgressValue>
      </Progress>,
    );
    expect(screen.getByRole("progressbar", { name: "Karten" }).getAttribute("aria-valuemax")).toBe(
      "5",
    );
    expect(screen.getByText("3 von 5")).toBeTruthy();
  });
});
