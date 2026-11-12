// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const changePassword = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth/client", () => ({ authClient: { changePassword } }));

const { ChangePasswordForm } = await import("./change-password-form");

const STRONG = "korrekt-pferd-batterie";

function current() {
  return screen.getByLabelText("Aktuelles Passwort") as HTMLInputElement;
}

function next() {
  return screen.getByLabelText("Neues Passwort") as HTMLInputElement;
}

function submitButton() {
  return screen.getByRole("button", { name: "Passwort ändern" });
}

async function fillAndSubmit(currentValue: string, newValue: string) {
  const user = userEvent.setup();
  render(<ChangePasswordForm />);
  if (currentValue) await user.type(current(), currentValue);
  if (newValue) await user.type(next(), newValue);
  await user.click(submitButton());
  return user;
}

beforeEach(() => {
  changePassword.mockReset();
});

describe("ChangePasswordForm", () => {
  it("ändert das Passwort, meldet andere Geräte ab und leert die Felder", async () => {
    changePassword.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    render(<ChangePasswordForm />);
    await user.type(current(), "alt-geheim");
    await user.type(next(), STRONG);
    await user.click(screen.getAllByRole("button", { name: "Passwort anzeigen" })[1]);
    expect(next().type).toBe("text");
    await user.click(submitButton());

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "alt-geheim",
      newPassword: STRONG,
      revokeOtherSessions: true,
    });
    expect((await screen.findByRole("status")).textContent).toBe(
      "Passwort geändert. Andere Geräte sind abgemeldet.",
    );
    expect(current().value).toBe("");
    expect(next().value).toBe("");
    expect(next().type).toBe("password");
    expect(screen.getByText("Mindestens 10 Zeichen.")).toBeTruthy();
    expect(submitButton().hasAttribute("disabled")).toBe(false);
  });

  it("schickt nichts ab und zeigt Hinweise, solange Felder fehlen", async () => {
    await fillAndSubmit("", "");
    expect(changePassword).not.toHaveBeenCalled();
    expect(screen.getByText("Bitte gib dein aktuelles Passwort ein.")).toBeTruthy();
    expect(screen.getByText("Bitte gib ein Passwort ein.")).toBeTruthy();
    expect(document.activeElement).toBe(current());
  });

  it("setzt den Fokus auf das neue Passwort, wenn nur dieses zu kurz ist", async () => {
    await fillAndSubmit("alt-geheim", "kurz");
    expect(changePassword).not.toHaveBeenCalled();
    expect(screen.getByText("Das Passwort braucht mindestens 10 Zeichen.")).toBeTruthy();
    expect(document.activeElement).toBe(next());
    expect(next().getAttribute("aria-describedby")?.startsWith("newPassword-hint ")).toBe(
      true,
    );
  });

  it("zeigt einen falschen aktuellen Wert auf Deutsch und behält die Eingaben", async () => {
    changePassword.mockResolvedValue({ error: { status: 400, code: "INVALID_PASSWORD" } });
    await fillAndSubmit("falsch-falsch", STRONG);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Das Passwort stimmt nicht.",
    );
    expect(current().value).toBe("falsch-falsch");
    expect(submitButton().hasAttribute("disabled")).toBe(false);
  });

  it("meldet eine fehlende Verbindung", async () => {
    changePassword.mockRejectedValue(new Error("offline"));
    await fillAndSubmit("alt-geheim", STRONG);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Keine Verbindung. Versuche es erneut.",
    );
    expect(submitButton().hasAttribute("disabled")).toBe(false);
  });

  it("sperrt den Knopf, solange die Änderung läuft", async () => {
    let finish: (value: { error: null }) => void = () => {};
    changePassword.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await fillAndSubmit("alt-geheim", STRONG);
    expect(submitButton().hasAttribute("disabled")).toBe(true);
    await act(async () => finish({ error: null }));
    expect(submitButton().hasAttribute("disabled")).toBe(false);
  });

  it("leert beim Verbergen der Seite Felder, Sichtbarkeit, Hinweise und Meldung", async () => {
    changePassword.mockResolvedValue({ error: { status: 400, code: "INVALID_PASSWORD" } });
    const user = userEvent.setup();
    const { rerender } = render(
      <Activity mode="visible">
        <ChangePasswordForm />
      </Activity>,
    );
    await user.type(current(), "falsch-falsch");
    await user.type(next(), STRONG);
    await user.click(screen.getAllByRole("button", { name: "Passwort anzeigen" })[0]);
    expect(current().type).toBe("text");
    await user.click(submitButton());
    await screen.findByText("Das Passwort stimmt nicht.");
    await user.clear(next());
    expect(next().getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Bitte gib ein Passwort ein.")).toBeTruthy();

    rerender(
      <Activity mode="hidden">
        <ChangePasswordForm />
      </Activity>,
    );
    rerender(
      <Activity mode="visible">
        <ChangePasswordForm />
      </Activity>,
    );

    expect(current().value).toBe("");
    expect(current().type).toBe("password");
    expect(next().value).toBe("");
    expect(next().getAttribute("aria-invalid")).toBe("false");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Mindestens 10 Zeichen.")).toBeTruthy();
  });
});
