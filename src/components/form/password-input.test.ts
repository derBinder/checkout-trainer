import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PASSWORD_TOGGLE_ATTRIBUTE } from "./form-values";
import { PasswordInput } from "./password-input";

// HTML-Attributnamen sind unabhängig von der Schreibweise.
function inputTag(html: string) {
  return (html.match(/<input[^>]*>/)?.[0] ?? "").toLowerCase();
}

describe("PasswordInput", () => {
  it("schaltet Rechtschreibprüfung, Autokorrektur und Großschreibung immer ab", () => {
    const tag = inputTag(
      renderToStaticMarkup(createElement(PasswordInput, { id: "pw", name: "pw" })),
    );
    expect(tag).toContain('type="password"');
    expect(tag).toContain('spellcheck="false"');
    expect(tag).toContain('autocorrect="off"');
    expect(tag).toContain('autocapitalize="none"');
  });

  it("lässt sich die Abschaltung nicht von außen überschreiben", () => {
    const tag = inputTag(
      renderToStaticMarkup(
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
    const html = renderToStaticMarkup(createElement(PasswordInput, { id: "pw" }));
    expect(html).toMatch(new RegExp(`<button[^>]*${PASSWORD_TOGGLE_ATTRIBUTE}="pw"`));
  });
});
