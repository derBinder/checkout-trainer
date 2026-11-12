// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { PublicFooter } from "./public-footer";

describe("PublicFooter", () => {
  it("verlinkt die Rechtsseiten in der Sprache der Seite und zeigt den Schalter", () => {
    render(
      <I18nProvider locale="en">
        <PublicFooter />
      </I18nProvider>,
    );
    expect(screen.getByRole("link", { name: "Imprint" }).getAttribute("href")).toBe("/en/imprint");
    expect(screen.getByRole("link", { name: "Privacy" }).getAttribute("href")).toBe("/en/privacy");
    expect(screen.getByText("DE")).toBeTruthy();
  });
});
