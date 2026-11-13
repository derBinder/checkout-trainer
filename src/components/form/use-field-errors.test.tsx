// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { emailSchema, passwordRequiredSchema } from "@/lib/validation/schemas";
import { type FieldSpec } from "./form-values";
import { useFieldErrors } from "./use-field-errors";
import { I18nProvider } from "@/i18n/client";
// Die Komponenten lesen die Sprache aus dem I18nProvider des Root-Layouts.
function wrapper({ children }: { children: React.ReactNode }) {
  return <I18nProvider locale="de">{children}</I18nProvider>;
}

const FIELDS: FieldSpec[] = [
  { name: "email", schema: emailSchema },
  { name: "choice", schema: passwordRequiredSchema },
];

function Harness({ onValid }: { onValid: () => void }) {
  const { errors, fieldProps, errorId, validateForm, reset } = useFieldErrors(FIELDS);
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (validateForm(event.currentTarget)) onValid();
      }}
    >
      <label htmlFor="email">E-Mail</label>
      <input id="email" name="email" {...fieldProps("email")} />
      <p id={errorId("email")}>{errors.email}</p>
      <label htmlFor="note">Notiz</label>
      <input id="note" name="note" {...fieldProps("note")} />
      <p data-testid="note-error">{errors.note ?? "kein Hinweis"}</p>
      {/* Zwei Felder mit gleichem Namen: namedItem liefert eine Liste, kein Element. */}
      <input type="radio" name="choice" value="a" aria-label="A" />
      <input type="radio" name="choice" value="b" aria-label="B" />
      <p>{errors.choice}</p>
      <button type="submit">Prüfen</button>
      <button type="button" onClick={reset}>
        Zurücksetzen
      </button>
    </form>
  );
}

function setup() {
  const onValid = vi.fn();
  const user = userEvent.setup();
  render(<Harness onValid={onValid} />, { wrapper });
  return { user, onValid, email: screen.getByLabelText("E-Mail") };
}

describe("useFieldErrors", () => {
  it("prüft ein Feld beim Verlassen ohne neues Ziel, etwa beim Tippen ins Leere", () => {
    const { email } = setup();
    fireEvent.change(email, { target: { value: "kaputt" } });
    expect(email.getAttribute("aria-invalid")).toBe("false");
    fireEvent.blur(email, { relatedTarget: null });
    expect(email.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/keine gültige E-Mail-Adresse/)).toBeTruthy();
  });

  it("verknüpft die Meldung nur, solange es eine gibt", async () => {
    const { user, email } = setup();
    expect(email.getAttribute("aria-describedby")).toBeNull();
    await user.click(email);
    await user.tab();
    const id = email.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id ?? "")?.textContent).toBe(
      "Bitte gib deine E-Mail-Adresse ein.",
    );
  });

  it("gibt für Felder ohne Regel nie einen Hinweis", async () => {
    const { user } = setup();
    const note = screen.getByLabelText("Notiz");
    await user.click(note);
    await user.tab();
    await user.type(note, "x");
    expect(note.getAttribute("aria-invalid")).toBe("false");
    expect(screen.getByTestId("note-error").textContent).toBe("kein Hinweis");
  });

  it("meldet ein fehlerhaftes Feld ohne eindeutiges Element, ohne den Fokus zu verschieben", async () => {
    const { user, onValid } = setup();
    await user.type(screen.getByLabelText("E-Mail"), "name@beispiel.de");
    const submit = screen.getByRole("button", { name: "Prüfen" });
    submit.focus();
    fireEvent.submit(submit.closest("form") as HTMLFormElement);
    expect(onValid).not.toHaveBeenCalled();
    expect(screen.getByText("Bitte gib ein Passwort ein.")).toBeTruthy();
    expect(document.activeElement).toBe(submit);
  });

  it("lässt ein vollständiges Formular durch", async () => {
    const { user, onValid } = setup();
    await user.type(screen.getByLabelText("E-Mail"), "name@beispiel.de");
    await user.click(screen.getByLabelText("B"));
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(onValid).toHaveBeenCalledOnce();
  });

  it("entfernt beim Zurücksetzen alle Hinweise", async () => {
    const { user, email } = setup();
    await user.click(screen.getByRole("button", { name: "Prüfen" }));
    expect(email.getAttribute("aria-invalid")).toBe("true");
    await user.click(screen.getByRole("button", { name: "Zurücksetzen" }));
    expect(email.getAttribute("aria-invalid")).toBe("false");
    expect(screen.queryByText("Bitte gib deine E-Mail-Adresse ein.")).toBeNull();
  });
});
