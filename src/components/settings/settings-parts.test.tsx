// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SettingsSection } from "./settings-parts";

describe("SettingsSection", () => {
  it("zeigt Überschrift und Inhalt eines Abschnitts", () => {
    render(
      <SettingsSection title="Darstellung" titleId="darstellung">
        <p>Inhalt</p>
      </SettingsSection>,
    );
    const heading = screen.getByRole("heading", { level: 2, name: "Darstellung" });
    expect(heading.id).toBe("darstellung");
    expect(heading.closest("section")?.textContent).toContain("Inhalt");
  });
});
