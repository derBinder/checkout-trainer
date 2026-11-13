import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { PasswordStrength } from "./password-strength";

function render(value: string, locale: "de" | "en" = "de") {
  const html = renderDe(
    createElement(PasswordStrength, { id: "hint", value }),
    locale,
  );
  // Inhalt der Live-Region: vom Attribut bis zum Hinweis daneben.
  const live =
    html.split('aria-live="polite"')[1]?.split('<span class="text-right')[0] ?? "";
  return { html, live };
}

/** Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts. */
function renderDe(element: ReactElement, locale: "de" | "en" = "de"): string {
  return renderToStaticMarkup(<I18nProvider locale={locale}>{element}</I18nProvider>);
}

describe("PasswordStrength", () => {
  it("hat genau eine Live-Region, und darin steht nur die Stufe", () => {
    const { html, live } = render("abcdefg");
    expect(html.match(/aria-live=/g)).toHaveLength(1);
    expect(live).toContain("Stärke: ");
    expect(live).toContain("Schwach");
    expect(live).not.toContain("Noch");
  });

  it("der Hinweis steht außerhalb der Live-Region, aber im beschriebenen Element", () => {
    const { html, live } = render("abcdefg");
    expect(html).toContain("Noch 3 Zeichen bis zum Minimum.");
    expect(live).not.toContain("Noch 3 Zeichen");
    const described = html.match(/<p[^>]*id="hint"[^>]*>(.*)<\/p>/)?.[1] ?? "";
    expect(described).toContain("Noch 3 Zeichen bis zum Minimum.");
    expect(described).toContain("Schwach");
    expect(html).not.toMatch(/<p[^>]*aria-live/);
  });

  it("die leere Live-Region steht schon vor der ersten Eingabe bereit", () => {
    const { html } = render("");
    expect(html).toMatch(/<span[^>]*aria-live="polite"[^>]*><\/span>/);
    expect(html).toContain("Mindestens 10 Zeichen.");
  });

  it("zeigt Stufe und Hinweise auf Englisch", () => {
    const { html, live } = render("abcdefg", "en");
    expect(live).toContain("Strength: ");
    expect(live).toContain("Weak");
    expect(html).toContain("3 more characters to the minimum.");
    expect(render("abcdefghi", "en").html).toContain("1 more character to the minimum.");
    expect(render("", "en").html).toContain("At least 10 characters.");
  });
});
