// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { version } from "../../../package.json";
import { DICTIONARIES } from "@/i18n/dictionaries";
import { AppVersion } from "./app-version";

describe("AppVersion", () => {
  it("zeigt die Version aus package.json auf Deutsch", () => {
    render(<AppVersion label={DICTIONARIES.de.settings.version} />);
    expect(screen.getByText(`Version ${version}`)).toBeTruthy();
  });

  it("zeigt die Version auf Englisch", () => {
    render(<AppVersion label={DICTIONARIES.en.settings.version} />);
    expect(screen.getByText(`Version ${version}`)).toBeTruthy();
  });
});
