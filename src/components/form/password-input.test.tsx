import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { PASSWORD_TOGGLE_ATTRIBUTE } from "./form-values";
import { PasswordInput } from "./password-input";

// HTML-Attributnamen sind unabhängig von der Schreibweise.
function inputTag(html: string) {
  return (html.match(/<input[^>]*>/)?.[0] ?? "").toLowerCase();
}

/** Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts. */
function renderDe(element: ReactElement): string {
  return renderToStaticMarkup(<I18nProvider locale="de">{element}</I18nProvider>);
}

describe("PasswordInput", () => {
  it("schaltet Rechtschreibprüfung, Autokorrektur und Großschreibung immer ab", () => {
    const tag = inputTag(
      renderDe(createElement(PasswordInput, { id: "pw", name: "pw" })),
    );
    expect(tag).toContain('type="password"');
    expect(tag).toContain('spellcheck="false"');
    expect(tag).toContain('autocorrect="off"');
    expect(tag).toContain('autocapitalize="none"');
  });

  it("lässt sich die Abschaltung nicht von außen überschreiben", () => {
    const tag = inputTag(
      renderDe(
        createElement(PasswordInput, {
          id: "pw",
          spellCheck: true,
          autoCorrect: "on",
          autoCapitalize: "sentences",
        }),
      ),
    );
    expect(tag).toContain('spellcheck="false"');
    expect(tag).toContain('autocorrect="off"');
    expect(tag).toContain('autocapitalize="none"');
  });

  it("markiert den Auge-Knopf mit der ID seines Felds", () => {
    const html = renderDe(createElement(PasswordInput, { id: "pw" }));
    expect(html).toMatch(new RegExp(`<button[^>]*${PASSWORD_TOGGLE_ATTRIBUTE}="pw"`));
  });
});
