// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/i18n/client";
import { PASSWORD_TOGGLE_ATTRIBUTE } from "./form-values";
import { PasswordInput } from "./password-input";

// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

function renderInput(props: React.ComponentProps<typeof PasswordInput> = {}) {
  render(
    <>
      <label htmlFor={props.id ?? undefined}>Passwort</label>
      <PasswordInput {...props} />
    </>,
    { wrapper },
  );
  return screen.getByLabelText<HTMLInputElement>("Passwort", { selector: "input" });
}

describe("PasswordInput im Browser", () => {
  it("schaltet zwischen verborgen und sichtbar um", async () => {
    const user = userEvent.setup();
    const input = renderInput({ id: "pw" });
    expect(input.type).toBe("password");

    const show = screen.getByRole("button", { name: "Passwort anzeigen" });
    expect(show.getAttribute("aria-pressed")).toBe("false");
    await user.click(show);
    expect(input.type).toBe("text");

    const hide = screen.getByRole("button", { name: "Passwort verbergen" });
    expect(hide.getAttribute("aria-pressed")).toBe("true");
    await user.click(hide);
    expect(input.type).toBe("password");
  });

  it("behält Fokus und Einfügemarke im Feld beim Umschalten", async () => {
    const user = userEvent.setup();
    const input = renderInput({ id: "pw" });
    await user.type(input, "geheimnis");
    input.setSelectionRange(2, 4);

    await user.click(screen.getByRole("button", { name: "Passwort anzeigen" }));
    expect(document.activeElement).toBe(input);
    expect(input.type).toBe("text");
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 4]);
  });

  it("schaltet auch ohne Fokus im Feld um, ohne den Fokus ins Feld zu holen", () => {
    const input = renderInput({ id: "pw" });
    const toggle = screen.getByRole("button", { name: "Passwort anzeigen" });
    toggle.focus();
    fireEvent.click(toggle);
    expect(input.type).toBe("text");
    expect(document.activeElement).not.toBe(input);
  });

  it("verhindert, dass ein Mausdruck auf das Auge den Fokus aus dem Feld nimmt", () => {
    renderInput({ id: "pw" });
    const toggle = screen.getByRole("button", { name: "Passwort anzeigen" });
    const allowed = fireEvent.mouseDown(toggle);
    expect(allowed).toBe(false);
  });

  it("erzeugt eine eigene ID, wenn keine übergeben wird, und verknüpft das Auge damit", () => {
    render(<PasswordInput name="pw" />, { wrapper });
    const input = document.querySelector("input");
    const toggle = screen.getByRole("button", { name: "Passwort anzeigen" });
    expect(input?.id).toBeTruthy();
    expect(toggle.getAttribute(PASSWORD_TOGGLE_ATTRIBUTE)).toBe(input?.id);
  });

  it("übernimmt zusätzliche Klassen am Feld", () => {
    const input = renderInput({ id: "pw", className: "extra-klasse" });
    expect(input.className).toContain("extra-klasse");
    expect(input.className).toContain("pr-14");
  });
});
